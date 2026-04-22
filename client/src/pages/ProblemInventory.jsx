import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import api from '../utils/api';
import { getProblemStatus, STATUS_BADGE_CLASS } from '../utils/problemStatus';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

/* ── Shimmer skeleton ──────────────────────────────────────── */
const shimmerBase = [
  'bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface-2)] to-[var(--color-surface)]',
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map((i) => (
          <div key={i} className="surface-card p-4 space-y-2">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="surface-card p-6">
        <SkeletonBox className="h-3 w-32 mb-4" />
        <SkeletonBox className="h-36 w-full" />
      </div>
      <div className="surface-card overflow-hidden">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="flex gap-4 px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex-1 space-y-2">
              <SkeletonBox className="h-3 w-24" />
              <SkeletonBox className="h-3 w-64" />
            </div>
            <SkeletonBox className="h-5 w-16 self-center" />
          </div>
        ))}
      </div>
    </div>
  </Layout>
);

/* ── Preview modal ─────────────────────────────────────────── */
const PreviewPanel = ({ problem, fullProblem, onClose, onNavigate }) => {
  const [showSol, setShowSol] = useState(false);
  const data = fullProblem || problem;
  if (!data) return null;

  const comments = data.feedbacks || [];
  const status = data._displayStatus || getProblemStatus(data, data.feedbacks);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="mx-auto max-w-2xl w-full surface-card shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sticky top-0 bg-[var(--color-bg)] z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{data.id}</span>
            <span className={`inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold border ${STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.Idea}`}>
              {status}
            </span>
            {data.quality && (
              <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{data.quality}/10</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div>
            <p className="section-label">Problem statement</p>
            <div className="mt-2 text-[15px] leading-7">
              <KatexRenderer latex={data.latex || ''} />
            </div>
          </div>

          {data.answer && (
            <div className="flex items-center gap-3">
              <span className="section-label shrink-0">Answer</span>
              <span className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-sm font-semibold">
                <KatexRenderer latex={data.answer} />
              </span>
            </div>
          )}

          {data.solution && (
            <div className="rounded-sm border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={() => setShowSol((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <span className="text-sm font-semibold text-[var(--color-accent)]">
                  {showSol ? 'Hide' : 'Show'} solution
                </span>
                {showSol ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showSol && (
                <div className="border-t border-[var(--color-border)] px-4 py-4 text-[15px] leading-7">
                  <KatexRenderer latex={data.solution} />
                </div>
              )}
            </div>
          )}

          {data.notes && (
            <div className="rounded-sm border border-[var(--color-border)] bg-[var(--badge-idea-bg)] px-4 py-4">
              <p className="section-label">Author notes</p>
              <div className="mt-2 text-sm leading-6">
                <KatexRenderer latex={data.notes} />
              </div>
            </div>
          )}

          {comments.length > 0 && (
            <div>
              <p className="section-label">Reviews ({comments.length})</p>
              <div className="mt-3 divide-y divide-[var(--color-border)] rounded-sm border border-[var(--color-border)] overflow-hidden">
                {comments.map((fb, idx) => (
                  <div key={fb.id || idx} className="px-4 py-3 bg-[var(--color-bg)]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold">{fb.user?.firstName} {fb.user?.lastName}</span>
                      {fb.isEndorsement
                        ? <span className="text-[10px] font-semibold text-[var(--badge-endorsed-text)]">✓ Endorsed</span>
                        : fb.resolved
                          ? <span className="text-[10px] font-semibold text-[var(--color-accent)]">Resolved</span>
                          : <span className="rounded-sm bg-[var(--badge-needs-review-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--badge-needs-review-text)]">Needs Review</span>}
                      <span className="ml-auto text-[10px] tabular-nums text-[var(--color-text-muted)]">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {fb.answer && (
                      <div className="mb-1 text-xs text-[var(--color-text-muted)]">
                        <span className="font-semibold">Ans: </span>
                        <KatexRenderer latex={fb.answer} />
                      </div>
                    )}
                    {(fb.comment || fb.feedback) && (
                      <p className="text-xs leading-5 text-[var(--color-text-muted)]">{fb.comment || fb.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1 border-t border-[var(--color-border)]">
            <button
              onClick={() => { onClose(); onNavigate(data.id); }}
              className="btn-filled text-sm py-2 px-4 mt-2"
            >
              Open full page
            </button>
            <button
              onClick={onClose}
              className="mt-2 px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Status count cards ────────────────────────────────────── */
const StatusCard = ({ label, count, color }) => (
  <div className="surface-card px-4 py-4">
    <p className="section-label">{label}</p>
    <p className={`mt-2 text-2xl font-bold tabular-nums ${color}`}>{count}</p>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   PROBLEM INVENTORY
══════════════════════════════════════════════════════════════ */
const ProblemInventory = () => {
  const navigate = useNavigate();

  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark')),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [problems, setProblems]                 = useState([]);
  const [search, setSearch]                     = useState('');
  const [stageFilter, setStageFilter]           = useState('all');
  const [topicFilter, setTopicFilter]           = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy]                     = useState('newest');
  const [loading, setLoading]                   = useState(true);
  const [previewProblem, setPreviewProblem]     = useState(null);
  const [previewFull, setPreviewFull]           = useState(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!previewProblem) { setPreviewFull(null); return; }
    api.get(`/problems/${previewProblem.id}`)
      .then((res) => setPreviewFull(res.data))
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

  /* ── Compute status counts ── */
  const statusCounts = useMemo(() => {
    const counts = { Idea: 0, 'Needs Review': 0, Resolved: 0, Endorsed: 0 };
    problems.forEach((p) => {
      const s = p._displayStatus || getProblemStatus(p, p.feedbacks);
      if (counts[s] !== undefined) counts[s]++;
      else counts.Idea++;
    });
    return counts;
  }, [problems]);

  const { filtered, chartData } = useMemo(() => {
    let res = problems.filter((p) => {
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
      if (sortBy === 'newest')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest')  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'diff')    return (b.quality || 0) - (a.quality || 0);
      if (sortBy === 'easiest') return (a.quality || 0) - (b.quality || 0);
      return 0;
    });

    const dailyData = {};
    [...problems]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((p) => {
        const date = new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!dailyData[date]) dailyData[date] = { date, Idea: 0, 'Needs Review': 0, Resolved: 0, Endorsed: 0 };
        const s = p._displayStatus || getProblemStatus(p, p.feedbacks);
        if      (s === 'Endorsed')     dailyData[date].Endorsed++;
        else if (s === 'Resolved')     dailyData[date].Resolved++;
        else if (s === 'Needs Review') dailyData[date]['Needs Review']++;
        else                           dailyData[date].Idea++;
      });

    let totals = { Idea: 0, 'Needs Review': 0, Resolved: 0, Endorsed: 0 };
    const cumulativeGrowth = Object.values(dailyData).map((day) => {
      totals.Idea            += day.Idea;
      totals['Needs Review'] += day['Needs Review'];
      totals.Resolved        += day.Resolved;
      totals.Endorsed        += day.Endorsed;
      return { date: day.date, ...totals };
    });

    return { filtered: res, chartData: cumulativeGrowth };
  }, [problems, search, stageFilter, topicFilter, difficultyFilter, sortBy]);

  const cc = {
    grid:    dark ? 'rgba(255,255,255,0.06)' : 'rgba(139,184,232,0.35)',
    axis:    dark ? '#64748b' : '#005587',
    tooltip: {
      bg:     dark ? '#0a0a0a' : '#fff',
      border: dark ? 'rgba(255,255,255,0.10)' : 'rgba(39,116,174,0.18)',
      text:   dark ? '#DAEBFE' : '#003B5C',
    },
  };

  if (loading) return <InventorySkeleton />;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Page header ── */}
        <header>
          <span className="gold-rule mb-3" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Problem Inventory
          </h1>
        </header>

        {/* ── Status counts (replaces massive counter) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusCard label="Idea"         count={statusCounts.Idea}            color="text-[var(--badge-idea-text)]" />
          <StatusCard label="Needs Review" count={statusCounts['Needs Review']} color="text-[var(--badge-needs-review-text)]" />
          <StatusCard label="Resolved"     count={statusCounts.Resolved}        color="text-[var(--badge-resolved-text)]" />
          <StatusCard label="Endorsed"     count={statusCounts.Endorsed}        color="text-[var(--badge-endorsed-text)]" />
        </div>

        {/* ── Growth chart ── */}
        <div className="surface-card px-6 py-6">
          <p className="section-label mb-4">Growth over time</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%" key={String(dark)}>
              <AreaChart data={chartData} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cc.grid} />
                <XAxis dataKey="date" stroke={cc.axis} fontSize={11} tickLine={false} axisLine={false} dy={6} />
                <YAxis stroke={cc.axis} fontSize={11} tickLine={false} axisLine={false}
                  label={{ value: 'Problems', angle: -90, position: 'insideLeft', offset: -2, style: { fontSize: 10, fill: cc.axis } }}
                />
                <Tooltip contentStyle={{ backgroundColor: cc.tooltip.bg, border: `1px solid ${cc.tooltip.border}`, borderRadius: '2px', fontSize: '12px', color: cc.tooltip.text }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 12, fontSize: 11, color: cc.axis }} />
                <Area type="monotone" dataKey="Idea"         stackId="s" stroke="#003B5C" fill="#8BB8E8" fillOpacity={0.4}  dot={false} strokeWidth={1.5} />
                <Area type="monotone" dataKey="Needs Review" stackId="s" stroke="#C08400" fill="#FFB81C" fillOpacity={0.45} dot={false} strokeWidth={1.8} />
                <Area type="monotone" dataKey="Resolved"     stackId="s" stroke="#2774AE" fill="#2774AE" fillOpacity={0.38} dot={false} strokeWidth={1.8} />
                <Area type="monotone" dataKey="Endorsed"     stackId="s" stroke="#15803D" fill="#22C55E" fillOpacity={0.35} dot={false} strokeWidth={1.8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-3 surface-card p-4">
          <label className="relative flex-1 min-w-[220px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            <input
              type="text"
              placeholder="Search by ID or content"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base w-full pl-8"
            />
          </label>
          {[
            { val: sortBy,           fn: setSortBy,           opts: [['newest','Newest'],['oldest','Oldest'],['diff','Hardest first'],['easiest','Easiest first']] },
            { val: stageFilter,      fn: setStageFilter,      opts: [['all','All stages'],['Idea','Idea'],['Needs Review','Needs Review'],['Resolved','Resolved'],['Endorsed','Endorsed']] },
            { val: topicFilter,      fn: setTopicFilter,      opts: [['all','All topics'],['Algebra','Algebra'],['Geometry','Geometry'],['Combinatorics','Combinatorics'],['Number Theory','Number Theory']] },
            { val: difficultyFilter, fn: setDifficultyFilter, opts: [['all','All difficulties'], ...Array.from({ length: 10 }, (_, i) => [(i+1).toString(), `${i+1}/10`])] },
          ].map((sel, i) => (
            <select
              key={i}
              value={sel.val}
              onChange={(e) => sel.fn(e.target.value)}
              className="input-base px-3 py-2.5 text-sm cursor-pointer"
            >
              {sel.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>

        {/* ── Table: Problem / Topics / Stage / Difficulty ── */}
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="px-5 py-3.5 section-label w-[40%]">Problem</th>
                  <th className="px-5 py-3.5 section-label w-[25%]">Topics</th>
                  <th className="px-5 py-3.5 section-label w-[20%]">Stage</th>
                  <th className="px-5 py-3.5 section-label text-right w-[15%]">Difficulty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center text-sm text-[var(--color-text-muted)]">
                      No matching problems.
                    </td>
                  </tr>
                ) : (
                  filtered.map((problem) => {
                    const s = problem._displayStatus || getProblemStatus(problem, problem.feedbacks);
                    return (
                      <tr
                        key={problem.id}
                        onClick={() => setPreviewProblem(problem)}
                        className="cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                      >
                        <td className="px-5 py-4 max-w-0">
                          <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{problem.id}</span>
                          <p className="text-sm text-[var(--color-text-muted)] truncate mt-0.5">
                            {problem.latex}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(problem.topics || []).map((t) => (
                              <span key={t} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold border ${STATUS_BADGE_CLASS[s] || STATUS_BADGE_CLASS.Idea}`}>
                            {s}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums">
                          {problem.quality ? `${parseInt(problem.quality, 10)}/10` : '—'}
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
          onNavigate={(id) => navigate(`/problem/${id}`)}
        />
      )}
    </Layout>
  );
};

export default ProblemInventory;
