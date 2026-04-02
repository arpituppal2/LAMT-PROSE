import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Medal } from 'lucide-react';
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

  const filtered = leaderboard.filter(entry =>
    search === '' ||
    entry.author.toLowerCase().includes(search.toLowerCase()) ||
    entry.initials.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-t-ucla-gold rounded-full animate-spin mb-4"></div>
          <div className="text-slate-500 dark:text-slate-400 font-medium italic">Assembling the legends...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy size={22} className="text-ucla-blue dark:text-ucla-gold" />
            Leaderboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Recognizing our top problem contributors</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search contributors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-ucla-blue/20 dark:focus:ring-[#FFD100]/20 outline-none transition-all text-slate-900 dark:text-white text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <div className="col-span-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">#</div>
            <div className="col-span-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contributor</div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Endorsed <span className="text-green-500">+5</span></div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Idea <span className="text-blue-500">+3</span></div>
            <div className="col-span-1 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Reviews <span className="text-purple-500">+0.25</span></div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Score</div>
          </div>

          {filtered.map((entry, index) => (
            <div
              key={entry.userId}
              onClick={() => navigate(`/users/${entry.userId}`)}
              className="grid grid-cols-12 gap-2 items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              {/* Rank */}
              <div className="col-span-1">
                {index === 0 ? (
                  <span className="text-lg">🥇</span>
                ) : index === 1 ? (
                  <span className="text-lg">🥈</span>
                ) : index === 2 ? (
                  <span className="text-lg">🥉</span>
                ) : (
                  <span className="text-sm font-semibold text-slate-400 tabular-nums">{index + 1}</span>
                )}
              </div>

              {/* Author */}
              <div className="col-span-4">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{entry.author}</p>
                <p className="text-xs text-slate-400 font-mono">{entry.initials}</p>
              </div>

              {/* Endorsed badge count */}
              <div className="col-span-2 text-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{entry.badges.endorsed || 0}</span>
              </div>

              {/* Idea badge count */}
              <div className="col-span-2 text-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{entry.badges.idea || 0}</span>
              </div>

              {/* Reviews given */}
              <div className="col-span-1 text-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{entry.reviewsGiven || 0}</span>
              </div>

              {/* Score */}
              <div className="col-span-2 text-right">
                <span className="text-lg font-bold text-ucla-blue dark:text-ucla-gold tabular-nums">{entry.score}</span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">
              No contributors found matching &ldquo;{search}&rdquo;
            </div>
          )}
        </div>

        {/* Scoring legend */}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">Endorsed problem: <strong className="text-green-600">+5 pts</strong></span>
          <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">Idea stage: <strong className="text-blue-600">+3 pts</strong></span>
          <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">Needs Review: <strong className="text-red-500">-2 pts</strong></span>
          <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">Review given: <strong className="text-purple-600">+0.25 pts</strong></span>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
