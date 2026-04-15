import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, Search, Filter } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const ArchivePage = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unarchiving, setUnarchiving] = useState(null);
  const [message, setMessage] = useState('');
  // Confirmation modal state
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    try {
      const res = await api.get('/problems?stage=Archived');
      setProblems(res.data);
    } catch (err) {
      console.error('Failed to fetch archived problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (id) => {
    setUnarchiving(id);
    setConfirmId(null);
    try {
      await api.put(`/problems/${id}/unarchive`);
      setMessage(`Problem ${id} restored to Idea.`);
      setProblems(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setMessage('Failed to unarchive problem.');
    } finally {
      setUnarchiving(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const filtered = problems.filter(p =>
    search === '' ||
    (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.latex || '').toLowerCase().includes(search.toLowerCase())
  );

  // The problem being confirmed (for displaying in the modal)
  const confirmProblem = confirmId ? problems.find(p => p.id === confirmId) : null;

  if (loading) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-ucla-blue border-t-transparent" />
            <span className="text-sm">Loading archive...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 pb-12 pt-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Archive size={22} className="text-slate-500 dark:text-slate-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Archive</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {problems.length} archived problem{problems.length !== 1 ? 's' : ''} &mdash; restore any to move it back to Idea
            </p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.includes('Failed')
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
          }`}>
            {message}
          </div>
        )}

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 mb-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search archived problems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue transition-all text-sm text-slate-800 dark:text-slate-200 border border-transparent focus:border-ucla-blue"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Filter className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={36} />
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                {search ? 'No matching archived problems.' : 'Nothing in the archive yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Problem</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(problem => (
                  <tr
                    key={problem.id}
                    onClick={() => navigate(`/problem/${problem.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-ucla-blue dark:text-ucla-gold font-semibold text-sm">
                          {problem.id}
                        </span>
                        {/* LaTeX-rendered snippet */}
                        <div
                          className="text-sm text-slate-600 dark:text-slate-400 max-w-xl overflow-hidden"
                          style={{ maxHeight: '2.8em' }}
                          onClick={e => e.stopPropagation()} // prevent nav when clicking math
                        >
                          <KatexRenderer latex={(problem.latex || 'Click to view...').slice(0, 160)} />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                            {problem.quality ? `${problem.quality}/10` : '?'}
                          </span>
                          {(problem.topics || []).map(t => (
                            <span
                              key={t}
                              className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmId(problem.id); }}
                        disabled={unarchiving === problem.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-ucla-blue/10 text-ucla-blue dark:bg-ucla-blue/20 dark:text-blue-300 hover:bg-ucla-blue hover:text-white transition-all disabled:opacity-50"
                      >
                        <ArchiveRestore size={13} />
                        {unarchiving === problem.id ? 'Restoring...' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Restore confirmation modal ───────────────────────────────── */}
      {confirmId && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setConfirmId(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Restore this problem?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              <span className="font-mono font-semibold text-[#2774AE] dark:text-[#FFD100]">{confirmId}</span>{' '}
              will be moved back to <strong>Idea</strong> stage and become visible in the inventory.
            </p>
            {/* LaTeX preview in modal */}
            {confirmProblem?.latex && (
              <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 overflow-hidden" style={{ maxHeight: '4em' }}>
                <KatexRenderer latex={confirmProblem.latex.slice(0, 200)} />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnarchive(confirmId)}
                className="px-4 py-2 text-sm rounded-lg bg-[#2774AE] hover:bg-[#005587] text-white font-semibold transition"
              >
                Restore to Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ArchivePage;
