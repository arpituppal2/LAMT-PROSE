import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

function Leaderboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Total');

  useEffect(() => {
    api.get('/leaderboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!data) return { Total: 0, Endorsed: 0, 'Needs Review': 0, Ideas: 0 };
    const problems = data.problems || [];
    return {
      Total: problems.length,
      Endorsed: problems.filter(
        p => p.stage === 'Endorsed' || p._displayStatus === 'endorsed' || p._displayStatus === 'Endorsed'
      ).length,
      'Needs Review': problems.filter(
        p => p.stage === 'Needs Review' || p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review'
      ).length,
      Ideas: problems.filter(
        p => p.stage === 'Idea' || p._displayStatus === 'idea' || p._displayStatus === 'Idea'
      ).length,
    };
  }, [data]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const users = data.users || [];
    if (activeFilter === 'Total') return users;

    const stageMap = {
      Endorsed: ['Endorsed', 'endorsed'],
      'Needs Review': ['Needs Review', 'needs_review'],
      Ideas: ['Idea', 'idea'],
    };

    const allowed = stageMap[activeFilter] || [];
    return users.filter(u =>
      (u.problems || []).some(p => allowed.includes(p.stage) || allowed.includes(p._displayStatus))
    );
  }, [data, activeFilter]);

  const pills = ['Total', 'Endorsed', 'Needs Review', 'Ideas'];

  return (
    <Layout>
      <div className="w-full px-[5%]">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">Leaderboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Rankings by contributions</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {pills.map(pill => {
            const active = activeFilter === pill;
            return (
              <button
                key={pill}
                onClick={() => setActiveFilter(prev => (prev === pill ? 'Total' : pill))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  active
                    ? 'bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-black border-[#2774AE] dark:border-[#FFD100]'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-[#2774AE]/40 dark:hover:border-[#FFD100]/30'
                }`}
              >
                <span className="font-semibold tabular-nums">{loading ? '—' : stats[pill]}</span>
                <span>{pill}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No contributors match this filter.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/8">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Problems</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Endorsed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Needs Review</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Ideas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filteredUsers.map((u, idx) => {
                  const problems = u.problems || [];
                  const endorsed = problems.filter(
                    p => p.stage === 'Endorsed' || p._displayStatus === 'endorsed' || p._displayStatus === 'Endorsed'
                  ).length;
                  const needsReview = problems.filter(
                    p => p.stage === 'Needs Review' || p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review'
                  ).length;
                  const ideas = problems.filter(
                    p => p.stage === 'Idea' || p._displayStatus === 'idea' || p._displayStatus === 'Idea'
                  ).length;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/user/${u.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            idx === 0
                              ? 'text-[#FFD100]'
                              : idx === 1
                              ? 'text-gray-400'
                              : idx === 2
                              ? 'text-orange-500'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#2774AE] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {u.initials || (u.firstName?.[0] || '?')}
                          </div>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {u.firstName} {u.lastName}
                          </span>
                          {idx === 0 && <Star size={12} className="text-[#FFD100]" fill="currentColor" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                        {problems.length}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-green-600 dark:text-green-400 font-medium hidden sm:table-cell">
                        {endorsed}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-amber-600 dark:text-amber-400 hidden md:table-cell">
                        {needsReview}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-blue-600 dark:text-blue-400 hidden md:table-cell">
                        {ideas}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Leaderboard;
