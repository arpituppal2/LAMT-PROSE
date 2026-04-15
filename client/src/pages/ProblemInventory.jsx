import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { X, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

/* ── Stage colours ────────────────────────────────────────────── */
const stageCls = (s) => ({
  'Endorsed':     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Needs Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Idea':         'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
}[s] || 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400');

/* ── Inline Preview Modal ─────────────────────────────────────── */
function PreviewModal({ problem, onClose }) {
  const navigate = useNavigate();
  const stage = problem._displayStatus || problem.stage || 'Idea';
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#111827] w-full sm:max-w-2xl max-h-[90dvh] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">#{problem.id}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageCls(stage)}`}>{stage}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Problem content */}
          <div className="bg-gray-50 dark:bg-white/4 rounded-xl p-4">
            <KatexRenderer latex={problem.latex} />
            {(problem.images || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {problem.images.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-white/10" loading="lazy" />
                ))}
              </div>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap gap-3 text-xs">
            {(problem.topics || []).map(t => (
              <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full font-medium">{t}</span>
            ))}
            {problem.quality && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 rounded-full font-medium">{parseInt(problem.quality)}/10</span>
            )}
            {problem.author && (
              <span className="text-gray-400">{problem.author.firstName} {problem.author.lastName}</span>
            )}
            <span className="text-gray-400">{new Date(problem.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Custom tags */}
          {(problem.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-medium">{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/8 flex gap-2 flex-shrink-0">
          <button
            onClick={() => navigate(`/problems/${problem.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2774AE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a5f8e] transition-colors"
          >
            <ExternalLink size={13} /> Open Full Detail
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function ProblemInventory() {
  const [problems, setProblems]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);   // null = All
  const [previewProblem, setPreviewProblem] = useState(null);

  useEffect(() => {
    api.get('/problems')
      .then(r => setProblems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total      = problems.length;
    const endorsed   = problems.filter(p => p._displayStatus === 'Endorsed' || p.stage === 'Endorsed').length;
    const needsReview = problems.filter(p => p._displayStatus === 'Needs Review' || p.stage === 'Needs Review').length;
    const ideas      = problems.filter(p => p._displayStatus === 'Idea' || p.stage === 'Idea').length;
    return { total, endorsed, needsReview, ideas };
  }, [problems]);

  /* ── Filtered rows ── */
  const filtered = useMemo(() => {
    if (!statusFilter) return problems;
    return problems.filter(p => {
      const s = p._displayStatus || p.stage || 'Idea';
      if (statusFilter === 'Endorsed')     return s === 'Endorsed';
      if (statusFilter === 'Needs Review') return s === 'Needs Review';
      if (statusFilter === 'Ideas')        return s === 'Idea';
      return true;
    });
  }, [problems, statusFilter]);

  /* ── Chart data: group by month ── */
  const chartData = useMemo(() => {
    if (!problems.length) return [];
    const map = {};
    problems.forEach(p => {
      const d = new Date(p.createdAt);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { date: key, ideas: 0, needsReview: 0, endorsed: 0, _ts: d.getTime() };
      const s = p._displayStatus || p.stage || 'Idea';
      if (s === 'Endorsed')          map[key].endorsed++;
      else if (s === 'Needs Review') map[key].needsReview++;
      else                           map[key].ideas++;
    });
    return Object.values(map).sort((a, b) => a._ts - b._ts);
  }, [problems]);

  const statCards = [
    { label: 'Total',        value: stats.total,       filterKey: null },
    { label: 'Endorsed',     value: stats.endorsed,    filterKey: 'Endorsed' },
    { label: 'Needs Review', value: stats.needsReview, filterKey: 'Needs Review' },
    { label: 'Ideas',        value: stats.ideas,       filterKey: 'Ideas' },
  ];

  return (
    <Layout>
      <div className="w-full px-[5%]">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">Problem Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">All problems in the bank</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {statCards.map(card => {
                const active = statusFilter === card.filterKey;
                return (
                  <button
                    key={card.label}
                    onClick={() => setStatusFilter(active ? null : card.filterKey)}
                    className={`text-left rounded-xl p-4 border transition-all ${
                      active
                        ? 'bg-[#2774AE]/8 dark:bg-[#FFD100]/8 border-[#2774AE] dark:border-[#FFD100] ring-1 ring-[#2774AE]/20 dark:ring-[#FFD100]/20'
                        : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/8 hover:border-[#2774AE]/30 hover:shadow-sm'
                    }`}
                  >
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{card.value}</p>
                  </button>
                );
              })}
            </div>

            {/* ── Stacked Area Chart ── */}
            {chartData.length > 0 && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5 mb-6">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Problems Over Time</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-white/5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="ideas"       stackId="1" stroke="#3b82f6" fill="#3b82f620" name="Ideas" />
                    <Area type="monotone" dataKey="needsReview" stackId="1" stroke="#f59e0b" fill="#f59e0b20" name="Needs Review" />
                    <Area type="monotone" dataKey="endorsed"    stackId="1" stroke="#22c55e" fill="#22c55e20" name="Endorsed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Problems Table ── */}
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/8">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Problem</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Topic</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Tags</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Diff</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Author</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No problems found.</td>
                    </tr>
                  ) : filtered.map(p => {
                    const stage = p._displayStatus || p.stage || 'Idea';
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setPreviewProblem(p)}
                        className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 max-w-xs">
                          <div className="text-xs font-mono text-gray-400 mb-0.5">#{p.id}</div>
                          <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                            <KatexRenderer latex={p.latex} />
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(p.topics || []).map(t => (
                              <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(p.tags || []).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs rounded-full font-medium">{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm tabular-nums font-semibold text-[#2774AE] dark:text-[#FFD100]">
                            {p.quality ? `${parseInt(p.quality)}/10` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600 dark:text-gray-400">
                          {p.author ? `${p.author.firstName} ${p.author.lastName}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageCls(stage)}`}>
                            {stage}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {previewProblem && (
        <PreviewModal problem={previewProblem} onClose={() => setPreviewProblem(null)} />
      )}
    </Layout>
  );
}
