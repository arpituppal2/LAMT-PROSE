import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ArrowLeft, BookOpen, Clock, Loader2 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const STAGE_CONFIG = {
  'On Test':      { label: 'In Testing',    cls: 'status-badge status-idea' },
  'Endorsed':     { label: 'Endorsed',      cls: 'status-badge status-endorsed' },
  'Published':    { label: 'Published',     cls: 'status-badge status-endorsed' },
  'Review':       { label: 'Under Review',  cls: 'status-badge status-resolved' },
  'Idea':         { label: 'Idea',          cls: 'status-badge status-idea' },
  'Needs Review': { label: 'Needs Edits',   cls: 'status-badge status-needs-review' },
};

const UserProfile = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

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
    let totalEndorsements = 0;
    profile.problems.forEach((p) => {
      counts[p.stage] = (counts[p.stage] || 0) + 1;
      totalEndorsements += (p.endorsements || 0);
    });
    return { counts, totalEndorsements };
  }, [profile]);

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem', gap: 'var(--space-3)', color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: 'var(--text-base)' }}>Loading profile…</span>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div style={{ maxWidth: '24rem', margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-20)' }}>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>{error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={14} /> Go back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: 'var(--space-6)',
            transition: 'color var(--transition-ui)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }} className="profile-grid">
          <style>{`@media (min-width: 1024px) { .profile-grid { grid-template-columns: 300px 1fr !important; } }`}</style>

          {/* ── Left: profile card ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Identity */}
            <div className="surface-card" style={{ padding: 'var(--space-6)' }}>
              {/* Avatar */}
              <div
                style={{
                  width: '3.25rem',
                  height: '3.25rem',
                  background: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-inverse)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-4)',
                  flexShrink: 0,
                }}
              >
                {profile.initials}
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  lineHeight: 1.2,
                }}
              >
                {profile.firstName} {profile.lastName}
              </h1>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-faint)',
                  marginTop: 'var(--space-1)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                {profile.initials}
              </p>

              {profile.mathExp && (
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.65,
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 'var(--space-4)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  {profile.mathExp}
                </p>
              )}

              {/* Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 'var(--space-4)',
                }}
              >
                <div>
                  <p className="section-label" style={{ marginBottom: 'var(--space-1)' }}>Problems</p>
                  <p
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--color-text)',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}
                  >
                    {profile.problems.length}
                  </p>
                </div>
                <div>
                  <p className="section-label" style={{ marginBottom: 'var(--space-1)' }}>Endorsed</p>
                  <p
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--color-cta-bg)',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}
                  >
                    {stats.totalEndorsements}
                  </p>
                </div>
              </div>
            </div>

            {/* By status */}
            <div className="surface-card" style={{ padding: 'var(--space-4)' }}>
              <p className="section-label" style={{ marginBottom: 'var(--space-3)' }}>By status</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {Object.entries(stats.counts).map(([stage, count]) => {
                  const cfg = STAGE_CONFIG[stage] || { cls: 'status-badge status-idea', label: stage };
                  return (
                    <span key={stage} className={cfg.cls}>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                      {' '}{cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right: submissions ── */}
          <div className="surface-card" style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-5)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <BookOpen size={15} style={{ color: 'var(--color-text-faint)' }} />
              <h2
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                Submissions
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {profile.problems.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--space-16) var(--space-8)',
                    textAlign: 'center',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-faint)',
                  }}
                >
                  No submissions yet.
                </div>
              ) : profile.problems.map((p) => (
                <Link
                  key={p.id}
                  to={`/problem/${p.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-4) var(--space-5)',
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background var(--transition-ui)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: 'var(--color-accent)',
                          }}
                        >
                          {p.id}
                        </span>
                        {(p.topics || []).map((t) => (
                          <span
                            key={t}
                            style={{
                              padding: '0.1rem 0.5rem',
                              background: 'var(--color-surface-offset)',
                              border: '1px solid var(--color-border)',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-text-faint)',
                              fontWeight: 500,
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      {p.latex && (
                        <p
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '420px',
                          }}
                        >
                          {p.latex.replace(/[$#\\]/g, '').substring(0, 70)}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0, marginLeft: 'var(--space-4)' }}>
                      {p.endorsements > 0 && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-cta-bg)',
                            fontWeight: 700,
                          }}
                        >
                          <Star size={11} fill="currentColor" />
                          {p.endorsements}
                        </span>
                      )}
                      <span className={STAGE_CONFIG[p.stage]?.cls || 'status-badge status-idea'}>
                        {STAGE_CONFIG[p.stage]?.label || p.stage}
                      </span>
                      <span
                        style={{
                          display: 'none',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-faint)',
                        }}
                        className="profile-date"
                      >
                        <Clock size={11} />
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <style>{`@media (min-width: 768px) { .profile-date { display: inline-flex !important; } }`}</style>
      </div>
    </Layout>
  );
};

export default UserProfile;
