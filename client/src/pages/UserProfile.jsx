import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ArrowLeft, BookOpen, Clock, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

/* ── Stage config ─────────────────────────────────────────── */
const STAGE_CONFIG = {
  'On Test':      { label: 'In Testing',   cls: 'status-badge status-idea' },
  'Endorsed':     { label: 'Endorsed',     cls: 'status-badge status-endorsed' },
  'Published':    { label: 'Published',    cls: 'status-badge status-endorsed' },
  'Review':       { label: 'Under Review', cls: 'status-badge status-resolved' },
  'Idea':         { label: 'Idea',         cls: 'status-badge status-idea' },
  'Needs Review': { label: 'Needs Edits',  cls: 'status-badge status-needs-review' },
};

/* ── Animated math background ─────────────────────────────── */
const MATH_SYMBOLS = [
  '∑','∫','∂','√','∞','∈','∉','⊂','⊃','∪','∩','∀','∃','⟹','⟺',
  'π','φ','θ','λ','Δ','∇','≡','≈','≤','≥','⊕','⊗','ℝ','ℤ','ℕ',
  '∏','∮','∝','⌊','⌋','⌈','⌉','⊥','∥','∠','△','α','β','γ','ε',
];

const MathBackground = () => {
  const symbols = useMemo(() => Array.from({ length: 38 }, (_, i) => ({
    id: i,
    symbol: MATH_SYMBOLS[i % MATH_SYMBOLS.length],
    left: `${(i * 7.3 + 3) % 97}%`,
    top:  `${(i * 11.7 + 5) % 90}%`,
    size: 11 + (i % 5) * 4,
    delay: (i * 0.19) % 4,
    dur:   6 + (i % 4) * 2,
    opacity: 0.04 + (i % 3) * 0.015,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {symbols.map(s => (
        <span key={s.id} style={{
          position: 'absolute', left: s.left, top: s.top,
          fontSize: `${s.size}px`, color: 'var(--color-text)',
          opacity: s.opacity, fontFamily: 'var(--font-display)',
          animation: `float-sym ${s.dur}s ease-in-out ${s.delay}s infinite alternate`,
          userSelect: 'none',
        }}>{s.symbol}</span>
      ))}
      <style>{`@keyframes float-sym { from{transform:translateY(0px) rotate(-4deg)} to{transform:translateY(-10px) rotate(4deg)} }`}</style>
    </div>
  );
};

const StatTile = ({ label, value, accent = false }) => (
  <div className="text-right">
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: 'var(--color-text-faint)' }}>{label}</p>
    <p className="tabular-nums leading-none" style={{
      fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800,
      color: accent ? 'var(--color-accent)' : 'var(--color-text)',
    }}>{value}</p>
  </div>
);

/* ── Main component ───────────────────────────────────────── */
const UserProfile = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('problems');

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profileRes, statsRes] = await Promise.all([
        api.get(`/user/${id}`),
        api.get(`/stats/user/${id}`),
      ]);
      setProfile(profileRes.data);
      setStats(statsRes.data);
    } catch {
      setError('User not found.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64 gap-3" style={{ color: 'var(--color-text-muted)' }}>
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm">Loading profile…</span>
      </div>
    </Layout>
  );

  if (error || !profile) return (
    <Layout>
      <div className="max-w-xs mx-auto text-center pt-20">
        <AlertCircle size={36} className="mx-auto mb-4" style={{ color: 'var(--color-text-faint)' }} />
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>{error || 'User not found.'}</p>
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={13} /> Go back
        </button>
      </div>
    </Layout>
  );

  const initials = profile.initials || `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`;
  const reviews  = (profile.feedbacks || []).filter(f => !f.isEndorsement);

  // STATUS_POINTS mirrors server for score breakdown display
  const STATUS_POINTS = { Endorsed: 5, Idea: 2, 'Needs Review': -2, Resolved: 3 };

  return (
    <Layout noPadding>

      {/* HERO */}
      <div className="relative overflow-hidden"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <MathBackground />

        {/* Back */}
        <div className="relative z-10 px-8 pt-5">
          <button onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors"
            style={{ color: 'var(--color-text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-faint)'}>
            <ArrowLeft size={11} /> Back
          </button>
        </div>

        {/* Identity + stats */}
        <div className="relative z-10 flex flex-wrap items-end gap-5 px-8 pt-5 pb-7">
          {/* Avatar */}
          <div className="flex items-center justify-center shrink-0" style={{
            width: '4.5rem', height: '4.5rem',
            background: 'var(--color-accent)', color: 'var(--color-text-inverse)',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)',
            fontWeight: 800, letterSpacing: '0.04em',
            boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          }}>{initials}</div>

          {/* Name + subtitle */}
          <div className="flex-1 min-w-0">
            <h1 className="leading-tight" style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
              fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em',
            }}>{profile.firstName} {profile.lastName}</h1>
            <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--color-text-faint)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {stats?.totalProblems ?? '—'} problems &middot; {stats?.reviewsGiven ?? '—'} reviews given
              {stats?.rank ? ` · #${stats.rank} of ${stats.total}` : ''}
            </p>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-6 shrink-0 pb-0.5">
            <StatTile label="Score"    value={stats?.score ?? '—'} accent />
            <div className="w-px h-10" style={{ background: 'var(--color-border)' }} />
            <StatTile label="Problems" value={stats?.totalProblems ?? '—'} />
            <div className="w-px h-10" style={{ background: 'var(--color-border)' }} />
            <StatTile label="Endorsed" value={stats?.badges?.endorsed ?? '—'} />
          </div>
        </div>

        {/* Tabs */}
        <div className="relative z-10 flex gap-0 px-8" style={{ borderTop: '1px solid var(--color-border)' }}>
          {[
            { key: 'problems', label: 'Problems',     icon: BookOpen,     count: profile.problems.length },
            { key: 'reviews',  label: 'Reviews Given', icon: MessageSquare, count: reviews.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className="relative flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition-colors"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === key ? 'var(--color-accent)' : 'var(--color-text-faint)',
                borderBottom: tab === key ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}>
              <Icon size={11} />
              {label}
              <span className="tabular-nums" style={{
                fontFamily: 'monospace', fontSize: '0.65rem', padding: '0.05rem 0.35rem',
                background: tab === key ? 'var(--color-accent)' : 'var(--color-surface-offset)',
                color: tab === key ? 'var(--color-text-inverse)' : 'var(--color-text-faint)',
                border: '1px solid var(--color-border)',
              }}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="w-full max-w-[1060px] mx-auto px-8 py-7 pb-16">
        <div className="profile-body" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-5)' }}>
          <style>{`
            @media (min-width: 1024px) {
              .profile-body { grid-template-columns: 240px 1fr !important; align-items: start; }
              .profile-sidebar { position: sticky; top: var(--space-6); }
            }
          `}</style>

          {/* SIDEBAR */}
          <div className="profile-sidebar flex flex-col gap-4">

            {/* Score breakdown */}
            <div className="surface-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3"
                style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <span className="section-label">Score Breakdown</span>
              </div>
              <div className="flex flex-col">
                {[
                  { label: 'Endorsed',    key: 'endorsed',    pts: STATUS_POINTS.Endorsed,        cls: 'status-badge status-endorsed' },
                  { label: 'Idea',        key: 'idea',         pts: STATUS_POINTS.Idea,            cls: 'status-badge status-idea' },
                  { label: 'Needs Edits', key: 'needsReview',  pts: STATUS_POINTS['Needs Review'], cls: 'status-badge status-needs-review' },
                  { label: 'Resolved',    key: 'resolved',     pts: STATUS_POINTS.Resolved,        cls: 'status-badge status-resolved' },
                  { label: 'Reviews',     key: null,           pts: 0.5,                           cls: null },
                ].map(({ label, key, pts, cls }) => {
                  const value = key ? (stats?.badges?.[key] ?? 0) : (stats?.reviewsGiven ?? 0);
                  return (
                    <div key={label} className="flex items-center justify-between px-5 py-2.5"
                      style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <div className="flex items-center gap-2">
                        {cls
                          ? <span className={cls} style={{ fontSize: '0.65rem' }}>{label}</span>
                          : <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                        }
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-faint)', fontFamily: 'monospace' }}>
                          ×+{pts}
                        </span>
                      </div>
                      <span className="tabular-nums font-bold" style={{
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: 'var(--color-text)',
                      }}>{value}</span>
                    </div>
                  );
                })}
                {/* Total */}
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ background: 'var(--color-surface-2)' }}>
                  <span className="section-label">Total</span>
                  <span className="tabular-nums" style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                    fontWeight: 800, color: 'var(--color-accent)',
                  }}>{stats?.score ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* Background */}
            {profile.mathExp && (
              <div className="surface-card p-5">
                <p className="section-label mb-3">Background</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{profile.mathExp}</p>
              </div>
            )}
          </div>

          {/* MAIN PANEL */}
          {tab === 'problems' ? (
            <div className="surface-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-2">
                  <BookOpen size={13} style={{ color: 'var(--color-text-faint)' }} />
                  <span className="section-label">Submissions</span>
                </div>
                <span className="tabular-nums font-bold text-[10px]" style={{
                  fontFamily: 'monospace', color: 'var(--color-text-faint)',
                  background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)',
                  padding: '0.1rem 0.45rem',
                }}>{profile.problems.length}</span>
              </div>

              {profile.problems.length > 0 && (
                <div className="grid px-5 py-2" style={{
                  gridTemplateColumns: '1fr auto',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-offset)',
                }}>
                  <span className="section-label">Problem</span>
                  <span className="section-label">Status</span>
                </div>
              )}

              <div className="flex flex-col">
                {profile.problems.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>No submissions yet.</p>
                  </div>
                ) : profile.problems.map((p) => {
                  const cfg = STAGE_CONFIG[p.stage] || { label: p.stage, cls: 'status-badge status-idea' };
                  return (
                    <Link key={p.id} to={`/problem/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div
                        className="flex items-center justify-between gap-4 px-5 py-4 transition-colors"
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold tabular-nums" style={{
                              fontFamily: 'monospace', fontSize: 'var(--text-sm)',
                              color: 'var(--color-accent)', letterSpacing: '0.03em',
                            }}>{p.id}</span>
                            {(p.topics || []).map(t => (
                              <span key={t} className="text-[0.65rem] font-bold uppercase tracking-[0.04em]" style={{
                                padding: '0.1rem 0.4rem',
                                background: 'var(--color-surface-offset)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-faint)',
                              }}>{t}</span>
                            ))}
                          </div>
                          {p.latex && (
                            <p className="text-xs truncate max-w-[420px]" style={{ color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                              {p.latex.replace(/[$#\\{}]/g, '').substring(0, 80)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {p.endorsements > 0 && (
                            <span className="flex items-center gap-0.5 text-xs font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                              <Star size={10} fill="currentColor" />{p.endorsements}
                            </span>
                          )}
                          <span className={cfg.cls}>{cfg.label}</span>
                          <span className="hidden sm:flex items-center gap-0.5 text-xs tabular-nums" style={{ color: 'var(--color-text-faint)' }}>
                            <Clock size={10} />{new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            /* REVIEWS TAB */
            <div className="surface-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={13} style={{ color: 'var(--color-text-faint)' }} />
                  <span className="section-label">Reviews Given</span>
                </div>
                <span className="tabular-nums font-bold text-[10px]" style={{
                  fontFamily: 'monospace', color: 'var(--color-text-faint)',
                  background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)',
                  padding: '0.1rem 0.45rem',
                }}>{reviews.length}</span>
              </div>
              {reviews.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>No reviews given yet.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {reviews.map((f) => {
                    if (!f.problem) return null;
                    const cfg = STAGE_CONFIG[f.problem.stage] || { label: f.problem.stage, cls: 'status-badge status-idea' };
                    return (
                      <Link key={f.id} to={`/problem/${f.problemId}`} style={{ textDecoration: 'none' }}>
                        <div
                          className="flex items-center justify-between gap-4 px-5 py-4 transition-colors"
                          style={{ borderBottom: '1px solid var(--color-border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold tabular-nums" style={{
                                fontFamily: 'monospace', fontSize: 'var(--text-sm)',
                                color: 'var(--color-accent)', letterSpacing: '0.03em',
                              }}>{f.problemId}</span>
                              {(f.problem.topics || []).map(t => (
                                <span key={t} className="text-[0.65rem] font-bold uppercase tracking-[0.04em]" style={{
                                  padding: '0.1rem 0.4rem',
                                  background: 'var(--color-surface-offset)',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-text-faint)',
                                }}>{t}</span>
                              ))}
                            </div>
                            {f.problem.latex && (
                              <p className="text-xs truncate max-w-[420px]" style={{ color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                {f.problem.latex.replace(/[$#\\{}]/g, '').substring(0, 80)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={cfg.cls}>{cfg.label}</span>
                            <span className="hidden sm:flex items-center gap-0.5 text-xs tabular-nums" style={{ color: 'var(--color-text-faint)' }}>
                              <Clock size={10} />{new Date(f.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
