import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star, LayoutDashboard, MessageSquare, Trash2, User,
  Eye, X, ChevronDown, ChevronUp, CheckCircle,
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

// ── Exam-style Preview Modal ──────────────────────────────────────────────────
const PreviewModal = ({ problem, onClose, onNavigate }) => {
  const [showSol, setShowSol] = useState(false);
  if (!problem) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0d1b2a] border border-slate-200 dark:border-white/10 w-full sm:max-w-2xl max-h-[92dvh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-white/8 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-base font-bold text-slate-900 dark:text-white">{problem.id}</span>
              <StatusBadge status={problem._displayStatus} stage={problem.stage} />
              {problem.quality && (
                <span className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">
                  Difficulty {problem.quality}/10
                </span>
              )}
            </div>
            {problem.topics?.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{problem.topics.join(' · ')}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Problem Statement</p>
            <div className="prose-math text-slate-900 dark:text-slate-100 leading-relaxed text-sm">
              <KatexRenderer latex={problem.latex} />
            </div>
          </div>

          {problem.answer && (
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Answer</span>
              <span className="px-3 py-1.5 bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 rounded-lg font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                <KatexRenderer latex={problem.answer} />
              </span>
            </div>
          )}

          {problem.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {problem.topics.map(t => (
                <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-white/10">{t}</span>
              ))}
            </div>
          )}

          {problem.solution && (
            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSol(!showSol)}
                className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-white/4 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                  <CheckCircle size={14} /> {showSol ? 'Hide' : 'Show'} Solution
                </div>
                {showSol ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              {showSol && (
                <div className="p-4 border-t border-slate-100 dark:border-white/8 prose-math text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  <KatexRenderer latex={problem.solution} />
                </div>
              )}
            </div>
          )}

          {problem.notes && (
            <div className="p-4 bg-slate-50 dark:bg-white/4 rounded-xl border border-slate-200 dark:border-white/10">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Author Notes</p>
              <div className="text-sm text-slate-700 dark:text-slate-300 prose-math leading-relaxed">
                <KatexRenderer latex={problem.notes} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-white/8 flex-shrink-0 bg-slate-50/80 dark:bg-white/2 flex justify-between items-center gap-3">
          <button onClick={() => onNavigate(`/problem/${problem.id}`)} className="text-xs text-slate-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors font-medium">
            Open full page →
          </button>
          <button onClick={() => onNavigate(`/problem/${problem.id}/feedback`)} className="text-xs text-slate-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors font-medium">
            Leave feedback →
          </button>
        </div>
      </div>
    </div>
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

// ── Parse resolution note out of feedback text ────────────────────────────────
const parseResolutionNote = (feedbackText) => {
  if (!feedbackText) return { body: feedbackText, resolveComment: null };
  const marker = '\n\n[Resolution] ';
  const idx = feedbackText.indexOf(marker);
  if (idx === -1) return { body: feedbackText, resolveComment: null };
  return {
    body: feedbackText.slice(0, idx),
    resolveComment: feedbackText.slice(idx + marker.length),
  };
};

// ── Reviewer display name helper ──────────────────────────────────────────────
const getReviewerName = (fb) => {
  if (fb.user?.firstName || fb.user?.lastName) {
    return `${fb.user.firstName || ''} ${fb.user.lastName || ''}`.trim();
  }
  if (fb.reviewerName && fb.reviewerName.toLowerCase() !== 'reviewer') return fb.reviewerName;
  if (fb.author && fb.author.toLowerCase() !== 'reviewer') return fb.author;
  return 'Anonymous';
};

const getReviewerInitials = (fb) => {
  if (fb.user?.firstName || fb.user?.lastName) {
    return `${fb.user.firstName?.[0] || ''}${fb.user.lastName?.[0] || ''}`;
  }
  const name = fb.reviewerName || fb.author || '';
  if (name && name.toLowerCase() !== 'reviewer') return name[0].toUpperCase();
  return '?';
};

// ── Answer display guard ──────────────────────────────────────────────────────
const isValidAnswer = (answer) => {
  if (!answer) return false;
  const trimmed = answer.trim().toLowerCase();
  return trimmed !== '' && trimmed !== 'n/a' && trimmed !== 'na' && trimmed !== 'null' && trimmed !== 'undefined';
};

// ─────────────────────────────────────────────────────────────────────────────
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

  // Preview
  const [previewProblem, setPreviewProblem] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Review tab
  const [reviewProblems, setReviewProblems] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editPreviewShowSolution, setEditPreviewShowSolution] = useState(false);
  // Reviewer comments for a needs-review problem
  const [reviewComments, setReviewComments] = useState([]);

  // Reply/Resolve state for reviewer comments
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveComment, setResolveComment] = useState('');

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
    // Notifications: replies/comments on problems I own or feedback I wrote
    try {
      const notifRes = await api.get('/notifications');
      setNotifications(notifRes.data || []);
    } catch (_) {
      // notifications endpoint may not exist yet — silently skip
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
      setReplyingId(null);
      setReplyText('');
      setResolvingId(null);
      setResolveComment('');
      // Load reviewer feedback comments for this problem
      try {
        const fbRes = await api.get(`/feedback/problem/${problem.id}`);
        setReviewComments(fbRes.data || []);
      } catch (_) {
        setReviewComments(full.feedbacks || []);
      }
    } catch (e) {
      console.error('Failed to load problem detail', e);
    }
  };

  const refreshReviewComments = async (problemId) => {
    try {
      const fbRes = await api.get(`/feedback/problem/${problemId}`);
      setReviewComments(fbRes.data || []);
    } catch (_) {}
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

  const handleSaveReply = async (fbId) => {
    if (!replyText.trim()) {
      setEditMessage('Reply cannot be empty.');
      return;
    }
    setSavingReply(true);
    try {
      await api.put(`/feedback/${fbId}/reply`, { reply: replyText });
      setEditMessage('Reply saved.');
      setReplyingId(null);
      setReplyText('');
      await refreshReviewComments(editingProblem.id);
    } catch (error) {
      setEditMessage(error?.response?.data?.error || 'Failed to save reply.');
    } finally {
      setSavingReply(false);
    }
  };

  const handleResolveFeedback = async (fbId) => {
    if (!resolveComment.trim()) {
      setEditMessage('Resolution comment is required.');
      return;
    }
    try {
      await api.put(`/feedback/${fbId}/resolve`, { comment: resolveComment });
      setEditMessage('Feedback resolved.');
      setResolvingId(null);
      setResolveComment('');
      await refreshReviewComments(editingProblem.id);
    } catch (error) {
      setEditMessage(error?.response?.data?.error || 'Failed to resolve feedback.');
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

  const handleMarkRead = (id) => {
    if (id === 'all') {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const handleNotifNavigate = (link) => {
    setShowNotifications(false);
    navigate(link);
  };

  const filteredProblems = problems.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review';
    if (filter === 'Endorsed') return p._displayStatus === 'Endorsed' || p._displayStatus === 'endorsed';
    return p._displayStatus === filter || p.stage === filter;
  });

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
  const needsReviewCount = problems.filter(p => p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review').length;
  const unreadCount = notifications.filter(n => !n.read).length;

  if (dashboardLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
          Loading...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {previewProblem && (
        <PreviewModal
          problem={previewProblem}
          onClose={() => setPreviewProblem(null)}
          onNavigate={(path) => { setPreviewProblem(null); navigate(path); }}
        />
      )}
      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={handleMarkRead}
          onNavigate={handleNotifNavigate}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <LayoutDashboard size={20} className="text-[#2774AE] dark:text-[#FFD100]" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">My Dashboard</h1>
            <span className="text-sm text-gray-400 dark:text-gray-500">{user?.firstName} {user?.lastName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/write')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2774AE] dark:bg-[#FFD100]/10 text-white dark:text-[#FFD100] rounded-lg text-xs font-semibold hover:bg-[#1a5a8a] dark:hover:bg-[#FFD100]/20 transition-colors"
            >
              <PenTool size={12} /> New Problem
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 dark:text-gray-500 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors"
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900 rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border border-gray-200 dark:border-white/10 rounded overflow-hidden text-base mb-6">
          {[
            { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
            { key: 'myreviews', label: 'My Reviews', icon: <MessageSquare size={14} /> },
            { key: 'review', label: 'Review Feedback', icon: <ClipboardEdit size={14} />, badge: needsReviewCount },
            { key: 'settings', label: 'Account', icon: <User size={14} /> },
          ].map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors flex-1 justify-center relative ${
                i > 0 ? 'border-l border-gray-200 dark:border-white/10' : ''
              } ${
                activeTab === tab.key
                  ? 'bg-[#2774AE] dark:bg-[#FFD100]/10 text-white dark:text-[#FFD100]'
                  : 'bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/3'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#FFD100]'
                    : 'bg-red-500 text-white'
                }`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards — clickable to filter */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'My Problems', value: stats?.totalProblems || 0, filterVal: 'all', icon: null },
                { label: 'Endorsed', value: stats?.totalEndorsements || 0, filterVal: 'Endorsed', icon: <Star size={11} /> },
                { label: 'Needs Review', value: needsReviewCount, filterVal: 'needs_review', icon: <AlertCircle size={11} /> },
                { label: 'Algebra', value: stats?.topicCounts?.Algebra || 0, filterVal: 'all', icon: null },
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">{card.icon}{card.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{card.value}</p>
                </button>
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
                  {f.val === 'needs_review' && needsReviewCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full">{needsReviewCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Problems table */}
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/8">
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Problem</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Topics</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Diff</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Stage</th>
                    <th className="px-4 py-2.5 w-10"></th>
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
                <button
                  onClick={() => { setEditingProblem(null); setReviewComments([]); }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] mb-5 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to review list
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <span className="font-mono text-base font-bold text-[#2774AE] dark:text-[#FFD100]">{editingProblem.id}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={10} /> Needs Review
                  </span>
                </div>

                {editMessage && (
                  <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    editMessage.includes('success') || editMessage.includes('Saved') || editMessage.includes('saved') || editMessage.includes('resolved')
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {editMessage}
                  </div>
                )}

                {/* ── REVIEWER COMMENTS (full ProblemDetail-style cards) ── */}
                {reviewComments.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Reviewer Comments
                    </p>
                    {reviewComments.map(fb => {
                      const { body: fbBody, resolveComment: fbResolveNote } = parseResolutionNote(fb.feedback);
                      const isReplyingThis = replyingId === fb.id;
                      const isResolvingThis = resolvingId === fb.id;
                      const normalizeAnswer = (a) => (a || '').trim().replace(/\s+/g, '').toLowerCase();
                      const answerMismatch = editingProblem.answer && isValidAnswer(fb.answer) &&
                        normalizeAnswer(editingProblem.answer) !== normalizeAnswer(fb.answer);

                      return (
                        <div key={fb.id} className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm ${
                          fb.isEndorsement ? 'border-amber-200 dark:border-amber-900/50' :
                          fb.resolved ? 'border-green-200 dark:border-green-900/50' :
                          'border-slate-200 dark:border-slate-800'
                        }`}>
                          {/* Card header */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs ${
                                fb.isEndorsement ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {getReviewerInitials(fb)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white text-sm leading-none mb-0.5">
                                  {getReviewerName(fb)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {fb.createdAt && <>{new Date(fb.createdAt).toLocaleDateString()} &bull; </>}
                                  <span className={
                                    fb.isEndorsement ? 'text-amber-600 dark:text-amber-500' :
                                    fb.resolved ? 'text-green-600 dark:text-green-500' :
                                    'text-slate-500'
                                  }>
                                    {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved' : 'Review'}
                                  </span>
                                  {fb.timeTaken > 0 && (
                                    <span className="ml-1.5 font-mono">⏱ {Math.floor(fb.timeTaken / 60)}m {fb.timeTaken % 60}s</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Actions: Reply + Resolve */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  if (isReplyingThis) {
                                    setReplyingId(null);
                                    setReplyText('');
                                  } else {
                                    setReplyingId(fb.id);
                                    setReplyText(fb.authorReply || '');
                                    setResolvingId(null);
                                  }
                                }}
                                className="flex items-center gap-1 text-xs font-medium text-[#2774AE] dark:text-[#FFD100] hover:underline transition-colors"
                              >
                                <MessageSquare size={11} />
                                {isReplyingThis ? 'Cancel' : fb.authorReply ? 'Edit Reply' : 'Reply'}
                              </button>
                              {!fb.resolved && !fb.isEndorsement && (
                                <button
                                  onClick={() => {
                                    setResolvingId(isResolvingThis ? null : fb.id);
                                    setReplyingId(null);
                                  }}
                                  className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                >
                                  {isResolvingThis ? 'Cancel' : 'Resolve'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Their answer — only shown when valid */}
                          {isValidAnswer(fb.answer) && (
                            <div className="mb-3 flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Their answer:</span>
                              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-sm font-mono text-slate-700 dark:text-slate-300">
                                <KatexRenderer latex={fb.answer} inline />
                              </span>
                              {answerMismatch && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 rounded text-[10px] font-semibold">
                                  <AlertCircle size={10} /> Doesn't match stored answer
                                </span>
                              )}
                            </div>
                          )}

                          {/* Feedback body */}
                          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{fbBody}</p>

                          {/* Author reply (display) */}
                          {!isReplyingThis && fb.authorReply && (
                            <div className="mt-3 ml-4 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] mb-1 flex items-center gap-1">
                                <MessageSquare size={10} /> Author Reply
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{fb.authorReply}</p>
                            </div>
                          )}

                          {/* Reply editor */}
                          {isReplyingThis && (
                            <div className="mt-3 ml-4 pl-3 border-l-2 border-[#2774AE]/30 dark:border-[#FFD100]/30">
                              <p className="text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] mb-2 flex items-center gap-1">
                                <MessageSquare size={10} /> {fb.authorReply ? 'Edit Reply' : 'Reply'}
                              </p>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write your reply..."
                                className="w-full p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-[#2774AE]/20 outline-none transition-all dark:text-white"
                                rows={3}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveReply(fb.id)}
                                disabled={savingReply}
                                className="mt-2 bg-[#2774AE] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#1a5a8a] transition-colors disabled:opacity-50"
                              >
                                {savingReply ? 'Saving...' : 'Save Reply'}
                              </button>
                            </div>
                          )}

                          {/* Resolution note (display) */}
                          {fb.resolved && fbResolveNote && (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <p className="text-xs font-semibold text-green-600 dark:text-green-500 uppercase mb-1">Resolution Note</p>
                              <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">{fbResolveNote}</p>
                            </div>
                          )}

                          {/* Resolve editor */}
                          {isResolvingThis && (
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                              <textarea
                                value={resolveComment}
                                onChange={(e) => setResolveComment(e.target.value)}
                                placeholder="How did you address this feedback?"
                                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-[#2774AE]/20 outline-none bg-white dark:bg-slate-900 transition-all dark:text-white"
                                rows={2}
                                autoFocus
                              />
                              <button
                                onClick={() => handleResolveFeedback(fb.id)}
                                className="w-full bg-[#2774AE] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#1a5a8a] transition-colors"
                              >
                                Confirm Resolution
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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

                  {/* RIGHT: live preview — NO bar */}
                  <div className="lg:col-span-5 lg:sticky lg:top-8">
                    <div className="bg-white dark:bg-[#0d1b2a] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100 dark:border-white/8 bg-slate-50 dark:bg-white/3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Preview</p>
                        <span className="text-xs font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{editForm.quality || 5}/10</span>
                      </div>
                      <div className="p-5 space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Problem Statement</p>
                          <div className="prose-math text-slate-900 dark:text-slate-100 leading-relaxed text-sm bg-slate-50 dark:bg-white/4 p-4 rounded-lg border border-slate-200 dark:border-white/10 min-h-[80px]">
                            {editForm.latex
                              ? <KatexRenderer latex={editForm.latex} />
                              : <span className="text-slate-400 italic text-xs">Waiting for input...</span>}
                          </div>
                        </div>

                        {editForm.answer && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Answer</span>
                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 rounded-lg font-mono text-sm font-semibold">
                              <KatexRenderer latex={editForm.answer} />
                            </span>
                          </div>
                        )}

                        {(editForm.topics || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {editForm.topics.map(t => (
                              <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-white/10">{t}</span>
                            ))}
                          </div>
                        )}

                        {editForm.solution && (
                          <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setEditPreviewShowSolution(!editPreviewShowSolution)}
                              className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-white/3 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                                <CheckCircle size={14} /> {editPreviewShowSolution ? 'Hide' : 'Show'} Solution
                              </div>
                              {editPreviewShowSolution ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </button>
                            {editPreviewShowSolution && (
                              <div className="p-4 border-t border-slate-100 dark:border-white/8 prose-math text-sm text-slate-800 dark:text-slate-200">
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
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Problem</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Topics</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Diff</th>
                          <th className="px-4 py-2.5 w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {reviewProblems.map(problem => (
                          <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
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
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                <input value={user?.email || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed" />
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
                <textarea value={user?.role || ''} disabled rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed resize-none" />
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
