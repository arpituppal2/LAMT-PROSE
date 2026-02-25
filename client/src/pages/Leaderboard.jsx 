import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

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
      case 'onTest': return 'bg-ucla-blue text-white';
      case 'endorsed': return 'bg-ucla-gold text-black';
      case 'idea': return 'bg-ucla-light-blue text-white';
      case 'needsReview': return 'bg-red-500 text-white';
      default: return 'bg-gray-200';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="text-ucla-gold" size={36} />
          <h1 className="text-3xl font-bold text-ucla-blue">Leaderboard</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-ucla-blue text-white">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-center">On Test (6pts)</th>
                <th className="px-4 py-3 text-center">Endorsed (5pts)</th>
                <th className="px-4 py-3 text-center">Idea (3pts)</th>
                <th className="px-4 py-3 text-center">Needs Review (-2pts)</th>
                <th className="px-4 py-3 text-right">Total Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr
                  key={entry.userId}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    {index < 3 ? (
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-600">{index + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.author}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor('onTest')}`}>
                      {entry.badges.onTest}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor('endorsed')}`}>
                      {entry.badges.endorsed}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor('idea')}`}>
                      {entry.badges.idea}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor('needsReview')}`}>
                      {entry.badges.needsReview}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xl font-bold text-ucla-blue">{entry.score}</span>
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

export default Leaderboard;
