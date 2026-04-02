import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Check, Star, Search, Filter, MessageSquare } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const ProblemInventory = () => {
  const navigate = useNavigate();

  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
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

  const UCLA_BLUE = '#2774AE';
  const UCLA_GOLD = '#FFD100';

  useEffect(() => {
    fetchData();
  }, []);

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

  const { filtered, stats, chartData } = useMemo(() => {
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

    const counts = { Algebra: 0, Geometry: 0, Combinatorics: 0, 'Number Theory': 0 };
    problems.forEach(p => {
      (p.topics || []).forEach(t => {
        if (counts.hasOwnProperty(t)) counts[t]++;
      });
    });

    const dailyData = {};
    [...problems]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach(p => {
        const date = new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!dailyData[date]) {
          dailyData[date] = { date, Idea: 0, Review: 0, Endorsed: 0 };
        }
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

    return { filtered: res, stats: counts, chartData: cumulativeGrowth };
  }, [problems, search, stageFilter, topicFilter, difficultyFilter, sortBy]);

  const chartBg          = dark ? '#0f172a' : '#ffffff';
  const chartBorder      = dark ? '#1e293b' : '#e2e8f0';
  const chartGrid        = dark ? '#334155' : '#e2e8f0';
  const chartAxis        = dark ? '#64748b' : '#94a3b8';
  const chartTooltipBg   = dark ? '#0f172a' : '#ffffff';
  const chartTooltipBorder = dark ? '#1e293b' : '#e2e8f0';

  if (loading) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-ucla-blue border-t-transparent" />
            <span className="text-sm">Loading inventory...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 pb-12 pt-8">

        {/* Header Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-ucla-blue rounded-2xl p-7 text-white relative overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Total Problems</p>
            <h2 className="text-5xl font-bold tabular-nums mb-5">
              {problems.length}
              <span className="text-xl font-medium opacity-40 ml-1">/200</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats).map(([label, val]) => (
                <div
                  key={label}
                  className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium"
                >
                  {label}: {val}
                </div>
              ))}
            </div>
          </div>

          <div
            className="lg:col-span-2 rounded-2xl p-6 border"
            style={{ backgroundColor: chartBg, borderColor: chartBorder }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: dark ? '#94a3b8' : '#64748b' }} className="text-xs font-semibold uppercase tracking-wider">
                Inventory Growth
              </h3>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%" key={String(dark)}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke={chartAxis}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    stroke={chartAxis}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTooltipBg,
                      border: `1px solid ${chartTooltipBorder}`,
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: dark ? '#e2e8f0' : '#1e293b',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{
                      paddingBottom: '16px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: '700',
                      color: dark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <Line type="monotone" dataKey="Idea" stroke={dark ? '#94a3b8' : '#cbd5e1'} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Review" stroke={UCLA_BLUE} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Endorsed" stroke={UCLA_GOLD} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 mb-5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue transition-all text-sm text-slate-800 dark:text-slate-200 border border-transparent focus:border-ucla-blue"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[{ val: sortBy, fn: setSortBy, opts: [['newest','Newest'],['oldest','Oldest'],['diff','Hardest']] },
              { val: stageFilter, fn: setStageFilter, opts: [['all','All Stages'],['Idea','Idea'],['Endorsed','Endorsed']] },
              { val: topicFilter, fn: setTopicFilter, opts: [['all','All Topics'],['Algebra','Algebra'],['Geometry','Geometry'],['Combinatorics','Combinatorics'],['Number Theory','Number Theory']] }
            ].map((sel, i) => (
              <select
                key={i}
                value={sel.val}
                onChange={(e) => sel.fn(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2.5 rounded-lg text-xs font-medium outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              >
                {sel.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Problem</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Latest Review</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Stage</th>
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
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 max-w-xl">
                        {problem.latex?.replace(/[$#\\\\]/g, '') || 'Click to view...'}
                      </p>
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">
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
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 text-slate-400 text-xs max-w-sm">
                      <MessageSquare size={13} className="mt-0.5 shrink-0" />
                      <p className="line-clamp-2 leading-relaxed italic">
                        {problem.feedbacks?.length > 0
                          ? `${problem.feedbacks[0].isEndorsement ? '★ ' : ''}${problem.feedbacks[0].feedback || '(no comment)'}`
                          : 'No reviews yet.'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      problem.stage === 'Endorsed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {problem.stage === 'Endorsed' ? <Check size={11} strokeWidth={2.5} /> : <Star size={11} />}
                      {problem.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <Filter className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={36} />
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                No matching problems.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProblemInventory;
