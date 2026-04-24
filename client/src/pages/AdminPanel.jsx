import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ArrowLeft, Search, ChevronRight,
  Save, X, ToggleLeft, ToggleRight, Check, AlertTriangle,
  User, Lock, Unlock, Eye, EyeOff,
  Plus, Trash2, Pencil, Trophy, ChevronDown,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Layout from '../components/Layout';
import { MANAGEABLE_PAGES } from '../components/Layout';

const card = 'surface-card';
const inp  = 'input-base';
const hdr  = 'section-label';

const initials = (u) => `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
const fullName = (u) => `${u.firstName} ${u.lastName}`;

const Avatar = ({ user, size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: 0, flexShrink: 0,
    background: user.disabled ? 'var(--color-surface-offset)' : 'var(--ucla-blue)',
    border: '1px solid var(--color-border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.33, fontWeight: 800,
    color: user.disabled ? 'var(--color-text-faint)' : '#fff',
    fontFamily: 'var(--font-display)', userSelect: 'none',
    opacity: user.disabled ? 0.55 : 1,
  }}>
    {initials(user)}
  </div>
);

const Toggle = ({ on, onChange, label }) => (
  <button onClick={() => onChange(!on)} title={label} style={{
    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    color: on ? 'var(--color-accent)' : 'var(--color-text-faint)',
    fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', transition: 'color 0.15s',
  }}>
    {on ? <ToggleRight size={20} style={{ flexShrink: 0 }} /> : <ToggleLeft size={20} style={{ flexShrink: 0 }} />}
    {label}
  </button>
);

const Tag = ({ label, active }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', padding: '0.2em 0.55em', border: '1px solid',
    borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
    background: active ? 'rgba(39,116,174,0.08)' : 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-faint)',
  }}>{label}</span>
);

/* ── Non-admin gate ─────────────────────────────────────────── */
const NotAdminGate = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '2rem',
      textAlign: 'center', background: 'var(--color-bg)', color: 'var(--color-text)',
    }}>
      <ShieldAlert size={44} style={{ color: 'var(--color-text-faint)', marginBottom: '1.25rem' }} />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, marginBottom: '0.75rem' }}>
        This page is for Admins Only
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
        You don't have permission to view this page.
      </p>
      <button onClick={() => navigate('/dashboard')} className="btn-outline"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={14} /> Return to Dashboard
      </button>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   USERS TAB
══════════════════════════════════════════════════════════════ */
const UserList = ({ users, onSelect, search, setSearch }) => {
  const filtered = users.filter(u =>
    fullName(u).toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800 }}>All Users</h2>
        <span style={{
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          fontSize: 'var(--text-xs)', fontWeight: 700, padding: '0.25em 0.65em',
          color: 'var(--color-text-muted)', letterSpacing: '0.08em',
        }}>{users.length} ACCOUNT{users.length !== 1 ? 'S' : ''}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: '0.75rem', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none',
        }} />
        <input className={inp + ' input-search'} placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className={card} style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>
            No users match your search.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['User', 'Email', 'Problems', 'Reviews', 'Status', 'Pages'].map(col => (
                  <th key={col} style={{
                    padding: '0.65rem 1rem', textAlign: 'left',
                    fontSize: 'var(--text-xs)', fontWeight: 700,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'var(--color-text-faint)', background: 'var(--color-surface-2)',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const accessCount = MANAGEABLE_PAGES.filter(p => (u.pageAccess || {})[p.key] !== false).length;
                const allAccess = accessCount === MANAGEABLE_PAGES.length;
                return (
                  <tr key={u.id} onClick={() => onSelect(u)}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                      cursor: 'pointer', background: 'transparent', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <Avatar user={u} size={30} />
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{fullName(u)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 'var(--text-xs)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{u._count?.problems ?? 0}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 'var(--text-xs)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{u._count?.feedbacks ?? 0}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {u.disabled
                        ? <span className="status-badge status-needs-review"><Lock size={10} /> Disabled</span>
                        : <span className="status-badge status-endorsed"><Check size={10} /> Active</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Tag label={allAccess ? 'Full Access' : `${accessCount}/${MANAGEABLE_PAGES.length}`} active={allAccess} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const UserDetail = ({ user: initial, onBack, onSaved }) => {
  const [user,       setUser]       = useState(initial);
  const [firstName,  setFirstName]  = useState(initial.firstName);
  const [lastName,   setLastName]   = useState(initial.lastName);
  const [customInit, setCustomInit] = useState(initial.initials);
  const [autoInit,   setAutoInit]   = useState(true);
  const [disabled,   setDisabled]   = useState(initial.disabled);
  const [pageAccess, setPageAccess] = useState(() => {
    const pa = initial.pageAccess || {};
    const out = {};
    MANAGEABLE_PAGES.forEach(p => { out[p.key] = pa[p.key] !== false; });
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (autoInit && firstName && lastName)
      setCustomInit(`${firstName[0]}${lastName[0]}`.toUpperCase());
  }, [firstName, lastName, autoInit]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !customInit.trim()) { setError('First name, last name, and initials are required.'); return; }
    if (customInit.trim().length > 4) { setError('Initials must be 4 characters or fewer.'); return; }
    setSaving(true); setError('');
    try {
      const updated = await api.patch(`/admin/users/${user.id}`, {
        firstName: firstName.trim(), lastName: lastName.trim(),
        initials: customInit.trim().toUpperCase(), disabled, pageAccess,
      });
      setSaved(true); setUser(updated.data); onSaved(updated.data);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes.');
    } finally { setSaving(false); }
  };

  const togglePage = (key) => setPageAccess(prev => ({ ...prev, [key]: !prev[key] }));
  const allEnabled  = MANAGEABLE_PAGES.every(p => pageAccess[p.key]);
  const allDisabled = MANAGEABLE_PAGES.every(p => !pageAccess[p.key]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={onBack} className="btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={13} /> All Users
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', opacity: saving ? 0.6 : 1 }}>
          {saved ? <Check size={13} /> : <Save size={13} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626', fontSize: 'var(--text-sm)',
        }}><AlertTriangle size={14} />{error}</div>
      )}
      <div className={card} style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <Avatar user={{ ...user, disabled }} size={48} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800 }}>{firstName} {lastName}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{user.email}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {disabled
              ? <span className="status-badge status-needs-review"><Lock size={10} /> Disabled</span>
              : <span className="status-badge status-endorsed"><Check size={10} /> Active</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label className={hdr}>First Name</label>
            <input className={inp} value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label className={hdr}>Last Name</label>
            <input className={inp} value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label className={hdr}>Initials (used in Problem IDs)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input className={inp} value={customInit} maxLength={4}
                onChange={e => { setAutoInit(false); setCustomInit(e.target.value.toUpperCase()); }}
                style={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }} />
              <button onClick={() => { setAutoInit(true); setCustomInit(`${firstName[0]}${lastName[0]}`.toUpperCase()); }}
                className="btn-ghost btn-sm" title="Reset to auto-derive from name" style={{ whiteSpace: 'nowrap' }}>Auto</button>
            </div>
            {customInit !== initial.initials && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: '0.2rem' }}>
                ⚠️ All Problem IDs starting with <strong>{initial.initials}-</strong> will be renamed to <strong>{customInit}-</strong>
              </p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', justifyContent: 'flex-end' }}>
            <label className={hdr}>Stats</label>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', gap: '1.25rem' }}>
              <span><strong style={{ color: 'var(--color-text)' }}>{user._count?.problems ?? 0}</strong> problems</span>
              <span><strong style={{ color: 'var(--color-text)' }}>{user._count?.feedbacks ?? 0}</strong> reviews</span>
            </div>
          </div>
        </div>
      </div>
      <div className={card} style={{ padding: '1.25rem' }}>
        <div style={{ marginBottom: '0.875rem' }}><span className={hdr}>Account Status</span></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.2rem' }}>
              {disabled ? 'Account is disabled' : 'Account is active'}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', maxWidth: '48ch' }}>
              {disabled ? 'This user cannot log in. They will see a disabled message on all pages.' : 'This user can log in and access PROSE normally.'}
            </p>
          </div>
          <button onClick={() => setDisabled(d => !d)}
            className={disabled ? 'btn-primary btn-sm' : 'btn-danger btn-sm'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {disabled ? <Unlock size={13} /> : <Lock size={13} />}
            {disabled ? 'Enable Account' : 'Disable Account'}
          </button>
        </div>
      </div>
      <div className={card} style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className={hdr}>Page Access</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-ghost btn-sm" onClick={() => setPageAccess(Object.fromEntries(MANAGEABLE_PAGES.map(p => [p.key, true])))} style={{ opacity: allEnabled ? 0.4 : 1 }}>
              <Eye size={12} /> Enable All
            </button>
            <button className="btn-ghost btn-sm" onClick={() => setPageAccess(Object.fromEntries(MANAGEABLE_PAGES.map(p => [p.key, false])))} style={{ opacity: allDisabled ? 0.4 : 1 }}>
              <EyeOff size={12} /> Disable All
            </button>
          </div>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: '1rem', maxWidth: '60ch' }}>
          Dashboard access is always enabled. Toggle any other page to remove or restore this user's access.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Dashboard</span>
              <Tag label="Always On" active />
            </div>
            <ToggleRight size={20} style={{ color: 'var(--color-accent)', opacity: 0.5 }} />
          </div>
          {MANAGEABLE_PAGES.map((p, i) => (
            <div key={p.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.625rem 0',
              borderBottom: i < MANAGEABLE_PAGES.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: pageAccess[p.key] ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
                {p.label}
              </span>
              <Toggle on={pageAccess[p.key]} onChange={() => togglePage(p.key)} label={pageAccess[p.key] ? 'Enabled' : 'Disabled'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   TOURNAMENTS TAB
══════════════════════════════════════════════════════════════ */
const ROUND_TYPES = ['Individual', 'Team', 'Relay', 'Guts', 'Other'];

const TournamentsTab = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // tournament create form
  const [newTName, setNewTName] = useState('');
  const [newTDesc, setNewTDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [tError, setTError]     = useState('');

  // editing tournament name inline
  const [editingT, setEditingT]   = useState(null); // id
  const [editTName, setEditTName] = useState('');
  const [savingT, setSavingT]     = useState(false);

  // expanded tournament
  const [expanded, setExpanded] = useState(null);

  // new round per tournament { [tId]: { name, roundType } }
  const [newRound, setNewRound]   = useState({});
  const [addingR, setAddingR]     = useState({}); // tId -> bool
  const [rError, setRError]       = useState({});

  // editing a round inline
  const [editingR, setEditingR]   = useState(null); // roundId
  const [editRName, setEditRName] = useState('');
  const [editRType, setEditRType] = useState('');
  const [savingR, setSavingR]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/tournaments');
      setTournaments(res.data);
    } catch { setError('Failed to load tournaments.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Create tournament ── */
  const handleCreateT = async (e) => {
    e.preventDefault();
    if (!newTName.trim()) { setTError('Tournament name is required.'); return; }
    setCreating(true); setTError('');
    try {
      const res = await api.post('/admin/tournaments', { name: newTName.trim(), description: newTDesc.trim() || null });
      setTournaments(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTName(''); setNewTDesc('');
      setExpanded(res.data.id);
    } catch (err) { setTError(err.response?.data?.error || 'Failed to create tournament.'); }
    finally { setCreating(false); }
  };

  /* ── Delete tournament ── */
  const handleDeleteT = async (id) => {
    if (!window.confirm('Delete this tournament and all its rounds? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/tournaments/${id}`);
      setTournaments(prev => prev.filter(t => t.id !== id));
      if (expanded === id) setExpanded(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete.'); }
  };

  /* ── Save tournament name ── */
  const handleSaveT = async (id) => {
    if (!editTName.trim()) return;
    setSavingT(true);
    try {
      const res = await api.patch(`/admin/tournaments/${id}`, { name: editTName.trim() });
      setTournaments(prev => prev.map(t => t.id === id ? { ...t, name: res.data.name } : t).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingT(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save.'); }
    finally { setSavingT(false); }
  };

  /* ── Create round ── */
  const handleCreateR = async (e, tId) => {
    e.preventDefault();
    const nr = newRound[tId] || {};
    if (!nr.name?.trim()) { setRError(prev => ({ ...prev, [tId]: 'Round name is required.' })); return; }
    setAddingR(prev => ({ ...prev, [tId]: true }));
    setRError(prev => ({ ...prev, [tId]: '' }));
    try {
      const res = await api.post(`/admin/tournaments/${tId}/rounds`, {
        name: nr.name.trim(),
        roundType: nr.roundType || 'Individual',
      });
      setTournaments(prev => prev.map(t =>
        t.id === tId ? { ...t, rounds: [...(t.rounds || []), res.data].sort((a, b) => a.name.localeCompare(b.name)) } : t
      ));
      setNewRound(prev => ({ ...prev, [tId]: { name: '', roundType: 'Individual' } }));
    } catch (err) { setRError(prev => ({ ...prev, [tId]: err.response?.data?.error || 'Failed to create round.' })); }
    finally { setAddingR(prev => ({ ...prev, [tId]: false })); }
  };

  /* ── Delete round ── */
  const handleDeleteR = async (tId, roundId) => {
    if (!window.confirm('Delete this round?')) return;
    try {
      await api.delete(`/admin/tournaments/${tId}/rounds/${roundId}`);
      setTournaments(prev => prev.map(t =>
        t.id === tId ? { ...t, rounds: (t.rounds || []).filter(r => r.id !== roundId) } : t
      ));
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete.'); }
  };

  /* ── Save round ── */
  const handleSaveR = async (tId, roundId) => {
    setSavingR(true);
    try {
      const res = await api.patch(`/admin/tournaments/${tId}/rounds/${roundId}`, {
        name: editRName.trim(),
        roundType: editRType,
      });
      setTournaments(prev => prev.map(t =>
        t.id === tId
          ? { ...t, rounds: (t.rounds || []).map(r => r.id === roundId ? res.data : r).sort((a, b) => a.name.localeCompare(b.name)) }
          : t
      ));
      setEditingR(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save.'); }
    finally { setSavingR(false); }
  };

  if (loading) return <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)', padding: '2rem 0' }}>Loading…</p>;
  if (error)   return <p style={{ fontSize: 'var(--text-sm)', color: '#dc2626', padding: '2rem 0' }}>{error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800 }}>Tournaments &amp; Rounds</h2>
        <span style={{
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          fontSize: 'var(--text-xs)', fontWeight: 700, padding: '0.25em 0.65em',
          color: 'var(--color-text-muted)', letterSpacing: '0.08em',
        }}>{tournaments.length} TOURNAMENT{tournaments.length !== 1 ? 'S' : ''}</span>
      </div>

      {/* Create tournament form */}
      <form onSubmit={handleCreateT} className={card} style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <span className={hdr}>New Tournament</span>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <input
            className={inp} placeholder="Tournament name (e.g. LAMT 2026)" value={newTName}
            onChange={e => setNewTName(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: 0 }}
          />
          <input
            className={inp} placeholder="Description (optional)" value={newTDesc}
            onChange={e => setNewTDesc(e.target.value)}
            style={{ flex: '2 1 260px', minWidth: 0 }}
          />
          <button type="submit" disabled={creating} className="btn-filled"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', padding: '0 1rem' }}>
            <Plus size={14} />{creating ? 'Creating…' : 'Add Tournament'}
          </button>
        </div>
        {tError && <p style={{ fontSize: 'var(--text-xs)', color: '#dc2626', margin: 0 }}>{tError}</p>}
      </form>

      {/* Tournament list */}
      {tournaments.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem 2rem', border: '1px dashed var(--color-border)',
          color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)',
        }}>
          <Trophy size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          No tournaments yet. Create one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {tournaments.map(t => {
            const isExpanded = expanded === t.id;
            const isEditing  = editingT === t.id;
            const nr = newRound[t.id] || { name: '', roundType: 'Individual' };

            return (
              <div key={t.id} className={card} style={{ overflow: 'hidden' }}>
                {/* Tournament header row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.75rem 1rem', cursor: 'pointer',
                  borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
                }}
                  onClick={() => setExpanded(isExpanded ? null : t.id)}
                >
                  <ChevronDown size={14} style={{
                    color: 'var(--color-text-faint)', flexShrink: 0,
                    transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s',
                  }} />

                  {isEditing ? (
                    <input
                      className={inp}
                      value={editTName}
                      onChange={e => setEditTName(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); handleSaveT(t.id); } if (e.key === 'Escape') { e.stopPropagation(); setEditingT(null); } }}
                      autoFocus
                      style={{ flex: 1, minWidth: 0, fontWeight: 700 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', flex: 1 }}>{t.name}</span>
                  )}

                  <span style={{
                    fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)',
                    background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)',
                    padding: '0.15em 0.5em', whiteSpace: 'nowrap',
                  }}>
                    {(t.rounds || []).length} round{(t.rounds || []).length !== 1 ? 's' : ''}
                  </span>

                  {/* Edit name button */}
                  {isEditing ? (
                    <>
                      <button onClick={e => { e.stopPropagation(); handleSaveT(t.id); }}
                        disabled={savingT} className="btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem' }}>
                        <Check size={12} />{savingT ? '…' : 'Save'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setEditingT(null); }}
                        className="btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setEditingT(t.id); setEditTName(t.name); }}
                      className="btn-ghost btn-sm" title="Rename tournament"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem' }}>
                      <Pencil size={12} />
                    </button>
                  )}

                  <button onClick={e => { e.stopPropagation(); handleDeleteT(t.id); }}
                    className="btn-ghost btn-sm" title="Delete tournament"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', color: 'var(--color-text-faint)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Rounds panel */}
                {isExpanded && (
                  <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                    {/* Existing rounds */}
                    {(t.rounds || []).length === 0 ? (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontStyle: 'italic', margin: '0 0 0.5rem' }}>No rounds yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
                        {(t.rounds || []).map(r => {
                          const isEditR = editingR === r.id;
                          return (
                            <div key={r.id} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              background: 'var(--color-surface-offset)',
                              border: '1px solid var(--color-border)',
                            }}>
                              {isEditR ? (
                                <>
                                  <input
                                    className={inp}
                                    value={editRName}
                                    onChange={e => setEditRName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveR(t.id, r.id); if (e.key === 'Escape') setEditingR(null); }}
                                    autoFocus
                                    style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-xs)' }}
                                  />
                                  <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <select
                                      className={inp}
                                      value={editRType}
                                      onChange={e => setEditRType(e.target.value)}
                                      style={{ fontSize: 'var(--text-xs)', paddingRight: '1.5rem', appearance: 'none' }}
                                    >
                                      {ROUND_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                                    </select>
                                    <ChevronDown size={10} style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-faint)' }} />
                                  </div>
                                  <button onClick={() => handleSaveR(t.id, r.id)} disabled={savingR}
                                    className="btn-primary btn-sm"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem' }}>
                                    <Check size={11} />{savingR ? '…' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditingR(null)} className="btn-ghost btn-sm" style={{ padding: '0.25rem 0.4rem' }}>
                                    <X size={11} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 600 }}>{r.name}</span>
                                  <span style={{
                                    fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.07em',
                                    textTransform: 'uppercase', padding: '0.15em 0.5em',
                                    background: 'var(--color-accent-alpha, rgba(39,116,174,0.1))',
                                    color: 'var(--color-accent)', border: '1px solid var(--color-accent)',
                                    opacity: 0.75,
                                  }}>{r.roundType}</span>
                                  <button onClick={() => { setEditingR(r.id); setEditRName(r.name); setEditRType(r.roundType || 'Individual'); }}
                                    className="btn-ghost btn-sm" title="Edit round"
                                    style={{ padding: '0.25rem 0.4rem', display: 'inline-flex', alignItems: 'center' }}>
                                    <Pencil size={11} />
                                  </button>
                                  <button onClick={() => handleDeleteR(t.id, r.id)}
                                    className="btn-ghost btn-sm" title="Delete round"
                                    style={{ padding: '0.25rem 0.4rem', display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-faint)' }}>
                                    <Trash2 size={11} />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add round form */}
                    <form onSubmit={e => handleCreateR(e, t.id)} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        className={inp}
                        placeholder="Round name (e.g. Individual: Algebra)"
                        value={nr.name}
                        onChange={e => setNewRound(prev => ({ ...prev, [t.id]: { ...nr, name: e.target.value } }))}
                        style={{ flex: '1 1 180px', minWidth: 0, fontSize: 'var(--text-xs)' }}
                      />
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <select
                          className={inp}
                          value={nr.roundType || 'Individual'}
                          onChange={e => setNewRound(prev => ({ ...prev, [t.id]: { ...nr, roundType: e.target.value } }))}
                          style={{ fontSize: 'var(--text-xs)', paddingRight: '1.5rem', appearance: 'none' }}
                        >
                          {ROUND_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                        </select>
                        <ChevronDown size={10} style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-faint)' }} />
                      </div>
                      <button type="submit" disabled={addingR[t.id]} className="btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                        <Plus size={12} />{addingR[t.id] ? 'Adding…' : 'Add Round'}
                      </button>
                    </form>
                    {rError[t.id] && <p style={{ fontSize: 'var(--text-xs)', color: '#dc2626', margin: 0 }}>{rError[t.id]}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'users',       label: 'Users' },
  { id: 'tournaments', label: 'Tournaments' },
];

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const [tab,      setTab]      = useState('users');
  const [users,    setUsers]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    setFetching(true);
    try { const res = await api.get('/admin/users'); setUsers(res.data); }
    catch { /* silent */ }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { if (user?.isAdmin) load(); }, [user, load]);

  if (loading) return null;
  if (!user?.isAdmin) return <NotAdminGate />;

  const handleSaved = (updated) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setSelected(updated);
  };

  return (
    <Layout>
      <div style={{ padding: '0 clamp(1rem, 4vw, 3rem)', paddingBottom: '4rem', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Page heading */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span className="gold-rule" />
            <span className={hdr}>Admin</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800 }}>Admin Panel</h1>
        </div>

        {/* Tab bar — only shown when not drilling into a user */}
        {!selected && (
          <div style={{
            display: 'flex', gap: 0,
            borderBottom: '2px solid var(--color-border)',
            marginBottom: '1.75rem',
          }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '0.55rem 1.1rem',
                  fontSize: 'var(--text-sm)', fontWeight: 700,
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: tab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                  marginBottom: '-2px',
                  color: tab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  transition: 'color 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {tab === 'users' && (
          fetching ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>Loading users…</span>
            </div>
          ) : selected ? (
            <UserDetail user={selected} onBack={() => setSelected(null)} onSaved={handleSaved} />
          ) : (
            <UserList users={users} onSelect={setSelected} search={search} setSearch={setSearch} />
          )
        )}

        {tab === 'tournaments' && <TournamentsTab />}
      </div>
    </Layout>
  );
}
