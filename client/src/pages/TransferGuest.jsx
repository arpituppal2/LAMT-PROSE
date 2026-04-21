import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckSquare, Square, Users, FileText,
  MessageSquare, AlertCircle, CheckCircle, Search, X, Loader2,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, label, count, onSelectAll, allSelected }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/8">
    <div className="flex items-center gap-2">
      <Icon size={13} className="text-slate-400" />
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400 tabular-nums">{count}</span>
    </div>
    <button
      onClick={onSelectAll}
      className="text-[11px] font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] hover:underline transition"
    >
      {allSelected ? 'Deselect all' : 'Select all'}
    </button>
  </div>
);

const stageBadgeClass = (stage) => {
  if (stage === 'Archived')     return 'status-badge status-archived';
  if (stage === 'Endorsed')     return 'status-badge status-endorsed';
  if (stage === 'Needs Review') return 'status-badge status-needs-review';
  if (stage === 'Idea')         return 'status-badge status-idea';
  return 'status-badge status-archived';
};

// ─── Main component ───────────────────────────────────────────────────────────
const TransferGuest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [guestId, setGuestId] = useState('');
  const [problems, setProblems] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedProblems, setSelectedProblems] = useState(new Set());
  const [selectedFeedbacks, setSelectedFeedbacks] = useState(new Set());
  const [toUserId, setToUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchGuestContent();
  }, [user]);

  const fetchGuestContent = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/guest-content');
      setGuestId(res.data.guestId);
      setProblems(res.data.problems);
      setFeedbacks(res.data.feedbacks);
      setUsers(res.data.users);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load guest content');
    } finally {
      setLoading(false);
    }
  };

  const toggleProblem = (id) => setSelectedProblems(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleFeedback = (id) => setSelectedFeedbacks(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const selectAllProblems = () =>
    setSelectedProblems(selectedProblems.size === problems.length ? new Set() : new Set(problems.map(p => p.id)));
  const selectAllFeedbacks = () =>
    setSelectedFeedbacks(selectedFeedbacks.size === feedbacks.length ? new Set() : new Set(feedbacks.map(f => f.id)));

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    if (!q) return users;
    return users.filter(
      u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
           u.email.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const selectedTarget = users.find(u => u.id === toUserId);
  const totalSelected = selectedProblems.size + selectedFeedbacks.size;
  const canTransfer = toUserId && totalSelected > 0;

  const handleTransfer = async () => {
    if (!toUserId) { setError('Please select a target user.'); return; }
    if (!totalSelected) { setError('Select at least one problem or feedback to transfer.'); return; }
    setTransferring(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/admin/transfer', {
        toUserId,
        problemIds: Array.from(selectedProblems),
        feedbackIds: Array.from(selectedFeedbacks),
      });
      setSuccess(res.data.message);
      setSelectedProblems(new Set());
      setSelectedFeedbacks(new Set());
      setToUserId('');
      setUserSearch('');
      fetchGuestContent();
    } catch (err) {
      setError(err?.response?.data?.error || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-16">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">Transfer Guest Content</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            Re-attribute problems and feedback from{' '}
            <code className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/8 px-1.5 py-0.5 rounded-[var(--radius-xs)]">GUESTBRUINS@ucla.edu</code>{' '}
            to their real accounts.
          </p>
        </div>

        {/* Banners */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--badge-needs-review-bg)] border border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)] text-sm">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--badge-endorsed-bg)] border border-[var(--badge-endorsed-border)] text-[var(--badge-endorsed-text)] text-sm">
            <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Empty state */}
        {problems.length === 0 && feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-[var(--radius-xl)] border border-dashed border-slate-200 dark:border-white/10 text-center">
            <CheckCircle size={32} className="text-[var(--badge-endorsed-text)] mb-3" />
            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">All clear — no guest content remaining</p>
            <p className="text-xs text-slate-400 mt-1">The GUESTBRUINS account has no problems or feedbacks left.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Left: content lists ────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Problems */}
              {problems.length > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-slate-200 dark:border-white/8 bg-white dark:bg-[var(--app-surface)] overflow-hidden">
                  <SectionHeader
                    icon={FileText}
                    label="Problems"
                    count={problems.length}
                    onSelectAll={selectAllProblems}
                    allSelected={selectedProblems.size === problems.length}
                  />
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {problems.map(p => {
                      const checked = selectedProblems.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProblem(p.id)}
                          className={[
                            'flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors select-none',
                            checked
                              ? 'bg-[var(--ucla-blue)]/4 dark:bg-[var(--ucla-gold)]/4'
                              : 'hover:bg-slate-50 dark:hover:bg-white/3',
                          ].join(' ')}
                        >
                          <div className={[
                            'mt-0.5 flex-shrink-0 transition-colors',
                            checked
                              ? 'text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]'
                              : 'text-slate-300 dark:text-slate-600',
                          ].join(' ')}>
                            {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500">{p.id}</span>
                              <span className={stageBadgeClass(p.stage)}>{p.stage}</span>
                              {p.topics?.map(t => (
                                <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400">{t}</span>
                              ))}
                              <span className="ml-auto text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 prose-math">
                              <KatexRenderer latex={p.latex?.slice(0, 120) + (p.latex?.length > 120 ? '…' : '')} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Feedbacks */}
              {feedbacks.length > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-slate-200 dark:border-white/8 bg-white dark:bg-[var(--app-surface)] overflow-hidden">
                  <SectionHeader
                    icon={MessageSquare}
                    label="Feedback"
                    count={feedbacks.length}
                    onSelectAll={selectAllFeedbacks}
                    allSelected={selectedFeedbacks.size === feedbacks.length}
                  />
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {feedbacks.map(fb => {
                      const checked = selectedFeedbacks.has(fb.id);
                      return (
                        <div
                          key={fb.id}
                          onClick={() => toggleFeedback(fb.id)}
                          className={[
                            'flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors select-none',
                            checked
                              ? 'bg-[var(--ucla-blue)]/4 dark:bg-[var(--ucla-gold)]/4'
                              : 'hover:bg-slate-50 dark:hover:bg-white/3',
                          ].join(' ')}
                        >
                          <div className={[
                            'mt-0.5 flex-shrink-0 transition-colors',
                            checked
                              ? 'text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]'
                              : 'text-slate-300 dark:text-slate-600',
                          ].join(' ')}>
                            {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500">on {fb.problemId}</span>
                              {fb.isEndorsement && (
                                <span className="status-badge status-endorsed">Endorsement</span>
                              )}
                              {fb.resolved && (
                                <span className="status-badge status-resolved">Resolved</span>
                              )}
                              <span className="ml-auto text-[10px] text-slate-400">{new Date(fb.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                              {fb.feedback?.slice(0, 100)}{fb.feedback?.length > 100 ? '…' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: sticky panel ────────────────────────────────────── */}
            <div>
              <div className="sticky top-6 space-y-3">

                {/* Selection summary */}
                <div className="rounded-[var(--radius-lg)] border border-slate-200 dark:border-white/8 bg-white dark:bg-[var(--app-surface)] p-4">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Selected to Transfer</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <FileText size={12} /> Problems
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums text-sm">{selectedProblems.size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <MessageSquare size={12} /> Feedbacks
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums text-sm">{selectedFeedbacks.size}</span>
                    </div>
                  </div>
                </div>

                {/* Target user picker */}
                <div className="rounded-[var(--radius-lg)] border border-slate-200 dark:border-white/8 bg-white dark:bg-[var(--app-surface)] p-4">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users size={11} /> Transfer To
                  </p>

                  {selectedTarget ? (
                    <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--ucla-blue)]/5 dark:bg-[var(--ucla-gold)]/5 border border-[var(--ucla-blue)]/15 dark:border-[var(--ucla-gold)]/15">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{selectedTarget.firstName} {selectedTarget.lastName}</p>
                        <p className="text-xs text-slate-400 truncate">{selectedTarget.email}</p>
                      </div>
                      <button
                        onClick={() => { setToUserId(''); setUserSearch(''); }}
                        className="ml-2 flex-shrink-0 p-1 rounded-[var(--radius-sm)] text-slate-400 hover:text-[var(--badge-needs-review-text)] hover:bg-[var(--badge-needs-review-bg)] transition"
                        aria-label="Clear selection"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          placeholder="Search name or email…"
                          className="w-full pl-8 pr-3 py-2 rounded-[var(--radius-md)] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/4 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--ucla-blue)]/25 dark:focus:ring-[var(--ucla-gold)]/20 transition"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
                        {filteredUsers.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No users found</p>
                        ) : filteredUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => { setToUserId(u.id); setUserSearch(''); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/4 transition-colors"
                          >
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transfer CTA */}
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !canTransfer}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] text-white dark:text-slate-900 py-2.5 rounded-[var(--radius-md)] font-semibold text-sm hover:bg-[var(--ucla-blue-hover)] dark:hover:bg-[var(--ucla-gold-hover)] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {transferring ? (
                    <><Loader2 size={14} className="animate-spin" /> Transferring…</>
                  ) : (
                    <><ArrowRight size={14} /> Transfer {totalSelected > 0 ? `${totalSelected} item${totalSelected !== 1 ? 's' : ''}` : 'Selected'}</>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed px-1">
                  Items will be re-attributed to the selected user. GUESTBRUINS is not deleted.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
};

export default TransferGuest;
