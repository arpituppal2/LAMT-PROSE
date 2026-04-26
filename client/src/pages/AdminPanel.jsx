import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ArrowLeft, Search,
  Save, X, ToggleLeft, ToggleRight, Check, AlertTriangle,
  Plus, Trash2, Pencil, Trophy, ChevronDown, ChevronUp,
  FlaskConical, KeyRound, Copy, Users, Loader2, ChevronRight,
  Eye, BookOpen, Settings,
} from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
const PAGE_ACCESS_KEYS = [
  { key: 'problems',    label: 'Problems' },
  { key: 'testsolving', label: 'Testsolving' },
  { key: 'exams',       label: 'Exams' },
  { key: 'stats',       label: 'Stats' },
  { key: 'feedback',    label: 'Feedback' },
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/* ══════════════════════════════════════════════════════════════
   TAB BAR
══════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'users',       label: 'Users',       Icon: Users },
  { id: 'tournaments', label: 'Tournaments', Icon: Trophy },
  { id: 'guest',       label: 'Guest Content', Icon: Eye },
];

/* ══════════════════════════════════════════════════════════════
   INLINE SAVE INDICATOR
══════════════════════════════════════════════════════════════ */
const SavedBadge = ({ show }) =>
  show ? (
    <span
      className="inline-flex items-center gap-1"
      style={{ fontSize: 'var(--text-xs)', color: 'var(--badge-endorsed-text)' }}
    >
      <Check size={11} /> Saved
    </span>
  ) : null;

/* ══════════════════════════════════════════════════════════════
   USERS TAB
══════════════════════════════════════════════════════════════ */
const UsersTab = () => {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [query, setQuery]       = useState('');
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [savedId, setSavedId]   = useState(null);
  const [saveErr, setSaveErr]   = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get('/admin/users')
      .then(r => setUsers(r.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const q = query.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.initials.toLowerCase().includes(q)
    );
  });

  const startEdit = (u) => {
    setEditing(u.id);
    setForm({
      firstName:  u.firstName,
      lastName:   u.lastName,
      initials:   u.initials,
      disabled:   u.disabled,
      pageAccess: { ...(u.pageAccess || {}) },
    });
    setSaveErr('');
  };

  const cancelEdit = () => { setEditing(null); setSaveErr(''); };

  const handleSave = async (userId) => {
    setSaving(true); setSaveErr('');
    try {
      const updated = await api.patch(`/admin/users/${userId}`, form);
      setUsers(prev => prev.map(u => u.id === userId ? updated.data : u));
      setEditing(null);
      setSavedId(userId);
      setTimeout(() => setSavedId(null), 1800);
    } catch (err) {
      setSaveErr(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (key) => {
    setForm(f => ({
      ...f,
      pageAccess: { ...f.pageAccess, [key]: !f.pageAccess[key] },
    }));
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  if (loading) return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm border"
      style={{ background: 'var(--badge-needs-review-bg)', borderColor: 'var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}>
      <AlertTriangle size={14} /> {error}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-faint)' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, email, or initials…"
          className="input-base w-full pl-9"
          style={{ fontSize: 'var(--text-sm)' }}
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-10" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>
          No users found.
        </p>
      )}

      <div className="space-y-2">
        {filtered.map(u => {
          const isEditing  = editing === u.id;
          const isExpanded = !!expanded[u.id];
          const pageAccess = u.pageAccess || {};

          return (
            <div key={u.id}
              className="surface-card overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                onClick={() => !isEditing && toggleExpand(u.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex-shrink-0 flex items-center justify-center font-bold"
                    style={{
                      width: 34, height: 34, borderRadius: 'var(--radius-full)',
                      background: 'var(--color-surface-offset)',
                      color: 'var(--color-text-muted)',
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {u.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                      {u.email}
                    </p>
                  </div>
                  {u.disabled && (
                    <span className="px-2 py-0.5 border font-semibold uppercase tracking-wide flex-shrink-0"
                      style={{ fontSize: 'var(--text-xs)', background: 'var(--badge-needs-review-bg)', borderColor: 'var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}>
                      Disabled
                    </span>
                  )}
                  {savedId === u.id && <SavedBadge show />}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                    {u._count?.problems ?? 0}P · {u._count?.feedbacks ?? 0}F
                  </span>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); startEdit(u); if (!isExpanded) toggleExpand(u.id); }}
                      className="p-1.5 transition-colors"
                      style={{ color: 'var(--color-text-faint)' }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {isExpanded
                    ? <ChevronUp size={14} style={{ color: 'var(--color-text-faint)' }} />
                    : <ChevronDown size={14} style={{ color: 'var(--color-text-faint)' }} />
                  }
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-4">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {[['firstName','First Name'],['lastName','Last Name'],['initials','Initials']].map(([k, lbl]) => (
                          <div key={k} className="col-span-1">
                            <label className="section-label">{lbl}</label>
                            <input
                              type="text"
                              value={form[k] || ''}
                              onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                              className="input-base w-full mt-1"
                              style={{ fontSize: 'var(--text-sm)' }}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="section-label">Account Disabled</p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                            Disabled users cannot log in.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, disabled: !f.disabled }))}
                          className="transition-colors"
                        >
                          {form.disabled
                            ? <ToggleRight size={28} style={{ color: 'var(--badge-needs-review-text)' }} />
                            : <ToggleLeft  size={28} style={{ color: 'var(--color-text-faint)' }} />
                          }
                        </button>
                      </div>

                      <div>
                        <p className="section-label mb-2">Page Access</p>
                        <div className="flex flex-wrap gap-2">
                          {PAGE_ACCESS_KEYS.map(({ key, label }) => {
                            const on = !!form.pageAccess?.[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => togglePage(key)}
                                className="px-3 py-1.5 border font-semibold transition-colors"
                                style={{
                                  fontSize: 'var(--text-xs)',
                                  borderRadius: 'var(--radius-sm)',
                                  ...(on
                                    ? { background: 'var(--badge-endorsed-bg)', borderColor: 'var(--badge-endorsed-border)', color: 'var(--badge-endorsed-text)' }
                                    : { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }
                                  ),
                                }}
                              >
                                {on ? <Check size={10} className="inline mr-1" /> : null}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {saveErr && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--badge-needs-review-text)' }}>
                          {saveErr}
                        </p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={cancelEdit} className="btn-outline px-4 py-2 text-sm">
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSave(u.id)}
                          disabled={saving}
                          className="btn-filled px-4 py-2 text-sm disabled:opacity-50"
                        >
                          {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Changes'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ['Math Experience', u.mathExp],
                          ['Joined', fmtDate(u.createdAt)],
                          ['Initials', u.initials],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <p className="section-label">{k}</p>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{v || '—'}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="section-label mb-1.5">Page Access</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PAGE_ACCESS_KEYS.map(({ key, label }) => {
                            const on = !!(pageAccess[key]);
                            return (
                              <span
                                key={key}
                                className="px-2 py-0.5 border font-semibold"
                                style={{
                                  fontSize: 'var(--text-xs)',
                                  borderRadius: 'var(--radius-sm)',
                                  ...(on
                                    ? { background: 'var(--badge-endorsed-bg)', borderColor: 'var(--badge-endorsed-border)', color: 'var(--badge-endorsed-text)' }
                                    : { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-faint)' }
                                  ),
                                }}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   TOURNAMENTS TAB
══════════════════════════════════════════════════════════════ */
const TournamentsTab = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [expanded, setExpanded]       = useState({});

  const [newName, setNewName]     = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [creating, setCreating]   = useState(false);
  const [createErr, setCreateErr] = useState('');

  const [editTId, setEditTId]     = useState(null);
  const [editTForm, setEditTForm] = useState({});
  const [savingT, setSavingT]     = useState(false);

  const [newRoundName, setNewRoundName]   = useState({});
  const [newRoundType, setNewRoundType]   = useState({});
  const [addingRound, setAddingRound]     = useState({});
  const [editRound, setEditRound]         = useState(null);
  const [editRoundForm, setEditRoundForm] = useState({});
  const [savingR, setSavingR]             = useState(false);
  const [deletingR, setDeletingR]         = useState(null);
  const [deletingT, setDeletingT]         = useState(null);

  useEffect(() => {
    api.get('/admin/tournaments')
      .then(r => setTournaments(r.data))
      .catch(() => setError('Failed to load tournaments.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const handleCreateTournament = async () => {
    if (!newName.trim()) return;
    setCreating(true); setCreateErr('');
    try {
      const r = await api.post('/admin/tournaments', { name: newName.trim(), description: newDesc.trim() || null });
      setTournaments(prev => [...prev, r.data]);
      setNewName(''); setNewDesc('');
    } catch (err) {
      setCreateErr(err.response?.data?.error || 'Failed to create.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTournament = async (id) => {
    setSavingT(true);
    try {
      const r = await api.patch(`/admin/tournaments/${id}`, editTForm);
      setTournaments(prev => prev.map(t => t.id === id ? r.data : t));
      setEditTId(null);
    } catch {} finally { setSavingT(false); }
  };

  const handleDeleteTournament = async (id) => {
    if (!window.confirm('Delete this tournament? Its rounds will also be removed.')) return;
    setDeletingT(id);
    try {
      await api.delete(`/admin/tournaments/${id}`);
      setTournaments(prev => prev.filter(t => t.id !== id));
    } catch {} finally { setDeletingT(null); }
  };

  const handleAddRound = async (tId) => {
    const name = newRoundName[tId]?.trim();
    if (!name) return;
    setAddingRound(p => ({ ...p, [tId]: true }));
    try {
      const r = await api.post(`/admin/tournaments/${tId}/rounds`, {
        name,
        roundType: newRoundType[tId] || 'Individual',
      });
      setTournaments(prev => prev.map(t =>
        t.id === tId ? { ...t, rounds: [...(t.rounds || []), r.data] } : t
      ));
      setNewRoundName(p => ({ ...p, [tId]: '' }));
    } catch {} finally { setAddingRound(p => ({ ...p, [tId]: false })); }
  };

  const handleSaveRound = async () => {
    if (!editRound) return;
    setSavingR(true);
    try {
      const r = await api.patch(
        `/admin/tournaments/${editRound.tournamentId}/rounds/${editRound.round.id}`,
        editRoundForm
      );
      setTournaments(prev => prev.map(t =>
        t.id === editRound.tournamentId
          ? { ...t, rounds: t.rounds.map(rr => rr.id === r.data.id ? r.data : rr) }
          : t
      ));
      setEditRound(null);
    } catch {} finally { setSavingR(false); }
  };

  const handleDeleteRound = async (tId, roundId) => {
    if (!window.confirm('Delete this round?')) return;
    setDeletingR(roundId);
    try {
      await api.delete(`/admin/tournaments/${tId}/rounds/${roundId}`);
      setTournaments(prev => prev.map(t =>
        t.id === tId ? { ...t, rounds: t.rounds.filter(r => r.id !== roundId) } : t
      ));
    } catch {} finally { setDeletingR(null); }
  };

  if (loading) return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="surface-card px-4 py-4 space-y-3" style={{ border: '1px solid var(--color-border)' }}>
        <p className="section-label">New Tournament</p>
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateTournament()} placeholder="Tournament name" className="input-base flex-1" style={{ fontSize: 'var(--text-sm)' }} />
          <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="input-base flex-1" style={{ fontSize: 'var(--text-sm)' }} />
          <button type="button" onClick={handleCreateTournament} disabled={creating || !newName.trim()} className="btn-filled px-4 py-2 text-sm disabled:opacity-50">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </div>
        {createErr && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--badge-needs-review-text)' }}>{createErr}</p>}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm border"
          style={{ background: 'var(--badge-needs-review-bg)', borderColor: 'var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {tournaments.length === 0 && !error && (
        <p className="text-center py-10" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>No tournaments yet.</p>
      )}

      {tournaments.map(t => {
        const isOpen     = !!expanded[t.id];
        const isEditingT = editTId === t.id;
        return (
          <div key={t.id} className="surface-card overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--color-surface)] transition-colors" onClick={() => !isEditingT && toggleExpand(t.id)}>
              <div className="flex items-center gap-3 min-w-0">
                <Trophy size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                {isEditingT ? (
                  <input type="text" value={editTForm.name || ''} onChange={e => setEditTForm(f => ({ ...f, name: e.target.value }))} onClick={e => e.stopPropagation()} className="input-base" style={{ fontSize: 'var(--text-sm)', width: 200 }} />
                ) : (
                  <span className="font-semibold text-sm truncate">{t.name}</span>
                )}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                  {t.rounds?.length ?? 0} round{t.rounds?.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-3" onClick={e => e.stopPropagation()}>
                {isEditingT ? (
                  <>
                    <button type="button" onClick={() => handleSaveTournament(t.id)} disabled={savingT} className="btn-filled px-3 py-1.5 text-xs disabled:opacity-50">
                      {savingT ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditTId(null)} className="btn-outline px-3 py-1.5 text-xs ml-1">Cancel</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setEditTId(t.id); setEditTForm({ name: t.name, description: t.description || '' }); if (!isOpen) toggleExpand(t.id); }} className="p-1.5 transition-colors" style={{ color: 'var(--color-text-faint)' }} title="Edit"><Pencil size={13} /></button>
                    <button type="button" onClick={() => handleDeleteTournament(t.id)} disabled={deletingT === t.id} className="p-1.5 transition-colors disabled:opacity-40" style={{ color: 'var(--color-text-faint)' }} title="Delete">
                      {deletingT === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </>
                )}
                {isOpen ? <ChevronUp size={14} style={{ color: 'var(--color-text-faint)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-faint)' }} />}
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-3">
                {t.description && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.description}</p>}
                <p className="section-label">Rounds</p>
                {(!t.rounds || t.rounds.length === 0) && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontStyle: 'italic' }}>No rounds yet.</p>
                )}
                <div className="space-y-1.5">
                  {(t.rounds || []).map(rr => {
                    const isEditR = editRound?.round?.id === rr.id;
                    return (
                      <div key={rr.id} className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        {isEditR ? (
                          <>
                            <input type="text" value={editRoundForm.name || ''} onChange={e => setEditRoundForm(f => ({ ...f, name: e.target.value }))} className="input-base flex-1" style={{ fontSize: 'var(--text-xs)' }} />
                            <select value={editRoundForm.roundType || 'Individual'} onChange={e => setEditRoundForm(f => ({ ...f, roundType: e.target.value }))} className="input-base" style={{ fontSize: 'var(--text-xs)', width: 110 }}>
                              <option>Individual</option>
                              <option>Team</option>
                            </select>
                            <button type="button" onClick={handleSaveRound} disabled={savingR} className="btn-filled px-2 py-1 text-xs disabled:opacity-50">
                              {savingR ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            </button>
                            <button type="button" onClick={() => setEditRound(null)} className="btn-outline px-2 py-1 text-xs"><X size={11} /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium">{rr.name}</span>
                            <span className="px-2 py-0.5 border font-semibold uppercase tracking-wide" style={{ fontSize: 'var(--text-xs)', background: 'var(--color-surface-offset)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{rr.roundType}</span>
                            <button type="button" onClick={() => { setEditRound({ tournamentId: t.id, round: rr }); setEditRoundForm({ name: rr.name, roundType: rr.roundType }); }} className="p-1 transition-colors" style={{ color: 'var(--color-text-faint)' }}><Pencil size={12} /></button>
                            <button type="button" onClick={() => handleDeleteRound(t.id, rr.id)} disabled={deletingR === rr.id} className="p-1 transition-colors disabled:opacity-40" style={{ color: 'var(--color-text-faint)' }}>
                              {deletingR === rr.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <input type="text" value={newRoundName[t.id] || ''} onChange={e => setNewRoundName(p => ({ ...p, [t.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAddRound(t.id)} placeholder="New round name" className="input-base flex-1" style={{ fontSize: 'var(--text-xs)' }} />
                  <select value={newRoundType[t.id] || 'Individual'} onChange={e => setNewRoundType(p => ({ ...p, [t.id]: e.target.value }))} className="input-base" style={{ fontSize: 'var(--text-xs)', width: 110 }}>
                    <option>Individual</option>
                    <option>Team</option>
                  </select>
                  <button type="button" onClick={() => handleAddRound(t.id)} disabled={addingRound[t.id] || !newRoundName[t.id]?.trim()} className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50">
                    {addingRound[t.id] ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   GUEST CONTENT TAB  (problems only — no feedbacks)
══════════════════════════════════════════════════════════════ */
const GuestContentTab = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [query, setQuery]     = useState('');

  useEffect(() => {
    api.get('/admin/guest-content')
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load guest content.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm border"
      style={{ background: 'var(--badge-needs-review-bg)', borderColor: 'var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}>
      <AlertTriangle size={14} /> {error}
    </div>
  );

  const { problems = [] } = data || {};

  const filtered = problems.filter(p =>
    !query ||
    p.id.toLowerCase().includes(query.toLowerCase()) ||
    (p.latex || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-3 border"
        style={{ background: 'var(--badge-idea-bg)', borderColor: 'var(--badge-idea-border)', color: 'var(--badge-idea-text)', fontSize: 'var(--text-xs)' }}>
        <AlertTriangle size={13} />
        <span>
          Problems submitted by <strong>GUESTBRUINS</strong>. Reassign to the real author via their user profile.
        </span>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by ID or content…"
          className="input-base w-full pl-9"
          style={{ fontSize: 'var(--text-sm)' }}
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-10" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>
          No guest problems.
        </p>
      )}

      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="surface-card px-4 py-3" style={{ border: '1px solid var(--color-border)' }}>
            <span className="font-mono font-semibold" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>{p.id}</span>
            <p className="mt-1 line-clamp-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {p.latex?.slice(0, 160) || 'No text.'}
            </p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {[p.stage, p.quality, p.examType].filter(Boolean).map(tag => (
                <span key={tag} className="px-2 py-0.5 border" style={{ fontSize: 'var(--text-xs)', background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{tag}</span>
              ))}
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{fmtDate(p.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');

  if (!user?.isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <ShieldAlert size={32} style={{ color: 'var(--color-text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Access denied.</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={13} /> Go back
          </button>
        </div>
      </Layout>
    );
  }

  const ActiveTab = tab === 'users' ? UsersTab : tab === 'tournaments' ? TournamentsTab : GuestContentTab;

  return (
    <Layout pageKey="admin">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <span className="gold-rule mb-3" />
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Admin Panel
            </h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Manage users, page access, tournaments, and guest content.
          </p>
        </header>

        <div className="flex gap-1 border-b border-[var(--color-border)]">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === id ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: tab === id ? 'var(--color-text)' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <ActiveTab />
      </div>
    </Layout>
  );
};

export default AdminPanel;
