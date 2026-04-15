import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Search, Filter, ChevronDown, TrendingUp, BookOpen, Star, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import api from '../utils/api';

export default function ProblemInventory() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [diffFilter, setDiffFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/problems'),
      api.get('/stats/tournament-progress'),
    ])
      .then(([proRes, chartRes]) => {
        setProblems(proRes.data);
        setChartData(chartRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const topics = useMemo(() => {
    const t = new Set(problems.flatMap(p => p.topics || []).filter(Boolean));
    return ['All', ...Array.from(t).sort()];
  }, [problems]);

  const statuses = ['All', 'Idea', 'Endorsed', 'Needs Review', 'Archived'];
  const difficulties = ['All', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  const filtered = useMemo(() => problems.filter(p => {
    const displayStatus = p._displayStatus || p.stage || 'Idea';
    const matchSearch = !search ||
      p.latex?.toLowerCase().includes(search.toLowerCase()) ||
      p.topics?.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      `${p.author?.firstName} ${p.author?.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchTopic = topicFilter === 'All' || (p.topics || []).includes(topicFilter);
    const matchStatus = statusFilter === 'All' || displayStatus === statusFilter;
    const matchDiff = diffFilter === 'All' || p.quality === diffFilter;
    return matchSearch && matchTopic && matchStatus && matchDiff;
  }), [problems, search, topicFilter, statusFilter, diffFilter]);

  const getDisplayStatus = (p) => p._displayStatus || p.stage || 'Idea';

  const statusColor = (s) => ({
    'Endorsed':     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Needs Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Idea':         'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
    'Archived':     'bg-gray-100  text-gray-500  dark:bg-white/5      dark:text-gray-500',
  }[s] || 'bg-gray-100 text-gray-500');

  // Format chart x-axis labels shorter
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
            { label: 'Total',        value: problems.length,                                                          icon: BookOpen,   color: 'text-[#2774AE]' },
            { label: 'Endorsed',     value: problems.filter(p => getDisplayStatus(p) === 'Endorsed').length,         icon: Star,      color: 'text-green-500' },
            { label: 'Needs Review', value: problems.filter(p => getDisplayStatus(p) === 'Needs Review').length,     icon: Clock,     color: 'text-amber-500' },
            { label: 'Ideas',        value: problems.filter(p => getDisplayStatus(p) === 'Idea').length,             icon: TrendingUp, color: 'text-blue-500' },
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

        {/* Chart — cumulative totals from /stats/tournament-progress */}
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cumulative Problems Over Time</h2>
          {chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  labelFormatter={fmtDate}
                  contentStyle={{
                    background: 'var(--color-surface, #fff)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="endorsed" name="Endorsed" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="idea" name="Idea" stroke="#2774AE" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="needsReview" name="Needs Review" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
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
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Difficulty</label>
              <select
                value={diffFilter}
                onChange={e => setDiffFilter(e.target.value)}
                className="text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 dark:text-white"
              >
                {difficulties.map(d => <option key={d}>{d}</option>)}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Diff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">No problems match your filters.</td></tr>
                ) : filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/problem/${p.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-0.5 font-mono">{p.id}</div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 max-w-md">
                        <KatexRenderer latex={p.latex} />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {(p.topics || []).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm tabular-nums font-semibold text-[#2774AE] dark:text-[#FFD100]">
                        {p.quality ? `${parseInt(p.quality)}/10` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {p.author ? `${p.author.firstName} ${p.author.lastName}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(getDisplayStatus(p))}`}>
                        {getDisplayStatus(p)}
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
