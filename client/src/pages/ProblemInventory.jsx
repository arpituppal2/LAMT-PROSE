import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CheckCircle2, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import api from '../utils/api';
import { getProblemStatus, STATUS_BADGE_CLASS } from '../utils/problemStatus';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

/* ── Shared input style ─────────────────────────────────────────────── */
const inputCls =
  'w-full px-3 py-2.5 text-sm bg-white dark:bg-[#020c16] border border-slate-200 dark:border-white/10 rounded-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-[#2774AE] dark:focus:border-[#FFD100]';

/* ── Shimmer skeleton ───────────────────────────────────────────────── */
const shimmerBase = [
  'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100',
  'dark:from-white/5 dark:via-white/[0.08] dark:to-white/5',
  'bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]',
  'rounded-sm',
].join(' ');

const SkeletonBox = ({ className = '' }) => (
  <div className={`${shimmerBase} ${className}`} />
);

const InventorySkeleton = () => (
  <Layout>
    <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-[#03111d] border border-slate-200 dark:border-white/10 rounded-sm p-6 space-y-3">
          <SkeletonBox className="h-3 w-24" />
          <SkeletonBox className="h-12 w-16" />
        </div>
        <div className="lg:col-span-3 bg-white dark:bg-[#03111d] border border-slate-200 dark:border-white/10 rounded-sm p-6">
          <SkeletonBox className="h-3 w-32 mb-4" />
          <SkeletonBox className="h-36 w-full" />
        </div>
      </div>
      <div className="flex gap-3 p-4 bg-white dark:bg-[#03111d] border border-slate-200 dark:border-white/10 rounded-sm">
        <SkeletonBox className="h-9 flex-1 min-w-[220px]" />
        {[1,2,3,4].map(i => <SkeletonBox key={i} className="h-9 w-32" />)}
      </div>
      <div className="bg-white dark:bg-[#03111d] border border-slate-200 dark:border-white/10 rounded-sm overflow-hidden">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex gap-4 px-5 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex-1 space-y-2">
              <SkeletonBox className="h-3 w-24" />
              <SkeletonBox className="h-3 w-64" />
            </div>
            <SkeletonBox className="h-3 w-40 self-center" />
            <SkeletonBox className="h-5 w-16 self-center" />
          </div>
        ))}
      </div>
    </div>
  </Layout>
);

/* ── Preview modal ──────────────────────────────────────────────────── */
const PreviewPanel = ({ problem, fullProblem, onClose, onNavigate }) => {
  const [showSol, setShowSol] = useState(false);
  const data = fullProblem || problem;
  if (!data) return null;

  const comments = data.feedbacks || [];
  const status = data._displayStatus || getProblemStatus(data, data.feedbacks);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#03111d] rounded-sm shadow-2xl border border-slate-200 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{data.id}</span>
            <span className={STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.Idea}>{status}</span>
            {data.quality && (
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {data.quality}/10
              </span>
            )}
            {(data.topics || []).map(t => (
              <span key={t} className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {t}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-sm p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Problem statement */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">
              Problem statement
            </p>
            <div className="text-[15px] leading-7 text-slate-900 dark:text-slate-100 prose-math">
              <KatexRenderer latex={data.latex || ''} />
            </div>
          </div>

          {/* Answer */}
          {data.answer && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 shrink-0">
                Answer
              </span>
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm font-semibold text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                <KatexRenderer latex={data.answer} />
              </span>
            </div>
          )}

          {/* Solution accordion */}
          {data.solution && (
            <div className="rounded-sm border border-slate-200 dark:border-white/10 overflow-hidden">
              <button
                onClick={() => setShowSol(s => !s)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-[#020c16] dark:hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                  <CheckCircle2 size={13} />
                  {showSol ? 'Hide' : 'Show'} solution
                </span>
                {showSol ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>
              {showSol && (
                <div className="border-t border-slate-200 px-4 py-4 dark:border-white/10 prose-math text-[15px] leading-7 text-slate-800 dark:text-slate-200">
                  <KatexRenderer latex={data.solution} />
                </div>
              )}
            </div>
          )}

          {/* Author notes */}
          {data.notes && (
            <div className="rounded-sm border border-slate-200 bg-amber-50/40 px-4 py-4 dark:border-white/10 dark:bg-amber-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">
                Author notes
              </p>
              <div className="text-sm leading-6 text-slate-700 dark:text-slate-300 prose-math">
                <KatexRenderer latex={data.notes} />
              </div>
            </div>
          )}

          {/* Comments */}
          {comments.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-3">
                Reviews ({comments.length})
              </p>
              <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                {comments.map((fb, idx) => (
                  <div key={fb.id || idx} className="px-4 py-3 bg-white dark:bg-[#020c16]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {fb.user?.firstName} {fb.user?.lastName}
                      </span>
                      {fb.isEndorsement ? (
                        <span className="text-[10px] font-semibold text-green-700 dark:text-green-400">✓ Endorsed</span>
                      ) : fb.resolved ? (
                        <span className="text-[10px] font-semibold text-[#2774AE] dark:text-[#FFD100]">Resolved</span>
                      ) : (
                        <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          Needs Review
                        </span>
                      )}
                      <span className="ml-auto text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {fb.answer && (
                      <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Ans: </span>
                        <KatexRenderer latex={fb.answer} />
                      </div>
                    )}
                    {(fb.comment || fb.feedback) && (
                      <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                        {fb.comment || fb.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => { onClose(); onNavigate(data.id); }}
              className="mt-4 inline-flex items-center gap-2 rounded-sm bg-[#2774AE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f6395] dark:bg-[#FFD100] dark:text-[#001628] dark:hover:bg-[#f5c800] transition-colors"
            >
              Open full page
            </button>
            <button
              onClick={onClose}
              className="mt-4 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main component ─────────────────────────────────────────────────── */
const ProblemInventory = () => {
  const navigate = useNavigate();

  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark')),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [problems, setProblems]                   = useState([]);
  const [search, setSearch]                       = useState('');
  const [stageFilter, setStageFilter]             = useState('all');
  const [topicFilter, setTopicFilter]             = useState('all');
  const [difficultyFilter, setDifficultyFilter]   = useState('all');
  const [sortBy, setSortBy]                       = useState('newest');
  const [loading, setLoading]                     = useState(true);
  const [previewProblem, setPreviewProblem]       = useState(null);
  const [previewFull, setPreviewFull]             = useState(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!previewProblem) { setPreviewFull(null); return; }
    api.get(`/problems/${previewProblem.id}`)
      .then(res => setPreviewFull(res.data))
      .catch(() => setPreviewFull(previewProblem));
  }, [previewProblem]);

  const fetchData = async () => {
    try {
      const res = await api.get('/problems');
      setProblems(res.data);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const { filtered, chartData } = useMemo(() => {
    let res = problems.filter(p => {
      const matchesSearch =
        search === '' ||
        (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.latex || '').toLowerCase().includes(search.toLowerCase());
      const disp = p._displayStatus || getProblemStatus(p, p.feedbacks);
      const matchesStage      = stageFilter === 'all' || disp === stageFilter;
      const matchesTopic      = topicFilter === 'all' || (p.topics || []).includes(topicFilter);
      const matchesDifficulty = difficultyFilter === 'all' || parseInt(p.quality) === parseInt(difficultyFilter);
      return matchesSearch && matchesStage && matchesTopic && matchesDifficulty;
    });

    res.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'diff')   return (b.quality || 0) - (a.quality || 0);
      return 0;
    });

    const dailyData = {};
    [...problems]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach(p => {
        const date = new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!dailyData[date]) dailyData[date] = { date, Idea: 0, 'Needs Review': 0, Resolved: 0, Endorsed: 0 };
        const s = p._displayStatus || getProblemStatus(p, p.feedbacks);
        if      (s === 'Endorsed')     dailyData[date].Endorsed++;
        else if (s === 'Resolved')     dailyData[date].Resolved++;
        else if (s === 'Needs Review') dailyData[date]['Needs Review']++;
        else                           dailyData[date].Idea++;
      });

    let totals = { Idea: 0, 'Needs Review': 0, Resolved: 0, Endorsed: 0 };
    const cumulativeGrowth = Object.values(dailyData).map(day => {
      totals.Idea             += day.Idea;
      totals['Needs Review']  += day['Needs Review'];
      totals.Resolved         += day.Resolved;
      totals.Endorsed         += day.Endorsed;
      return { date: day.date, ...totals };
    });

    return { filtered: res, chartData: cumulativeGrowth };
  }, [problems, search, stageFilter, topicFilter, difficultyFilter, sortBy]);

  const cc = {
    grid:    dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
    axis:    dark ? '#64748b' : '#94a3b8',
    tooltip: {
      bg:     dark ? '#03111d' : '#fff',
      border: dark ? 'rgba(255,255,255,0.10)' : '#e2e8f0',
      text:   dark ? '#cbd5e1' : '#0f172a',
    },
  };

  if (loading) return <InventorySkeleton />;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Stats + chart ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="rounded-sm border border-slate-200 bg-white px-6 py-6 dark:border-white/10 dark:bg-[#03111d]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Total problems
            </p>
            <p className="mt-3 text-5xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {problems.length}
            </p>
          </div>

          <div className="lg:col-span-3 rounded-sm border border-slate-200 bg-white px-6 py-6 dark:border-white/10 dark:bg-[#03111d]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-4">
              Growth over time
            </p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%" key={String(dark)}>
                <AreaChart data={chartData} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cc.grid} />
                  <XAxis dataKey="date" stroke={cc.axis} fontSize={11} tickLine={false} axisLine={false} dy={6} />
                  <YAxis stroke={cc.axis} fontSize={11} tickLine={false} axisLine={false}
                    label={{ value: 'Problems', angle: -90, position: 'insideLeft', offset: -2, style: { fontSize: 10, fill: cc.axis } }}
                  />
                  <Tooltip contentStyle={{ backgroundColor: cc.tooltip.bg, border: `1px solid ${cc.tooltip.border}`, borderRadius: '4px', fontSize: '12px', color: cc.tooltip.text }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 12, fontSize: 11, color: cc.axis }} />
                  <Area type="monotone" dataKey="Idea"         stackId="s" stroke="#003B5C" fill="#8BB8E8" fillOpacity={0.4}  dot={false} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Needs Review" stackId="s" stroke="#C08400" fill="#FFB81C" fillOpacity={0.45} dot={false} strokeWidth={1.8} />
                  <Area type="monotone" dataKey="Resolved"     stackId="s" stroke="#2563EB" fill="#2774AE" fillOpacity={0.38} dot={false} strokeWidth={1.8} />
                  <Area type="monotone" dataKey="Endorsed"     stackId="s" stroke="#15803D" fill="#22C55E" fillOpacity={0.35} dot={false} strokeWidth={1.8} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#03111d]">
          <label className="relative flex-1 min-w-[220px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID or content"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${inputCls} pl-8`}
            />
          </label>
          {[
            { val: sortBy,           fn: setSortBy,           opts: [['newest','Newest'],['oldest','Oldest'],['diff','Hardest first']] },
            { val: stageFilter,      fn: setStageFilter,      opts: [['all','All stages'],['Idea','Idea'],['Needs Review','Needs Review'],['Resolved','Resolved'],['Endorsed','Endorsed']] },
            { val: topicFilter,      fn: setTopicFilter,      opts: [['all','All topics'],['Algebra','Algebra'],['Geometry','Geometry'],['Combinatorics','Combinatorics'],['Number Theory','Number Theory']] },
            { val: difficultyFilter, fn: setDifficultyFilter, opts: [['all','All difficulties'], ...Array.from({ length: 10 }, (_, i) => [(i+1).toString(), `${i+1}/10`])] },
          ].map((sel, i) => (
            <select
              key={i}
              value={sel.val}
              onChange={e => sel.fn(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white dark:bg-[#020c16] border border-slate-200 dark:border-white/10 rounded-sm text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#2774AE] dark:focus:border-[#FFD100] cursor-pointer"
            >
              {sel.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>

        {/* ── Table ──────────────────────────────────────────────────── */}
        <div className="rounded-sm border border-slate-200 bg-white dark:border-white/10 dark:bg-[#03111d] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#020c16]">
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 w-[45%]">Problem</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 w-[35%]">Latest review</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 text-right w-[20%]">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-14 text-center text-sm text-slate-400 dark:text-slate-500">
                      No matching problems.
                    </td>
                  </tr>
                ) : (
                  filtered.map(problem => {
                    const s = problem._displayStatus || getProblemStatus(problem, problem.feedbacks);
                    return (
                      <tr
                        key={problem.id}
                        onClick={() => setPreviewProblem(problem)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-5 py-4 max-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                              {problem.id}
                            </span>
                            {problem.quality && (
                              <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                                · {problem.quality}/10
                              </span>
                            )}
                            {(problem.topics || []).map(t => (
                              <span key={t} className="rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                                {t}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {problem.latex}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {problem.feedbacks?.length > 0 ? (
                            <div>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {problem.feedbacks[0].user?.firstName} {problem.feedbacks[0].user?.lastName}
                              </p>
                              <p className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                                {new Date(problem.feedbacks[0].createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">No reviews yet</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={STATUS_BADGE_CLASS[s] || STATUS_BADGE_CLASS.Idea}>{s}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {previewProblem && (
        <PreviewPanel
          problem={previewProblem}
          fullProblem={previewFull}
          onClose={() => { setPreviewProblem(null); setPreviewFull(null); }}
          onNavigate={id => navigate(`/problem/${id}`)}
        />
      )}
    </Layout>
  );
};

export default ProblemInventory;
