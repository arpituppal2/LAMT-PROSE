import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star, X, ChevronDown, ChevronUp, CheckCircle,
  ClipboardEdit, Save, ArrowLeft, PenTool, Trash2
} from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const stripLatex = (str = '') =>
  str
    .replace(/\$\$[\s\S]*?\$\$/g, '[\u2026]')
    .replace(/\$[^$]*?\$/g, (m) => m.slice(1, -1))
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/[\\{}]/g, '')
    .trim()
    .slice(0, 90);

// ── Preview Panel ─────────────────────────────────────────────────────────────
const PreviewPanel = ({ problem, fullProblem, onClose, onNavigate }) => {
  const [showSol, setShowSol] = useState(false);
  const data = fullProblem || problem;
  if (!data) return null;

  const comments = data.feedbacks || [];
  const notes = data.notes;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0d1e2e] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2774AE] dark:bg-[#001f3f] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-white">{data.id}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/20 text-white">
              {data._displayStatus === 'needs_review' || data._displayStatus === 'Needs Review'
                ? 'Needs Review'
                : data._displayStatus === 'Endorsed' || data._displayStatus === 'endorsed'
                ? 'Endorsed'
                : data.stage}
            </span>
            {data.topics?.length > 0 && (
              <span className="text-xs text-white/60">{data.topics.join(' \u00b7 ')}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

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
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg font-mono text-sm font-semibold text-gray-800 dark:text-gray-100">
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
              <span key={t} className="px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded border border-gray-200 dark:border-white/10">
                {t}
              </span>
            ))}
          </div>

          {data.solution && (
            <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSol(s => !s)}
                className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
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
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Author Notes</p>
              <div className="text-sm text-gray-700 dark:text-gray-300 prose-math leading-relaxed">
                {notes ? <KatexRenderer latex={notes} /> : null}
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
                  <div key={fb.id || idx} className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {fb.reviewer?.firstName} {fb.reviewer?.lastName}
                      </span>
                      {fb.isEndorsement
                        ? <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">✓ Endorsed</span>
                        : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium">Needs Review</span>
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
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2774AE] text-white rounded-lg text-xs font-semibold hover:bg-[#005587] transition-colors"
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
      // Exclude archived problems from the dashboard view
      setProblems((problemsRes.data || []).filter(
        p => p.stage !== 'Archived' && p._displayStatus !== 'Archived' && p._displayStatus !== 'archived'
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
        p => (p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review')
          && p.stage !== 'Archived'
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
        p => p.stage !== 'Archived' && p._displayStatus !== 'Archived' && p._displayStatus !== 'archived'
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

  const needsReviewCount = problems.filter(
    p => p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review'
  ).length;

  const ideaCount = problems.filter(
    p => p.stage === 'Idea' && p._displayStatus !== 'needs_review' && p._displayStatus !== 'Needs Review'
      && p._displayStatus !== 'Endorsed' && p._displayStatus !== 'endorsed'
  ).length;

  const endorsedCount = problems.filter(
    p => p._displayStatus === 'Endorsed' || p._displayStatus === 'endorsed'
  ).length;

  const filteredProblems = problems.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review';
    if (filter === 'Endorsed') return p._displayStatus === 'Endorsed' || p._displayStatus === 'endorsed';
    if (filter === 'Idea') return p.stage === 'Idea' && p._displayStatus !== 'needs_review' && p._displayStatus !== 'Needs Review' && p._displayStatus !== 'Endorsed' && p._displayStatus !== 'endorsed';
    return p._displayStatus === filter || p.stage === filter || (p.topics || []).includes(filter);
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
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => navigate('/write')}
            className="flex items-center gap-2 px-4 py-2 bg-[#2774AE] text-white rounded-lg text-sm font-semibold hover:bg-[#005587] transition-colors shadow-sm"
          >
            <PenTool size={15} /> New Problem
          </button>
        </div>

        <div className="flex items-center border-b border-gray-200 dark:border-white/10 mb-6 text-sm font-medium">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'review',   label: 'Review Feedback' },
            { id: 'profile',  label: 'Account' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-[#2774AE] text-[#2774AE] dark:border-[#FFD100] dark:text-[#FFD100]'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'review' && needsReviewCount > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 tabular-nums">
                  {needsReviewCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1">Filter:</span>
                {[
                  { value: 'all',          label: 'All',          count: problems.length },
                  { value: 'needs_review', label: 'Needs Review', count: needsReviewCount },
                  { value: 'Idea',         label: 'Idea',         count: ideaCount },
                  { value: 'Endorsed',     label: 'Endorsed',     count: endorsedCount },
                  ...topicOptions.map(t => ({ value: t, label: t, count: problems.filter(p => (p.topics||[]).includes(t)).length })),
                ].map(({ value, label, count }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filter === value
                        ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/8 dark:hover:text-white'
                    }`}
                  >
                    {label}
                    <span className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full ${
                      filter === value
                        ? 'bg-white/20 dark:bg-black/20'
                        : value === 'needs_review' && count > 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                    }`}>{count}</span>
                  </button>
                ))}
              </div>

              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-white/8">
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">ID</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Problem</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Topics</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Diff</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Stars</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {filteredProblems.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">No problems found.</td></tr>
                      ) : filteredProblems.map(problem => (
                        <tr
                          key={problem.id}
                          onClick={() => setPreviewProblem(problem)}
                          className="hover:bg-gray-50 dark:hover:bg-white/4 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{problem.id}</td>
                          <td className="px-4 py-3 max-w-[220px]">
                            <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {problem.latex ? stripLatex(problem.latex) + (problem.latex.length > 90 ? '\u2026' : '') : '\u2014'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {problem.topics.map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">{t}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {problem.quality
                              ? <span className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{parseInt(problem.quality)}/10</span>
                              : <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              (problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review')
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                                : (problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed')
                                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400'
                            }`}>
                              {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                                ? 'Needs Review'
                                : problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed'
                                ? 'Endorsed'
                                : problem.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {problem.endorsements > 0
                              ? <span className="flex items-center gap-1 text-xs text-[#2774AE] dark:text-[#FFD100] font-semibold"><Star size={11} fill="currentColor" /> {problem.endorsements}</span>
                              : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {new Date(problem.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="w-72 flex-shrink-0">
              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4 sticky top-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Your reviews</h3>
                {myFeedback.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No reviews submitted yet.</p>
                ) : myFeedback.map(fb => (
                  <div
                    key={fb.id}
                    onClick={() => navigate(`/problem/${fb.problemId}`)}
                    className="cursor-pointer border-l-2 border-gray-100 dark:border-white/10 pl-3 py-1.5 mb-2.5 hover:border-[#2774AE] dark:hover:border-[#FFD100] transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{fb.problemId}</span>
                        {!fb.isEndorsement && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            fb.resolved
                              ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400'
                          }`}>{fb.resolved ? 'Resolved' : 'Open'}</span>
                        )}
                      </div>
                      <button
                        onClick={e => handleDeleteFeedback(e, fb.id)}
                        className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {fb.answer && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-baseline gap-1 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Ans:</span>
                        <span className="font-mono"><KatexRenderer latex={fb.answer} /></span>
                      </div>
                    )}
                    {fb.comment && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{fb.comment}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                      </span>
                      {fb.isEndorsement && <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">✓ Endorsed</span>}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/feedback')}
                  className="w-full mt-3 py-1.5 text-sm font-medium bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded hover:opacity-90 transition-opacity"
                >
                  Go to Feedback
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW FEEDBACK */}
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Needs Review</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-5">
                    {[['Problem Statement','latex',7,'Problem text. Use $...$ for inline math.'],['Solution','solution',5,'Solution explanation...']].map(([label, key, rows, placeholder]) => (
                      <div key={key}>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">{label}</label>
                        <textarea value={editForm[key] || ''} onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))} rows={rows} placeholder={placeholder}
                          className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/30 focus:border-[#2774AE] outline-none text-gray-900 dark:text-white resize-none transition" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Answer</label>
                      <input type="text" value={editForm.answer || ''} onChange={e => setEditForm(prev => ({ ...prev, answer: e.target.value }))} placeholder="e.g. 42"
                        className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/30 focus:border-[#2774AE] outline-none text-gray-900 dark:text-white transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Author Notes</label>
                      <textarea value={editForm.notes || ''} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Notes for reviewers..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/30 focus:border-[#2774AE] outline-none text-gray-900 dark:text-white resize-none transition" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Difficulty</label>
                        <input type="range" min="1" max="10" step="1" value={editForm.quality || 5} onChange={e => setEditForm(prev => ({ ...prev, quality: e.target.value }))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-[#2774AE] mb-2" />
                        <div className="px-3 py-2 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-between">
                          <span className="text-xs text-gray-400">Level</span>
                          <span className="text-sm font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{editForm.quality || 5}/10</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Topics</label>
                        <div className="flex flex-wrap gap-2">
                          {topicOptions.map(topic => (
                            <button key={topic} type="button" onClick={() => toggleEditTopic(topic)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                editForm.topics?.includes(topic)
                                  ? 'bg-[#2774AE] border-[#2774AE] text-white'
                                  : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#2774AE]'
                              }`}>
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button onClick={handleEditSave} disabled={editSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#2774AE] text-white rounded-lg text-sm font-semibold hover:bg-[#005587] transition-colors disabled:opacity-50">
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
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-100 dark:border-white/8 flex items-center justify-between">
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
                            <span className="px-3 py-1.5 bg-gray-100 dark:bg-white/8 rounded-lg font-mono text-sm font-semibold text-gray-800 dark:text-gray-100">
                              <KatexRenderer latex={editForm.answer} />
                            </span>
                          </div>
                        )}
                        {editForm.solution && (
                          <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                            <button onClick={() => setEditPreviewShowSolution(s => !s)}
                              className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 transition-colors">
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
                          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
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
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">You’re all caught up!</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">None of your problems currently need revision.</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-white/8">
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">ID</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Topics</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Diff</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Date</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                          {reviewProblems.map(problem => (
                            <tr key={problem.id} onClick={() => setPreviewProblem(problem)} className="hover:bg-gray-50 dark:hover:bg-white/4 cursor-pointer transition-colors">
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
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2774AE] text-white rounded text-xs font-semibold hover:bg-[#005587] transition-colors">
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

        {/* ACCOUNT */}
        {activeTab === 'profile' && (
          <div className="max-w-xl">
            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-5">Account Settings</h2>
              {profileMessage && (
                <p className={`mb-4 text-sm ${profileMessage === 'Saved.' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {profileMessage}
                </p>
              )}
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Email</label>
                    <input type="email" value={user?.email || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/3 text-gray-400 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Initials</label>
                    <input type="text" value={user?.initials || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/3 text-gray-400 cursor-not-allowed" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">First name</label>
                    <input type="text" value={formData.firstName} onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 transition" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Last name</label>
                    <input type="text" value={formData.lastName} onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Math experience</label>
                  <textarea value={formData.mathExp} onChange={e => setFormData(prev => ({ ...prev, mathExp: e.target.value }))} rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 resize-none transition" />
                </div>
                <button type="submit" disabled={profileSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold bg-[#2774AE] text-white rounded-lg hover:bg-[#005587] transition-colors disabled:opacity-50">
                  {profileSubmitting ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </div>
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
