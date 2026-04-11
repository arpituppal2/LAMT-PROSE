import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckSquare, Square, Users, FileText,
  MessageSquare, AlertCircle, CheckCircle, Search, X
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

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

  const toggleProblem = (id) => {
    setSelectedProblems(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleFeedback = (id) => {
    setSelectedFeedbacks(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const selectAllProblems = () => {
    if (selectedProblems.size === problems.length) setSelectedProblems(new Set());
    else setSelectedProblems(new Set(problems.map(p => p.id)));
  };

  const selectAllFeedbacks = () => {
    if (selectedFeedbacks.size === feedbacks.length) setSelectedFeedbacks(new Set());
    else setSelectedFeedbacks(new Set(feedbacks.map(f => f.id)));
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    if (!q) return users;
    return users.filter(
      u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
           u.email.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const selectedTarget = users.find(u => u.id === toUserId);

  const handleTransfer = async () => {
    if (!toUserId) { setError('Please select a target user.'); return; }
    if (!selectedProblems.size && !selectedFeedbacks.size) {
      setError('Select at least one problem or feedback to transfer.');
      return;
    }
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
      fetchGuestContent(); // refresh remaining
    } catch (err) {
      setError(err?.response?.data?.error || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const stageBadge = (stage) => {
    if (stage === 'Archived') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    if (stage === 'Endorsed') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (stage === 'Needs Review') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  };

  if (loading) return (
    <Layout>
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-ucla-blue border-t-transparent" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 pb-20 pt-2">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Transfer Guest Content</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Re-attribute problems and feedback from <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">GUESTBRUINS@ucla.edu</span> to their real accounts.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            <CheckCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {problems.length === 0 && feedbacks.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All clear — no guest content remaining</p>
            <p className="text-sm text-slate-400 mt-1">The GUESTBRUINS account has no problems or feedbacks left.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: content lists */}
            <div className="lg:col-span-2 space-y-6">

              {/* Problems */}
              {problems.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Problems</span>
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold px-2 py-0.5 rounded-full">{problems.length}</span>
                    </div>
                    <button
                      onClick={selectAllProblems}
                      className="text-xs font-semibold text-ucla-blue hover:underline"
                    >
                      {selectedProblems.size === problems.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {problems.map(p => {
                      const checked = selectedProblems.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProblem(p.id)}
                          className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors ${
                            checked ? 'bg-ucla-blue/5 dark:bg-ucla-blue/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className={`mt-0.5 flex-shrink-0 ${
                            checked ? 'text-ucla-blue' : 'text-slate-300 dark:text-slate-600'
                          }`}>
                            {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-mono text-xs font-semibold text-slate-500">{p.id}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${stageBadge(p.stage)}`}>{p.stage}</span>
                              {p.topics?.map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-medium rounded">{t}</span>
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
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Feedback</span>
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold px-2 py-0.5 rounded-full">{feedbacks.length}</span>
                    </div>
                    <button
                      onClick={selectAllFeedbacks}
                      className="text-xs font-semibold text-ucla-blue hover:underline"
                    >
                      {selectedFeedbacks.size === feedbacks.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {feedbacks.map(fb => {
                      const checked = selectedFeedbacks.has(fb.id);
                      return (
                        <div
                          key={fb.id}
                          onClick={() => toggleFeedback(fb.id)}
                          className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors ${
                            checked ? 'bg-ucla-blue/5 dark:bg-ucla-blue/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className={`mt-0.5 flex-shrink-0 ${
                            checked ? 'text-ucla-blue' : 'text-slate-300 dark:text-slate-600'
                          }`}>
                            {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs font-semibold text-slate-500">on {fb.problemId}</span>
                              {fb.isEndorsement && (
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-semibold rounded-full">Endorsement</span>
                              )}
                              {fb.resolved && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-semibold rounded-full">Resolved</span>
                              )}
                              <span className="ml-auto text-[10px] text-slate-400">{new Date(fb.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{fb.feedback?.slice(0, 100)}{fb.feedback?.length > 100 ? '…' : ''}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: target user + action */}
            <div className="space-y-4">
              <div className="sticky top-6 space-y-4">

                {/* Selection summary */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Selected to Transfer</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <FileText size={13} /> Problems
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">{selectedProblems.size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MessageSquare size={13} /> Feedbacks
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">{selectedFeedbacks.size}</span>
                    </div>
                  </div>
                </div>

                {/* Target user picker */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users size={12} /> Transfer To
                  </p>

                  {selectedTarget ? (
                    <div className="flex items-center justify-between p-3 bg-ucla-blue/5 dark:bg-ucla-blue/10 border border-ucla-blue/20 rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{selectedTarget.firstName} {selectedTarget.lastName}</p>
                        <p className="text-xs text-slate-400">{selectedTarget.email}</p>
                      </div>
                      <button onClick={() => { setToUserId(''); setUserSearch(''); }} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          placeholder="Search by name or email…"
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No users found</p>
                        ) : filteredUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => { setToUserId(u.id); setUserSearch(''); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transfer button */}
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !toUserId || (!selectedProblems.size && !selectedFeedbacks.size)}
                  className="w-full flex items-center justify-center gap-2 bg-ucla-blue text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1a5a8a] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {transferring ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Transferring…</>
                  ) : (
                    <><ArrowRight size={16} /> Transfer Selected</>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Items will be re-attributed to the selected user. The GUESTBRUINS account is not deleted.
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
