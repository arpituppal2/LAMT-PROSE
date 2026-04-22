import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star, X, ChevronDown, ChevronUp, CheckCircle,
  ClipboardEdit, Save, ArrowLeft, PenTool, Trash2
} from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import { getProblemStatus, STATUS_BADGE_CLASS } from '../utils/problemStatus';

const DRAFTS_KEY = 'prose_drafts_v1';

const normStatus = (p) => p._displayStatus || getProblemStatus(p, p.feedbacks);

const stripLatex = (str = '') =>
  str
    .replace(/\$\$[\s\S]*?\$\$/g, '[…]')
    .replace(/\$[^$]*?\$/g, (m) => m.slice(1, -1))
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/[\\{}]/g, '')
    .trim()
    .slice(0, 90);

// ── Preview Panel ────────────────────────────────────────────────────────────
const PreviewPanel = ({ problem, fullProblem, onClose, onNavigate }) => {
  const [showSol, setShowSol] = useState(false);
  const data = fullProblem || problem;
  if (!data) return null;

  const comments = data.feedbacks || [];
  const notes = data.notes;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded border border-slate-200 dark:border-white/15 bg-white dark:bg-[#001628] text-black dark:text-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2774AE] dark:bg-[#001f3f]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-white">{data.id}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-white/20 text-white">
              {normStatus(data)}
            </span>
            {data.topics?.length > 0 && (
              <span className="text-xs text-white/60">{data.topics.join(' · ')}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Problem Statement</p>
            <div className="prose-math text-gray-900 dark:text-gray-100 leading-relaxed text-sm">
              {data.latex ? <KatexRenderer latex={data.latex} /> : <span className="text-gray-400 italic">No content</span>}
            </div>
          </div>

          {data.answer && (
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Answer</span>
              <span className="px-3 py-1.5 bg-white/60 dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded font-mono text-sm font-semibold text-gray-800 dark:text-gray-100">
                <KatexRenderer latex={data.answer} />
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Difficulty&nbsp;&nbsp;
              <span className="text-[#2774AE] dark:text-[#FFD100] text-xs font-bold">
                {parseInt(data.quality) || '?'}/10
              </span>
            </span>
            {data.topics?.map(t => (
              <span key={t} className="px-2 py-0.5 bg-white/60 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded border border-gray-200 dark:border-white/10">
                {t}
              </span>
            ))}
          </div>

          {data.solution && (
            <div className="border border-gray-200 dark:border-white/10 rounded overflow-hidden">
              <button
                onClick={() => setShowSol(s => !s)}
                className="w-full flex justify-between items-center px-4 py-3 bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                  <CheckCircle size={13} />
                  {showSol ? 'Hide' : 'Show'} Solution
                </div>
                {showSol ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
              </button>
              {showSol && (
                <div className="p-4 border-t border-gray-100 dark:border-white/8 prose-math text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  <KatexRenderer latex={data.solution} />
                </div>
              )}
            </div>
          )}

          {notes && (
            <div className="p-4 bg-white/50 dark:bg-white/5 rounded border border-gray-200 dark:border-white/10">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Author Notes</p>
              <div className="text-sm text-gray-700 dark:text-gray-300 prose-math leading-relaxed">
                <KatexRenderer latex={notes} />
              </div>
            </div>
          )}

          {comments.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Comments ({comments.length})
              </p>
              <div className="space-y-2">
                {comments.map((fb, idx) => (
                  <div key={fb.id || idx} className="p-3 bg-white/50 dark:bg-white/5 rounded border border-gray-100 dark:border-white/8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {fb.reviewer?.firstName} {fb.reviewer?.lastName}
                      </span>
                      {fb.isEndorsement
                        ? <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">✓ Endorsed</span>
                        : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium">Needs Review</span>
                      }
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {fb.answer && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span className="font-semibold text-gray-400">Ans: </span>
                        <KatexRenderer latex={fb.answer} />
                      </div>
                    )}
                    {(fb.comment || fb.feedback) && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{fb.comment || fb.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => { onClose(); onNavigate(data.id); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2774AE] text-white rounded text-xs font-semibold hover:bg-[#005587] transition-colors shadow-sm"
            >
              Full Page
            </button>
            <button onClick={onClose} className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, checkAuth } = useAuth();

  const activeTab = searchParams.get('view') || 'overview';
  const filter = searchParams.get('filter') || 'all';

  const setActiveTab = (tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'overview') next.delete('view'); else next.set('view', tab);
      return next;
    }, { replace: false });
  };

  const setFilter = (value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all') next.delete('filter'); else next.set('filter', value);
      return next;
    }, { replace: false });
  };

  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [previewProblem, setPreviewProblem] = useState(null);
  const [previewFull, setPreviewFull] = useState(null);

  const [reviewProblems, setReviewProblems] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editPreviewShowSolution, setEditPreviewShowSolution] = useState(false);

  const [formData, setFormData] = useState({ firstName: '', lastName: '', mathExp: '' });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

  const draftEntries = useMemo(() => {
    try {
      const o = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
      return Object.entries(o)
        .map(([pid, v]) => ({ pid, updatedAt: v.updatedAt || 0 }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }, [activeTab, dashboardLoading, problems.length]);

  useEffect(() => { fetchDashboardData(); }, []);
  useEffect(() => { if (activeTab === 'review') fetchReviewProblems(); }, [activeTab]);
  useEffect(() => {
    if (user) setFormData({ firstName: user.firstName || '', lastName: user.lastName || '', mathExp: user.mathExp || '' });
  }, [user]);

  useEffect(() => {
    if (!previewProblem) { setPreviewFull(null); return; }
    api.get(`/problems/${previewProblem.id}`)
      .then(res => setPreviewFull(res.data))
      .catch(() => setPreviewFull(previewProblem));
  }, [previewProblem]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const [statsRes, problemsRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/problems/my'),
      ]);
      setStats(statsRes.data);
      setProblems((problemsRes.data || []).filter(
        p => p.stage !== 'Archived' && normStatus(p) !== 'Archived'
      ));
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setDashboardLoading(false);
    }
    try {
      const feedbackRes = await api.get('/feedback/my-feedback');
      setMyFeedback(feedbackRes.data);
    } catch (e) {
      console.error('Failed to fetch my feedback', e);
    }
  };

  const fetchReviewProblems = async () => {
    setReviewLoading(true);
    try {
      const res = await api.get('/problems/my');
      setReviewProblems((res.data || []).filter(
        p => normStatus(p) === 'Needs Review' && p.stage !== 'Archived'
      ));
    } catch (e) {
      console.error(e);
    } finally {
      setReviewLoading(false);
    }
  };

  const openEditProblem = async (problem) => {
    try {
      const res = await api.get(`/problems/${problem.id}`);
      const full = res.data;
      setEditingProblem(full);
      setEditForm({
        latex: full.latex || '',
        solution: full.solution || '',
        answer: full.answer || '',
        notes: full.notes || '',
        topics: full.topics || [],
        quality: full.quality ? String(full.quality) : '5',
        examType: full.examType || 'Numerical Answer',
      });
      setEditMessage('');
      setEditPreviewShowSolution(false);
    } catch (e) { console.error(e); }
  };

  const handleEditSave = async () => {
    if (!editingProblem) return;
    setEditSaving(true);
    setEditMessage('');
    try {
      await api.put(`/problems/${editingProblem.id}`, editForm);
      setEditMessage('Saved successfully.');
      await fetchReviewProblems();
      const res = await api.get('/problems/my');
      setProblems((res.data || []).filter(
        p => p.stage !== 'Archived' && normStatus(p) !== 'Archived'
      ));
    } catch (e) {
      setEditMessage(e.response?.data?.error || 'Failed to save.');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleEditTopic = (topic) => {
    setEditForm(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const handleDeleteFeedback = async (e, feedbackId) => {
    e.stopPropagation();
    if (!window.confirm('Remove this review?')) return;
    try {
      await api.delete(`/feedback/${feedbackId}`);
      setMyFeedback(prev => prev.filter(fb => fb.id !== feedbackId));
      const statsRes = await api.get('/stats/dashboard');
      setStats(statsRes.data);
    } catch (e) { alert('Failed to remove review.'); }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileMessage('');
    try {
      await api.put('/user/profile', formData);
      await checkAuth();
      setProfileMessage('Saved.');
    } catch (e) {
      setProfileMessage('Failed to save changes.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const needsReviewCount = problems.filter(p => normStatus(p) === 'Needs Review').length;
  const ideaCount = problems.filter(p => normStatus(p) === 'Idea').length;
  const endorsedCount = problems.filter(p => normStatus(p) === 'Endorsed').length;
  const resolvedCount = problems.filter(p => normStatus(p) === 'Resolved').length;

  const filteredProblems = problems.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return normStatus(p) === 'Needs Review';
    if (filter === 'Endorsed') return normStatus(p) === 'Endorsed';
    if (filter === 'Resolved') return normStatus(p) === 'Resolved';
    if (filter === 'Idea') return normStatus(p) === 'Idea';
    return normStatus(p) === filter || (p.topics || []).includes(filter);
  });

  if (dashboardLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => navigate('/write')}
            className="flex items-center gap-2 px-4 py-2 bg-[#2774AE] text-white rounded text-sm font-semibold hover:bg-[#005587] active:bg-[#003B5C] transition-colors shadow-sm"
          >
            <PenTool size={15} /> New Problem
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-white/15 mb-6 text-sm font-medium">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'review', label: 'Review' },
            { id: 'myreviews', label: 'My reviews' },
            { id: 'profile', label: 'Account' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-[#2774AE] text-[#2774AE] dark:border-[#FFD100] dark:text-[#FFD100]'
                  : 'border-transparent text-slate-600 hover:text-black dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'review' && needsReviewCount > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-[#FFB81C]/30 dark:text-white tabular-nums">
                  {needsReviewCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="min-w-0">
              {draftEntries.length > 0 && (
                <div className="mb-4 border border-slate-200 dark:border-white/15 rounded-md p-4 bg-slate-50 dark:bg-[#020c16] text-black dark:text-white">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Drafts (this browser)</p>
                  <ul className="text-xs space-y-1.5">
                    {draftEntries.slice(0, 8).map(({ pid, updatedAt }) => (
                      <li key={pid} className="flex flex-wrap items-baseline gap-2">
                        <button
                          type="button"
                          className="font-mono font-semibold text-[#2774AE] dark:text-[#FFD100] hover:underline"
                          onClick={() => navigate(`/problem/${pid}`)}
                        >
                          {pid}
                        </button>
                        <span className="text-slate-600 dark:text-slate-400">{new Date(updatedAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
                {[
                  { value: 'all', label: 'All', count: problems.length },
                  { value: 'needs_review', label: 'Needs Review', count: needsReviewCount },
                  { value: 'Idea', label: 'Idea', count: ideaCount },
                  { value: 'Resolved', label: 'Resolved', count: resolvedCount },
                  { value: 'Endorsed', label: 'Endorsed', count: endorsedCount },
                  ...topicOptions.map(t => ({ value: t, label: t, count: problems.filter(p => (p.topics || []).includes(t)).length })),
                ].map(({ value, label, count }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
                      border transition-colors
                      ${
                        filter === value
                          ? 'bg-[#2774AE] border-[#2774AE] text-white dark:bg-[#FFD100] dark:border-[#FFD100] dark:text-[#001628]'
                          : 'bg-white dark:bg-[#001628] border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:border-[#2774AE] dark:hover:border-[#FFD100]'
                      }
                    `}
                  >
                    {label}
                    <span className={`
                      text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded
                      ${
                        filter === value
                          ? 'bg-white/20 dark:bg-black/20 text-inherit'
                          : value === 'needs_review' && count > 0
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                      }
                    `}>{count}</span>
                  </button>
                ))}
              </div>

              <div className="border border-slate-200 dark:border-white/15 rounded-md overflow-hidden bg-white dark:bg-[#001628]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-black dark:text-white">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#020c16]">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">ID</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Problem</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Topics</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Diff</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {filteredProblems.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No problems found.</td></tr>
                      ) : filteredProblems.map(problem => {
                        const st = normStatus(problem);
                        return (
                        <tr
                          key={problem.id}
                          onClick={() => setPreviewProblem(problem)}
                          className="hover:bg-slate-50 dark:hover:bg-[#020c16] cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">{problem.id}</td>
                          <td className="px-4 py-3 max-w-[220px]">
                            <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                              {problem.latex ? stripLatex(problem.latex) + (problem.latex.length > 90 ? '…' : '') : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {problem.topics.map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs rounded border border-slate-200 dark:border-white/10">{t}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {problem.quality
                              ? <span className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{parseInt(problem.quality)}/10</span>
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_BADGE_CLASS[st] || STATUS_BADGE_CLASS.Idea}`}>
                              {st}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(problem.createdAt).toLocaleDateString()}
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

        {activeTab === 'myreviews' && (
          <div className="max-w-3xl border border-slate-200 dark:border-white/15 rounded-md p-5 bg-white dark:bg-[#001628] text-black dark:text-white">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Problems you have reviewed</h2>
            {myFeedback.length === 0 ? (
              <p className="text-sm text-slate-500">No reviews submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {myFeedback.map(fb => (
                  <div
                    key={fb.id}
                    onClick={() => navigate(`/problem/${fb.problemId}`)}
                    className="cursor-pointer border-l-2 border-slate-200 dark:border-white/15 pl-3 py-2 hover:border-[#2774AE] dark:hover:border-[#FFD100] transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{fb.problemId}</span>
                        {!fb.isEndorsement && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                            fb.resolved
                              ? 'border-green-600 text-green-800 dark:text-green-300'
                              : 'border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300'
                          }`}>{fb.resolved ? 'Resolved' : 'Open'}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={e => handleDeleteFeedback(e, fb.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {fb.answer && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-baseline gap-1 flex-wrap">
                        <span className="text-[10px] uppercase font-semibold text-slate-500">Ans:</span>
                        <span className="font-mono"><KatexRenderer latex={fb.answer} /></span>
                      </div>
                    )}
                    {fb.comment && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{fb.comment}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                      {fb.isEndorsement && <span className="font-semibold text-[#005587] dark:text-[#FFD100]">Endorsement</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/feedback')}
              className="mt-5 px-4 py-2 text-sm font-semibold bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded-md hover:opacity-90"
            >
              Give more feedback
            </button>
          </div>
        )}

        {/* ── REVIEW FEEDBACK ── */}
        {activeTab === 'review' && (
          <div>
            {editingProblem ? (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => { setEditingProblem(null); setEditMessage(''); }} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">{editingProblem.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Needs Review</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-5">
                    {[['Problem Statement','latex',7,'Problem text. Use $...$ for inline math.'],['Solution','solution',5,'Solution explanation...']].map(([label, key, rows, placeholder]) => (
                      <div key={key}>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">{label}</label>
                        <textarea value={editForm[key] || ''} onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))} rows={rows} placeholder={placeholder}
                          className="w-full px-4 py-2.5 bg-white/70 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/30 focus:border-[#2774AE] outline-none text-gray-900 dark:text-white resize-none transition" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Answer</label>
                      <input type="text" value={editForm.answer || ''} onChange={e => setEditForm(prev => ({ ...prev, answer: e.target.value }))} placeholder="e.g. 42"
                        className="w-full px-4 py-2.5 bg-white/70 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/30 focus:border-[#2774AE] outline-none text-gray-900 dark:text-white transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Author Notes</label>
                      <textarea value={editForm.notes || ''} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Notes for reviewers..."
                        className="w-full px-4 py-2.5 bg-white/70 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/30 focus:border-[#2774AE] outline-none text-gray-900 dark:text-white resize-none transition" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Difficulty</label>
                        <input type="range" min="1" max="10" step="1" value={editForm.quality || 5} onChange={e => setEditForm(prev => ({ ...prev, quality: e.target.value }))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-[#2774AE] mb-2" />
                        <div className="px-3 py-2 bg-white/70 dark:bg-white/5 rounded border border-gray-200 dark:border-white/10 flex items-center justify-between">
                          <span className="text-xs text-gray-400">Level</span>
                          <span className="text-sm font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{editForm.quality || 5}/10</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Topics</label>
                        <div className="flex flex-wrap gap-2">
                          {topicOptions.map(topic => (
                            <button key={topic} type="button" onClick={() => toggleEditTopic(topic)}
                              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all border ${
                                editForm.topics?.includes(topic)
                                  ? 'bg-[#2774AE] border-[#2774AE] text-white shadow-sm'
                                  : 'bg-white/70 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#2774AE]'
                              }`}>
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button onClick={handleEditSave} disabled={editSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#2774AE] text-white rounded text-sm font-semibold hover:bg-[#005587] transition-colors disabled:opacity-50 shadow-sm">
                        <Save size={14} />{editSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button onClick={() => navigate(`/problem/${editingProblem.id}`)}
                        className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                        Full Page →
                      </button>
                      {editMessage && (
                        <p className={`text-sm ${editMessage === 'Saved successfully.' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {editMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="lg:col-span-5 lg:sticky lg:top-6">
                    <div className="border border-slate-200 dark:border-white/15 rounded-md overflow-hidden bg-white dark:bg-[#001628]">
                      <div className="px-5 py-3 border-b border-gray-200/60 dark:border-white/8 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Live Preview</p>
                        <span className="text-xs font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{editForm.quality || 5}/10</span>
                      </div>
                      <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
                        <div className="text-gray-900 dark:text-gray-100 leading-relaxed text-sm min-h-[2rem]">
                          {editForm.latex
                            ? <KatexRenderer latex={editForm.latex} />
                            : <span className="text-gray-400 dark:text-gray-600 italic">Start typing…</span>}
                        </div>
                        {editForm.answer && (
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Answer</span>
                            <span className="px-3 py-1.5 bg-white/60 dark:bg-white/8 rounded font-mono text-sm font-semibold text-gray-800 dark:text-gray-100">
                              <KatexRenderer latex={editForm.answer} />
                            </span>
                          </div>
                        )}
                        {editForm.solution && (
                          <div className="border border-gray-200 dark:border-white/10 rounded overflow-hidden">
                            <button onClick={() => setEditPreviewShowSolution(s => !s)}
                              className="w-full flex justify-between items-center px-4 py-3 bg-white/50 dark:bg-white/5 hover:bg-white/70 transition-colors">
                              <div className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                                <CheckCircle size={13} />{editPreviewShowSolution ? 'Hide' : 'Show'} Solution
                              </div>
                              {editPreviewShowSolution ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                            </button>
                            {editPreviewShowSolution && (
                              <div className="p-4 border-t border-gray-100 dark:border-white/8 text-sm text-gray-800 dark:text-gray-200">
                                <KatexRenderer latex={editForm.solution} />
                              </div>
                            )}
                          </div>
                        )}
                        {editForm.notes && (
                          <div className="p-4 bg-white/50 dark:bg-white/5 rounded border border-gray-200 dark:border-white/10">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Author Notes</p>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <KatexRenderer latex={editForm.notes} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Problems flagged <span className="font-medium text-amber-600 dark:text-amber-400">Needs Review</span> — edit them to address reviewer feedback.
                </p>
                {reviewLoading ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading…</div>
                ) : reviewProblems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <CheckCircle size={36} className="text-green-400 dark:text-green-500 mb-3" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">You're all caught up!</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">None of your problems currently need revision.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-white/15 rounded-md overflow-hidden bg-white dark:bg-[#001628]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-200/60 dark:border-white/8">
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">ID</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Topics</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Diff</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Date</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/80 dark:divide-white/5">
                          {reviewProblems.map(problem => (
                            <tr key={problem.id} onClick={() => setPreviewProblem(problem)} className="hover:bg-white/50 dark:hover:bg-white/4 cursor-pointer transition-colors">
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{problem.id}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {problem.topics.map(t => <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">{t}</span>)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {problem.quality ? <span className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{parseInt(problem.quality)}/10</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">{new Date(problem.createdAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                <button onClick={() => openEditProblem(problem)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2774AE] text-white rounded text-xs font-semibold hover:bg-[#005587] transition-colors shadow-sm">
                                  <ClipboardEdit size={12} /> Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ACCOUNT ── */}
        {activeTab === 'profile' && (
          <div className="max-w-xl text-black dark:text-white">
            <h2 className="text-base font-semibold mb-3">Account</h2>
            {profileMessage && (
              <p className={`mb-3 text-sm ${profileMessage === 'Saved.' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {profileMessage}
              </p>
            )}
            <form onSubmit={handleProfileSubmit} className="border border-slate-200 dark:border-white/15 rounded-md overflow-hidden bg-white dark:bg-[#001628]">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 w-32 shrink-0">Email</span>
                <span className="text-sm">{user?.email}</span>
              </div>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 w-32 shrink-0">Initials</span>
                <span className="text-sm font-mono">{user?.initials}</span>
              </div>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 w-32 shrink-0 pt-2">First name</span>
                <input type="text" value={formData.firstName} onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 dark:border-white/15 rounded-md bg-white dark:bg-[#020c16] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]" />
              </div>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 w-32 shrink-0 pt-2">Last name</span>
                <input type="text" value={formData.lastName} onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 dark:border-white/15 rounded-md bg-white dark:bg-[#020c16] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]" />
              </div>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Math experience</span>
                <textarea value={formData.mathExp} onChange={e => setFormData(prev => ({ ...prev, mathExp: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/15 rounded-md bg-white dark:bg-[#020c16] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] resize-none" />
              </div>
              <div className="px-4 py-3 bg-slate-50 dark:bg-[#020c16]">
                <button type="submit" disabled={profileSubmitting}
                  className="px-5 py-2 text-sm font-semibold bg-[#2774AE] text-white rounded-md hover:bg-[#005587] transition-colors disabled:opacity-50 dark:bg-[#FFD100] dark:text-[#001628] dark:hover:bg-[#FFC72C]">
                  {profileSubmitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {previewProblem && (
        <PreviewPanel
          problem={previewProblem}
          fullProblem={previewFull}
          onClose={() => { setPreviewProblem(null); setPreviewFull(null); }}
          onNavigate={(id) => navigate(`/problem/${id}`)}
        />
      )}
    </Layout>
  );
};

export default Dashboard;
