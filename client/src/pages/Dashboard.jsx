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
    if (!window.confirm('Do you want to remove this review?')) return;
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
                <span className="text-sm font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">
                  {parseInt(problem.quality) || '?'}/10
                </span>
              </div>
              {problem.topics?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {problem.topics.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {problem.solution && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowSol(s => !s)}
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

          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex-shrink-0 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-2">
            <button
              onClick={() => { onClose(); navigate(`/problem/${problem.id}`); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2774AE] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Full Page
            </button>
            <button onClick={onClose} className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-2 py-2">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-base text-gray-400 dark:text-gray-500 mt-0.5">{user?.email}</p>
          </div>

          <div className="flex border border-gray-200 dark:border-white/10 rounded overflow-hidden text-base">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard size={15} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-1.5 px-3 py-2 border-l border-gray-200 dark:border-white/10 transition-colors ${
                activeTab === 'review'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <ClipboardEdit size={15} />
              Review Feedback
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3 py-2 border-l border-gray-200 dark:border-white/10 transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <User size={15} />
              Settings
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4">
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">Total</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.totalProblems || 0}</p>
              </div>
              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4">
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">Endorsed</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.totalEndorsements || 0}</p>
                  <Star size={12} className="text-[#FFD100] fill-[#FFD100] mb-0.5" />
                </div>
              </div>
              {topicOptions.map((topic) => (
                <div key={topic} className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4">
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">{topic}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.topicCounts?.[topic] || 0}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded overflow-hidden">
                  <div className="flex gap-1 p-3 border-b border-gray-100 dark:border-white/8">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'needs_review', label: 'Needs Review' },
                      { value: 'Idea', label: 'Idea' },
                      { value: 'Published', label: 'Published' },
                      { value: 'Endorsed', label: 'Endorsed' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          filter === value
                            ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/8 dark:hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-white/8">
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">ID</th>
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Topics</th>
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Difficulty</th>
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Status</th>
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Stars</th>
                          <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {filteredProblems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                              No problems in this category.
                            </td>
                          </tr>
                        ) : filteredProblems.map((problem) => (
                          <tr
                            key={problem.id}
                            onClick={() => navigate(`/problem/${problem.id}`)}
                            className="hover:bg-gray-50 dark:hover:bg-white/4 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3.5 font-mono text-sm font-medium text-gray-900 dark:text-white">{problem.id}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {problem.topics.map(t => (
                                  <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {problem.quality ? (
                                <span className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">
                                  {parseInt(problem.quality)}/10
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
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
                            </td>
                            <td className="px-4 py-3.5">
                              {problem.endorsements > 0 ? (
                                <span className="flex items-center gap-1 text-[#FFD100] text-sm">
                                  <Star size={12} fill="currentColor" /> {problem.endorsements}
                                </span>
                              ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500">
                              {new Date(problem.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-72 flex-shrink-0">
                <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4">
                  <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <MessageSquare size={14} className="text-gray-400" />
                    Your reviews
                  </h2>
                  {myFeedback.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No reviews submitted yet.</p>
                  ) : myFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      onClick={() => navigate(`/problem/${fb.problemId}`)}
                      className="cursor-pointer border-l-2 border-gray-100 dark:border-white/10 pl-3 py-1.5 mb-2.5 hover:border-[#2774AE] dark:hover:border-[#FFD100] transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-gray-800 dark:text-white">{fb.problemId}</span>
                          {!fb.isEndorsement && (
                            <span className={`text-sm px-1.5 py-0.5 rounded ${
                              fb.resolved
                                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {fb.resolved ? 'Resolved' : 'Open'}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleDeleteFeedback(e, fb.id)}
                          className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {fb.answer && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="text-gray-700 dark:text-gray-300">Ans:</span> {fb.answer}
                        </p>
                      )}
                      {fb.comment && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 truncate">{fb.comment}</p>
                      )}
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                        {fb.isEndorsement && <span className="ml-2 text-[#FFD100]">Endorsed</span>}
                      </p>
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
          </div>
        )}

        {activeTab === 'review' && (
          <div>
            {editingProblem ? (
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => { setEditingProblem(null); setEditMessage(''); }}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft size={15} /> Back to list
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{editingProblem.id}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    Needs Review
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 space-y-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Problem Statement</label>
                      <textarea
                        value={editForm.latex}
                        onChange={e => setEditForm(prev => ({ ...prev, latex: e.target.value }))}
                        rows={7}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none transition-all text-slate-900 dark:text-slate-100 shadow-sm"
                        placeholder="Problem text. Use $...$ for inline math."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Solution</label>
                      <textarea
                        value={editForm.solution}
                        onChange={e => setEditForm(prev => ({ ...prev, solution: e.target.value }))}
                        rows={5}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none transition-all text-slate-900 dark:text-slate-100 shadow-sm"
                        placeholder="Solution explanation..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Answer</label>
                      <input
                        type="text"
                        value={editForm.answer}
                        onChange={e => setEditForm(prev => ({ ...prev, answer: e.target.value }))}
                        placeholder="e.g. 42 or 1/2"
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none text-slate-900 dark:text-white shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Author Notes</label>
                      <textarea
                        value={editForm.notes}
                        onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none transition-all text-slate-900 dark:text-slate-100 shadow-sm"
                        placeholder="Notes for reviewers..."
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
                              key={topic}
                              type="button"
                              onClick={() => toggleEditTopic(topic)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                editForm.topics?.includes(topic)
                                  ? 'bg-[#2774AE] border-[#2774AE] text-white dark:bg-[#FFD100] dark:border-[#FFD100] dark:text-[#001628]'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#2774AE] hover:text-[#2774AE] dark:hover:border-[#FFD100] dark:hover:text-[#FFD100]'
                              }`}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Exam Type</label>
                      <select
                        value={editForm.examType}
                        onChange={e => setEditForm(prev => ({ ...prev, examType: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2774AE]/20 focus:border-[#2774AE] outline-none shadow-sm"
                      >
                        <option value="Numerical Answer">Numerical Answer</option>
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="Proof">Proof</option>
                        <option value="Short Answer">Short Answer</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleEditSave}
                        disabled={editSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <Save size={14} />
                        {editSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => navigate(`/problem/${editingProblem.id}`)}
                        className="px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      >
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
                    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Preview</p>
                        <span className="text-xs font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{editForm.quality || 5}/10</span>
                      </div>

                      <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Problem Statement</p>
                          <div className="prose-math text-slate-900 dark:text-slate-100 leading-relaxed text-sm min-h-[2rem]">
                            {editForm.latex ? <KatexRenderer latex={editForm.latex} /> : <span className="text-slate-300 dark:text-slate-600 italic">Start typing your problem…</span>}
                          </div>
                        </div>

                        {editForm.answer && (
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Answer</span>
                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                              <KatexRenderer latex={editForm.answer} />
                            </span>
                          </div>
                        )}

                        {editForm.topics?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {editForm.topics.map(t => (
                              <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-600">{t}</span>
                            ))}
                          </div>
                        )}

                        {editForm.solution && (
                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setEditPreviewShowSolution(s => !s)}
                              className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                                <CheckCircle size={13} /> {editPreviewShowSolution ? 'Hide' : 'Show'} Solution
                              </div>
                              {editPreviewShowSolution ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                            </button>
                            {editPreviewShowSolution && (
                              <div className="p-4 border-t border-slate-100 dark:border-slate-800 prose-math text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                <KatexRenderer latex={editForm.solution} />
                              </div>
                            )}
                          </div>
                        )}

                        {editForm.notes && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Author Notes</p>
                            <div className="text-sm text-slate-700 dark:text-slate-300 prose-math leading-relaxed">
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
                  Problems flagged <span className="font-medium text-red-500 dark:text-red-400">Needs Review</span> — edit them inline to address reviewer feedback.
                </p>

                {reviewLoading ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
                ) : reviewProblems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <CheckCircle size={36} className="text-green-400 dark:text-green-500 mb-3" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">You're all caught up!</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">None of your problems currently need revision.</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-white/8">
                            <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">ID</th>
                            <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Topics</th>
                            <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Difficulty</th>
                            <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500">Date</th>
                            <th className="px-4 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-500"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                          {reviewProblems.map(problem => (
                            <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-white/4 transition-colors">
                              <td className="px-4 py-3.5 font-mono text-sm font-medium text-gray-900 dark:text-white">{problem.id}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap gap-1">
                                  {problem.topics.map(t => (
                                    <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">{t}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                {problem.quality ? (
                                  <span className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">
                                    {parseInt(problem.quality)}/10
                                  </span>
                                ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                              </td>
                              <td className="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500">
                                {new Date(problem.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEditProblem(problem)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                                  >
                                    <ClipboardEdit size={12} /> Edit
                                  </button>
                                  <button
                                    onClick={() => setPreviewProblem(problem)}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Preview"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </div>
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

        {activeTab === 'profile' && (
          <div className="max-w-xl">
            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-6">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-5">Account settings</h2>

              {profileMessage && (
                <p className={`mb-4 text-sm ${
                  profileMessage === 'Saved.'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {profileMessage}
                </p>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Initials</label>
                    <input
                      type="text"
                      value={user?.initials || ''}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">First name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Last name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Math experience</label>
                  <textarea
                    value={formData.mathExp}
                    onChange={e => setFormData(prev => ({ ...prev, mathExp: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {profileSubmitting ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {previewProblem && (
        <PreviewPanel problem={previewProblem} onClose={() => setPreviewProblem(null)} />
      )}
    </Layout>
  );
};

export default Dashboard;
