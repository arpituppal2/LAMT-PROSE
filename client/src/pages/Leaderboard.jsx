import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

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

  const getBadgeColor = (type) => {
    switch (type) {
      case 'endorsed': return 'bg-green-600 dark:bg-green-700 text-white';
      case 'idea': return 'bg-ucla-blue dark:bg-blue-700 text-white';
      case 'needsReview': return 'bg-red-500 dark:bg-red-700 text-white';
      default: return 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200';
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
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-ucla-gold" size={36} />
          <h1 className="text-3xl font-bold text-ucla-blue dark:text-ucla-gold">Leaderboard</h1>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Author</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Endorsed (5 pts)</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Idea (3 pts)</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Needs Review (-2 pts)</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((entry, index) => (
                <tr
                  key={entry.userId}
                  onClick={() => navigate(`/users/${entry.userId}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    {index < 3 ? (
                      <span className="text-xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 font-mono">{index + 1}</span>
                    )}
                  </td>
                  {/* Author */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{entry.author}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{entry.initials}</div>
                  </td>
                  {/* Endorsed */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-sm font-bold ${getBadgeColor('endorsed')}`}>
                      {entry.badges.endorsed || 0}
                    </span>
                  </td>
                  {/* Idea */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-sm font-bold ${getBadgeColor('idea')}`}>
                      {entry.badges.idea || 0}
                    </span>
                  </td>
                  {/* Needs Review */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-sm font-bold ${getBadgeColor('needsReview')}`}>
                      {entry.badges.needsReview || 0}
                    </span>
                  </td>
                  {/* Total Score */}
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-lg text-ucla-blue dark:text-ucla-gold">{entry.score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">No results found</div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
