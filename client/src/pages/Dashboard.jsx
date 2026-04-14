import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star, LayoutDashboard, MessageSquare, Trash2, User,
  Eye, X, ChevronDown, ChevronUp, CheckCircle,
  ClipboardEdit, Save, ArrowLeft, ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, checkAuth } = useAuth();

  const activeTab = searchParams.get('view') || 'overview';
  const filter = searchParams.get('filter') || 'all';

  const setActiveTab = (tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'overview') next.delete('view');
      else next.set('view', tab);
      return next;
    }, { replace: false });
  };

  const setFilter = (value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all') next.delete('filter');
      else next.set('filter', value);
      return next;
    }, { replace: false });
  };

  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Preview panel state
  const [previewProblem, setPreviewProblem] = useState(null);

  // Review Feedback tab state
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

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    if (activeTab === 'review') fetchReviewProblems();
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        mathExp: user.mathExp || ''
      });
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const [statsRes, problemsRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/problems/my'),
      ]);
      setStats(statsRes.data);
      setProblems(problemsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setDashboardLoading(false);
    }
    try {
      const feedbackRes = await api.get('/feedback/my-feedback');
      setMyFeedback(feedbackRes.data);
    } catch (error) {
      console.error('Failed to fetch my feedback', error);
    }
  };

  const fetchReviewProblems = async () => {
    setReviewLoading(true);
    try {
      const res = await api.get('/problems/my');
      const needsReview = res.data.filter(
        p => p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review'
      );
      setReviewProblems(needsReview);
    } catch (e) {
      console.error('Failed to fetch review problems', e);
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
    } catch (e) {
      console.error('Failed to load problem detail', e);
    }
  };

  const handleEditSave = async () => {
    if (!editingProblem) return;
    setEditSaving(true);
    setEditMessage('');
    try {
      await api.put(`/problems/${editingProblem.id}`, {
        latex: editForm.latex,
        solution: editForm.solution,
        answer: editForm.answer,
        notes: editForm.notes,
        topics: editForm.topics,
        quality: editForm.quality,
        examType: editForm.examType,
      });
      setEditMessage('Saved successfully.');
      await fetchReviewProblems();
      const problemsRes = await api.get('/problems/my');
      setProblems(problemsRes.data);
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
        : [...prev.topics, topic]
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
    } catch (error) {
      console.error('Failed to delete feedback', error);
      alert('Failed to remove review.');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileMessage('');
    try {
      await api.put('/user/profile', formData);
      await checkAuth();
      setProfileMessage('Saved.');
    } catch (error) {
      setProfileMessage('Failed to save changes.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const filteredProblems = problems.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review';
    if (filter === 'Endorsed') return p._displayStatus === 'Endorsed' || p._displayStatus === 'endorsed';
    return p._displayStatus === filter || p.stage === filter;
  });

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

  if (dashboardLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
          Loading...
        </div>
      </Layout>
    );
  }

  const PreviewPanel = ({ problem, onClose }) => {
    const [showSol, setShowSol] = useState(false);
    if (!problem) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{problem.id}</span>
                <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                  problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                    : problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed'
                    ? 'bg-yellow-50 text-yellow-700 dark:bg-[#FFD100]/10 dark:text-[#FFD100]'
                    : 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-300'
                }`}>
                  {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                    ? 'Needs Review'
                    : problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed'
                    ? 'Endorsed'
                    : problem.stage}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{problem.topics?.join(' · ')}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Problem Statement</p>
              <div className="prose-math text-slate-900 dark:text-slate-100 leading-relaxed text-sm">
                <KatexRenderer latex={problem.latex} />
              </div>
            </div>

            {problem.answer && (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Answer</span>
                <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                  <KatexRenderer latex={problem.answer} />
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Difficulty</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">
                    {parseInt(problem.quality) || '?'}/10
                  </span>
                </div>
              </div>
              {problem.topics?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {problem.topics.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {problem.solution && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowSol(!showSol)}
                  className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                    <CheckCircle size={14} /> {showSol ? 'Hide' : 'Show'} Solution
                  </div>
                  {showSol ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {showSol && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 prose-math text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    <KatexRenderer latex={problem.solution} />
                  </div>
                )}
              </div>
            )}

            {problem.notes && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Author Notes</p>
                <div className="text-sm text-slate-700 dark:text-slate-300 prose-math leading-relaxed">
                  <KatexRenderer latex={problem.notes} />
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 flex justify-between items-center">
            <button
              onClick={() => navigate(`/problem/${problem.id}`)}
              className="text-xs text-slate-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors font-medium"
            >
              Open full page →
            </button>
            <button
              onClick={() => { onClose(); navigate(`/problem/${problem.id}/feedback`); }}
              className="text-xs text-slate-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors font-medium"
            >
              Leave feedback →
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      {previewProblem && <PreviewPanel problem={previewProblem} onClose={() => setPreviewProblem(null)} />}

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <LayoutDashboard size={20} className="text-[#2774AE] dark:text-[#FFD100]" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">My Dashboard</h1>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {user?.firstName} {user?.lastName}
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex border border-gray-200 dark:border-white/10 rounded overflow-hidden text-base mb-6">
          {[
            { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
            { key: 'review',   label: 'Review Feedback', icon: <ClipboardEdit size={14} /> },
            { key: 'settings', label: 'Settings', icon: <User size={14} /> },
          ].map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors flex-1 justify-center ${i > 0 ? 'border-l border-gray-200 dark:border-white/10' : ''} ${
                activeTab === tab.key
                  ? 'bg-[#2774AE] dark:bg-[#FFD100]/10 text-white dark:text-[#FFD100]'
                  : 'bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/3'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">My Problems</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.totalProblems || 0}</p>
              </div>
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1"><Star size={11} /> Endorsed</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.totalEndorsements || 0}</p>
              </div>
              {['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'].slice(0, 2).map(topic => (
                <div key={topic} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg p-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{topic}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.topicCounts?.[topic] || 0}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {[
                { val: 'all', label: 'All' },
                { val: 'Idea', label: 'Idea' },
                { val: 'needs_review', label: 'Needs Review' },
                { val: 'Endorsed', label: 'Endorsed' },
              ].map(f => (
                <button
                  key={f.val}
                  onClick={() => setFilter(f.val)}
                  className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                    filter === f.val
                      ? 'bg-[#2774AE] dark:bg-[#FFD100]/10 text-white dark:text-[#FFD100]'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Problems table */}
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/8">
                    <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Problem</th>
                    <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Topics</th>
                    <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Difficulty</th>
                    <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Stage</th>
                    <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {filteredProblems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                        No problems match this filter.
                      </td>
                    </tr>
                  ) : filteredProblems.map(problem => (
                    <tr key={problem.id}
                      onClick={() => navigate(`/problem/${problem.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px] mt-0.5">
                          {problem.latex?.replace(/[$#\\]/g, '').slice(0, 60) || ''}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(problem.topics || []).map(t => (
                            <span key={t} className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 rounded">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {problem.quality
                          ? <span className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{parseInt(problem.quality)}/10</span>
                          : <span className="text-gray-300 dark:text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${
                          problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed'
                            ? 'bg-yellow-50 text-yellow-700 dark:bg-[#FFD100]/10 dark:text-[#FFD100]'
                            : problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400'
                        }`}>
                          {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                            ? 'Needs Review'
                            : problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed'
                            ? 'Endorsed'
                            : problem.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setPreviewProblem(problem)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-300 dark:text-gray-600 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors"
                          title="Preview"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* My feedback section */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MessageSquare size={14} /> My Reviews
              </h2>
              {myFeedback.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">You haven't left any reviews yet.</p>
              ) : (
                <div className="space-y-2">
                  {myFeedback.map(fb => (
                    <div
                      key={fb.id}
                      className="cursor-pointer border-l-2 border-gray-100 dark:border-white/10 pl-3 py-1.5 mb-2.5 hover:border-[#2774AE] dark:hover:border-[#FFD100] transition-colors group"
                      onClick={() => navigate(`/problem/${fb.problemId}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs text-[#2774AE] dark:text-[#FFD100] font-semibold group-hover:underline">
                            {fb.problemId}
                          </span>
                          {fb.isEndorsement && (
                            <span className="ml-2 text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">★ Endorsement</span>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic line-clamp-1">{fb.feedback}</p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteFeedback(e, fb.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-all"
                          title="Remove review"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REVIEW FEEDBACK TAB ── */}
        {activeTab === 'review' && (
          <div>
            {editingProblem ? (
              /* ── EDIT PANE ── */
              <div>
                <button
                  onClick={() => setEditingProblem(null)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] mb-5 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to review list
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <span className="font-mono text-base font-bold text-[#2774AE] dark:text-[#FFD100]">{editingProblem.id}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    Needs Review
                  </span>
                </div>

                {editMessage && (
                  <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    editMessage.includes('success') || editMessage.includes('Saved')
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {editMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* LEFT: edit form */}
                  <div className="lg:col-span-7 space-y-5">

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Problem Statement</label>
                      <textarea
                        value={editForm.latex || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, latex: e.target.value }))}
                        rows={8}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none transition-all text-slate-900 dark:text-slate-100 shadow-sm"
                        placeholder="Enter problem text. Use $...$ for inline math."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Solution</label>
                      <textarea
                        value={editForm.solution || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, solution: e.target.value }))}
                        rows={6}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none transition-all text-slate-900 dark:text-slate-100 shadow-sm"
                        placeholder="Explain the solution..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Answer</label>
                      <input
                        type="text"
                        value={editForm.answer || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, answer: e.target.value }))}
                        placeholder="e.g. 42 or 1/2"
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none text-slate-900 dark:text-white shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Author Notes</label>
                      <textarea
                        value={editForm.notes || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none transition-all text-slate-900 dark:text-slate-100 shadow-sm"
                        placeholder="Optional notes for reviewers..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Difficulty</label>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editForm.quality || 5}
                          onChange={e => setEditForm(prev => ({ ...prev, quality: e.target.value }))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-[#2774AE]"
                        />
                        <div className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Level</span>
                          <span className="text-sm font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{editForm.quality || 5}/10</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Topics</label>
                        <div className="flex flex-wrap gap-2">
                          {topicOptions.map(topic => (
                            <button
                              key={topic} type="button"
                              onClick={() => toggleEditTopic(topic)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                (editForm.topics || []).includes(topic)
                                  ? 'bg-[#2774AE] border-[#2774AE] text-white'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#2774AE]'
                              }`}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={handleEditSave}
                        disabled={editSaving}
                        className="w-full bg-[#2774AE] hover:bg-[#1a5a8a] text-white py-3 rounded-xl transition-all disabled:opacity-50 font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        {editSaving ? 'Saving...' : <><Save size={15} /> Save Changes</>}
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: live preview */}
                  <div className="lg:col-span-5 lg:sticky lg:top-8">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Preview</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{editForm.quality || 5}/10</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Problem Statement</p>
                          <div className="prose-math text-slate-900 dark:text-slate-100 leading-relaxed text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[80px]">
                            {editForm.latex
                              ? <KatexRenderer latex={editForm.latex} />
                              : <span className="text-slate-400 italic text-xs">Waiting for input...</span>}
                          </div>
                        </div>

                        {editForm.answer && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Answer</span>
                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm font-semibold">
                              <KatexRenderer latex={editForm.answer} />
                            </span>
                          </div>
                        )}

                        {(editForm.topics || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {editForm.topics.map(t => (
                              <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700">{t}</span>
                            ))}
                          </div>
                        )}

                        {editForm.solution && (
                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setEditPreviewShowSolution(!editPreviewShowSolution)}
                              className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                                <CheckCircle size={14} /> {editPreviewShowSolution ? 'Hide' : 'Show'} Solution
                              </div>
                              {editPreviewShowSolution ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </button>
                            {editPreviewShowSolution && (
                              <div className="p-4 border-t border-slate-100 dark:border-slate-800 prose-math text-sm text-slate-800 dark:text-slate-200">
                                <KatexRenderer latex={editForm.solution} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── REVIEW LIST ── */
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Problems marked <span className="font-semibold text-red-500 dark:text-red-400">Needs Review</span> — edit and resubmit directly here.
                </p>

                {reviewLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
                ) : reviewProblems.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <CheckCircle size={40} className="text-green-400 dark:text-green-500 mb-3" />
                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300">You're all caught up!</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No problems are marked Needs Review.</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-white/8">
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Problem</th>
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Topics</th>
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Difficulty</th>
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {reviewProblems.map(problem => (
                          <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3.5">
                              <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px] mt-0.5">
                                {problem.latex?.replace(/[$#\\]/g, '').slice(0, 60) || ''}
                              </p>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {(problem.topics || []).map(t => (
                                  <span key={t} className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 rounded">{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {problem.quality
                                ? <span className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{parseInt(problem.quality)}/10</span>
                                : null}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => setPreviewProblem(problem)}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-300 dark:text-gray-600 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors"
                                  title="Preview"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => openEditProblem(problem)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2774AE] hover:bg-[#1a5a8a] text-white rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <ClipboardEdit size={12} /> Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div className="max-w-md space-y-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Profile Settings</h2>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">First Name</label>
                <input
                  value={formData.firstName}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Last Name</label>
                <input
                  value={formData.lastName}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Math Experience</label>
                <input
                  value={formData.mathExp}
                  onChange={e => setFormData(prev => ({ ...prev, mathExp: e.target.value }))}
                  placeholder="e.g. AIME, AMC 12, etc."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Role</label>
                <textarea
                  value={user?.role || ''}
                  disabled
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed resize-none"
                />
              </div>

              {profileMessage && (
                <p className={`text-sm font-medium ${
                  profileMessage === 'Saved.' ? 'text-green-500' : 'text-red-500'
                }`}>{profileMessage}</p>
              )}

              <button
                type="submit"
                disabled={profileSubmitting}
                className="w-full bg-[#2774AE] hover:bg-[#1a5a8a] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {profileSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Dashboard;
