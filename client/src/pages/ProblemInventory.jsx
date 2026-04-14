import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Search, Filter, ChevronDown, TrendingUp, BookOpen, Star, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function ProblemInventory() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get('/problems')
      .then(res => setProblems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const topics = useMemo(() => {
    const t = new Set(problems.map(p => p.topic).filter(Boolean));
    return ['All', ...Array.from(t).sort()];
  }, [problems]);

  const statuses = ['All', 'Idea', 'Endorsed', 'Needs Review', 'Archived'];

  const filtered = useMemo(() => problems.filter(p => {
    const matchSearch = !search ||
      p.statement?.toLowerCase().includes(search.toLowerCase()) ||
      p.topic?.toLowerCase().includes(search.toLowerCase()) ||
      p.author?.toLowerCase().includes(search.toLowerCase());
    const matchTopic = topicFilter === 'All' || p.topic === topicFilter;
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchTopic && matchStatus;
  }), [problems, search, topicFilter, statusFilter]);

  // Build chart data: problems added per day (last 14 days)
  const chartData = useMemo(() => {
    const counts = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      counts[key] = 0;
    }
    problems.forEach(p => {
      if (!p.createdAt) return;
      const d = new Date(p.createdAt);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (key in counts) counts[key]++;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [problems]);

  const statusColor = (s) => ({
    'Endorsed':     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Needs Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Idea':         'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
    'Archived':     'bg-gray-100  text-gray-500  dark:bg-white/5      dark:text-gray-500',
  }[s] || 'bg-gray-100 text-gray-500');

  return (
    <Layout>
      <div className="w-full px-[5%]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Problem Inventory</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {problems.length} problems total
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',       value: problems.length,                                          icon: BookOpen,  color: 'text-[#2774AE]' },
            { label: 'Endorsed',    value: problems.filter(p=>p.status==='Endorsed').length,         icon: Star,     color: 'text-green-500' },
            { label: 'Needs Review',value: problems.filter(p=>p.status==='Needs Review').length,     icon: Clock,    color: 'text-amber-500' },
            { label: 'Ideas',       value: problems.filter(p=>p.status==='Idea').length,             icon: TrendingUp,color:'text-blue-500' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
                <s.icon size={14} className={s.color} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Problems Added (Last 14 Days)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--tw-bg-opacity,1)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line type="monotone" dataKey="count" stroke="#2774AE" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search problems…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 hover:border-[#2774AE]/40 transition-colors"
          >
            <Filter size={14} />
            Filters
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Topic</label>
              <select
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
                className="text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 dark:text-white"
              >
                {topics.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 dark:text-white"
              >
                {statuses.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/8">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Problem</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Topic</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">No problems match your filters.</td></tr>
                ) : filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/problem/${p.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 max-w-md">
                        {p.statement || <span className="text-gray-400 italic">No statement</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{p.topic || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{p.author || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                        {p.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
