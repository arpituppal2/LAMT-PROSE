import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { STATUS_POINTS } from '../utils/problemStatus';

/* ═══════════════════════════════════════════════════════════════
   LEADERBOARD
═══════════════════════════════════════════════════════════════ */

const SCORING_PILLS = [
  { label: 'Endorsed',     pts: '+5',   color: 'var(--badge-endorsed-text)',      bg: 'var(--badge-endorsed-bg)',      border: 'var(--badge-endorsed-border)' },
  { label: 'Idea',         pts: '+2',   color: 'var(--badge-idea-text)',           bg: 'var(--badge-idea-bg)',           border: 'var(--badge-idea-border)' },
  { label: 'Resolved',     pts: '+3',   color: 'var(--badge-resolved-text)',       bg: 'var(--badge-resolved-bg)',       border: 'var(--badge-resolved-border)' },
  { label: 'Needs Review', pts: '−2',   color: 'var(--badge-needs-review-text)',   bg: 'var(--badge-needs-review-bg)',   border: 'var(--badge-needs-review-border)' },
  { label: 'Review Given', pts: '+0.5', color: 'var(--color-accent)',              bg: 'var(--color-surface-2)',         border: 'var(--color-border)' },
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

  const entries = leaderboard.filter((entry) => (entry.score ?? 0) > 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 gap-3 text-[var(--color-text-muted)]">
          <Loader2 size={18} className="animate-spin text-[var(--color-accent)]" />
          <span>Loading leaderboard…</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-[1200px] mx-auto space-y-5">

        {/* ── Title row + inline scoring pills ── */}
        <header className="space-y-3">
          <span className="gold-rule" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <h1
              style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800 }}
              className="tracking-tight leading-none"
            >
              Leaderboard
            </h1>
            {/* Scoring pills — inline in header */}
            <div className="flex flex-wrap items-center gap-2">
              {SCORING_PILLS.map((pill) => (
                <span
                  key={pill.label}
                  style={{
                    background: pill.bg,
                    color: pill.color,
                    borderColor: pill.border,
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-body)',
                    border: '1px solid',
                    padding: '0.25em 0.6em',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3em',
                  }}
                >
                  {pill.label}
                  <strong style={{ fontWeight: 900 }}>{pill.pts}</strong>
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* ── Leaderboard table ── */}
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="px-4 py-3 section-label w-12">#</th>
                  <th className="px-4 py-3 section-label">Contributor</th>
                  <th className="px-4 py-3 section-label text-center">Endorsed</th>
                  <th className="px-4 py-3 section-label text-center">Idea</th>
                  <th className="px-4 py-3 section-label text-center">Needs Review</th>
                  <th className="px-4 py-3 section-label text-center">Resolved</th>
                  <th className="px-4 py-3 section-label text-center">Reviews</th>
                  <th className="px-4 py-3 section-label text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {entries.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    onClick={() => navigate(`/users/${entry.userId}`)}
                    className="cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p style={{ fontWeight: 600 }}>{entry.author}</p>
                      <p
                        style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-muted)' }}
                      >
                        {entry.initials}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.endorsed || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.idea || 0}</td>
                    <td
                      className="px-4 py-3 text-center tabular-nums"
                      style={{ color: 'var(--badge-needs-review-text)' }}
                    >
                      {entry.badges.needsReview || 0}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.badges.resolved || 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{entry.reviewsGiven || 0}</td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ fontWeight: 700, color: 'var(--color-accent)' }}
                    >
                      {entry.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entries.length === 0 && (
            <div className="text-center py-14" style={{ color: 'var(--color-text-muted)' }}>
              No contributors with a score yet.
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Leaderboard;
