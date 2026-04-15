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
  const isNR  = status === 'Needs Review';
  const isEnd = status === 'Endorsed';
  const label = isNR ? 'Needs Review' : isEnd ? 'Endorsed' : (stage || status || 'Idea');
  const cls = isEnd
    ? 'bg-yellow-50 text-yellow-700 dark:bg-[#FFD100]/10 dark:text-[#FFD100]'
    : isNR
    ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded font-medium ${cls}`}>
      {isNR  && <AlertCircle size={10} />}
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
  const [editingProblem, setEditingProblem]               = useState(null);
  const [editForm, setEditForm]                           = useState({});
  const [editSaving, setEditSaving]                       = useState(false);
  const [reviewComments, setReviewComments]               = useState([]);
  const [reviewCommentsLoading, setReviewCommentsLoading] = useState(false);
  const [replyDrafts, setReplyDrafts]                     = useState({});
  const [replyLoading, setReplyLoading]                   = useState({});
  const [editPreviewShowSolution, setEditPreviewShowSolution] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('problems');

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Wait until auth has resolved. If still null after a tick, keep waiting.
    if (user === undefined) return; // auth not yet resolved
    if (user === null) {
      // Not logged in — stop the spinner so the page doesn't hang.
      setLoading(false);
      return;
    }
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
      // Server always returns 'Needs Review' (with space) from computeDisplayStatus
      const needsReview = problemsRes.data.filter(p => p._displayStatus === 'Needs Review');
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
      latex:    problem.latex    || '',
      solution: problem.solution || '',
      answer:   problem.answer   || '',
      notes:    problem.notes    || '',
      quality:  problem.quality  || '',
      topics:   problem.topics   || [],
      stage:    problem.stage    || 'Idea',
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
        firstName:      user.firstName      || '',
        lastName:       user.lastName       || '',
        initials:       user.initials       || '',
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

  // Server computeDisplayStatus returns: 'Archived' | 'Needs Review' | 'Endorsed' | stage ('Idea' etc.)
  const filteredProblems = problems.filter((p) => {
    if (filter === 'all')          return true;
    if (filter === 'Needs Review') return p._displayStatus === 'Needs Review';
    if (filter === 'Endorsed')     return p._displayStatus === 'Endorsed';
    if (filter === 'Idea')         return p._displayStatus === 'Idea';
    return p._displayStatus === filter;
  });

  // Derived counts — computed purely from _displayStatus, matching server output exactly
  const endorsedCount    = problems.filter(p => p._displayStatus === 'Endorsed').length;
  const needsReviewCount = problems.filter(p => p._displayStatus === 'Needs Review').length;
  const ideasCount       = problems.filter(p => p._displayStatus === 'Idea').length;
  const unreadCount      = notifications.filter(n => !n.read).length;

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
            { key: 'problems',  label: 'My Problems',     icon: <LayoutDashboard size={14} /> },
            { key: 'myreviews', label: 'My Reviews',       icon: <MessageSquare size={14} /> },
            { key: 'review',    label: 'Review Feedback',  icon: <ClipboardEdit size={14} />, badge: needsReviewCount },
            { key: 'settings',  label: 'Account',          icon: <User size={14} /> },
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
                { label: 'My Problems',  value: problems.length, filterVal: 'all',          icon: null },
                { label: 'Endorsed',     value: endorsedCount,   filterVal: 'Endorsed',     icon: <Star size={11} /> },
                { label: 'Needs Review', value: needsReviewCount,filterVal: 'Needs Review', icon: <AlertCircle size={11} /> },
                { label: 'Ideas',        value: ideasCount,      filterVal: 'Idea',         icon: null },
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
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/8">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Problem</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Topic</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Difficulty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {filteredProblems.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 max-w-xs">
                          <div className="text-xs text-gray-400 mb-0.5 font-mono">{p.id}</div>
                          <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                            <KatexRenderer latex={p.latex} />
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {(p.topics || []).join(', ') || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <DiffLabel quality={p.quality} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p._displayStatus} stage={p.stage} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEditProblem(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/8 hover:bg-[#2774AE]/10 dark:hover:bg-[#FFD100]/10 text-gray-600 dark:text-gray-300 hover:text-[#2774AE] dark:hover:text-[#FFD100] rounded-lg transition-colors"
                          >
                            <ClipboardEdit size={11} /> Edit
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

        {/* ── MY REVIEWS TAB ── */}
        {activeTab === 'myreviews' && (
          <div>
            {myFeedback.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <MessageSquare size={36} className="text-gray-200 dark:text-white/10 mb-3" />
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No reviews given yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Reviews you submit will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myFeedback.map(f => (
                  <div key={f.id} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-400 mb-1 font-mono">{f.problemId}</div>
                        {f.comment && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">{f.comment}</p>
                        )}
                        {f.rating && (
                          <p className="text-xs text-gray-400 mt-1">Rating: {f.rating}/5</p>
                        )}
                      </div>
                      <button
                        onClick={e => handleDeleteFeedback(e, f.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-5 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to list
                </button>

                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-gray-400">{editingProblem.id}</span>
                    <StatusBadge status={editingProblem._displayStatus} stage={editingProblem.stage} />
                  </div>

                  {/* Preview */}
                  <div className="bg-gray-50 dark:bg-white/4 rounded-lg p-4 mb-4">
                    <KatexRenderer latex={editForm.latex} />
                    {editPreviewShowSolution && editForm.solution && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Solution</p>
                        <KatexRenderer latex={editForm.solution} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setEditPreviewShowSolution(v => !v)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-4"
                  >
                    {editPreviewShowSolution ? 'Hide solution' : 'Show solution'}
                  </button>

                  {/* Edit fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Problem (LaTeX)</label>
                      <textarea
                        value={editForm.latex}
                        onChange={e => handleEditFieldChange('latex', e.target.value)}
                        rows={4}
                        className="w-full text-sm font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Solution</label>
                      <textarea
                        value={editForm.solution}
                        onChange={e => handleEditFieldChange('solution', e.target.value)}
                        rows={3}
                        className="w-full text-sm font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Answer</label>
                        <input
                          value={editForm.answer}
                          onChange={e => handleEditFieldChange('answer', e.target.value)}
                          className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Difficulty</label>
                        <select
                          value={editForm.quality}
                          onChange={e => handleEditFieldChange('quality', e.target.value)}
                          className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none dark:text-white"
                        >
                          <option value="">—</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={String(n)}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Topics</label>
                      <div className="flex flex-wrap gap-1.5">
                        {topicOptions.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleEditTopic(t)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              editForm.topics?.includes(t)
                                ? 'bg-[#2774AE] text-white'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Notes</label>
                      <textarea
                        value={editForm.notes}
                        onChange={e => handleEditFieldChange('notes', e.target.value)}
                        rows={2}
                        className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={handleEditSave}
                      disabled={editSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#2774AE] hover:bg-[#1a5a8a] dark:bg-[#FFD100] dark:hover:bg-[#e6bc00] text-white dark:text-slate-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <Save size={13} /> {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingProblem(null); setReviewComments([]); }}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Reviewer comments */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Review Comments</h3>
                  {reviewCommentsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </div>
                  ) : reviewComments.length === 0 ? (
                    <p className="text-sm text-gray-400">No review comments yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {reviewComments.map(f => (
                        <div key={f.id} className={`rounded-lg p-4 ${
                          f.resolved ? 'bg-green-50 dark:bg-green-900/10' : 'bg-gray-50 dark:bg-white/4'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              {f.user ? `${f.user.firstName} ${f.user.lastName}` : 'Reviewer'}
                            </span>
                            <div className="flex items-center gap-2">
                              {f.resolved && (
                                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                  <CheckCircle size={11} /> Resolved
                                </span>
                              )}
                              {!f.resolved && (
                                <button
                                  onClick={() => handleResolveFeedback(f.id)}
                                  className="text-xs text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                >
                                  Mark resolved
                                </button>
                              )}
                            </div>
                          </div>
                          {f.comment && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{f.comment}</p>}
                          {f.rating && <p className="text-xs text-gray-400">Rating: {f.rating}/5</p>}

                          {/* Reply */}
                          {!f.resolved && (
                            <div className="mt-3 flex gap-2">
                              <input
                                value={replyDrafts[f.id] || ''}
                                onChange={e => setReplyDrafts(prev => ({ ...prev, [f.id]: e.target.value }))}
                                placeholder="Reply…"
                                className="flex-1 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2774AE]/30 dark:text-white placeholder:text-gray-400"
                              />
                              <button
                                onClick={() => handleSaveReply(f.id)}
                                disabled={replyLoading[f.id]}
                                className="px-2.5 py-1 bg-[#2774AE] text-white text-xs rounded hover:bg-[#1a5a8a] transition-colors disabled:opacity-50"
                              >
                                {replyLoading[f.id] ? '…' : 'Send'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Problems marked Needs Review — click to view, or edit and resubmit directly here.
                </p>
                {reviewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
                    Loading…
                  </div>
                ) : reviewProblems.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <CheckCircle size={36} className="text-green-400 mb-3" />
                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300">You're all caught up!</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No problems are marked Needs Review.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewProblems.map(p => (
                      <button
                        key={p.id}
                        onClick={() => openEditProblem(p)}
                        className="w-full text-left bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-5 py-4 hover:border-[#2774AE]/30 dark:hover:border-[#FFD100]/30 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-gray-400">{p.id}</span>
                          <StatusBadge status={p._displayStatus} stage={p.stage} />
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          <KatexRenderer latex={p.latex} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ACCOUNT TAB ── */}
        {activeTab === 'settings' && (
          <div className="max-w-md">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Account Settings</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">First Name</label>
                  <input
                    value={formData.firstName}
                    onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                    className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Last Name</label>
                  <input
                    value={formData.lastName}
                    onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                    className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Initials</label>
                <input
                  value={formData.initials}
                  onChange={e => setFormData(p => ({ ...p, initials: e.target.value }))}
                  maxLength={4}
                  className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Math Experience</label>
                <select
                  value={formData.mathExperience}
                  onChange={e => setFormData(p => ({ ...p, mathExperience: e.target.value }))}
                  className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white"
                >
                  <option value="">Select…</option>
                  <option value="AMC 10/12">AMC 10/12</option>
                  <option value="AIME">AIME</option>
                  <option value="USAMO/USAJMO">USAMO/USAJMO</option>
                  <option value="Putnam">Putnam</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#2774AE] hover:bg-[#1a5a8a] dark:bg-[#FFD100] dark:hover:bg-[#e6bc00] text-white dark:text-slate-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Save size={13} /> {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
                {profileMsg && <span className="text-xs text-green-600 dark:text-green-400">{profileMsg}</span>}
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
