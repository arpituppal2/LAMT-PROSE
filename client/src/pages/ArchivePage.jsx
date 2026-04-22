import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, Search, Filter, Loader2 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const ArchivePage = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unarchiving, setUnarchiving] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { fetchArchived(); }, []);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const res = await api.get('/problems?stage=Archived');
      setProblems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch archived problems:', err);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (id) => {
    setUnarchiving(id);
    setConfirmId(null);
    try {
      await api.put(`/problems/${id}/unarchive`);
      setMessage({ text: `Problem ${id} restored to Idea.`, type: 'success' });
      setProblems(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setMessage({ text: 'Failed to unarchive problem.', type: 'error' });
    } finally {
      setUnarchiving(null);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const filtered = problems.filter(p =>
    search === '' ||
    (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.latex || '').toLowerCase().includes(search.toLowerCase())
  );

  const confirmProblem = confirmId ? problems.find(p => p.id === confirmId) : null;

  const cardCls = 'bg-white/70 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl';
  const inputCls = 'w-full px-4 py-2.5 text-base bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ucla-blue)]/30 dark:focus:ring-[var(--ucla-gold)]/20 transition';

  if (loading) {
    return (
      <Layout>
        <div className="h-64 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 size={18} className="animate-spin text-[var(--ucla-blue)]" />
            <span className="text-base">Loading archive...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Archive size={22} className="text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Archive</h1>
            <p className="text-base text-gray-400 dark:text-gray-500 mt-0.5">
              {problems.length} archived problem{problems.length !== 1 ? 's' : ''} — restore any to move it back to Idea
            </p>
          </div>
        </div>

        {message.text && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-base font-medium ${
            message.type === 'error'
              ? 'status-badge status-needs-review border border-[var(--badge-needs-review-border)]'
              : 'status-badge status-endorsed border border-[var(--badge-endorsed-border)]'
          }`}>
            {message.text}
          </div>
        )}

        <div className={`${cardCls} p-3 mb-5`}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search archived problems..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-11`} />
          </div>
        </div>

        <div className={`${cardCls} overflow-hidden`}>
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Filter className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={36} />
              <p className="text-base text-gray-400 dark:text-gray-500">
                {search ? 'No matching archived problems.' : 'Nothing in the archive yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/8">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Problem</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {filtered.map(problem => (
                  <tr
                    key={problem.id}
                    onClick={() => navigate(`/problem/${problem.id}`)}
                    className="hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] font-semibold text-base">
                          {problem.id}
                        </span>
                        <div
                          className="text-base text-gray-600 dark:text-gray-400 max-w-xl overflow-hidden"
                          style={{ maxHeight: '2.8em' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <KatexRenderer latex={(problem.latex || 'Click to view...').slice(0, 160)} />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-white/10">
                            {problem.quality ? `${problem.quality}/10` : '?'}
                          </span>
                          {(problem.topics || []).map(t => (
                            <span key={t}
                              className="text-xs font-medium px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-white/10">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--ucla-blue)]/10 text-[var(--ucla-blue)] dark:bg-[var(--ucla-blue)]/20 dark:text-[#8BB8E8] hover:bg-[var(--ucla-blue)] hover:text-white transition-all disabled:opacity-50"
                      >
                        {unarchiving === problem.id
                          ? <><Loader2 size={13} className="animate-spin" /> Restoring...</>
                          : <><ArchiveRestore size={14} /> Restore</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirmId && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setConfirmId(null)}
        >
          <div
            className="bg-white/80 dark:bg-[#0d1e30]/90 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Restore this problem?
            </h3>
            <p className="text-base text-gray-500 dark:text-gray-400 mb-3">
              <span className="font-mono font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">{confirmId}</span>{' '}
              will be moved back to <strong>Idea</strong> stage and become visible in the inventory.
            </p>
            {confirmProblem?.latex && (
              <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-base text-gray-600 dark:text-gray-300 overflow-hidden" style={{ maxHeight: '4em' }}>
                <KatexRenderer latex={confirmProblem.latex.slice(0, 200)} />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmId(null)}
                className="px-4 py-2 text-base rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                Cancel
              </button>
              <button onClick={() => handleUnarchive(confirmId)}
                className="px-4 py-2 text-base rounded-xl bg-[var(--ucla-blue)] hover:bg-[var(--ucla-blue-dark)] text-white font-semibold transition">
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
