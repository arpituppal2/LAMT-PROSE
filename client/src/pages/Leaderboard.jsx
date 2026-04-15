import { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats/leaderboard')
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Server computes and returns the correct score — use it directly.
  // Show everyone (no filter) so users with 0 score still appear.
  const sorted = [...users].sort((a, b) => b.score - a.score);

  const icons = [Trophy, Medal, Award];

  return (
    <Layout>
      <div className="w-full px-[5%]">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Leaderboard</h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Scoring: endorsed <span className="font-semibold text-yellow-600 dark:text-yellow-400">+5</span>
              {' · '} idea <span className="font-semibold text-blue-600 dark:text-blue-400">+3</span>
              {' · '} needs review <span className="font-semibold text-red-500">−2</span>
              {' · '} review given <span className="font-semibold text-green-600 dark:text-green-400">+0.25</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No contributors yet.</div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/8">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide w-12">#</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Writer</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">Endorsed</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">Needs Review</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">Ideas</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden md:table-cell">Reviews Given</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {sorted.map((u, i) => {
                  const Icon = icons[i] || null;
                  return (
                    <tr key={u.userId} className={`transition-colors ${
                      i === 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' :
                      i === 1 ? 'bg-gray-50/50 dark:bg-white/2' :
                      i === 2 ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                    }`}>
                      <td className="px-5 py-3.5">
                        {Icon
                          ? <Icon size={16} className={i===0?'text-yellow-500':i===1?'text-gray-400':'text-orange-400'} />
                          : <span className="text-sm text-gray-400 tabular-nums">{i + 1}</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#2774AE] dark:bg-[#FFD100]/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white dark:text-[#FFD100]">{u.initials || u.firstName?.[0] || '?'}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-bold tabular-nums text-[#2774AE] dark:text-[#FFD100]">{u.score.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                        <span className="text-sm tabular-nums text-yellow-600 dark:text-yellow-400 font-medium">{u.badges?.endorsed ?? 0}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                        <span className="text-sm tabular-nums text-red-500 font-medium">{u.badges?.needsReview ?? 0}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                        <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">{u.badges?.idea ?? 0}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden md:table-cell">
                        <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">{u.reviewsGiven ?? 0}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
