import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { STATUS_POINTS } from '../utils/problemStatus';

/* ══════════════════════════════════════════════════════════════
   LEADERBOARD
══════════════════════════════════════════════════════════════ */

const SCORE_CHIPS = [
  { label: 'ENDORSED',     pts: `+${STATUS_POINTS.Endorsed}`,          color: 'var(--badge-endorsed-text)',     bg: 'var(--badge-endorsed-bg)',     border: 'var(--badge-endorsed-border)' },
  { label: 'RESOLVED',     pts: `+${STATUS_POINTS.Resolved}`,           color: 'var(--badge-resolved-text)',     bg: 'var(--badge-resolved-bg)',     border: 'var(--badge-resolved-border)' },
  { label: 'IDEA',         pts: `+${STATUS_POINTS.Idea}`,               color: 'var(--badge-idea-text)',         bg: 'var(--badge-idea-bg)',         border: 'var(--badge-idea-border)' },
  { label: 'NEEDS REVIEW', pts: `${STATUS_POINTS['Needs Review']}`,     color: 'var(--badge-needs-review-text)', bg: 'var(--badge-needs-review-bg)', border: 'var(--badge-needs-review-border)' },
  { label: 'REVIEW GIVEN', pts: '+0.5',                                  color: 'var(--color-accent)',            bg: 'var(--color-surface)',         border: 'var(--color-border)' },
];

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const filtered = leaderboard.filter((entry) => (entry.score ?? 0) > 0);

  if (loading) {
    return (
      <Layout pageKey="leaderboard">
        <div className="flex items-center justify-center h-64 gap-3 text-[var(--color-text-muted)]">
          <Loader2 size={18} className="animate-spin text-[var(--color-accent)]" />
          <span className="text-base">Loading leaderboard…</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageKey="leaderboard">
      <div className="w-full max-w-[1200px] mx-auto space-y-6">

        {/* ── Page header ── */}
        <header>
          <span className="gold-rule mb-3" />
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Leaderboard
            </h1>
            {/* Inline scoring chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {SCORE_CHIPS.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                  style={{
                    color: chip.color,
                    backgroundColor: chip.bg,
                    borderColor: chip.border,
                  }}
                >
                  {chip.label}
                  <span className="tabular-nums opacity-90">{chip.pts}</span>
                </span>
              ))}
            </div>
          </div>
        </header>

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
              No contributors with a score yet.
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Leaderboard;
