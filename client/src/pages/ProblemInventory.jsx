import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Search, MessageSquare } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

/* ── Shimmer skeleton ─────────────────────────────────────────── */
const shimmerBase = [
  'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100',
  'dark:from-white/5 dark:via-white/10 dark:to-white/5',
  'bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]',
  'rounded',
].join(' ');

const SkeletonBox = ({ className = '' }) => (
  <div className={`${shimmerBase} ${className}`} />
);

const InventorySkeleton = () => (
  <Layout>
    <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    <div className="max-w-7xl mx-auto">
      {/* Stat + chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg p-6 space-y-3">
          <SkeletonBox className="h-3 w-24" />
          <SkeletonBox className="h-12 w-16" />
          <SkeletonBox className="h-3 w-28" />
        </div>
        <div className="lg:col-span-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg p-6">
          <SkeletonBox className="h-3 w-32 mb-4" />
          <SkeletonBox className="h-36 w-full" />
        </div>
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-3 p-4 mb-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg">
        <SkeletonBox className="h-9 flex-1 min-w-[220px]" />
        {[1,2,3,4].map(i => <SkeletonBox key={i} className="h-9 w-32" />)}
      </div>
      {/* Table rows skeleton */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex gap-4 px-5 py-4 border-b border-gray-50 dark:border-white/5">
            <div className="flex-1 space-y-2">
              <SkeletonBox className="h-3 w-24" />
              <SkeletonBox className="h-3 w-64" />
            </div>
            <SkeletonBox className="h-3 w-40 self-center" />
            <SkeletonBox className="h-5 w-16 self-center rounded" />
          </div>
        ))}
      </div>
    </div>
  </Layout>
);

const ProblemInventory = () => {
  const navigate = useNavigate();

  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

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
      const matchesSearch = search === '' ||
        (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.latex || '').toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === 'all' || (p.stage || '').toLowerCase() === stageFilter.toLowerCase();
      const matchesTopic = topicFilter === 'all' || (p.topics || []).includes(topicFilter);
      const matchesDifficulty = difficultyFilter === 'all' || parseInt(p.quality) === parseInt(difficultyFilter);
      return matchesSearch && matchesStage && matchesTopic && matchesDifficulty;
    });

    res.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'diff') return (b.quality || 0) - (a.quality || 0);
      return 0;
    });

    const dailyData = {};
    [...problems]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach(p => {
        const date = new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!dailyData[date]) dailyData[date] = { date, Idea: 0, Review: 0, Endorsed: 0 };
        if (p.stage === 'Idea') dailyData[date].Idea++;
        else if (p.stage === 'Review') dailyData[date].Review++;
        else if (p.stage === 'Endorsed' || p.stage === 'Published') dailyData[date].Endorsed++;
      });

    let totals = { Idea: 0, Review: 0, Endorsed: 0 };
    const cumulativeGrowth = Object.values(dailyData).map(day => {
      totals.Idea += day.Idea;
      totals.Review += day.Review;
      totals.Endorsed += day.Endorsed;
      return { date: day.date, ...totals };
    });

    return { filtered: res, chartData: cumulativeGrowth };
  }, [problems, search, stageFilter, topicFilter, difficultyFilter, sortBy]);

  const chartColor = {
    grid: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb',
    axis: dark ? '#4b5563' : '#9ca3af',
    tooltip: { bg: dark ? '#111827' : '#fff', border: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', text: dark ? '#d1d5db' : '#111827' },
  };

  if (loading) return <InventorySkeleton />;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* Header row: count + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total problems</p>
            <p className="text-5xl font-semibold text-gray-900 dark:text-white tabular-nums">{problems.length}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">of 200 planned</p>
          </div>

          <div className="lg:col-span-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Growth over time</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%" key={String(dark)}>
                <LineChart data={chartData} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColor.grid} />
                  <XAxis dataKey="date" stroke={chartColor.axis} fontSize={11} tickLine={false} axisLine={false} dy={6} />
                  <YAxis
                    stroke={chartColor.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: 'Number of Problems',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -2,
                      style: { fontSize: 10, fill: chartColor.axis },
                    }}
                  />
                  <Tooltip contentStyle={{
                    backgroundColor: chartColor.tooltip.bg,
                    border: `1px solid ${chartColor.tooltip.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: chartColor.tooltip.text,
                  }} />
                  <Legend verticalAlign="top" align="right" iconType="circle"
                    wrapperStyle={{ paddingBottom: 12, fontSize: 11, color: chartColor.axis }} />
                  <Line type="monotone" dataKey="Idea" stroke={chartColor.axis} strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Review" stroke="#2774AE" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Endorsed" stroke="#FFD100" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 p-4 mb-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID or content"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition"
            />
          </div>
          {[
            { val: sortBy,           fn: setSortBy,           opts: [['newest','Newest'],['oldest','Oldest'],['diff','Hardest first']] },
            { val: stageFilter,      fn: setStageFilter,      opts: [['all','All stages'],['Idea','Idea'],['Review','Review'],['Endorsed','Endorsed']] },
            { val: topicFilter,      fn: setTopicFilter,      opts: [['all','All topics'],['Algebra','Algebra'],['Geometry','Geometry'],['Combinatorics','Combinatorics'],['Number Theory','Number Theory']] },
            { val: difficultyFilter, fn: setDifficultyFilter, opts: [['all','All difficulties'],...Array.from({length:10},(_,i)=>[(i+1).toString(),`${i+1}/10`])] },
          ].map((sel, i) => (
            <select
              key={i}
              value={sel.val}
              onChange={e => sel.fn(e.target.value)}
              className="px-3 py-2 text-sm appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 cursor-pointer transition"
            >
              {sel.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/8">
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Problem</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Latest review</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center text-sm text-gray-400 dark:text-gray-500">No matching problems.</td>
                </tr>
              ) : filtered.map(problem => (
                <tr key={problem.id} onClick={() => navigate(`/problem/${problem.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                      {problem.quality && (
                        <span className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">{problem.quality}/10</span>
                      )}
                      <div className="flex gap-1.5">
                        {(problem.topics || []).map(t => (
                          <span key={t} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    {/* LaTeX preview — truncated to avoid long renders */}
                    <div className="text-sm text-gray-400 dark:text-gray-500 max-w-md overflow-hidden" style={{ maxHeight: '2.5em' }}>
                      <KatexRenderer latex={(problem.latex || '').slice(0, 150)} />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2 max-w-xs">
                      <MessageSquare size={13} className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-400 dark:text-gray-500 line-clamp-2 italic">
                        {problem.feedbacks?.length > 0
                          ? problem.feedbacks[0].feedback || '(no comment)'
                          : 'No reviews yet.'}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`inline-block px-2.5 py-1 text-xs rounded font-medium ${
                      problem.stage === 'Endorsed'
                        ? 'bg-yellow-50 text-yellow-700 dark:bg-[#FFD100]/10 dark:text-[#FFD100]'
                        : problem.stage === 'Needs Review'
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400'
                    }`}>
                      {problem.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </Layout>
  );
};

export default ProblemInventory;
