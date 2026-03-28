import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { Check, Star, Search, Filter, BookOpen, MessageSquare, BarChart3 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const ProblemInventory = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
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
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const { filtered, topicCounts, chartData } = useMemo(() => {
    // 1. Filter Logic
    let res = problems.filter(p => {
      const matchesSearch = search === '' || 
        (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.latex || '').toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === 'all' || (p.stage || '').toLowerCase() === stageFilter.toLowerCase();
      const matchesTopic = topicFilter === 'all' || (p.topics || []).includes(topicFilter);
      const matchesDifficulty = difficultyFilter === 'all' || parseInt(p.quality) === parseInt(difficultyFilter);
      return matchesSearch && matchesStage && matchesTopic && matchesDifficulty;
    });

    res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 2. Topic Counts
    const counts = res.reduce((acc, p) => {
      (p.topics || ['Misc']).forEach(t => acc[t] = (acc[t] || 0) + 1);
      return acc;
    }, {});

    // 3. Growth Data (Cumulative)
    const sortedByDate = [...problems].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let cumulativeTotal = 0;
    let cumulativeEndorsed = 0;
    
    const growth = sortedByDate.map(p => {
      cumulativeTotal++;
      if (p.stage === 'Endorsed' || p.stage === 'Published') cumulativeEndorsed++;
      return {
        date: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Total: cumulativeTotal,
        Endorsed: cumulativeEndorsed
      };
    });

    return { filtered: res, topicCounts: counts, chartData: growth };
  }, [problems, search, stageFilter, topicFilter, difficultyFilter]);

  const barData = Object.entries(topicCounts).map(([name, value]) => ({ name, value }));

  if (loading) return <Layout><div className="h-96 flex items-center justify-center text-ucla-blue font-black italic animate-pulse">LOADING DATA...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 pb-12 pt-8">
        
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
            Bruin <span className="text-ucla-blue dark:text-ucla-gold not-italic">Inventory</span>
          </h1>
          <p className="text-slate-500 font-medium">Tournament repository and growth analytics.</p>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-ucla-blue rounded-[2rem] p-8 text-white shadow-xl flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Problem Count</p>
              <h2 className="text-6xl font-black italic">{problems.length}<span className="text-ucla-gold text-2xl not-italic opacity-50">/200</span></h2>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
               {Object.entries(topicCounts).slice(0, 3).map(([label, val]) => (
                 <span key={label} className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-bold uppercase">{label}: {val}</span>
               ))}
            </div>
          </div>

          <div className="bg-[#1a2236] rounded-[2rem] p-6 shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-ucla-blue" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Growth</h3>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="Total" stroke={UCLA_BLUE} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Endorsed" stroke={UCLA_GOLD} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#1a2236] rounded-[2rem] p-6 shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-ucla-gold" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topic Balance</h3>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" hide />
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
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search ID or content..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-ucla-blue"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none">
              <option value="all">All Difficulties</option>
              {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>Level {i+1}</option>)}
            </select>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none">
              <option value="all">All Stages</option>
              <option value="Idea">Idea</option>
              <option value="Review">Review</option>
              <option value="Endorsed">Endorsed</option>
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
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Problem Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Feedback</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(problem => (
                <tr key={problem.id} onClick={() => navigate(`/problem/${problem.id}`)} className="hover:bg-ucla-blue/[0.02] transition-colors cursor-pointer group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-ucla-blue dark:text-ucla-gold font-black italic">{problem.id}</span>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 max-w-md font-medium">
                        {problem.latex?.replace(/[$#\\]/g, '') || 'No content preview available...'}
                      </p>
                      <div className="flex gap-2 mt-2">
                         <span className="text-[9px] font-black px-2 py-0.5 bg-ucla-gold/10 text-ucla-gold rounded">DIFF: {problem.quality || '?'}</span>
                         {(problem.topics || []).map(t => <span key={t} className="text-[9px] font-black px-2 py-0.5 bg-ucla-blue/5 text-ucla-blue rounded">{t}</span>)}
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
                    <p className="text-xs font-bold text-slate-400 mb-1">{new Date(problem.createdAt).toLocaleDateString()}</p>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      problem.stage === 'Endorsed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
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
