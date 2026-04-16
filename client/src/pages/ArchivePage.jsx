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
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { fetchArchived(); }, []);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      // Try fetching user’s own archived problems first; fall back to stage filter
      let data = [];
      try {
        const res = await api.get('/problems/my?archived=true');
        data = (res.data || []).filter(
          p => p.stage === 'Archived' || p._displayStatus === 'Archived' || p._displayStatus === 'archived'
        );
      } catch {
        data = [];
      }
      // If the endpoint doesn’t support archived=true, fall back
      if (data.length === 0) {
        try {
          const res2 = await api.get('/problems/my');
          data = (res2.data || []).filter(
            p => p.stage === 'Archived' || p._displayStatus === 'Archived' || p._displayStatus === 'archived'
          );
        } catch { data = []; }
      }
      // Final fallback: global stage filter
      if (data.length === 0) {
        try {
          const res3 = await api.get('/problems?stage=Archived');
          data = res3.data || [];
        } catch { data = []; }
      }
      setProblems(data);
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

  const confirmProblem = confirmId ? problems.find(p => p.id === confirmId) : null;

  const cardCls = 'bg-white/70 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl';
  const inputCls = 'w-full px-4 py-2.5 text-base bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition';

  if (loading) {
    return (
      <Layout>
        <div className="h-64 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#2774AE] border-t-transparent" />
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
          <Archive size={22} className="text-[#2774AE] dark:text-[#FFD100]" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Archive</h1>
            <p className="text-base text-gray-400 dark:text-gray-500 mt-0.5">
              {problems.length} archived problem{problems.length !== 1 ? 's' : ''} — restore any to move it back to Idea
            </p>
          </div>
        </div>

        {message && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-base font-medium ${
            message.includes('Failed')
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
          }`}>
            {message}
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
                        <span className="text-[#2774AE] dark:text-[#FFD100] font-semibold text-base">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#2774AE]/10 text-[#2774AE] dark:bg-[#2774AE]/20 dark:text-[#8BB8E8] hover:bg-[#2774AE] hover:text-white transition-all disabled:opacity-50"
                      >
                        <ArchiveRestore size={14} />
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
              <span className="font-mono font-semibold text-[#2774AE] dark:text-[#FFD100]">{confirmId}</span>{' '}
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
                className="px-4 py-2 text-base rounded-xl bg-[#2774AE] hover:bg-[#005587] text-white font-semibold transition">
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
