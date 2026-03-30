import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Check, Star, Search, Filter, BookOpen, MessageSquare, Info } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { useTheme } from '../components/Layout';

const ProblemInventory = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
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

  // Chart colors adapt to dark/light mode
  const chartBg = dark ? '#0f172a' : '#ffffff';
  const chartBorder = dark ? '#1e293b' : '#e2e8f0';
  const chartGrid = dark ? '#334155' : '#e2e8f0';
  const chartAxis = dark ? '#64748b' : '#94a3b8';
  const chartTooltipBg = dark ? '#0f172a' : '#ffffff';
  const chartTooltipBorder = dark ? '#1e293b' : '#e2e8f0';

  if (loading) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center text-ucla-blue dark:text-ucla-gold font-black italic">
          SYNCING INVENTORY...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 pb-12 pt-10">

        {/* Header Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Problem count card */}
          <div className="bg-ucla-blue rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Problem Count</p>
            <h2 className="text-7xl font-black italic mb-8">
              {problems.length}
              <span className="text-ucla-gold text-3xl not-italic opacity-40">/200</span>
            </h2>
            <div className="flex flex-wrap gap-2 relative z-10">
              {Object.entries(stats).map(([label, val]) => (
                <div
                  key={label}
                  className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border border-white/5"
                >
                  {label}: {val}
                </div>
              ))}
            </div>
          </div>

          {/* Chart card — dark/light aware */}
          <div
            className="lg:col-span-2 rounded-[2.5rem] p-8 shadow-md border"
            style={{ backgroundColor: chartBg, borderColor: chartBorder }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-ucla-blue dark:text-slate-400" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Inventory Growth
                </h3>
              </div>
              <div className="group relative cursor-pointer">
                <Info size={16} className="text-slate-400 group-hover:text-ucla-gold transition-colors" />
                <div className="absolute right-0 top-6 w-48 p-3 bg-white dark:bg-slate-900 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 hidden group-hover:block z-50 border border-slate-200 dark:border-slate-700 shadow-xl">
                  Cumulative totals across all workflow stages.
                </div>
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke={chartAxis}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
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
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: dark ? '#e2e8f0' : '#1e293b',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{
                      paddingBottom: '20px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: '800',
                      color: dark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <Line type="monotone" dataKey="Idea" stroke={dark ? '#94a3b8' : '#cbd5e1'} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Review" stroke={UCLA_BLUE} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Endorsed" stroke={UCLA_GOLD} strokeWidth={4} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-md border border-slate-100 dark:border-slate-800 mb-8 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search Inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-ucla-blue transition-all font-medium text-sm text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            {[{ val: sortBy, fn: setSortBy, opts: [['newest','Sort: Newest'],['oldest','Sort: Oldest'],['diff','Sort: High Diff']] },
              { val: stageFilter, fn: setStageFilter, opts: [['all','Stages: All'],['Idea','Idea'],['Endorsed','Endorsed']] },
              { val: topicFilter, fn: setTopicFilter, opts: [['all','Topics: All'],['Algebra','Algebra'],['Geometry','Geometry'],['Combinatorics','Combinatorics'],['Number Theory','Number Theory']] }
            ].map((sel, i) => (
              <select
                key={i}
                value={sel.val}
                onChange={(e) => sel.fn(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-2xl text-[10px] font-black uppercase outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-slate-700"
              >
                {sel.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Problem & Meta</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Latest Feedback</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filtered.map(problem => (
                <tr
                  key={problem.id}
                  onClick={() => navigate(`/problem/${problem.id}`)}
                  className="hover:bg-ucla-blue/[0.03] dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                >
                  <td className="px-10 py-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-ucla-blue dark:text-ucla-gold font-black italic tracking-tight text-lg">
                        {problem.id}
                      </span>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 max-w-xl font-medium">
                        {problem.latex?.replace(/[$#\\]/g, '') || 'Click to view problem content...'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[9px] font-black px-2.5 py-1 bg-ucla-gold/10 text-amber-600 dark:text-ucla-gold rounded-lg border border-ucla-gold/20 uppercase">
                          Lvl {problem.quality || '?'}
                        </span>
                        {(problem.topics || []).map(t => (
                          <span
                            key={t}
                            className="text-[9px] font-black px-2.5 py-1 bg-ucla-blue/5 text-ucla-blue dark:text-blue-300 rounded-lg border border-ucla-blue/10 uppercase tracking-tighter"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-3">
                    <div className="flex items-start gap-3 text-slate-400 italic text-xs max-w-sm">
                      <MessageSquare size={16} className="mt-0.5 shrink-0 text-slate-400" />
                      <p className="line-clamp-2 leading-relaxed">
                        {problem.comments?.[0]?.content || 'No review comments submitted yet.'}
                      </p>
                    </div>
                  </td>
                  <td className="px-10 py-3 text-right">
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      problem.stage === 'Endorsed'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {problem.stage === 'Endorsed' ? <Check size={12} strokeWidth={3} /> : <Star size={12} />}
                      {problem.stage}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-24 text-center">
              <Filter className="mx-auto mb-4 text-slate-300 dark:text-slate-700" size={48} />
              <p className="text-slate-400 dark:text-slate-500 font-bold italic tracking-tight text-lg">
                No matching problems in the pack.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProblemInventory;
