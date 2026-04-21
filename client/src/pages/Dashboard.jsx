import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  FileText,
  Filter,
  MessageSquareMore,
  PenTool,
  Search,
  Sparkles,
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

const MetricCard = ({ label, value, hint, tone = 'neutral' }) => {
  const toneClass = {
    neutral: 'text-slate-900 dark:text-white',
    review: 'text-red-700 dark:text-red-300',
    success: 'text-green-700 dark:text-green-300',
    idea: 'text-yellow-800 dark:text-yellow-200',
    resolved: 'text-blue-700 dark:text-blue-300',
  };

  return (
    <div className="rounded-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-[#03111d] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className={`text-3xl font-semibold tracking-[-0.03em] ${toneClass[tone] || toneClass.neutral}`}>
          {value}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 text-right">{hint}</span>
      </div>
    </div>
  );
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
        ? 'border-[#2774AE] bg-[#2774AE] text-white dark:border-[#FFD100] dark:bg-[#FFD100] dark:text-[#001628]'
        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-[#03111d] dark:text-slate-200 dark:hover:border-white/20'
    }`}
  >
    <span>{children}</span>
    {typeof count === 'number' && (
      <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-white/20 dark:bg-black/15' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
        {count}
      </span>
    )}
  </button>
);

const PreviewPanel = ({ problem, fullProblem, onClose, onNavigate }) => {
  const [showSol, setShowSol] = useState(false);
  const data = fullProblem || problem;
  if (!data) return null;

  const comments = data.feedbacks || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/45 dark:bg-black/70 p-4 md:p-6" onClick={onClose}>
      <div
        className="mx-auto max-w-3xl rounded-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-[#001628] shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white/95 px-5 py-4 backdrop-blur dark:bg-[#001628]/95">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{data.id}</span>
              <StatusBadge status={normStatus(data)} />
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{(data.topics || []).join(' · ') || 'No topic tags'}</p>
          </div>
          <button onClick={onClose} className="rounded-sm p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5 md:px-6 md:py-6">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Problem</p>
            <div className="mt-3 text-[15px] leading-7 text-slate-900 dark:text-slate-100 prose-math">
              {data.latex ? <KatexRenderer latex={data.latex} /> : <span className="text-slate-400 italic">No problem text</span>}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Metadata</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(data.topics || []).map((topic) => (
                  <span key={topic} className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Difficulty</p>
              <p className="mt-1 text-xl font-semibold text-[#2774AE] dark:text-[#FFD100]">{parseInt(data.quality, 10) || '?'}<span className="text-sm text-slate-500 dark:text-slate-400">/10</span></p>
            </div>
          </section>

          {data.answer && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Answer</p>
              <div className="mt-3 inline-flex rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-semibold dark:border-white/10 dark:bg-white/5">
                <KatexRenderer latex={data.answer} />
              </div>
            </section>
          )}

          {data.solution && (
            <section className="rounded-sm border border-slate-200 dark:border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSol((s) => !s)}
                className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                <span>{showSol ? 'Hide solution' : 'Show solution'}</span>
                {showSol ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showSol && (
                <div className="border-t border-slate-200 px-4 py-4 text-[15px] leading-7 dark:border-white/10 text-slate-800 dark:text-slate-200">
                  <KatexRenderer latex={data.solution} />
                </div>
              )}
            </section>
          )}

          {data.notes && (
            <section className="rounded-sm border border-slate-200 bg-amber-50/40 px-4 py-4 dark:border-white/10 dark:bg-amber-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Author notes</p>
              <div className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300 prose-math">
                <KatexRenderer latex={data.notes} />
              </div>
            </section>
          )}

          {comments.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Review thread</p>
              <div className="mt-3 space-y-3">
                {comments.map((fb, idx) => (
                  <div key={fb.id || idx} className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {fb.reviewer?.firstName} {fb.reviewer?.lastName}
                      </span>
                      <StatusBadge status={fb.isEndorsement ? 'Endorsed' : fb.resolved ? 'Resolved' : 'Needs Review'} />
                      <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{formatRelativeDate(fb.createdAt)}</span>
                    </div>
                    {(fb.comment || fb.feedback) && (
                      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{fb.comment || fb.feedback}</p>
                    )}
                    {fb.answer && (
                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Solver answer: <span className="font-mono text-slate-700 dark:text-slate-200"><KatexRenderer latex={fb.answer} /></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => { onClose(); onNavigate(data.id); }}
              className="inline-flex items-center gap-2 rounded-sm bg-[#2774AE] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6395] dark:bg-[#FFD100] dark:text-[#001628] dark:hover:bg-[#f5c800]"
            >
              Open full problem
              <ArrowRight size={15} />
            </button>
            <button onClick={onClose} className="rounded-sm px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const activeTab = searchParams.get('view') || 'overview';
  const statusFilter = searchParams.get('status') || 'all';
  const topicFilter = searchParams.get('topic') || 'all';
  const query = searchParams.get('q') || '';

  const [stats, setStats] = useState(null);
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'review') fetchReviewProblems();
  }, [activeTab]);

  useEffect(() => {
    if (!previewProblem) {
      setPreviewFull(null);
      return;
    }
    api.get(`/problems/${previewProblem.id}`)
      .then((res) => setPreviewFull(res.data))
      .catch(() => setPreviewFull(previewProblem));
  }, [previewProblem]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const [statsRes, problemsRes, feedbackRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/problems/my'),
        api.get('/feedback/my-feedback'),
      ]);
      const safeProblems = (problemsRes.data || []).filter((p) => p.stage !== 'Archived' && normStatus(p) !== 'Archived');
      setStats(statsRes.data);
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
      const flagged = (res.data || []).filter((p) => normStatus(p) === 'Needs Review' && p.stage !== 'Archived');
      setReviewProblems(flagged);
    } catch (error) {
      console.error('Failed to load review queue', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const draftEntries = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
      return Object.entries(saved)
        .map(([pid, value]) => ({ pid, updatedAt: value.updatedAt || 0 }))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 6);
    } catch {
      return [];
    }
  }, [dashboardLoading, problems.length]);

  const counts = useMemo(() => {
    const byStatus = {
      all: problems.length,
      'Needs Review': problems.filter((p) => normStatus(p) === 'Needs Review').length,
      Resolved: problems.filter((p) => normStatus(p) === 'Resolved').length,
      Idea: problems.filter((p) => normStatus(p) === 'Idea').length,
      Endorsed: problems.filter((p) => normStatus(p) === 'Endorsed').length,
    };
    return byStatus;
  }, [problems]);

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

  const reviewSummary = useMemo(() => {
    return {
      open: reviewProblems.length,
      unresolvedComments: reviewProblems.reduce((sum, problem) => sum + (problem.feedbacks || []).filter((fb) => !fb.isEndorsement && !fb.resolved).length, 0),
    };
  }, [reviewProblems]);

  const myReviewSummary = useMemo(() => {
    return {
      total: myFeedback.length,
      endorsements: myFeedback.filter((fb) => fb.isEndorsement).length,
      open: myFeedback.filter((fb) => !fb.isEndorsement && !fb.resolved).length,
    };
  }, [myFeedback]);

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

  if (dashboardLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-base text-slate-500 dark:text-slate-400">Loading dashboard…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white px-5 py-5 dark:border-white/10 dark:bg-[#03111d] md:flex-row md:items-start md:justify-between md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Dashboard</p>
            <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-slate-950 dark:text-white">Problem operations</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600 dark:text-slate-300">
              Prioritize review work first, then move through authored inventory and recent review activity.
            </p>
          </div>
          <div className="flex items-start gap-3 md:items-center">
            <div className="hidden rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-white/10 dark:bg-white/5 sm:block">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.firstName} {user?.lastName}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{user?.initials || 'PR'}</p>
            </div>
            <button
              onClick={() => navigate('/write')}
              className="inline-flex items-center gap-2 rounded-sm bg-[#2774AE] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6395] dark:bg-[#FFD100] dark:text-[#001628] dark:hover:bg-[#f5c800]"
            >
              <PenTool size={15} />
              New Problem
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Needs review" value={counts['Needs Review']} hint="Flagged authored problems" tone="review" />
          <MetricCard label="My reviews" value={myReviewSummary.total} hint={`${myReviewSummary.open} still open`} tone="resolved" />
          <MetricCard label="Total problems" value={problems.length} hint={`${counts.Endorsed} endorsed`} tone="neutral" />
          <MetricCard label="Recently updated" value={draftEntries.length} hint="Local draft surfaces" tone="idea" />
        </section>

        <section className="rounded-sm border border-slate-200 bg-white dark:border-white/10 dark:bg-[#03111d]">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10 md:px-5">
            <div className="flex flex-wrap gap-2">
              {DASHBOARD_TABS.map((tab) => {
                const tabCount = tab.id === 'review' ? counts['Needs Review'] : tab.id === 'myreviews' ? myReviewSummary.total : problems.length;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setParam('view', tab.id, 'overview')}
                    className={`inline-flex items-center gap-2 rounded-sm px-3.5 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-[#001628]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-white/15 dark:bg-black/15' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}>
                      {tabCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-5 p-4 md:p-5">
              <div className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-[#020c16] xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Filter size={15} />
                    Status
                  </div>
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
                </div>

                <div className="grid gap-3 md:grid-cols-[220px_220px] xl:min-w-[460px]">
                  <label className="relative block">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setParam('q', e.target.value)}
                      placeholder="Search ID, preview, topic"
                      className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#2774AE] dark:border-white/10 dark:bg-[#03111d] dark:text-white dark:focus:border-[#FFD100]"
                    />
                  </label>
                  <select
                    value={topicFilter}
                    onChange={(e) => setParam('topic', e.target.value, 'all')}
                    className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2774AE] dark:border-white/10 dark:bg-[#03111d] dark:text-white dark:focus:border-[#FFD100]"
                  >
                    <option value="all">All topics</option>
                    {TOPIC_OPTIONS.map((topic) => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                <div className="overflow-hidden rounded-sm border border-slate-200 dark:border-white/10">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="sticky top-0 z-[1] bg-slate-50 dark:bg-[#020c16]">
                        <tr className="border-b border-slate-200 dark:border-white/10">
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Problem</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Topics</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Difficulty</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Status</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Updated</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white dark:divide-white/10 dark:bg-[#03111d]">
                        {filteredProblems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No authored problems match the current filters.</td>
                          </tr>
                        ) : filteredProblems.map((problem) => {
                          const status = normStatus(problem);
                          return (
                            <tr
                              key={problem.id}
                              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
                              onClick={() => setPreviewProblem(problem)}
                            >
                              <td className="px-4 py-3 align-top">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                                  </div>
                                  <p className="max-w-[420px] text-sm leading-6 text-slate-700 dark:text-slate-300">
                                    {problem.latex ? `${stripLatex(problem.latex)}${problem.latex.length > 110 ? '…' : ''}` : 'No preview available'}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex max-w-[220px] flex-wrap gap-1.5">
                                  {(problem.topics || []).map((topic) => (
                                    <span key={topic} className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{problem.quality ? `${parseInt(problem.quality, 10)}/10` : '—'}</td>
                              <td className="px-4 py-3 align-top"><StatusBadge status={status} /></td>
                              <td className="px-4 py-3 align-top text-sm text-slate-500 dark:text-slate-400">{formatRelativeDate(problem.updatedAt || problem.createdAt)}</td>
                              <td className="px-4 py-3 align-top">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/problem/${problem.id}`);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-sm px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                  Open
                                  <ArrowRight size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-sm border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#03111d]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Workflow focus</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex items-start gap-3">
                        <Clock3 size={16} className="mt-0.5 text-red-500" />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">Resolve flagged work first</p>
                          <p className="mt-1 leading-6">Keep the queue clear before starting fresh drafts or polishing endorsed inventory.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Sparkles size={16} className="mt-0.5 text-blue-500" />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">Use concise rows</p>
                          <p className="mt-1 leading-6">The table keeps previews short so you can scan status and act without reading full statements here.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {draftEntries.length > 0 && (
                    <div className="rounded-sm border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#03111d]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Recent drafts</p>
                      <div className="mt-3 space-y-2">
                        {draftEntries.map(({ pid, updatedAt }) => (
                          <button
                            key={pid}
                            type="button"
                            onClick={() => navigate(`/problem/${pid}`)}
                            className="flex w-full items-center justify-between rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
                          >
                            <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{pid}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeDate(updatedAt)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-5 p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Flagged problems" value={reviewSummary.open} hint="Authored items needing action" tone="review" />
                <MetricCard label="Unresolved notes" value={reviewSummary.unresolvedComments} hint="Reviewer comments still open" tone="resolved" />
                <MetricCard label="Recommended action" value={reviewSummary.open > 0 ? 'Open' : 'Clear'} hint="Open review, then revise in context" tone={reviewSummary.open > 0 ? 'idea' : 'success'} />
              </div>

              {reviewLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading review queue…</div>
              ) : reviewProblems.length === 0 ? (
                <div className="rounded-sm border border-slate-200 bg-slate-50 px-6 py-16 text-center dark:border-white/10 dark:bg-[#020c16]">
                  <CheckCircle2 className="mx-auto text-green-500" size={36} />
                  <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">No authored problems need review</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your authored queue is clear right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewProblems.map((problem) => {
                    const unresolved = (problem.feedbacks || []).filter((fb) => !fb.isEndorsement && !fb.resolved);
                    const latest = unresolved[0] || problem.feedbacks?.[0];
                    return (
                      <button
                        key={problem.id}
                        type="button"
                        onClick={() => navigate(`/problem/${problem.id}`)}
                        className="block w-full rounded-sm border border-slate-200 bg-white p-5 text-left hover:border-[#2774AE] hover:bg-slate-50 dark:border-white/10 dark:bg-[#03111d] dark:hover:border-[#FFD100] dark:hover:bg-white/5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                              <StatusBadge status="Needs Review" />
                              <span className="rounded-sm bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                                {unresolved.length} unresolved
                              </span>
                            </div>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
                              {problem.latex ? `${stripLatex(problem.latex)}${problem.latex.length > 110 ? '…' : ''}` : 'No preview available'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {(problem.topics || []).map((topic) => (
                                <span key={topic} className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-3 xl:w-[360px]">
                            <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-[#020c16]">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                <MessageSquareMore size={15} className="text-red-500" />
                                Latest reviewer note
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {latest?.comment || latest?.feedback || 'Open the full thread to inspect reviewer feedback.'}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                              <span>Updated {formatRelativeDate(problem.updatedAt || problem.createdAt)}</span>
                              <span className="inline-flex items-center gap-2 font-semibold text-[#2774AE] dark:text-[#FFD100]">
                                Open Review
                                <ArrowRight size={15} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'myreviews' && (
            <div className="space-y-5 p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <MetricCard label="Total reviews" value={myReviewSummary.total} hint="All submissions" tone="neutral" />
                <MetricCard label="Open items" value={myReviewSummary.open} hint="Awaiting resolution" tone="review" />
                <MetricCard label="Endorsements" value={myReviewSummary.endorsements} hint="Ready-as-is approvals" tone="success" />
              </div>

              <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-[#020c16]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Review history</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">See the outcome of your past reviews and jump back into any thread.</p>
                  </div>
                  <button
                    onClick={() => navigate('/feedback')}
                    className="inline-flex items-center gap-2 rounded-sm bg-[#2774AE] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6395] dark:bg-[#FFD100] dark:text-[#001628] dark:hover:bg-[#f5c800]"
                  >
                    Give Feedback
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {myFeedback.length === 0 ? (
                <div className="rounded-sm border border-slate-200 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-[#03111d]">
                  <FileText className="mx-auto text-slate-300 dark:text-slate-600" size={36} />
                  <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">No reviews submitted yet</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Start with the feedback workspace to build a review history.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myFeedback.map((fb) => {
                    const outcome = fb.isEndorsement ? 'Endorsed' : fb.resolved ? 'Resolved' : 'Needs Review';
                    return (
                      <div
                        key={fb.id}
                        className="rounded-sm border border-slate-200 bg-white px-5 py-5 dark:border-white/10 dark:bg-[#03111d]"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{fb.problemId}</span>
                              <StatusBadge status={outcome} />
                              <span className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeDate(fb.createdAt)}</span>
                            </div>
                            {fb.answer && (
                              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                                Solver answer: <span className="font-mono text-slate-900 dark:text-slate-100"><KatexRenderer latex={fb.answer} /></span>
                              </p>
                            )}
                            {(fb.comment || fb.feedback) && (
                              <div className="mt-4 rounded-sm border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-[#020c16]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Your review</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{fb.comment || fb.feedback}</p>
                              </div>
                            )}
                            {fb.resolutionNotes && (
                              <div className="mt-3 rounded-sm border border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-400/20 dark:bg-blue-500/10">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">Resolution</p>
                                <p className="mt-2 text-sm leading-6 text-blue-900 dark:text-blue-100">{fb.resolutionNotes}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 md:pl-6">
                            <button
                              type="button"
                              onClick={() => navigate(`/problem/${fb.problemId}`)}
                              className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                              <Eye size={15} />
                              Open thread
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteFeedback(e, fb.id)}
                              className="rounded-sm p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {previewProblem && (
        <PreviewPanel
          problem={previewProblem}
          fullProblem={previewFull}
          onClose={() => {
            setPreviewProblem(null);
            setPreviewFull(null);
          }}
          onNavigate={(id) => navigate(`/problem/${id}`)}
        />
      )}
    </Layout>
  );
};

export default Dashboard;
