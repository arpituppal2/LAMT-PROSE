import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { STATUS_POINTS } from '../utils/problemStatus';

/* ══════════════════════════════════════════════════════════════
   LEADERBOARD  —  lamt.net / ucla.edu treatment
══════════════════════════════════════════════════════════════ */
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
    .filter((entry) => (entry.score ?? 0) > 0)
    .filter((entry) =>
      search === '' ||
      entry.author.toLowerCase().includes(search.toLowerCase()) ||
      entry.initials.toLowerCase().includes(search.toLowerCase()),
    );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 gap-3 text-[var(--color-text-muted)]">
          <Loader2 size={18} className="animate-spin text-[var(--color-accent)]" />
          <span className="text-base">Loading leaderboard…</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-[1200px] mx-auto space-y-6">

        {/* ── Page header ── */}
        <header>
          <span className="gold-rule mb-3" />
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Leaderboard
          </h1>
          <p className="prose mt-2 max-w-2xl">
            Points are awarded per problem based on workflow stage, plus a bonus for reviews you give to others.
          </p>
        </header>

        {/* ── Scoring formula — shown directly, no tooltip ── */}
        <div className="surface-card px-5 py-4">
          <p className="section-label mb-3">Scoring Formula</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {[
              { label: 'Idea',         pts: `+${STATUS_POINTS.Idea}`,             color: 'var(--badge-idea-text)' },
              { label: 'Needs Review', pts: `+${STATUS_POINTS['Needs Review']}`,  color: 'var(--badge-needs-review-text)' },
              { label: 'Resolved',     pts: `+${STATUS_POINTS.Resolved}`,         color: 'var(--badge-resolved-text)' },
              { label: 'Endorsed',     pts: `+${STATUS_POINTS.Endorsed}`,         color: 'var(--badge-endorsed-text)' },
              { label: 'Review Given', pts: '+0.5',                               color: 'var(--color-accent)' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: item.color }}>
                  {item.pts}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-faint)] mt-3 leading-relaxed">
            Your total score = (Idea count × {STATUS_POINTS.Idea}) + (Needs Review count × {STATUS_POINTS['Needs Review']}) + (Resolved count × {STATUS_POINTS.Resolved}) + (Endorsed count × {STATUS_POINTS.Endorsed}) + (Reviews given × 0.5).
            Points accumulate as your problems progress through the workflow.
          </p>
        </div>

        {/* ── Search ── */}
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
          <input
            type="text"
            placeholder="Search by name or initials"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base w-full pl-9"
          />
        </div>

        {/* ── Leaderboard table ── */}
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="px-4 py-3.5 section-label w-12">#</th>
                  <th className="px-4 py-3.5 section-label">Contributor</th>
                  <th className="px-4 py-3.5 section-label text-center">Endorsed</th>
                  <th className="px-4 py-3.5 section-label text-center">Idea</th>
                  <th className="px-4 py-3.5 section-label text-center">Needs Review</th>
                  <th className="px-4 py-3.5 section-label text-center">Resolved</th>
                  <th className="px-4 py-3.5 section-label text-center">Reviews</th>
                  <th className="px-4 py-3.5 section-label text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filtered.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    onClick={() => navigate(`/users/${entry.userId}`)}
                    className="cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{entry.author}</p>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono">{entry.initials}</p>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.endorsed || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.idea || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-[var(--badge-needs-review-text)]">{entry.badges.needsReview || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.resolved || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.reviewsGiven || 0}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--color-accent)]">
                      {entry.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-14 text-sm text-[var(--color-text-muted)]">
              {search ? `No results for "${search}"` : 'No contributors with a score yet.'}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Leaderboard;
