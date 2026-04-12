import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Search, MessageSquare } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-sm text-gray-400 dark:text-gray-500">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* Header row: count + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-5">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total problems</p>
            <p className="text-4xl font-semibold text-gray-900 dark:text-white tabular-nums">{problems.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">of 200 planned</p>
          </div>

          <div className="lg:col-span-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-5">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Growth over time</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%" key={String(dark)}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColor.grid} />
                  <XAxis dataKey="date" stroke={chartColor.axis} fontSize={10} tickLine={false} axisLine={false} dy={6} />
                  <YAxis stroke={chartColor.axis} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColor.tooltip.bg,
                      border: `1px solid ${chartColor.tooltip.border}`,
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: chartColor.tooltip.text,
                    }}
                  />
                  <Legend
                    verticalAlign="top" align="right" iconType="circle"
                    wrapperStyle={{ paddingBottom: 12, fontSize: 10, color: chartColor.axis }}
                  />
                  <Line type="monotone" dataKey="Idea" stroke={chartColor.axis} strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Review" stroke="#2774AE" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Endorsed" stroke="#FFD100" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 p-3 mb-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID or content"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] transition"
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
              className="px-2 py-1.5 text-sm bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
            >
              {sel.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/8">
                <th className="px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500">Problem</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500">Latest review</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500 text-right">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    No matching problems.
                  </td>
                </tr>
              ) : filtered.map(problem => (
                <tr
                  key={problem.id}
                  onClick={() => navigate(`/problem/${problem.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                      {problem.quality && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{problem.quality}/10</span>
                      )}
                      <div className="flex gap-1">
                        {(problem.topics || []).map(t => (
                          <span key={t} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-md">
                      {problem.latex?.replace(/[$#\\\\]/g, '') || ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1.5 max-w-xs">
                      <MessageSquare size={12} className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 italic">
                        {problem.feedbacks?.length > 0
                          ? problem.feedbacks[0].feedback || '(no comment)'
                          : 'No reviews yet.'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${
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
