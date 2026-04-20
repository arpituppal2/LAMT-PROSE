import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { STATUS_POINTS } from '../utils/problemStatus';

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    className="inline-block text-slate-500 cursor-help dark:text-slate-400">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

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

  const filtered = leaderboard
    .filter(entry => (entry.score ?? 0) > 0)
    .filter(entry =>
      search === '' ||
      entry.author.toLowerCase().includes(search.toLowerCase()) ||
      entry.initials.toLowerCase().includes(search.toLowerCase())
    );

  const pointsText = `Idea +${STATUS_POINTS.Idea} · Needs Review ${STATUS_POINTS['Needs Review']} · Resolved +${STATUS_POINTS.Resolved} · Endorsed +${STATUS_POINTS.Endorsed}`;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400 text-base">
          Loading…
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-[1200px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-black dark:text-white">Leaderboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-2">
            Per-problem points for your authored work (plus a small bonus for reviews given).
            <span className="relative group inline-flex items-center">
              <InfoIcon />
              <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 hidden group-hover:block w-80 rounded-md px-3 py-2 text-xs leading-relaxed bg-[#001628] text-white border border-white/15 shadow-lg">
                {pointsText}
              </span>
            </span>
          </p>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or initials"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#001628] text-black dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
          />
        </div>

        <div className="border border-slate-200 dark:border-white/15 rounded-lg overflow-hidden bg-white dark:bg-[#001628]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#020c16]">
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200 w-12">#</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200">Contributor</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200 text-center">Endorsed</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200 text-center">Idea</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200 text-center">Needs review</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200 text-center">Resolved</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200 text-center">Reviews</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {filtered.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    onClick={() => navigate(`/users/${entry.userId}`)}
                    className="hover:bg-slate-50 dark:hover:bg-[#020c16] cursor-pointer text-black dark:text-white"
                  >
                    <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{entry.author}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{entry.initials}</p>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.endorsed || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.idea || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-amber-700 dark:text-[#FFB81C]">{entry.badges.needsReview || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.resolved || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.reviewsGiven || 0}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-[#2774AE] dark:text-[#FFD100]">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-14 text-sm text-slate-500 dark:text-slate-400">
              {search ? `No results for "${search}"` : 'No contributors with a score yet.'}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
