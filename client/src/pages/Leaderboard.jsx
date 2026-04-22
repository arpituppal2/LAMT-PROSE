import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { STATUS_POINTS } from '../utils/problemStatus';

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    className="inline-block text-gray-400 cursor-help">
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
        <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
          <Loader2 size={18} className="animate-spin text-[var(--ucla-blue)]" />
          <span className="text-base">Loading leaderboard...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-[1200px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            Per-problem points for your authored work (plus a small bonus for reviews given).
            <span className="relative group inline-flex items-center">
              <InfoIcon />
              <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 hidden group-hover:block w-80 rounded-lg px-3 py-2 text-xs leading-relaxed bg-gray-900 dark:bg-[#001628] text-white border border-white/15 shadow-lg">
                {pointsText}
              </span>
            </span>
          </p>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or initials"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ucla-blue)]/30 dark:focus:ring-[var(--ucla-gold)]/20 transition"
          />
        </div>

        <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white/70 dark:bg-white/[0.05] backdrop-blur-md">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/8 bg-white/50 dark:bg-white/[0.03]">
                  <th className="px-4 py-3 font-semibold text-gray-400 dark:text-gray-500 w-12">#</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 dark:text-gray-500">Contributor</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 dark:text-gray-500 text-center">Endorsed</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 dark:text-gray-500 text-center">Idea</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 dark:text-gray-500 text-center">Needs review</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 dark:text-gray-500 text-center">Resolved</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 dark:text-gray-500 text-center">Reviews</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 dark:text-gray-500 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {filtered.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    onClick={() => navigate(`/users/${entry.userId}`)}
                    className="hover:bg-white/40 dark:hover:bg-white/[0.04] cursor-pointer transition-colors text-gray-900 dark:text-white"
                  >
                    <td className="px-4 py-3 tabular-nums text-gray-400 dark:text-gray-500">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{entry.author}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{entry.initials}</p>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.endorsed || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.idea || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-[var(--badge-needs-review-text)]">{entry.badges.needsReview || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.resolved || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.reviewsGiven || 0}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-14 text-sm text-gray-400 dark:text-gray-500">
              {search ? `No results for "${search}"` : 'No contributors with a score yet.'}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
