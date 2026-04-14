import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Search } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function ArchivePage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/problems/archive')
      .then(res => setProblems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = problems.filter(p =>
    !search ||
    p.statement?.toLowerCase().includes(search.toLowerCase()) ||
    p.topic?.toLowerCase().includes(search.toLowerCase())
  );

  const topicColor = (topic) => {
    const colors = {
      'Algebra':       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'Geometry':      'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
      'Combinatorics': 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
      'Number Theory': 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
    };
    return colors[topic] || 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400';
  };

  return (
    <Layout>
      <div className="w-full px-[5%] pb-12 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center">
            <Archive size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Archive</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{problems.length} archived problems</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search archived problems…"
            className="w-full max-w-sm pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white placeholder:text-gray-400"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Archive size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-400">{search ? 'No results.' : 'No archived problems.'}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/8">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Problem</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Topic</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Author</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/problem/${p.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 max-w-lg">{p.statement}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${topicColor(p.topic)}`}>
                        {p.topic || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{p.author || '—'}</span>
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
