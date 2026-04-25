import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp,
  Loader2, X, AlertTriangle,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import { getProblemStatus } from '../utils/problemStatus';

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════ */
const STAGES = ['Idea', 'Needs Review', 'Resolved', 'Endorsed'];
const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

const TOPIC_ABBR = {
  Algebra: 'ALG',
  Geometry: 'GEO',
  Combinatorics: 'COMBO',
  'Number Theory': 'NT',
};

const STAGE_CFG = {
  Idea:           { dot: 'bg-amber-400',  rail: 'bg-amber-100 dark:bg-amber-900/30' },
  'Needs Review': { dot: 'bg-rose-500',   rail: 'bg-rose-100 dark:bg-rose-900/30' },
  Resolved:       { dot: 'bg-blue-500',   rail: 'bg-blue-100 dark:bg-blue-900/30' },
  Endorsed:       { dot: 'bg-green-500',  rail: 'bg-green-100 dark:bg-green-900/30' },
};

/* Testsolve status — only two public states */
const TESTSOLVE_STATUS_LABEL = {
  active: 'Open to Feedback',
  closed: 'Closed for Feedback',
};

/* ── Slot builders ────────────────────────────────────────────── */
const buildSlotsFromExam = (exam) => {
  if (!exam) return Array.from({ length: 10 }, (_, i) => ({ label: `Q${i + 1}`, slotType: 'normal' }));
  const { numSets = 1, questionsPerSet = 10, estimationSets = 0 } = exam;
  const slots = [];
  if (numSets === 1) {
    for (let q = 1; q <= questionsPerSet; q++)
      slots.push({ label: `Q${q}`, slotType: 'normal' });
  } else {
    for (let s = 1; s <= numSets; s++)
      for (let q = 1; q <= questionsPerSet; q++)
        slots.push({ label: `S${s}.${q}`, slotType: 'normal' });
  }
  for (let e = 1; e <= estimationSets; e++)
    slots.push({ label: estimationSets === 1 ? 'Estimation' : `Est. ${e}`, slotType: 'estimation' });
  return slots;
};

/* ── Slot-map helpers ─────────────────────────────────────────────── */
const deriveSlotMap = (slots) => {
  const map = {};
  if (!slots) return map;
  (Array.isArray(slots) ? slots : Object.values(slots)).forEach((s, i) => {
    if (s && typeof s === 'object') {
      if (s.problemId) map[i] = { problemId: s.problemId };
    } else if (typeof s === 'string' && s) {
      map[i] = { problemId: s };
    }
  });
  return map;
};

const slotsToPayload = (slotMap, totalSlots) => {
  const arr = [];
  for (let i = 0; i < totalSlots; i++) {
    const entry = slotMap[i];
    arr.push(entry ? { problemId: entry.problemId } : null);
  }
  return arr;
};

const fixLatex = (str = '') => str.replace(/\$([\\s\\S]*?)\$/g, (_, m) => `$${m}$`);

/* ── Build LaTeX export ───────────────────────────────────────────── */
const buildLatex = (exam, slotDefs, slotMap, problemMap, includeSolutions) => {
  const lines = [
    '\\documentclass[11pt]{article}',
    '\\usepackage[margin=1in]{geometry}',
    '\\usepackage{amsmath,amssymb,graphicx,enumitem,fancyhdr}',
    '\\pagestyle{fancy}',
    `\\lhead{${exam.competition || 'Competition'}}`,
    `\\rhead{${exam.name || 'Exam'}}`,
    '\\begin{document}',
    `\\begin{center}{\\Large\\bfseries ${exam.name || 'Exam'}}\\end{center}`,
    '\\vspace{1em}',
    '\\begin{enumerate}[leftmargin=*]',
  ];
  slotDefs.forEach((slot, i) => {
    const entry = slotMap[i];
    const prob  = entry ? problemMap[entry.problemId] : null;
    const latex = prob?.latex ? fixLatex(prob.latex) : '\\textit{[Problem not assigned]}';
    lines.push(`\\item ${latex}`);
    if (includeSolutions && prob?.solution) {
      lines.push(`\\par\\textbf{Solution:} ${fixLatex(prob.solution)}`);
    }
  });
  lines.push('\\end{enumerate}', '\\end{document}');
  return lines.join('\n');
};

/* ══════════════════════════════════════════════════════════════════
   LOCK MODAL
══════════════════════════════════════════════════════════════════ */
const LockModal = ({ exam, onSave, onClose }) => {
  const isLocked = exam.isLocked;

  const [status,   setStatus]   = useState(exam.testsolveStatus || 'active');
  const [password, setPassword] = useState(exam.testsolvePassword || '');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave({ status, password });
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {isLocked ? 'Edit Testsolve Settings' : 'Lock Exam for Testsolving'}
          </p>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Status — only two options */}
          <div>
            <label className="section-label">Testsolve Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-base w-full mt-2"
            >
              <option value="active">Open to Feedback</option>
              <option value="closed">Closed for Feedback</option>
            </select>
            <p className="mt-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
              {status === 'active'
                ? 'Testsolvers can access this exam and submit feedback.'
                : 'The exam is locked but no longer accepting new submissions.'}
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="section-label">Access Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password for testsolvers"
              className="input-base w-full mt-2"
              autoComplete="off"
            />
            <p className="mt-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
              Testsolvers must enter this password to begin.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm px-3 py-2.5"
              style={{ background: 'var(--badge-needs-review-bg)', color: 'var(--badge-needs-review-text)', border: '1px solid var(--badge-needs-review-border)' }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1 py-2.5 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !password.trim()}
              className="btn-filled flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : isLocked ? 'Save Changes' : 'Lock Exam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PROBLEM SLOT
══════════════════════════════════════════════════════════════════ */
const ProblemSlot = ({
  index, slotDef, entry, problemMap,
  isEditing, onSearch, onRemove,
  searchQuery, setSearchQuery,
  searchResults, searching,
  activeSearchSlot, setActiveSearchSlot,
}) => {
  const prob = entry ? problemMap[entry.problemId] : null;
  const isSearchOpen = isEditing && activeSearchSlot === index;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      {/* Slot label */}
      <span
        className="flex-shrink-0 tabular-nums font-semibold"
        style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', width: '2.5rem', paddingTop: '0.1rem' }}
      >
        {slotDef.label}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {prob ? (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="font-mono font-semibold" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>
                  {prob.id}
                </span>
                {(prob.topics || []).map(t => (
                  <span key={t} className="px-1.5 py-0.5 border border-[var(--color-border)]"
                    style={{ fontSize: 'var(--text-xs)', background: 'var(--color-surface)' }}>
                    {TOPIC_ABBR[t] || t}
                  </span>
                ))}
                {prob.quality && (
                  <span className="tabular-nums" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                    {prob.quality}/10
                  </span>
                )}
              </div>
              <div className="text-sm leading-6 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                {prob.latex ? <KatexRenderer latex={prob.latex} /> : <span className="italic">No problem text</span>}
              </div>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="flex-shrink-0 p-1 text-[var(--color-text-faint)] hover:text-[var(--badge-needs-review-text)] transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : (
          isEditing ? (
            <div>
              {isSearchOpen ? (
                <div>
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); onSearch(e.target.value, index); }}
                    onBlur={() => setTimeout(() => setActiveSearchSlot(null), 200)}
                    placeholder="Search by ID or topic…"
                    className="input-base w-full"
                    style={{ fontSize: 'var(--text-sm)' }}
                  />
                  {searching && (
                    <div className="flex items-center gap-2 py-2 px-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                      <Loader2 size={11} className="animate-spin" /> Searching…
                    </div>
                  )}
                  {!searching && searchResults.length > 0 && (
                    <div className="mt-1 border border-[var(--color-border)] overflow-hidden"
                      style={{ background: 'var(--color-bg)', maxHeight: '200px', overflowY: 'auto' }}>
                      {searchResults.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onMouseDown={() => onSearch(r, index, true)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-surface)] transition-colors"
                        >
                          <span className="font-mono font-semibold" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>{r.id}</span>
                          <span className="flex-1 truncate text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            {r.topics?.join(', ')}
                            {r.quality ? ` · ${r.quality}/10` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setActiveSearchSlot(index); setSearchQuery(''); }}
                  className="text-left transition-colors"
                  style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)', fontStyle: 'italic' }}
                >
                  + Assign problem
                </button>
              )}
            </div>
          ) : (
            <span className="italic" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>
              Empty
            </span>
          )
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam,        setExam]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [saveMsg,     setSaveMsg]     = useState('');
  const [isEditing,   setIsEditing]   = useState(false);
  const [showLock,    setShowLock]    = useState(false);
  const [unlocking,   setUnlocking]   = useState(false);

  /* slot editing */
  const [slotMap,     setSlotMap]     = useState({});
  const [problemMap,  setProblemMap]  = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [activeSearchSlot, setActiveSearchSlot] = useState(null);

  /* metadata editing */
  const [editName,      setEditName]      = useState('');
  const [editComp,      setEditComp]      = useState('');
  const [editRoundType, setEditRoundType] = useState('');
  const [editRoundName, setEditRoundName] = useState('');
  const [editNumSets,   setEditNumSets]   = useState(1);
  const [editQPS,       setEditQPS]       = useState(10);
  const [editEstSets,   setEditEstSets]   = useState(0);
  const [editTimeLimit, setEditTimeLimit] = useState('');
  const [saving,        setSaving]        = useState(false);

  /* accordion */
  const [expandedSets, setExpandedSets] = useState({});

  const fetchExam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/exams/${id}`);
      const data = res.data;
      setExam(data);

      const map = deriveSlotMap(data.slots);
      setSlotMap(map);

      const ids = Object.values(map).map(e => e.problemId).filter(Boolean);
      if (ids.length > 0) {
        const probs = await Promise.all(ids.map(pid => api.get(`/problems/${pid}`).catch(() => null)));
        const pm = {};
        probs.forEach(r => { if (r?.data) pm[r.data.id] = r.data; });
        setProblemMap(pm);
      }

      setEditName(data.name || '');
      setEditComp(data.competition || '');
      setEditRoundType(data.roundType || '');
      setEditRoundName(data.roundName || '');
      setEditNumSets(data.numSets || 1);
      setEditQPS(data.questionsPerSet || 10);
      setEditEstSets(data.estimationSets || 0);
      setEditTimeLimit(data.timeLimit != null ? String(data.timeLimit) : '');
    } catch {
      setError('Failed to load exam. You may not have access.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  const slotDefs = useMemo(() => buildSlotsFromExam(exam), [exam]);

  const handleSearch = useCallback(async (queryOrResult, slotIndex, isSelect = false) => {
    if (isSelect) {
      const prob = queryOrResult;
      setSlotMap(prev => ({ ...prev, [slotIndex]: { problemId: prob.id } }));
      setProblemMap(prev => ({ ...prev, [prob.id]: prob }));
      setActiveSearchSlot(null);
      setSearchResults([]);
      setSearchQuery('');
      return;
    }
    const q = queryOrResult;
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/problems?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(res.data?.problems || res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleRemoveSlot = useCallback((index) => {
    setSlotMap(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const totalSlots = (editNumSets * editQPS) + editEstSets;
      const payload = {
        name:             editName,
        competition:      editComp,
        roundType:        editRoundType,
        roundName:        editRoundName,
        numSets:          editNumSets,
        questionsPerSet:  editQPS,
        estimationSets:   editEstSets,
        timeLimit:        editTimeLimit ? parseInt(editTimeLimit) : null,
        slots:            slotsToPayload(slotMap, totalSlots),
      };
      await api.put(`/exams/${id}`, payload);
      setSaveMsg('Saved.');
      setIsEditing(false);
      fetchExam();
    } catch {
      setSaveMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleLockSave = async ({ status, password }) => {
    await api.post(`/exams/${id}/lock`, { status, password });
    setShowLock(false);
    fetchExam();
  };

  const handleUnlock = async () => {
    if (!window.confirm('Unlock this exam? It will no longer be available for testsolving.')) return;
    setUnlocking(true);
    try {
      await api.post(`/exams/${id}/unlock`);
      fetchExam();
    } catch {
      setSaveMsg('Failed to unlock.');
    } finally {
      setUnlocking(false);
    }
  };

  /* ── Group slots by set for accordion display ── */
  const setGroups = useMemo(() => {
    if (!exam) return [];
    const { numSets = 1, questionsPerSet = 10, estimationSets = 0 } = exam;
    const groups = [];
    if (numSets === 1) {
      groups.push({ label: 'Problems', startIndex: 0, count: questionsPerSet });
    } else {
      for (let s = 0; s < numSets; s++) {
        groups.push({ label: `Set ${s + 1}`, startIndex: s * questionsPerSet, count: questionsPerSet });
      }
    }
    if (estimationSets > 0) {
      groups.push({ label: 'Estimation', startIndex: numSets * questionsPerSet, count: estimationSets });
    }
    return groups;
  }, [exam]);

  /* ── Locked banner info ── */
  const lockedStatusLabel = exam?.testsolveStatus
    ? (TESTSOLVE_STATUS_LABEL[exam.testsolveStatus] || exam.testsolveStatus)
    : 'Open to Feedback';

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  if (loading) return (
    <Layout pageKey="exams">
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--color-accent)]" />
      </div>
    </Layout>
  );

  if (error || !exam) return (
    <Layout pageKey="exams">
      <div className="mx-auto max-w-2xl py-20 text-center space-y-4">
        <AlertTriangle size={32} className="mx-auto" style={{ color: 'var(--color-text-faint)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{error || 'Exam not found.'}</p>
        <button type="button" onClick={() => navigate('/exams')} className="btn-outline btn-sm">
          Back to Exams
        </button>
      </div>
    </Layout>
  );

  const currentSlotDefs = isEditing
    ? buildSlotsFromExam({ numSets: editNumSets, questionsPerSet: editQPS, estimationSets: editEstSets })
    : slotDefs;

  return (
    <Layout pageKey="exams">
      <div className="mx-auto max-w-4xl space-y-5">

        {/* ── Breadcrumb ── */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/exams')}
            className="inline-flex items-center gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            style={{ fontSize: 'var(--text-sm)' }}
          >
            <ArrowLeft size={14} />
            All Exams
          </button>
        </div>

        {/* ── Header ── */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="gold-rule mb-3" />
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-base text-xl font-bold"
                style={{ fontFamily: 'var(--font-display)' }}
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {exam.name}
              </h1>
            )}
            {exam.competition && !isEditing && (
              <p className="mt-1" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {exam.competition}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isEditing && (
              <>
                {exam.isLocked ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowLock(true)}
                      className="btn-outline btn-sm"
                    >
                      Edit Testsolve
                    </button>
                    <button
                      type="button"
                      onClick={handleUnlock}
                      disabled={unlocking}
                      className="btn-outline btn-sm"
                    >
                      {unlocking ? <Loader2 size={13} className="animate-spin" /> : 'Unlock'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLock(true)}
                    className="btn-outline btn-sm"
                  >
                    Lock for Testsolving
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn-filled btn-sm"
                >
                  Edit Exam
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); fetchExam(); }}
                  className="btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-filled btn-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── Save message ── */}
        {saveMsg && (
          <div
            className="border px-4 py-3 text-sm"
            style={{
              background: saveMsg.includes('ail') ? 'var(--badge-needs-review-bg)' : 'var(--badge-endorsed-bg)',
              borderColor: saveMsg.includes('ail') ? 'var(--badge-needs-review-border)' : 'var(--badge-endorsed-border)',
              color: saveMsg.includes('ail') ? 'var(--badge-needs-review-text)' : 'var(--badge-endorsed-text)',
            }}
          >
            {saveMsg}
          </div>
        )}

        {/* ── Locked banner ── */}
        {exam.isLocked && (
          <div
            className="flex items-center gap-3 border px-4 py-3"
            style={{ background: 'var(--badge-resolved-bg)', borderColor: 'var(--badge-resolved-border)', color: 'var(--badge-resolved-text)' }}
          >
            <span className="font-semibold text-sm">
              Locked: {lockedStatusLabel}
            </span>
            {exam.testsolvePassword && (
              <span style={{ fontSize: 'var(--text-xs)', opacity: 0.75 }}>
                · Password: <span className="font-mono">{exam.testsolvePassword}</span>
              </span>
            )}
          </div>
        )}

        {/* ── Metadata panel ── */}
        {isEditing && (
          <div className="surface-card px-5 py-5 space-y-4">
            <p className="section-label">Exam Metadata</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="section-label">Competition</label>
                <input type="text" value={editComp} onChange={e => setEditComp(e.target.value)} className="input-base w-full mt-1" placeholder="e.g. LAMT 2025" />
              </div>
              <div>
                <label className="section-label">Round Type</label>
                <input type="text" value={editRoundType} onChange={e => setEditRoundType(e.target.value)} className="input-base w-full mt-1" placeholder="e.g. Individual, Team" />
              </div>
              <div>
                <label className="section-label">Round Name</label>
                <input type="text" value={editRoundName} onChange={e => setEditRoundName(e.target.value)} className="input-base w-full mt-1" placeholder="e.g. Sprint, Relay" />
              </div>
              <div>
                <label className="section-label">Time Limit (min)</label>
                <input type="number" value={editTimeLimit} onChange={e => setEditTimeLimit(e.target.value)} className="input-base w-full mt-1" placeholder="e.g. 30" min={0} />
              </div>
              <div>
                <label className="section-label">Number of Sets</label>
                <input type="number" value={editNumSets} onChange={e => setEditNumSets(Math.max(1, parseInt(e.target.value) || 1))} className="input-base w-full mt-1" min={1} max={10} />
              </div>
              <div>
                <label className="section-label">Questions per Set</label>
                <input type="number" value={editQPS} onChange={e => setEditQPS(Math.max(1, parseInt(e.target.value) || 1))} className="input-base w-full mt-1" min={1} max={30} />
              </div>
              <div>
                <label className="section-label">Estimation Sets</label>
                <input type="number" value={editEstSets} onChange={e => setEditEstSets(Math.max(0, parseInt(e.target.value) || 0))} className="input-base w-full mt-1" min={0} max={5} />
              </div>
            </div>
          </div>
        )}

        {/* ── Exam info chips (view mode) ── */}
        {!isEditing && (
          <div className="flex flex-wrap gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {exam.roundType && (
              <span className="border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-semibold uppercase tracking-wide">
                {exam.roundType}
              </span>
            )}
            {exam.roundName && <span>{exam.roundName}</span>}
            {exam.questionsPerSet && (
              <span className="tabular-nums">
                {exam.numSets > 1 ? `${exam.numSets} × ${exam.questionsPerSet}` : exam.questionsPerSet} problems
                {exam.estimationSets > 0 && ` + ${exam.estimationSets} estimation`}
              </span>
            )}
            {exam.timeLimit && <span className="tabular-nums">{exam.timeLimit} min</span>}
          </div>
        )}

        {/* ── Slot sets (accordion) ── */}
        <div className="space-y-3">
          {setGroups.map((group, gi) => {
            const isOpen = expandedSets[gi] !== false; // default open
            return (
              <div key={gi} className="surface-card overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setExpandedSets(prev => ({ ...prev, [gi]: !isOpen }))}
                  className="flex items-center justify-between w-full px-5 py-3 hover:bg-[var(--color-surface)] transition-colors"
                >
                  <span className="section-label">{group.label}</span>
                  {isOpen
                    ? <ChevronUp size={15} style={{ color: 'var(--color-text-faint)' }} />
                    : <ChevronDown size={15} style={{ color: 'var(--color-text-faint)' }} />}
                </button>
                {isOpen && (
                  <div>
                    {Array.from({ length: group.count }, (_, qi) => {
                      const slotIndex = group.startIndex + qi;
                      const def = currentSlotDefs[slotIndex] || { label: `Q${slotIndex + 1}`, slotType: 'normal' };
                      return (
                        <ProblemSlot
                          key={slotIndex}
                          index={slotIndex}
                          slotDef={def}
                          entry={slotMap[slotIndex]}
                          problemMap={problemMap}
                          isEditing={isEditing}
                          onSearch={handleSearch}
                          onRemove={handleRemoveSlot}
                          searchQuery={searchQuery}
                          setSearchQuery={setSearchQuery}
                          searchResults={searchResults}
                          searching={searching}
                          activeSearchSlot={activeSearchSlot}
                          setActiveSearchSlot={setActiveSearchSlot}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {showLock && (
        <LockModal
          exam={exam}
          onSave={handleLockSave}
          onClose={() => setShowLock(false)}
        />
      )}
    </Layout>
  );
};

export default ExamDetail;
