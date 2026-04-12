import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/stats/leaderboard');
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leaderboard.filter(entry =>
    search === '' ||
    entry.author.toLowerCase().includes(search.toLowerCase()) ||
    entry.initials.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
          Loading...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Scoring: endorsed +5 · idea +3 · needs review −2 · review given +0.25
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or initials"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 transition"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded overflow-hidden">
          {/* Header row */}
          <div
            className="grid gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/3"
            style={{ gridTemplateColumns: '2rem 1fr 6rem 5rem 7rem 6rem 5rem' }}
          >
            {['#', 'Contributor', 'Endorsed', 'Idea', 'Needs Review', 'Reviews', 'Score'].map((col, i) => (
              <div key={col} className={`text-xs font-medium text-gray-400 dark:text-gray-500 ${
                i > 1 ? 'text-center' : ''
              } ${i === 6 ? 'text-right' : ''}`}>
                {col}
              </div>
            ))}
          </div>

          {filtered.map((entry, index) => (
            <div
              key={entry.userId}
              onClick={() => navigate(`/users/${entry.userId}`)}
              className="grid gap-2 items-center px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors"
              style={{ gridTemplateColumns: '2rem 1fr 6rem 5rem 7rem 6rem 5rem' }}
            >
              {/* Rank */}
              <div className="text-sm tabular-nums">
                {index === 0 ? '🥇'
                  : index === 1 ? '🥈'
                  : index === 2 ? '🥉'
                  : <span className="text-gray-400 dark:text-gray-500">{index + 1}</span>
                }
              </div>

              {/* Author */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.author}</p>
                <p className="text-xs text-gray-400 font-mono">{entry.initials}</p>
              </div>

              {/* Endorsed */}
              <div className="text-center">
                <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
                  {entry.badges.endorsed || 0}
                </span>
              </div>

              {/* Idea */}
              <div className="text-center">
                <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
                  {entry.badges.idea || 0}
                </span>
              </div>

              {/* Needs Review */}
              <div className="text-center">
                <span className={`text-sm tabular-nums ${
                  (entry.badges.needsReview || 0) > 0
                    ? 'text-red-500'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {entry.badges.needsReview || 0}
                </span>
              </div>

              {/* Reviews given */}
              <div className="text-center">
                <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
                  {entry.reviewsGiven || 0}
                </span>
              </div>

              {/* Score */}
              <div className="text-right">
                <span className="text-sm font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">
                  {entry.score}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
              No results for &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
