import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  BarChart, Bar, Cell, YAxis as BarYAxis
} from 'recharts';
import { Check, Star, Search, Filter, BookOpen, MessageSquare, BarChart3 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const ProblemInventory = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  const UCLA_BLUE = '#2774AE';
  const UCLA_GOLD = '#FFD100';

  // Helper to generate growth data over time
  const generateProgressData = (data) => {
    const sorted = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let count = 0;
    return sorted.map(p => {
      count++;
      return {
        date: new Date(p.createdAt).toLocaleDateString(),
        count: count,
      };
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/problems');
      setProblems(res.data);
      setChartData(generateProgressData(res.data));
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const { filtered, topicCounts } = useMemo(() => {
    let result = problems.filter(p => {
      const matchesSearch = search === '' || 
        (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.latex || '').toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === 'all' || (p.stage || '').toLowerCase() === stageFilter.toLowerCase();
      const matchesTopic = topicFilter === 'all' || (p.topics || []).includes(topicFilter);
      const matchesDifficulty = difficultyFilter === 'all' || parseInt(p.quality) === parseInt(difficultyFilter);
      return matchesSearch && matchesStage && matchesTopic && matchesDifficulty;
    });

    result.sort((a, b) => {
      if (sortBy === 'diff-asc') return (parseInt(a.quality) || 0) - (parseInt(b.quality) || 0);
      if (sortBy === 'diff-desc') return (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const counts = result.reduce((acc, p) => {
      (p.topics || ['Misc']).forEach(t => acc[t] = (acc[t] || 0) + 1);
      return acc;
    }, {});

    return { filtered: result, topicCounts: counts };
  }, [problems, search, stageFilter, topicFilter, difficultyFilter, sortBy]);

  const barData = Object.entries(topicCounts).map(([name, value]) => ({ name, value }));

  if (loading) return <div className="h-screen flex items-center justify-center text-ucla-blue font-black italic uppercase animate-pulse">Loading Inventory...</div>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 pb-12">
        
        {/* Header */}
        <div className="mb-10 pt-8">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
            Bruin <span className="text-ucla-blue dark:text-ucla-gold not-italic">Inventory</span>
          </h1>
          <p className="text-slate-500 font-medium">Tournament repository and analytics.</p>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Problem Count Card */}
          <div className="bg-ucla-blue rounded-[2rem] p-8 text-white shadow-xl shadow-ucla-blue/20 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Problem Count</p>
              <h2 className="text-6xl font-black italic">{problems.length}<span className="text-ucla-gold text-2xl not-italic opacity-50">/200</span></h2>
            </div>
            <div className="mt-6 flex gap-2">
               {Object.entries(topicCounts).slice(0, 3).map(([label, val]) => (
                 <div key={label} className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter">
                   {label}: {val}
                 </div>
               ))}
            </div>
          </div>

          {/* Growth Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-ucla-blue" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Growth</h3>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <Area type="monotone" dataKey="count" stroke={UCLA_BLUE} fill={UCLA_BLUE} fillOpacity={0.1} strokeWidth={3} />
                  <Tooltip cursor={false} contentStyle={{ borderRadius: '12px', border: 'none', fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Topic Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-ucla-gold" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topic Balance</h3>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? UCLA_BLUE : UCLA_GOLD} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 mb-8 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search ID or content..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-ucla-blue transition-all"
            />
          </div>
          
          <div className="flex gap-2">
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none">
              <option value="all">All Stages</option>
              <option value="Idea">Idea</option>
              <option value="Review">Review</option>
              <option value="Endorsed">Endorsed</option>
              <option value="Published">Published</option>
            </select>

            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none">
              <option value="all">All Diff</option>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Lvl {n}</option>)}
            </select>

            <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none">
              <option value="all">All Topics</option>
              <option value="Algebra">Algebra</option>
              <option value="Geometry">Geometry</option>
              <option value="Combinatorics">Combinatorics</option>
              <option value="Number Theory">Number Theory</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID & Content</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Feedback</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(problem => (
                <tr key={problem.id} onClick={() => navigate(`/problem/${problem.id}`)} className="hover:bg-ucla-blue/[0.02] transition-colors cursor-pointer group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-ucla-blue dark:text-ucla-gold font-black italic">{problem.id}</span>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 max-w-md">
                        {problem.latex?.replace(/[$#\\]/g, '') || 'Empty problem...'}
                      </p>
                      <div className="flex gap-2 mt-2">
                         <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">LVL {problem.quality}</span>
                         {problem.topics?.map(t => <span key={t} className="text-[9px] font-black px-2 py-0.5 bg-ucla-blue/5 text-ucla-blue rounded">{t}</span>)}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-start gap-2 text-slate-400 italic text-xs max-w-xs">
                      <MessageSquare size={14} className="mt-0.5 shrink-0" />
                      <p className="line-clamp-2">
                        {problem.comments?.[0]?.content || "No feedback yet."}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                      problem.stage === 'Endorsed' ? 'bg-green-100 text-green-600' : 'bg-ucla-gold/10 text-ucla-gold'
                    }`}>
                      {problem.stage === 'Endorsed' ? <Check size={10} /> : <Star size={10} />}
                      {problem.stage}
                    </div>
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
