import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp,
  Loader2, X, AlertTriangle, Trash2, Settings,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import { getProblemStatus } from '../utils/problemStatus';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
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
  paused: 'Paused',
};

/* ── Slot builders ─────────────────────────────────────────── */
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

/* ── Slot-map helpers ──────────────────────────────────────────────── */
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

/* ── Build LaTeX export ─────────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════
   LOCK MODAL
══════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════
   DELETE MODAL
══════════════════════════════════════════════════════════════ */
const DeleteModal = ({ examName, onConfirm, onClose }) => {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const matches = confirmText.trim() === examName.trim();

  const handleDelete = async () => {
    if (!matches) return;
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to delete exam.');
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>Delete Exam</p>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            This will permanently delete <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{examName}</span> and all its slot assignments. This cannot be undone.
          </p>
          <div>
            <label className="section-label">Type the exam name to confirm</label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={examName}
              className="input-base w-full mt-2"
              autoComplete="off"
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm px-3 py-2.5"
              style={{ background: 'var(--badge-needs-review-bg)', color: 'var(--badge-needs-review-text)', border: '1px solid var(--badge-needs-review-border)' }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!matches || deleting}
              className="flex-1 py-2.5 text-sm flex items-center justify-center gap-2 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{
                background: matches && !deleting ? 'var(--color-error)' : undefined,
                color: matches && !deleting ? '#fff' : 'var(--color-text-faint)',
                border: '1px solid transparent',
              }}
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {deleting ? 'Deleting…' : 'Delete Exam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   PROBLEM CARD (slot row)
══════════════════════════════════════════════════════════════ */
const ProblemCard = ({
  slotIndex,
  slotLabel,
  slotType,
  problemId,
  problem,
  onRemove,
  onSearch,
  isEditing,
  searchQuery,
  setSearchQuery,
  searchResults,
  searching,
  activeSearchSlot,
  setActiveSearchSlot,
}) => {
  const inputRef = useRef(null);
  const isActive = activeSearchSlot === slotIndex;

  const statusObj  = problem ? getProblemStatus(problem) : null;
  const authorName = problem
    ? [problem.author?.firstName, problem.author?.lastName].filter(Boolean).join(' ')
    : null;

  const handleFocus = () => {
    setActiveSearchSlot(slotIndex);
    setSearchQuery('');
  };

  const handleChange = (e) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value, slotIndex);
  };

  const handleSelect = (prob) => {
    onSearch(prob, slotIndex, true);
    if (inputRef.current) inputRef.current.blur();
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-b-0">
      {/* Slot label */}
      <span
        className="flex-shrink-0 mt-0.5 font-mono text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 border"
        style={{
          color: slotType === 'estimation' ? 'var(--color-text-muted)' : 'var(--color-accent)',
          borderColor: slotType === 'estimation'
            ? 'oklch(from var(--color-text-muted) l c h / 0.3)'
            : 'oklch(from var(--color-accent) l c h / 0.3)',
          background: 'transparent',
          minWidth: '2.5rem',
          textAlign: 'center',
        }}
      >
        {slotLabel}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {problem ? (
          /* ── Filled slot ── */
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {problem.topic && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {TOPIC_ABBR[problem.topic] || problem.topic}
                  </span>
                )}
                {problem.difficulty != null && (
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    D{problem.difficulty}
                  </span>
                )}
                {statusObj && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5"
                    style={{
                      background: `var(--badge-${statusObj.badgeKey}-bg)`,
                      color: `var(--badge-${statusObj.badgeKey}-text)`,
                      border: `1px solid var(--badge-${statusObj.badgeKey}-border)`,
                    }}
                  >
                    {statusObj.label}
                  </span>
                )}
                {authorName && (
                  <span className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>{authorName}</span>
                )}
              </div>
              <div className="text-sm leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>
                <KatexRenderer content={problem.statement || problem.latex || '(no statement)'} />
              </div>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => onRemove(slotIndex)}
                className="flex-shrink-0 mt-0.5 p-1 text-[var(--color-text-faint)] hover:text-[var(--color-error)] transition-colors"
                aria-label="Remove problem"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : isEditing ? (
          /* ── Empty slot (editing) — search input ── */
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={isActive ? searchQuery : ''}
              onFocus={handleFocus}
              onChange={handleChange}
              placeholder="Search problems…"
              className="input-base w-full text-sm py-1.5"
            />
            {isActive && searchResults.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 z-20 mt-1 border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl overflow-y-auto"
                style={{ maxHeight: '240px' }}
              >
                {searchResults.map(prob => (
                  <button
                    key={prob.id}
                    type="button"
                    onMouseDown={() => handleSelect(prob)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {prob.topic && (
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
                          {TOPIC_ABBR[prob.topic] || prob.topic}
                        </span>
                      )}
                      {prob.difficulty != null && (
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--color-text-muted)' }}>D{prob.difficulty}</span>
                      )}
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text)' }}>
                      <KatexRenderer content={prob.statement || prob.latex || '(no statement)'} />
                    </p>
                  </button>
                ))}
              </div>
            )}
            {isActive && searching && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 px-3 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text-muted)]">
                Searching…
              </div>
            )}
          </div>
        ) : (
          /* ── Empty slot (viewing) ── */
          <span className="text-sm italic" style={{ color: 'var(--color-text-faint)' }}>Empty</span>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam,        setExam]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [saveMsg,     setSaveMsg]     = useState('');
  const [isEditing,   setIsEditing]   = useState(false);
  const [showLock,    setShowLock]    = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
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
      // Backend is mounted at /api/tests — NOT /api/exams
      const res = await api.get(`/tests/${id}`);
      const data = res.data;
      // Normalise _id → id in case backend returns MongoDB _id
      const normData = { ...data, id: data.id ?? data._id };
      setExam(normData);

      const map = deriveSlotMap(data.slots);
      setSlotMap(map);

      const ids = Object.values(map).map(e => e.problemId).filter(Boolean);
      if (ids.length > 0) {
        const probs = await Promise.all(ids.map(pid => api.get(`/problems/${pid}`).catch(() => null)));
        const pm = {};
        probs.forEach(r => { if (r?.data) pm[r.data.id ?? r.data._id] = r.data; });
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
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to load exam.';
      setError(msg);
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
      const res = await api.put(`/tests/${id}`, payload);
      const updated = res.data;
      const normUpdated = { ...updated, id: updated.id ?? updated._id };
      setExam(normUpdated);
      setSlotMap(deriveSlotMap(updated.slots));
      setIsEditing(false);
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (e) {
      setSaveMsg(e?.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!exam) return;
    setEditName(exam.name || '');
    setEditComp(exam.competition || '');
    setEditRoundType(exam.roundType || '');
    setEditRoundName(exam.roundName || '');
    setEditNumSets(exam.numSets || 1);
    setEditQPS(exam.questionsPerSet || 10);
    setEditEstSets(exam.estimationSets || 0);
    setEditTimeLimit(exam.timeLimit != null ? String(exam.timeLimit) : '');
    setSlotMap(deriveSlotMap(exam.slots));
    setIsEditing(false);
    setSaveMsg('');
  };

  const handleLockSave = async ({ status, password }) => {
    const res = await api.put(`/tests/${id}`, {
      isLocked: true,
      testsolveStatus: status,
      testsolvePassword: password,
    });
    const updated = res.data;
    setExam({ ...updated, id: updated.id ?? updated._id });
    setShowLock(false);
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const res = await api.put(`/tests/${id}`, { isLocked: false, testsolveStatus: 'closed' });
      const updated = res.data;
      setExam({ ...updated, id: updated.id ?? updated._id });
    } finally {
      setUnlocking(false);
    }
  };

  const handleDelete = async () => {
    await api.delete(`/tests/${id}`);
    navigate('/exams');
  };

  /* ── Group slots by set for accordion display ── */
  const setGroups = useMemo(() => {
    if (!exam) return [];
    const { numSets = 1, questionsPerSet = 10, estimationSets = 0 } = exam;
    const groups = [];
    if (numSets === 1) {
      const slots = slotDefs.filter(s => s.slotType === 'normal');
      groups.push({ label: null, slots, startIndex: 0 });
    } else {
      for (let s = 0; s < numSets; s++) {
        const startIndex = s * questionsPerSet;
        const slots = slotDefs.slice(startIndex, startIndex + questionsPerSet);
        groups.push({ label: `Set ${s + 1}`, slots, startIndex });
      }
    }
    if (estimationSets > 0) {
      const estStart = numSets * questionsPerSet;
      const estSlots = slotDefs.slice(estStart);
      groups.push({ label: 'Estimation', slots: estSlots, startIndex: estStart });
    }
    return groups;
  }, [exam, slotDefs]);

  /* ── Expand all sets by default ── */
  useEffect(() => {
    if (setGroups.length > 0) {
      const initial = {};
      setGroups.forEach((_, i) => { initial[i] = true; });
      setExpandedSets(initial);
    }
  }, [setGroups.length]);

  const toggleSet = (i) => setExpandedSets(prev => ({ ...prev, [i]: !prev[i] }));

  /* ── Stats ── */
  const filledCount = useMemo(
    () => Object.values(slotMap).filter(e => e?.problemId).length,
    [slotMap]
  );

  /* ── Export ── */
  const handleExportLatex = (includeSolutions = false) => {
    if (!exam) return;
    const latex = buildLatex(exam, slotDefs, slotMap, problemMap, includeSolutions);
    const blob = new Blob([latex], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${exam.name || 'exam'}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <Layout pageKey="exams">
        <div className="flex items-center justify-center py-32 text-[var(--color-text-muted)]">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !exam) {
    return (
      <Layout pageKey="exams">
        <div className="max-w-[960px] mx-auto space-y-4">
          <button type="button" onClick={() => navigate('/exams')} className="btn-outline btn-sm">
            ← Back to Exams
          </button>
          <div
            className="flex items-center gap-2 px-4 py-3 text-sm"
            style={{
              background: 'var(--badge-needs-review-bg)',
              color: 'var(--badge-needs-review-text)',
              border: '1px solid var(--badge-needs-review-border)',
            }}
          >
            <AlertTriangle size={14} />
            {error || 'Exam not found.'}
          </div>
        </div>
      </Layout>
    );
  }

  const isLocked = exam.isLocked;
  const totalSlots = slotDefs.length;

  return (
    <Layout pageKey="exams">
      <div className="max-w-[960px] mx-auto space-y-4 pb-16">

        {/* ── Back nav ── */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/exams')}
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ArrowLeft size={14} />
            Exams
          </button>
        </div>

        {/* ── Header card ── */}
        <div
          className="surface-card px-5 py-4"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {isEditing ? (
            /* Edit mode header */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label">Exam Name</label>
                  <input className="input-base w-full mt-1" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="section-label">Competition</label>
                  <input className="input-base w-full mt-1" value={editComp} onChange={e => setEditComp(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label">Round Type</label>
                  <select className="input-base w-full mt-1" value={editRoundType} onChange={e => setEditRoundType(e.target.value)}>
                    <option value="">—</option>
                    <option value="Individual">Individual</option>
                    <option value="Team">Team</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="section-label">Round Name</label>
                  <input className="input-base w-full mt-1" value={editRoundName} onChange={e => setEditRoundName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="section-label">Sets</label>
                  <input type="number" min={1} className="input-base w-full mt-1" value={editNumSets} onChange={e => setEditNumSets(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <div>
                  <label className="section-label">Qs / Set</label>
                  <input type="number" min={1} className="input-base w-full mt-1" value={editQPS} onChange={e => setEditQPS(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <div>
                  <label className="section-label">Est. Slots</label>
                  <input type="number" min={0} className="input-base w-full mt-1" value={editEstSets} onChange={e => setEditEstSets(Math.max(0, parseInt(e.target.value) || 0))} />
                </div>
                <div>
                  <label className="section-label">Time (min)</label>
                  <input type="number" min={0} className="input-base w-full mt-1" value={editTimeLimit} onChange={e => setEditTimeLimit(e.target.value)} placeholder="—" />
                </div>
              </div>
            </div>
          ) : (
            /* View mode header */
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1
                  className="font-bold leading-tight truncate"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)' }}
                >
                  {exam.name}
                </h1>
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {exam.competition && (
                    <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{exam.competition}</span>
                  )}
                  {exam.roundType && (
                    <>
                      <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>·</span>
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{exam.roundType}</span>
                    </>
                  )}
                  {exam.roundName && (
                    <>
                      <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>·</span>
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{exam.roundName}</span>
                    </>
                  )}
                  <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>·</span>
                  <span className="text-sm tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{filledCount}</span>/{totalSlots} filled
                  </span>
                  {exam.timeLimit && (
                    <>
                      <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>·</span>
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{exam.timeLimit} min</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {/* Lock/unlock */}
                {isLocked ? (
                  <button
                    type="button"
                    onClick={() => handleUnlock()}
                    disabled={unlocking}
                    className="btn-outline btn-sm flex items-center gap-1.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {unlocking ? <Loader2 size={12} className="animate-spin" /> : null}
                    Unlock
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowLock(true)}
                  className="btn-outline btn-sm"
                >
                  {isLocked ? 'Testsolve Settings' : 'Lock for Testsolving'}
                </button>

                {/* Export */}
                <button
                  type="button"
                  onClick={() => handleExportLatex(false)}
                  className="btn-outline btn-sm"
                >
                  Export LaTeX
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn-filled btn-sm"
                >
                  Edit Exam
                </button>
              </div>
            </div>
          )}

          {/* Lock status banner */}
          {isLocked && !isEditing && (
            <div
              className="mt-3 flex items-center gap-2 px-3 py-2 text-xs font-medium"
              style={{
                background: 'var(--badge-endorsed-bg)',
                color: 'var(--color-success)',
                border: '1px solid oklch(from var(--color-success) l c h / 0.3)',
              }}
            >
              <span className="font-semibold">{TESTSOLVE_STATUS_LABEL[exam.testsolveStatus] || 'Locked'}</span>
              {exam.testsolvePassword && (
                <span style={{ color: 'var(--color-text-muted)' }}>· Password: <span className="font-mono">{exam.testsolvePassword}</span></span>
              )}
            </div>
          )}

          {/* Save/cancel bar */}
          {isEditing && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-filled btn-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={handleCancelEdit} className="btn-outline btn-sm">Cancel</button>
              {saveMsg && (
                <span className="text-xs ml-1" style={{ color: saveMsg === 'Saved!' ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {saveMsg}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Slots ── */}
        <div className="space-y-2">
          {setGroups.map((group, gi) => {
            const isExpanded = expandedSets[gi] !== false;
            return (
              <div
                key={gi}
                className="surface-card overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                {/* Group header */}
                {group.label && (
                  <button
                    type="button"
                    onClick={() => toggleSet(gi)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)]"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      {group.label}
                    </span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}

                {/* Slots */}
                {isExpanded && (
                  <div>
                    {group.slots.map((slot, si) => {
                      const index = group.startIndex + si;
                      const entry = slotMap[index];
                      const problem = entry ? problemMap[entry.problemId] : null;
                      return (
                        <ProblemCard
                          key={index}
                          slotIndex={index}
                          slotLabel={slot.label}
                          slotType={slot.slotType}
                          problemId={entry?.problemId}
                          problem={problem}
                          onRemove={handleRemoveSlot}
                          onSearch={handleSearch}
                          isEditing={isEditing}
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

        {/* ── Danger zone ── */}
        {!isEditing && (
          <div
            className="surface-card px-5 py-4"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <p className="section-label mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Settings size={13} />
              Settings
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete this exam</p>
                <p className="mt-0.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                  Permanently removes the exam and all slot assignments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="btn-sm flex items-center gap-1.5 font-semibold transition-colors"
                style={{
                  color: 'var(--color-error)',
                  border: '1px solid color-mix(in oklch, var(--color-error) 35%, transparent)',
                  background: 'var(--badge-needs-review-bg)',
                  padding: '0.3rem 0.75rem',
                }}
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </div>
        )}

      </div>

      {showLock && (
        <LockModal
          exam={exam}
          onSave={handleLockSave}
          onClose={() => setShowLock(false)}
        />
      )}

      {showDelete && (
        <DeleteModal
          examName={exam.name}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </Layout>
  );
};

export default ExamDetail;
