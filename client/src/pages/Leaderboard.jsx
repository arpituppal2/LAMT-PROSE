import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
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

  const pointsText = `Idea +${STATUS_POINTS['Idea']} · Needs Review ${STATUS_POINTS['Needs Review']} · Resolved +${STATUS_POINTS['Resolved']} · Endorsed +${STATUS_POINTS['Endorsed']}`;

  const cardCls = 'bg-white/70 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl';
  const inputCls = 'w-full px-4 py-2.5 text-base bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-base">
          Loading...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="text-base text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1.5">
            Score formula
            <span className="relative group">
              <InfoIcon />
              <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-20 hidden group-hover:block w-72 rounded-xl px-3 py-2 text-sm leading-relaxed bg-gray-900 dark:bg-gray-800 text-white shadow-xl">
                {pointsText}
              </span>
            </span>
          </p>
        </div>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name or initials"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-10`} />
        </div>

        <div className={`${cardCls} overflow-hidden`}>
          <div className="grid gap-2 px-5 py-3 border-b border-gray-100 dark:border-white/8 bg-white/50 dark:bg-white/[0.03]"
            style={{ gridTemplateColumns: '2rem 1fr 6rem 5rem 7rem 6rem 5rem' }}>
            {['#', 'Contributor', 'Endorsed', 'Idea', 'Needs Review', 'Reviews', 'Score'].map((col, i) => (
              <div key={col} className={`text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide ${i > 1 ? 'text-center' : ''} ${i === 6 ? 'text-right' : ''}`}>
                {col}
              </div>
            ))}
          </div>

          {filtered.map((entry, index) => (
            <div key={entry.userId}
              onClick={() => navigate(`/users/${entry.userId}`)}
              className="grid gap-2 items-center px-5 py-3.5 border-b border-gray-50 dark:border-white/[0.04] last:border-0 hover:bg-white/40 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
              style={{ gridTemplateColumns: '2rem 1fr 6rem 5rem 7rem 6rem 5rem' }}>
              <div className="text-base tabular-nums">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : <span className="text-gray-400 dark:text-gray-500">{index + 1}</span>}
              </div>

              <div>
                <p className="text-base font-medium text-gray-900 dark:text-white">{entry.author}</p>
                <p className="text-sm text-gray-400 font-mono">{entry.initials}</p>
              </div>

              <div className="text-center"><span className="text-base tabular-nums text-gray-700 dark:text-gray-300">{entry.badges.endorsed || 0}</span></div>
              <div className="text-center"><span className="text-base tabular-nums text-gray-700 dark:text-gray-300">{entry.badges.idea || 0}</span></div>
              <div className="text-center"><span className={`text-base tabular-nums ${(entry.badges.needsReview || 0) > 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{entry.badges.needsReview || 0}</span></div>
              <div className="text-center"><span className="text-base tabular-nums text-gray-700 dark:text-gray-300">{entry.reviewsGiven || 0}</span></div>
              <div className="text-right"><span className="text-base font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{entry.score}</span></div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-base text-gray-400 dark:text-gray-500">
              {search ? `No results for "${search}"` : 'No contributors with a score yet.'}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
