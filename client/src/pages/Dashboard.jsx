import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import { getProblemStatus, STATUS_BADGE_CLASS } from '../utils/problemStatus';

const DRAFTS_KEY = 'prose_drafts_v1';
const DASHBOARD_TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'review',     label: 'Review Queue' },
  { id: 'myreviews',  label: 'My Reviews' },
  { id: 'account',    label: 'Account' },
];
const STATUS_FILTERS = [
  { value: 'all',          label: 'All' },
  { value: 'Needs Review', label: 'Needs Review' },
  { value: 'Resolved',     label: 'Resolved' },
  { value: 'Idea',         label: 'Idea' },
  { value: 'Endorsed',     label: 'Endorsed' },
];
const TOPIC_OPTIONS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

const normStatus = (p) => p._displayStatus || getProblemStatus(p, p.feedbacks);

const stripLatex = (str = '') =>
  str
    .replace(/\$\$[\s\S]*?\$\$/g, '[…]')
    .replace(/\$[^$]*?\$/g, (m) => m.slice(1, -1))
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/[\\{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 110);

const formatRelativeDate = (dateLike) => {
  if (!dateLike) return '—';
  const date = new Date(dateLike);
  const diffHours = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 24) return `${Math.max(diffHours, 0)}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold border ${STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.Idea}`}>
    {status}
  </span>
);

/* ── Preview modal — rendered via portal so position:fixed is always
      relative to the viewport, not the scrollable <main> container. ── */
const PreviewPanel = ({ problem, fullProblem, onClose, onNavigate, onArchive, onDelete }) => {
  const [showSol, setShowSol] = useState(false);
  const data = fullProblem || problem;
  if (!data) return null;

  const comments = data.feedbacks || [];

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        background: 'rgba(8, 12, 18, 0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          borderRadius: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: 'var(--color-accent)',
                }}
              >
                {data.id}
              </span>
              <StatusBadge status={normStatus(data)} />
            </div>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {(data.topics || []).join(' · ') || 'No topic tags'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2rem',
              height: '2rem',
              flexShrink: 0,
              color: 'var(--color-text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 180ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            aria-label="Close preview"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Problem statement */}
          <section>
            <p className="section-label" style={{ marginBottom: '0.625rem' }}>Problem</p>
            <div style={{ fontSize: '15px', lineHeight: '1.75', fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}>
              {data.latex
                ? <KatexRenderer latex={data.latex} />
                : <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>No problem text</span>
              }
            </div>
          </section>

          {/* Topics + difficulty */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <section>
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Topics</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {(data.topics || []).length > 0
                  ? (data.topics).map((topic) => (
                      <span
                        key={topic}
                        style={{
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface-2)',
                          padding: '0.2rem 0.625rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          fontFamily: 'var(--font-body)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {topic}
                      </span>
                    ))
                  : <span style={{ fontSize: '0.8rem', color: 'var(--color-text-faint)' }}>—</span>
                }
              </div>
            </section>
            <section>
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Difficulty</p>
              <p style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-accent)', lineHeight: 1 }}>
                {parseInt(data.quality, 10) || '?'}
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/10</span>
              </p>
            </section>
          </div>

          {/* Answer */}
          {data.answer && (
            <section>
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Answer</p>
              <div
                style={{
                  display: 'inline-flex',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  padding: '0.375rem 0.75rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                <KatexRenderer latex={data.answer} />
              </div>
            </section>
          )}

          {/* Solution toggle */}
          {data.solution && (
            <section style={{ border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowSol((s) => !s)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--color-surface-2)',
                  padding: '0.625rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'background 180ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-offset)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
              >
                <span>{showSol ? 'Hide Solution' : 'Show Solution'}</span>
                {showSol ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showSol && (
                <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem', fontSize: '15px', lineHeight: '1.75', fontFamily: 'var(--font-body)' }}>
                  <KatexRenderer latex={data.solution} />
                </div>
              )}
            </section>
          )}

          {/* Author notes */}
          {data.notes && (
            <section
              style={{
                border: '1px solid var(--badge-idea-border)',
                background: 'var(--badge-idea-bg)',
                padding: '0.875rem 1rem',
              }}
            >
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Author Notes</p>
              <div style={{ fontSize: '0.875rem', lineHeight: '1.65', fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
                <KatexRenderer latex={data.notes} />
              </div>
            </section>
          )}

          {/* Review thread */}
          {comments.length > 0 && (
            <section>
              <p className="section-label" style={{ marginBottom: '0.625rem' }}>
                Review Thread
                <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--color-text-faint)' }}>({comments.length})</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {comments.map((fb, idx) => (
                  <div
                    key={fb.id || idx}
                    style={{
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-2)',
                      padding: '0.75rem 1rem',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}>
                        {fb.reviewer?.firstName} {fb.reviewer?.lastName}
                      </span>
                      <StatusBadge status={fb.isEndorsement ? 'Endorsed' : fb.resolved ? 'Resolved' : 'Needs Review'} />
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {formatRelativeDate(fb.createdAt)}
                      </span>
                    </div>
                    {(fb.comment || fb.feedback) && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                        {fb.comment || fb.feedback}
                      </p>
                    )}
                    {fb.answer && (
                      <div style={{ marginTop: '0.375rem', fontSize: '0.78rem', color: 'var(--color-text-faint)' }}>
                        Solver answer:{' '}
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          <KatexRenderer latex={fb.answer} />
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.625rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => { onClose(); onNavigate(data.id); }}
              className="btn-primary btn-sm"
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Archive problem ${data.id}? It can be restored from the Archive page.`)) {
                  onArchive(data.id);
                  onClose();
                }
              }}
              className="btn-outline btn-sm"
            >
              Archive
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Permanently delete problem ${data.id}? This cannot be undone.`)) {
                  onDelete(data.id);
                  onClose();
                }
              }}
              className="btn-outline btn-sm"
              style={{ '--hover-bg': 'rgb(220 38 38)', '--hover-border': 'rgb(220 38 38)', '--hover-color': '#fff' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.borderColor = '#dc2626';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '';
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.color = '';
              }}
            >
              Delete
            </button>
            <button onClick={onClose} className="btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const activeTab    = searchParams.get('view')   || 'overview';
  const statusFilter = searchParams.get('status') || 'all';
  const topicFilter  = searchParams.get('topic')  || 'all';
  const query        = searchParams.get('q')      || '';

  const [problems,         setProblems]         = useState([]);
  const [myFeedback,       setMyFeedback]        = useState([]);
  const [reviewProblems,   setReviewProblems]    = useState([]);
  const [dashboardLoading, setDashboardLoading]  = useState(true);
  const [reviewLoading,    setReviewLoading]     = useState(false);
  const [previewProblem,   setPreviewProblem]    = useState(null);
  const [previewFull,      setPreviewFull]       = useState(null);

  const setParam = (key, value, defaultValue = '') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === defaultValue) next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    if (activeTab === 'review') fetchReviewProblems();
  }, [activeTab]);

  useEffect(() => {
    if (!previewProblem) { setPreviewFull(null); return; }
    api.get(`/problems/${previewProblem.id}`)
      .then((res) => setPreviewFull(res.data))
      .catch(() => setPreviewFull(previewProblem));
  }, [previewProblem]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const [problemsRes, feedbackRes] = await Promise.all([
        api.get('/problems/my'),
        api.get('/feedback/my-feedback'),
      ]);
      const safeProblems = (problemsRes.data || []).filter(
        (p) => p.stage !== 'Archived' && normStatus(p) !== 'Archived',
      );
      setProblems(safeProblems);
      setMyFeedback(feedbackRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchReviewProblems = async () => {
    setReviewLoading(true);
    try {
      const res = await api.get('/problems/my');
      const flagged = (res.data || []).filter(
        (p) => normStatus(p) === 'Needs Review' && p.stage !== 'Archived',
      );
      setReviewProblems(flagged);
    } catch (error) {
      console.error('Failed to load review queue', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleArchive = async (problemId) => {
    try {
      await api.patch(`/problems/${problemId}`, { stage: 'Archived' });
      setProblems((prev) => prev.filter((p) => p.id !== problemId));
    } catch {
      alert('Failed to archive problem.');
    }
  };

  const handleDelete = async (problemId) => {
    try {
      await api.delete(`/problems/${problemId}`);
      setProblems((prev) => prev.filter((p) => p.id !== problemId));
    } catch {
      alert('Failed to delete problem.');
    }
  };

  const handleDeleteFeedback = async (e, feedbackId) => {
    e.stopPropagation();
    if (!window.confirm('Remove this review?')) return;
    try {
      await api.delete(`/feedback/${feedbackId}`);
      setMyFeedback((prev) => prev.filter((fb) => fb.id !== feedbackId));
    } catch {
      alert('Failed to remove review.');
    }
  };

  const counts = useMemo(() => ({
    all:           problems.length,
    'Needs Review': problems.filter((p) => normStatus(p) === 'Needs Review').length,
    Resolved:      problems.filter((p) => normStatus(p) === 'Resolved').length,
    Idea:          problems.filter((p) => normStatus(p) === 'Idea').length,
    Endorsed:      problems.filter((p) => normStatus(p) === 'Endorsed').length,
  }), [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      const preview  = stripLatex(problem.latex || '');
      const status   = normStatus(problem);
      const searchOk = !query || `${problem.id} ${preview} ${(problem.topics || []).join(' ')}`.toLowerCase().includes(query.toLowerCase());
      const statusOk = statusFilter === 'all' || status === statusFilter;
      const topicOk  = topicFilter  === 'all' || (problem.topics || []).includes(topicFilter);
      return searchOk && statusOk && topicOk;
    });
  }, [problems, query, statusFilter, topicFilter]);

  if (dashboardLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-base text-[var(--color-text-muted)]">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-[1500px] space-y-5">
        {/* ── Page header ── */}
        <header className="flex items-center justify-between">
          <div>
            <span className="gold-rule mb-3" />
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Dashboard
            </h1>
          </div>
          <button onClick={() => navigate('/write')} className="btn-primary btn-sm">
            New Problem
          </button>
        </header>

        {/* ── Tabs ── */}
        <section className="surface-card">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {DASHBOARD_TABS.map((tab) => {
                const tabCount =
                  tab.id === 'review'    ? counts['Needs Review'] :
                  tab.id === 'myreviews' ? myFeedback.length :
                  tab.id === 'account'   ? null :
                  problems.length;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setParam('view', tab.id, 'overview')}
                    className={`btn-tab${active ? ' btn-tab--active' : ''}`}
                  >
                    {tab.label}
                    {tabCount !== null && (
                      <span className="btn-tab__count">{tabCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ════ OVERVIEW TAB ════ */}
          {activeTab === 'overview' && (
            <div className="space-y-4 p-4">
              {/* Filters + search row */}
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setParam('status', item.value, 'all')}
                      className={`btn-filter${statusFilter === item.value ? ' btn-filter--active' : ''}`}
                    >
                      {item.label}
                      <span className="btn-filter__count">
                        {item.value === 'all' ? counts.all : (counts[item.value] ?? 0)}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <label className="relative block" style={{ width: '280px' }}>
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
                    <input
                      value={query}
                      onChange={(e) => setParam('q', e.target.value)}
                      placeholder="Search ID, preview, topic"
                      className="input-base w-full py-2 pl-9 pr-3 text-sm"
                    />
                  </label>
                  <select
                    value={topicFilter}
                    onChange={(e) => setParam('topic', e.target.value, 'all')}
                    className="input-base px-3 py-2 text-sm"
                  >
                    <option value="all">All topics</option>
                    {TOPIC_OPTIONS.map((topic) => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Problem table */}
              <div className="overflow-hidden rounded-sm border border-[var(--color-border)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                        <th className="px-4 py-3 section-label">Problem</th>
                        <th className="px-4 py-3 section-label">Topics</th>
                        <th className="px-4 py-3 section-label">Difficulty</th>
                        <th className="px-4 py-3 section-label">Status</th>
                        <th className="px-4 py-3 section-label">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {filteredProblems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">
                            No authored problems match the current filters.
                          </td>
                        </tr>
                      ) : filteredProblems.map((problem) => {
                        const status = normStatus(problem);
                        return (
                          <tr
                            key={problem.id}
                            className="cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                            onClick={() => setPreviewProblem(problem)}
                          >
                            <td className="px-4 py-3 align-top">
                              <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{problem.id}</span>
                              <p className="mt-1 max-w-[400px] text-sm leading-6 text-[var(--color-text-muted)]">
                                {problem.latex ? `${stripLatex(problem.latex)}${problem.latex.length > 110 ? '…' : ''}` : 'No preview'}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex max-w-[200px] flex-wrap gap-1">
                                {(problem.topics || []).map((t) => (
                                  <span key={t} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium">{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-sm font-semibold tabular-nums">
                              {problem.quality ? `${parseInt(problem.quality, 10)}/10` : '—'}
                            </td>
                            <td className="px-4 py-3 align-top"><StatusBadge status={status} /></td>
                            <td className="px-4 py-3 align-top text-sm text-[var(--color-text-muted)]">
                              {formatRelativeDate(problem.updatedAt || problem.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ REVIEW QUEUE TAB ════ */}
          {activeTab === 'review' && (
            <div className="space-y-4 p-4">
              {reviewLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-[var(--color-text-muted)]">Loading…</div>
              ) : reviewProblems.length === 0 ? (
                <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
                  <span className="gold-rule mx-auto mb-4" />
                  <h2 className="text-xl font-semibold">No problems need review</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">Your queue is clear.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewProblems.map((problem) => {
                    const unresolved = (problem.feedbacks || []).filter((fb) => !fb.isEndorsement && !fb.resolved);
                    const latest = unresolved[0] || problem.feedbacks?.[0];
                    return (
                      <div
                        key={problem.id}
                        onClick={() => setPreviewProblem(problem)}
                        className="cursor-pointer surface-card p-4 hover:border-[var(--ucla-blue)] transition-colors"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{problem.id}</span>
                          <StatusBadge status="Needs Review" />
                          <span className="text-xs text-[var(--badge-needs-review-text)]">{unresolved.length} unresolved</span>
                          <span className="ml-auto text-xs text-[var(--color-text-muted)]">{formatRelativeDate(problem.updatedAt || problem.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                          {problem.latex ? `${stripLatex(problem.latex)}${problem.latex.length > 110 ? '…' : ''}` : 'No preview'}
                        </p>
                        {latest?.feedback && (
                          <div className="mt-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                            {latest.feedback}
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(problem.topics || []).map((t) => (
                            <span key={t} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium">{t}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════ MY REVIEWS TAB ════ */}
          {activeTab === 'myreviews' && (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="section-label">Review history</p>
                <button onClick={() => navigate('/feedback')} className="btn-primary btn-sm">
                  Give Feedback
                </button>
              </div>

              {myFeedback.length === 0 ? (
                <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
                  <span className="gold-rule mx-auto mb-4" />
                  <h2 className="text-xl font-semibold">No reviews yet</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">Start reviewing to build your history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myFeedback.map((fb) => {
                    const outcome = fb.isEndorsement ? 'Endorsed' : fb.resolved ? 'Resolved' : 'Needs Review';
                    return (
                      <div
                        key={fb.id}
                        className="cursor-pointer surface-card p-4 hover:border-[var(--ucla-blue)] transition-colors"
                        onClick={() => navigate(`/problem/${fb.problemId}`)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{fb.problemId}</span>
                          <StatusBadge status={outcome} />
                          <span className="text-xs text-[var(--color-text-muted)]">{formatRelativeDate(fb.createdAt)}</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFeedback(e, fb.id)}
                            className="ml-auto p-1.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {fb.answer && (
                          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                            Answer: <span className="font-mono"><KatexRenderer latex={fb.answer} /></span>
                          </p>
                        )}
                        {(fb.comment || fb.feedback) && (
                          <div className="mt-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                            {fb.comment || fb.feedback}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════ ACCOUNT TAB ════ */}
          {activeTab === 'account' && (
            <div className="space-y-5 p-4">
              <div>
                <span className="gold-rule mb-3" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Account</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="surface-card p-4">
                  <p className="section-label">Name</p>
                  <p className="mt-2 text-lg font-semibold">{user?.firstName} {user?.lastName}</p>
                </div>
                <div className="surface-card p-4">
                  <p className="section-label">Initials</p>
                  <p className="mt-2 text-lg font-semibold font-mono">{user?.initials || '—'}</p>
                </div>
                <div className="surface-card p-4">
                  <p className="section-label">Email</p>
                  <p className="mt-2 text-sm">{user?.email || '—'}</p>
                </div>
                <div className="surface-card p-4">
                  <p className="section-label">Problems authored</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">{problems.length}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{counts.Endorsed} endorsed</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Preview modal — portalled to document.body so position:fixed
          is always relative to the viewport, not the scrollable <main>. */}
      {previewProblem && (
        <PreviewPanel
          problem={previewProblem}
          fullProblem={previewFull}
          onClose={() => { setPreviewProblem(null); setPreviewFull(null); }}
          onNavigate={(id) => navigate(`/problem/${id}`)}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}
    </Layout>
  );
};

export default Dashboard;
