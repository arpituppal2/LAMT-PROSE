import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ArrowLeft, BookOpen, Clock, Loader2, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

/* ── Stage config ────────────────────────────────────────────── */
const STAGE_CONFIG = {
  'On Test':      { label: 'In Testing',   cls: 'status-badge status-idea' },
  'Endorsed':     { label: 'Endorsed',     cls: 'status-badge status-endorsed' },
  'Published':    { label: 'Published',    cls: 'status-badge status-endorsed' },
  'Review':       { label: 'Under Review', cls: 'status-badge status-resolved' },
  'Idea':         { label: 'Idea',         cls: 'status-badge status-idea' },
  'Needs Review': { label: 'Needs Edits',  cls: 'status-badge status-needs-review' },
};

/* ── Animated math-symbol background (same as other hero pages) ── */
const MATH_SYMBOLS = [
  '∑','∫','∂','√','∞','∈','∉','⊂','⊃','∪','∩','∀','∃','⟹','⟺',
  'π','φ','θ','λ','Δ','∇','≡','≈','≤','≥','⊕','⊗','ℝ','ℤ','ℕ',
  '∏','∮','∝','⌊','⌋','⌈','⌉','⊥','∥','∠','△','α','β','γ','ε',
];

const MathBackground = () => {
  const symbols = useMemo(() => {
    return Array.from({ length: 38 }, (_, i) => ({
      id: i,
      symbol: MATH_SYMBOLS[i % MATH_SYMBOLS.length],
      left: `${(i * 7.3 + 3) % 97}%`,
      top:  `${(i * 11.7 + 5) % 90}%`,
      size: 11 + (i % 5) * 4,
      delay: (i * 0.19) % 4,
      dur:   6 + (i % 4) * 2,
      opacity: 0.045 + (i % 3) * 0.018,
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
      {symbols.map(s => (
        <span
          key={s.id}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            fontSize: `${s.size}px`,
            color: 'var(--color-text)',
            opacity: s.opacity,
            fontFamily: 'var(--font-display)',
            animation: `float-symbol ${s.dur}s ease-in-out ${s.delay}s infinite alternate`,
            userSelect: 'none',
          }}
        >
          {s.symbol}
        </span>
      ))}
      <style>{`
        @keyframes float-symbol {
          from { transform: translateY(0px) rotate(-4deg); }
          to   { transform: translateY(-10px) rotate(4deg); }
        }
      `}</style>
    </div>
  );
};

/* ── Main component ──────────────────────────────────────────── */
const UserProfile = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/user/${id}`);
      setProfile(res.data);
    } catch {
      setError('User not found.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!profile) return null;
    const counts = {};
    let endorsed = 0;
    profile.problems.forEach((p) => {
      counts[p.stage] = (counts[p.stage] || 0) + 1;
      if (p.stage === 'Endorsed' || p.stage === 'Published') endorsed++;
      endorsed += (p.endorsements || 0);
    });
    // deduplicate: count problems whose stage is endorsed separately from endorsement votes
    // Actually just count total endorsement votes as before
    let totalEndorsements = 0;
    profile.problems.forEach((p) => {
      totalEndorsements += (p.endorsements || 0);
    });
    return { counts, totalEndorsements };
  }, [profile]);

  /* ── Loading ── */
  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '20rem', gap: 'var(--space-3)', color: 'var(--color-text-muted)' }}>
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: 'var(--text-sm)' }}>Loading profile…</span>
      </div>
    </Layout>
  );

  /* ── Error ── */
  if (error || !profile) return (
    <Layout>
      <div style={{ maxWidth: '24rem', margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-20)' }}>
        <AlertCircle size={36} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} />
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>{error || 'User not found.'}</p>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    </Layout>
  );

  const initials = profile.initials || `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`;

  return (
    <Layout noPadding>

      {/* ═══════════════════════════════════════════════════════
          HERO HEADER
      ═══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'relative',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <MathBackground />

        {/* Back nav */}
        <div style={{ position: 'relative', zIndex: 1, padding: 'var(--space-5) var(--space-8) 0' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color var(--transition-ui)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-faint)'}
          >
            <ArrowLeft size={12} /> Back
          </button>
        </div>

        {/* Identity row */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 'var(--space-5)',
            padding: 'var(--space-6) var(--space-8) var(--space-7)',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '4.5rem',
              height: '4.5rem',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-inverse)',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              letterSpacing: '0.04em',
              flexShrink: 0,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            {initials}
          </div>

          {/* Name + handle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 800,
                color: 'var(--color-text)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              {profile.firstName} {profile.lastName}
            </h1>
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-faint)',
                marginTop: 'var(--space-1)',
                letterSpacing: '0.06em',
              }}
            >
              {initials}
            </p>
          </div>

          {/* Stats strip — right aligned */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-6)',
              flexShrink: 0,
              paddingBottom: 'var(--space-1)',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-faint)',
                  marginBottom: '0.2rem',
                }}
              >
                Problems
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 800,
                  color: 'var(--color-text)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {profile.problems.length}
              </p>
            </div>
            <div
              style={{
                width: '1px',
                height: '2.5rem',
                background: 'var(--color-border)',
                alignSelf: 'center',
              }}
            />
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-faint)',
                  marginBottom: '0.2rem',
                }}
              >
                Endorsed
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 800,
                  color: 'var(--color-cta-bg)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stats.totalEndorsements}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BODY
      ═══════════════════════════════════════════════════════ */}
      <div
        style={{
          maxWidth: '1060px',
          margin: '0 auto',
          padding: 'var(--space-7) var(--space-8) var(--space-16)',
        }}
      >
        <div
          className="profile-body"
          style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-5)' }}
        >
          <style>{`
            @media (min-width: 1024px) {
              .profile-body { grid-template-columns: 268px 1fr !important; align-items: start; }
              .profile-sidebar { position: sticky; top: var(--space-6); }
            }
            @media (min-width: 768px) { .profile-date { display: inline-flex !important; } }
          `}</style>

          {/* ── SIDEBAR ── */}
          <div className="profile-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Bio */}
            {profile.mathExp && (
              <div className="surface-card" style={{ padding: 'var(--space-5)' }}>
                <p
                  className="section-label"
                  style={{ marginBottom: 'var(--space-3)' }}
                >
                  Background
                </p>
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.7,
                  }}
                >
                  {profile.mathExp}
                </p>
              </div>
            )}

            {/* By status */}
            <div className="surface-card" style={{ padding: 'var(--space-5)' }}>
              <p className="section-label" style={{ marginBottom: 'var(--space-3)' }}>By Status</p>
              {Object.keys(stats.counts).length === 0 ? (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>No submissions yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {Object.entries(stats.counts).map(([stage, count]) => {
                    const cfg = STAGE_CONFIG[stage] || { cls: 'status-badge status-idea', label: stage };
                    return (
                      <div
                        key={stage}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-2) var(--space-3)',
                          background: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <span className={cfg.cls} style={{ fontSize: '0.68rem' }}>
                          {cfg.label}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── SUBMISSIONS PANEL ── */}
          <div className="surface-card" style={{ overflow: 'hidden' }}>

            {/* Panel header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-5)',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <BookOpen size={13} style={{ color: 'var(--color-text-faint)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Submissions
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--color-text-faint)',
                  fontVariantNumeric: 'tabular-nums',
                  background: 'var(--color-surface-offset)',
                  border: '1px solid var(--color-border)',
                  padding: '0.1rem 0.5rem',
                }}
              >
                {profile.problems.length}
              </span>
            </div>

            {/* Column labels */}
            {profile.problems.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  padding: 'var(--space-2) var(--space-5)',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-offset)',
                }}
              >
                <span className="section-label">Problem</span>
                <span className="section-label">Status</span>
              </div>
            )}

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {profile.problems.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--space-16) var(--space-8)',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    No submissions yet.
                  </p>
                </div>
              ) : (
                profile.problems.map((p, idx) => {
                  const cfg = STAGE_CONFIG[p.stage] || { label: p.stage, cls: 'status-badge status-idea' };
                  return (
                    <Link key={p.id} to={`/problem/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--space-4)',
                          padding: 'var(--space-4) var(--space-5)',
                          borderBottom: idx < profile.problems.length - 1
                            ? '1px solid var(--color-border)'
                            : 'none',
                          transition: 'background var(--transition-ui)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Left: ID + topic chips + preview */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                              marginBottom: 'var(--space-1)',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 700,
                                color: 'var(--color-accent)',
                                letterSpacing: '0.03em',
                              }}
                            >
                              {p.id}
                            </span>
                            {(p.topics || []).map(t => (
                              <span
                                key={t}
                                style={{
                                  padding: '0.1rem 0.45rem',
                                  background: 'var(--color-surface-offset)',
                                  border: '1px solid var(--color-border)',
                                  fontSize: '0.67rem',
                                  color: 'var(--color-text-faint)',
                                  fontWeight: 600,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                          {p.latex && (
                            <p
                              style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '420px',
                                lineHeight: 1.5,
                              }}
                            >
                              {p.latex.replace(/[$#\\{}]/g, '').substring(0, 80)}
                            </p>
                          )}
                        </div>

                        {/* Right: endorsements + status + date */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            flexShrink: 0,
                          }}
                        >
                          {p.endorsements > 0 && (
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'var(--color-cta-bg)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              <Star size={10} fill="currentColor" />
                              {p.endorsements}
                            </span>
                          )}
                          <span className={cfg.cls}>{cfg.label}</span>
                          <span
                            className="profile-date"
                            style={{
                              display: 'none',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-text-faint)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            <Clock size={10} />
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
