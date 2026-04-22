import { useState, useEffect, useMemo } from 'react';
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
  { id: 'overview', label: 'Overview' },
  { id: 'review', label: 'Review Queue' },
  { id: 'myreviews', label: 'My Reviews' },
  { id: 'account', label: 'Account' },
];
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'Needs Review', label: 'Needs Review' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Idea', label: 'Idea' },
  { value: 'Endorsed', label: 'Endorsed' },
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

const FilterChip = ({ active, children, onClick, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-[var(--ucla-blue)] text-white border-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] dark:text-black dark:border-[var(--ucla-gold)]'
        : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--ucla-blue)] dark:hover:border-[var(--ucla-blue-lighter)]'
    }`}
  >
    <span>{children}</span>
    {typeof count === 'number' && (
      <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-white/20 dark:bg-black/15' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
        {count}
      </span>
    )}
  </button>
);

/* ── Preview modal with edit / archive / delete / close ─── */
const PreviewPanel = ({ problem, fullProblem, onClose, onNavigate, onArchive, onDelete }) => {
  const [showSol, setShowSol] = useState(false);
  const data = fullProblem || problem;
  if (!data) return null;

  const comments = data.feedbacks || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="mx-auto max-w-3xl w-full surface-card shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 backdrop-blur">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{data.id}</span>
              <StatusBadge status={normStatus(data)} />
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{(data.topics || []).join(' · ') || 'No topic tags'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-5 py-5">
          <section>
            <p className="section-label">Problem</p>
            <div className="mt-3 text-[15px] leading-7">
              {data.latex ? <KatexRenderer latex={data.latex} /> : <span className="italic text-[var(--color-text-muted)]">No problem text</span>}
            </div>
          </section>

          <section className="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <p className="section-label">Topics</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(data.topics || []).map((topic) => (
                  <span key={topic} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs font-medium">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-right">
              <p className="section-label">Difficulty</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-accent)]">{parseInt(data.quality, 10) || '?'}<span className="text-sm text-[var(--color-text-muted)]">/10</span></p>
            </div>
          </section>

          {data.answer && (
            <section>
              <p className="section-label">Answer</p>
              <div className="mt-2 inline-flex rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm font-semibold">
                <KatexRenderer latex={data.answer} />
              </div>
            </section>
          )}

          {data.solution && (
            <section className="rounded-sm border border-[var(--color-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSol((s) => !s)}
                className="flex w-full items-center justify-between bg-[var(--color-surface)] px-4 py-3 text-left text-sm font-semibold hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <span>{showSol ? 'Hide solution' : 'Show solution'}</span>
                {showSol ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showSol && (
                <div className="border-t border-[var(--color-border)] px-4 py-4 text-[15px] leading-7">
                  <KatexRenderer latex={data.solution} />
                </div>
              )}
            </section>
          )}

          {data.notes && (
            <section className="rounded-sm border border-[var(--color-border)] bg-[var(--badge-idea-bg)] px-4 py-4">
              <p className="section-label">Author notes</p>
              <div className="mt-2 text-sm leading-6">
                <KatexRenderer latex={data.notes} />
              </div>
            </section>
          )}

          {comments.length > 0 && (
            <section>
              <p className="section-label">Review thread</p>
              <div className="mt-3 space-y-3">
                {comments.map((fb, idx) => (
                  <div key={fb.id || idx} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {fb.reviewer?.firstName} {fb.reviewer?.lastName}
                      </span>
                      <StatusBadge status={fb.isEndorsement ? 'Endorsed' : fb.resolved ? 'Resolved' : 'Needs Review'} />
                      <span className="ml-auto text-xs text-[var(--color-text-muted)]">{formatRelativeDate(fb.createdAt)}</span>
                    </div>
                    {(fb.comment || fb.feedback) && (
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{fb.comment || fb.feedback}</p>
                    )}
                    {fb.answer && (
                      <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                        Solver answer: <span className="font-mono"><KatexRenderer latex={fb.answer} /></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Action buttons: Edit / Archive / Delete / Close */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--color-border)]">
            <button
              onClick={() => { onClose(); onNavigate(data.id); }}
              className="btn-filled text-sm py-2 px-4"
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
              className="btn-outline text-sm py-2 px-4"
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
              className="btn-outline text-sm py-2 px-4 hover:!bg-red-600 hover:!border-red-600 hover:!text-white"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="ml-auto text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-3 py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const activeTab = searchParams.get('view') || 'overview';
  const statusFilter = searchParams.get('status') || 'all';
  const topicFilter = searchParams.get('topic') || 'all';
  const query = searchParams.get('q') || '';

  const [problems, setProblems] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [reviewProblems, setReviewProblems] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [previewProblem, setPreviewProblem] = useState(null);
  const [previewFull, setPreviewFull] = useState(null);

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
    all: problems.length,
    'Needs Review': problems.filter((p) => normStatus(p) === 'Needs Review').length,
    Resolved: problems.filter((p) => normStatus(p) === 'Resolved').length,
    Idea: problems.filter((p) => normStatus(p) === 'Idea').length,
    Endorsed: problems.filter((p) => normStatus(p) === 'Endorsed').length,
  }), [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      const preview = stripLatex(problem.latex || '');
      const status = normStatus(problem);
      const searchOk = !query || `${problem.id} ${preview} ${(problem.topics || []).join(' ')}`.toLowerCase().includes(query.toLowerCase());
      const statusOk = statusFilter === 'all' || status === statusFilter;
      const topicOk = topicFilter === 'all' || (problem.topics || []).includes(topicFilter);
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
        {/* ── Page header (clean, no clutter) ── */}
        <header className="flex items-center justify-between">
          <div>
            <span className="gold-rule mb-3" />
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Dashboard
            </h1>
          </div>
          <button
            onClick={() => navigate('/write')}
            className="btn-filled text-sm py-2 px-5"
          >
            New Problem
          </button>
        </header>

        {/* ── Tabs ── */}
        <section className="surface-card">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {DASHBOARD_TABS.map((tab) => {
                const tabCount =
                  tab.id === 'review' ? counts['Needs Review'] :
                  tab.id === 'myreviews' ? myFeedback.length :
                  tab.id === 'account' ? null :
                  problems.length;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setParam('view', tab.id, 'overview')}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold transition-colors border-b-2 ${
                      active
                        ? 'border-[var(--ucla-gold)] text-[var(--color-text)]'
                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                    }`}
                  >
                    {tab.label}
                    {tabCount !== null && (
                      <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-[var(--color-surface-2)]' : 'bg-[var(--color-surface)]'}`}>
                        {tabCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ════ OVERVIEW TAB ════ */}
          {activeTab === 'overview' && (
            <div className="space-y-4 p-4">
              {/* Filters */}
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((item) => (
                    <FilterChip
                      key={item.value}
                      active={statusFilter === item.value}
                      count={counts[item.value] ?? counts.all}
                      onClick={() => setParam('status', item.value, 'all')}
                    >
                      {item.label}
                    </FilterChip>
                  ))}
                </div>
                <div className="flex gap-3">
                  <label className="relative block flex-1 xl:w-56">
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
                <button onClick={() => navigate('/feedback')} className="btn-filled text-sm py-2 px-4">
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

      {/* Preview modal */}
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
