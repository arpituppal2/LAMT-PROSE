import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star, LayoutDashboard, MessageSquare, Trash2, User,
  X, ChevronDown, ChevronUp, CheckCircle,
  ClipboardEdit, Save, ArrowLeft, AlertCircle, Bell, PenTool
} from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

// ── Shared diff label (NO bar ever) ──────────────────────────────────────────
const DiffLabel = ({ quality, className = '' }) => {
  const d = parseInt(quality);
  if (!d) return <span className="text-gray-300 dark:text-white/20">—</span>;
  return (
    <span className={`tabular-nums font-semibold text-xs text-[#2774AE] dark:text-[#FFD100] ${className}`}>
      {d}/10
    </span>
  );
};

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, stage }) => {
  const isNR = status === 'needs_review' || status === 'Needs Review';
  const isEnd = status === 'Endorsed' || status === 'endorsed';
  const label = isNR ? 'Needs Review' : isEnd ? 'Endorsed' : (stage || status);
  const cls = isEnd
    ? 'bg-yellow-50 text-yellow-700 dark:bg-[#FFD100]/10 dark:text-[#FFD100]'
    : isNR
    ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded font-medium ${cls}`}>
      {isNR && <AlertCircle size={10} />}
      {isEnd && <Star size={10} className="fill-current" />}
      {label}
    </span>
  );
};

// ── Notifications panel ───────────────────────────────────────────────────────
const NotificationsPanel = ({ notifications, onClose, onMarkRead, onNavigate }) => {
  const unread = notifications.filter(n => !n.read);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full bg-white dark:bg-[#0d1b2a] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/8">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#2774AE] dark:text-[#FFD100]" />
            <span className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</span>
            {unread.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900 rounded-full">{unread.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button onClick={() => onMarkRead('all')} className="text-xs text-slate-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors">Mark all read</button>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/8 text-slate-400 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell size={32} className="text-slate-200 dark:text-white/10 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No notifications yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Replies and feedback updates will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => { onMarkRead(n.id); onNavigate(n.link); }}
                  className={`px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/3 ${
                    !n.read ? 'bg-[#2774AE]/4 dark:bg-[#FFD100]/4' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      !n.read ? 'bg-[#2774AE] dark:bg-[#FFD100]' : 'bg-transparent'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{n.message}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── State ────────────────────────────────────────────────────────────────
  const [problems, setProblems]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [myFeedback, setMyFeedback] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Review feedback
  const [reviewProblems, setReviewProblems] = useState([]);
  const [reviewLoading, setReviewLoading]   = useState(false);

  // Edit inline
  const [editingProblem, setEditingProblem]           = useState(null);
  const [editForm, setEditForm]                       = useState({});
  const [editSaving, setEditSaving]                   = useState(false);
  const [reviewComments, setReviewComments]           = useState([]);
  const [reviewCommentsLoading, setReviewCommentsLoading] = useState(false);
  const [replyDrafts, setReplyDrafts]                 = useState({});
  const [replyLoading, setReplyLoading]               = useState({});
  const [editPreviewShowSolution, setEditPreviewShowSolution] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('problems');

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [problemsRes, feedbackRes] = await Promise.all([
        api.get('/problems/my'),
        api.get('/feedback/my'),
      ]);
      setProblems(problemsRes.data);
      setMyFeedback(feedbackRes.data || []);

      setReviewLoading(true);
      const needsReview = problemsRes.data.filter(
        p => p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review'
      );
      setReviewProblems(needsReview);
      setReviewLoading(false);

      try {
        const notifRes = await api.get('/notifications');
        setNotifications(notifRes.data || []);
      } catch (_) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Edit problem ─────────────────────────────────────────────────────────
  const openEditProblem = async (problem) => {
    setEditingProblem(problem);
    setEditForm({
      latex:     problem.latex || '',
      solution:  problem.solution || '',
      answer:    problem.answer || '',
      notes:     problem.notes || '',
      quality:   problem.quality || '',
      topics:    problem.topics || [],
      stage:     problem.stage || 'Idea',
    });
    setEditPreviewShowSolution(false);

    setReviewCommentsLoading(true);
    try {
      const res = await api.get(`/feedback/problem/${problem.id}`);
      setReviewComments(res.data || []);
    } catch (_) {
      setReviewComments([]);
    } finally {
      setReviewCommentsLoading(false);
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleEditTopic = (topic) => {
    setEditForm(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic]
    }));
  };

  const handleEditSave = async () => {
    if (!editingProblem) return;
    setEditSaving(true);
    try {
      await api.put(`/problems/${editingProblem.id}`, editForm);
      await loadDashboard();
      setEditingProblem(null);
      setReviewComments([]);
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setEditSaving(false);
    }
  };

  // ── Profile update ───────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', initials: '', mathExperience: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg]       = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName:      user.firstName || '',
        lastName:       user.lastName  || '',
        initials:       user.initials  || '',
        mathExperience: user.mathExperience || '',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.put('/auth/profile', formData);
      setProfileMsg('Saved!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      setProfileMsg('Failed to save.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Feedback / reviews ───────────────────────────────────────────────────
  const handleDeleteFeedback = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Remove this review?')) return;
    try {
      await api.delete(`/feedback/${id}`);
      setMyFeedback(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveReply = async (feedbackId) => {
    const body = replyDrafts[feedbackId]?.trim();
    if (!body) return;
    setReplyLoading(prev => ({ ...prev, [feedbackId]: true }));
    try {
      await api.post(`/feedback/${feedbackId}/reply`, { body });
      setReplyDrafts(prev => ({ ...prev, [feedbackId]: '' }));
      const res = await api.get(`/feedback/problem/${editingProblem?.id}`);
      setReviewComments(res.data || []);
    } catch (err) {
      alert('Reply failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setReplyLoading(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  const handleResolveFeedback = async (feedbackId) => {
    try {
      await api.patch(`/feedback/${feedbackId}/resolve`);
      setReviewComments(prev =>
        prev.map(f => f.id === feedbackId ? { ...f, resolved: true } : f)
      );
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      if (id === 'all') {
        await api.patch('/notifications/read-all');
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } else {
        await api.patch(`/notifications/${id}/read`);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (_) {}
  };

  const handleNavNotif = (link) => {
    setShowNotifications(false);
    navigate(link);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isValidAnswer = (ans) => ans && ans.trim() !== '' && ans.trim() !== '0';

  const filteredProblems = problems.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review';
    if (filter === 'Endorsed') return p._displayStatus === 'Endorsed' || p._displayStatus === 'endorsed';
    return p._displayStatus === filter || p.stage === filter;
  });

  // Derived counts — always accurate, no API dependency
  const endorsedCount   = problems.filter(p => p._displayStatus === 'Endorsed' || p._displayStatus === 'endorsed').length;
  const needsReviewCount = problems.filter(p => p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review').length;
  const ideasCount      = problems.filter(p => p.stage === 'Idea' || p._displayStatus === 'Idea').length;
  const unreadCount     = notifications.filter(n => !n.read).length;

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading dashboard…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={handleMarkNotifRead}
          onNavigate={handleNavNotif}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.firstName || 'Writer'}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Your problem-writing dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/write')}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2774AE] hover:bg-[#1a5a8a] dark:bg-[#FFD100] dark:hover:bg-[#e6bc00] text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-colors"
            >
              <PenTool size={13} /> New Problem
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-white/8">
          {[
            { key: 'problems', label: 'My Problems', icon: <LayoutDashboard size={14} /> },
            { key: 'myreviews', label: 'My Reviews', icon: <MessageSquare size={14} /> },
            { key: 'review', label: 'Review Feedback', icon: <ClipboardEdit size={14} />, badge: needsReviewCount },
            { key: 'settings', label: 'Account', icon: <User size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-[#2774AE] dark:border-[#FFD100] text-[#2774AE] dark:text-[#FFD100]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── MY PROBLEMS TAB ── */}
        {activeTab === 'problems' && (
          <div>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'My Problems', value: problems.length,   filterVal: 'all',          icon: null },
                { label: 'Endorsed',    value: endorsedCount,     filterVal: 'Endorsed',     icon: <Star size={11} /> },
                { label: 'Needs Review',value: needsReviewCount,  filterVal: 'needs_review', icon: <AlertCircle size={11} /> },
                { label: 'Ideas',       value: ideasCount,        filterVal: 'Idea',         icon: null },
              ].map((card, i) => (
                <button
                  key={i}
                  onClick={() => setFilter(card.filterVal)}
                  className={`text-left bg-white dark:bg-white/5 border rounded-lg p-4 transition-all hover:shadow-md hover:border-[#2774AE]/30 dark:hover:border-[#FFD100]/30 ${
                    filter === card.filterVal
                      ? 'border-[#2774AE] dark:border-[#FFD100] ring-1 ring-[#2774AE]/20 dark:ring-[#FFD100]/20'
                      : 'border-gray-200 dark:border-white/8'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                    {card.icon}{card.label}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{card.value}</p>
                </button>
              ))}
            </div>

            {/* Problems table */}
            {filteredProblems.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <LayoutDashboard size={36} className="text-gray-200 dark:text-white/10 mb-3" />
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No problems found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try a different filter or write a new problem.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/8">
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Problem</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Topics</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Diff</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {filteredProblems.map(problem => (
                      <tr key={problem.id}
                        onClick={() => navigate(`/problem/${problem.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px] mt-0.5">
                            {problem.latex?.replace(/[$#\\]/g, '').slice(0, 70) || ''}
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
                          <DiffLabel quality={problem.quality} />
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={problem._displayStatus} stage={problem.stage} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MY REVIEWS TAB ── */}
        {activeTab === 'myreviews' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Reviews you've written on others' problems.</p>
            {myFeedback.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <MessageSquare size={36} className="text-gray-200 dark:text-white/10 mb-3" />
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No reviews yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Head to Feedback to start reviewing problems.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
                {myFeedback.map(fb => (
                  <div
                    key={fb.id}
                    className="flex items-start gap-4 px-5 py-4 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/problem/${fb.problemId}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100] group-hover:underline">{fb.problemId}</span>
                        {fb.isEndorsement && (
                          <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">★ Endorsement</span>
                        )}
                        {fb.timeTaken > 0 && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">⏱ {Math.floor(fb.timeTaken / 60)}m {fb.timeTaken % 60}s</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2">{fb.feedback}</p>
                      {isValidAnswer(fb.answer) && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Ans: <span className="font-mono"><KatexRenderer latex={fb.answer} inline /></span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteFeedback(e, fb.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-all flex-shrink-0"
                      title="Remove review"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEW FEEDBACK TAB ── */}
        {activeTab === 'review' && (
          <div>
            {editingProblem ? (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={() => { setEditingProblem(null); setReviewComments([]); }}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors"
                  >
                    <ArrowLeft size={15} /> Back to list
                  </button>
                  <span className="text-gray-300 dark:text-white/20">|</span>
                  <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{editingProblem.id}</span>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* LEFT: edit form */}
                  <div className="lg:col-span-7 space-y-4">

                    {/* Review comments */}
                    {reviewCommentsLoading ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Loading feedback…</div>
                    ) : reviewComments.length > 0 ? (
                      <div className="space-y-3">
                        {reviewComments.map(fc => (
                          <div key={fc.id} className={`rounded-xl border p-4 transition-all ${
                            fc.resolved
                              ? 'border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10 opacity-60'
                              : 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10'
                          }`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{fc.reviewerName || 'Reviewer'}</span>
                                {fc.resolved && <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">✓ Resolved</span>}
                              </div>
                              <span className="text-[10px] text-gray-400">{fc.createdAt ? new Date(fc.createdAt).toLocaleDateString() : ''}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{fc.feedback}</p>

                            {/* Replies */}
                            {fc.replies?.length > 0 && (
                              <div className="mt-3 space-y-2 pl-3 border-l-2 border-gray-200 dark:border-white/10">
                                {fc.replies.map((r, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{r.authorName || 'You'}:</span> {r.body}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply box */}
                            {!fc.resolved && (
                              <div className="mt-3 flex gap-2">
                                <input
                                  type="text"
                                  value={replyDrafts[fc.id] || ''}
                                  onChange={e => setReplyDrafts(prev => ({ ...prev, [fc.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveReply(fc.id); }}
                                  placeholder="Reply…"
                                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                                />
                                <button
                                  onClick={() => handleSaveReply(fc.id)}
                                  disabled={replyLoading[fc.id]}
                                  className="px-3 py-1.5 bg-[#2774AE] hover:bg-[#1a5a8a] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                  {replyLoading[fc.id] ? '…' : 'Reply'}
                                </button>
                                <button
                                  onClick={() => handleResolveFeedback(fc.id)}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                                >
                                  ✓ Resolve
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No feedback comments yet.</div>
                    )}

                    {/* Edit fields */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Problem Statement</label>
                        <textarea
                          value={editForm.latex}
                          onChange={e => handleEditFieldChange('latex', e.target.value)}
                          rows={5}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Solution</label>
                        <textarea
                          value={editForm.solution}
                          onChange={e => handleEditFieldChange('solution', e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Answer</label>
                        <input
                          value={editForm.answer}
                          onChange={e => handleEditFieldChange('answer', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                        <textarea
                          value={editForm.notes}
                          onChange={e => handleEditFieldChange('notes', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Difficulty (1–10)</label>
                        <input
                          type="range" min="1" max="10"
                          value={editForm.quality || 5}
                          onChange={e => handleEditFieldChange('quality', e.target.value)}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-[#2774AE]"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>1</span><span className="font-semibold text-[#2774AE] dark:text-[#FFD100]">{editForm.quality || 5}</span><span>10</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Topics</label>
                        <div className="flex flex-wrap gap-1.5">
                          {topicOptions.map(topic => (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => toggleEditTopic(topic)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                (editForm.topics || []).includes(topic)
                                  ? 'bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900'
                                  : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
                              }`}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                        {(editForm.topics || []).length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-1">{editForm.topics.join(', ')}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Stage</label>
                        <select
                          value={editForm.stage}
                          onChange={e => handleEditFieldChange('stage', e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                        >
                          <option value="Idea">Idea</option>
                          <option value="Needs Review">Needs Review</option>
                          <option value="Endorsed">Endorsed</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleEditSave}
                      disabled={editSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#2774AE] hover:bg-[#1a5a8a] dark:bg-[#FFD100] dark:hover:bg-[#e6bc00] text-white dark:text-slate-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <Save size={14} />{editSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>

                  {/* RIGHT: live preview */}
                  <div className="lg:col-span-5">
                    <div className="sticky top-4 space-y-4">
                      <div className="bg-white dark:bg-white/4 border border-gray-200 dark:border-white/8 rounded-xl p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Preview</p>
                        <div className="prose-math text-sm text-slate-800 dark:text-slate-100 leading-relaxed mt-3">
                          {editForm.latex
                            ? <KatexRenderer latex={editForm.latex} />
                            : <span className="text-gray-300 dark:text-white/20 italic">Start typing to preview…</span>
                          }
                        </div>
                        {editForm.answer && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Answer</span>
                            <span className="font-mono text-sm text-[#2774AE] dark:text-[#FFD100]">
                              <KatexRenderer latex={editForm.answer} inline />
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Solution preview */}
                      <div className="border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setEditPreviewShowSolution(!editPreviewShowSolution)}
                          className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-white/4 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#2774AE] dark:text-[#FFD100]">
                            <CheckCircle size={14} /> {editPreviewShowSolution ? 'Hide' : 'Show'} Solution
                          </div>
                          {editPreviewShowSolution ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </button>
                        {editPreviewShowSolution && (
                          <div className="p-4 border-t border-slate-100 dark:border-white/8 prose-math text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                            {editForm.solution
                              ? <KatexRenderer latex={editForm.solution} />
                              : <span className="text-gray-300 dark:text-white/20 italic">No solution yet</span>
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Problems marked <span className="font-semibold text-red-500 dark:text-red-400">Needs Review</span> — click to view, or edit and resubmit directly here.
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
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Problem</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Topics</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Diff</th>
                          <th className="px-4 py-2.5 w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {reviewProblems.map(problem => (
                          <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer" onClick={() => navigate(`/problem/${problem.id}`)}>
                            <td className="px-4 py-3.5">
                              <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px] mt-0.5">
                                {problem.latex?.replace(/[$#\\]/g, '').slice(0, 70) || ''}
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
                              <DiffLabel quality={problem.quality} />
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditProblem(problem); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2774AE] hover:bg-[#1a5a8a] text-white rounded-lg text-xs font-semibold transition-colors ml-auto"
                              >
                                <ClipboardEdit size={12} /> Edit
                              </button>
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

        {/* ── ACCOUNT TAB ── */}
        {activeTab === 'settings' && (
          <div className="max-w-md space-y-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Account</h2>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">First Name</label>
                <input value={formData.firstName} disabled className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Last Name</label>
                <input value={formData.lastName} disabled className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Initials</label>
                <input
                  value={formData.initials}
                  onChange={e => setFormData(f => ({ ...f, initials: e.target.value }))}
                  maxLength={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Math Experience</label>
                <select
                  value={formData.mathExperience}
                  onChange={e => setFormData(f => ({ ...f, mathExperience: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2774AE] hover:bg-[#1a5a8a] dark:bg-[#FFD100] dark:hover:bg-[#e6bc00] text-white dark:text-slate-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Save size={14} />{profileSaving ? 'Saving…' : 'Save'}
              </button>
              {profileMsg && <p className="text-sm text-green-600 dark:text-green-400">{profileMsg}</p>}
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
