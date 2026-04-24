import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp,
  Loader2, X, AlertTriangle, Settings, Download,
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

const TOPIC_CFG = {
  Algebra:        { dot: 'bg-blue-500',   active: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400',   idle: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-blue-400/50' },
  Geometry:       { dot: 'bg-green-500',  active: 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400', idle: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-green-400/50' },
  Combinatorics:  { dot: 'bg-amber-500',  active: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400', idle: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-400/50' },
  'Number Theory':{ dot: 'bg-purple-500', active: 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400', idle: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-purple-400/50' },
};

const STAGE_CFG = {
  Idea:           { dot: 'bg-amber-400',  rail: 'bg-amber-100 dark:bg-amber-900/30' },
  'Needs Review': { dot: 'bg-rose-500',   rail: 'bg-rose-100 dark:bg-rose-900/30' },
  Resolved:       { dot: 'bg-blue-500',   rail: 'bg-blue-100 dark:bg-blue-900/30' },
  Endorsed:       { dot: 'bg-green-500',  rail: 'bg-green-100 dark:bg-green-900/30' },
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

/* ── Slot-map helpers ───────────────────────────────────────── */
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

const fixLatex = (str = '') => str.replace(/\$([\s\S]*?)\$/g, (_, m) => `$${m}$`);

/* ── Build LaTeX export ─────────────────────────────────────── */
const buildLatex = (exam, slotDefs, slotMap, problemMap, includeSolutions) => {
  const lines = [
    '\\documentclass[11pt]{article}',
    '\\usepackage[margin=1in]{geometry}',
    '\\usepackage{amsmath,amssymb,graphicx,enumitem,fancyhdr}',
    '\\pagestyle{fancy}',
    `\\lhead{${exam.competition || 'Competition'}}`,
    `\\rhead{${exam.name || 'Exam'}}`,
    '\\begin{document}',
    `\\begin{center}{\\Large\\bfseries ${exam.name || 'Exam'}}\\\\[4pt]`,
    `{\\large ${exam.competition || ''}}\\end{center}`,
    '\\vspace{1em}',
  ];
  slotDefs.forEach((slot, i) => {
    const entry = slotMap[i];
    const problem = entry ? problemMap[entry.problemId] : null;
    lines.push(`\\subsection*{${slot.label}}`);
    if (problem) {
      lines.push(fixLatex(problem.latex || '(No problem text)'));
      if (includeSolutions && problem.solution) {
        lines.push('\\vspace{0.5em}');
        lines.push('{\\small\\textbf{Solution:} ' + fixLatex(problem.solution) + '}');
        if (problem.answer) lines.push(`{\\small\\textbf{Answer:} ${fixLatex(problem.answer)}}`);
      }
    } else {
      lines.push('\\textit{(Empty slot)}');
    }
    lines.push('\\vspace{1em}');
  });
  lines.push('\\end{document}');
  return lines.join('\n');
};

const downloadTex = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ── Cross-exam duplicate detection ─────────────────────────── */
const useDuplicates = (examId, slotMap) => {
  const [dupes, setDupes] = useState([]);
  useEffect(() => {
    const ids = Object.values(slotMap).map((s) => s.problemId).filter(Boolean);
    if (ids.length === 0) { setDupes([]); return; }
    api.get('/tests')
      .then((res) => {
        const found = [];
        (res.data || []).forEach((other) => {
          if (other.id === examId) return;
          const otherIds = (other.slots || other.problems || [])
            .map((s) => (typeof s === 'string' ? s : s?.problemId))
            .filter(Boolean);
          const overlap = ids.filter((id) => otherIds.includes(id));
          if (overlap.length > 0) found.push({ examName: other.name, problems: overlap });
        });
        setDupes(found);
      })
      .catch(() => setDupes([]));
  }, [examId, slotMap]);
  return dupes;
};

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

const StageChip = ({ stage }) => {
  const cfg = STAGE_CFG[stage] || STAGE_CFG.Idea;
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${cfg.rail}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {stage}
    </span>
  );
};

const Grip = () => (
  <div className="flex-shrink-0 grid grid-cols-2 gap-[2px] opacity-30">
    {[0,1,2,3,4,5].map(i => (
      <div key={i} className="w-[3px] h-[3px] rounded-full bg-[var(--color-text-muted)]" />
    ))}
  </div>
);

/* ── SlotCard ── */
const SlotCard = ({ slot, index, entry, problem, onRemove, onDrop, onPreview }) => {
  const [over, setOver] = useState(false);
  const topics = problem ? (problem.topics || []).map(t => TOPIC_ABBR[t] || t) : [];

  return (
    <div
      className={[
        'border rounded-sm transition-all select-none',
        over ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-[var(--color-border)]',
        slot.slotType === 'estimation' ? 'border-l-2 border-l-[var(--ucla-gold)]' : '',
        problem ? 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] cursor-pointer' : 'bg-[var(--color-bg)] cursor-default',
      ].join(' ')}
      style={{ minHeight: '52px' }}
      onClick={() => problem && onPreview(problem)}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('problemId'); if (id) onDrop(index, id); }}
    >
      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5">
        <Grip />
        <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex-shrink-0">{slot.label}</span>
        {problem ? (
          <>
            <span className="font-mono text-[10px] font-bold text-[var(--color-accent)] leading-none flex-shrink-0">{problem.id}</span>
            <span className="text-[9px] tabular-nums font-semibold text-[var(--color-text-faint)] flex-shrink-0">{problem.quality || '?'}/10</span>
            <div className="flex items-center gap-0.5 flex-1 min-w-0 flex-wrap">
              {topics.map(t => (
                <span key={t} className="text-[8px] font-medium px-1 py-0 rounded-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] leading-4">{t}</span>
              ))}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(index); }}
              className="ml-auto flex-shrink-0 p-0.5 text-[var(--color-text-faint)] hover:text-rose-500 transition-colors"
            >
              <X size={10} />
            </button>
          </>
        ) : (
          <span className="text-[9px] text-[var(--color-text-faint)] italic ml-1">Drop here</span>
        )}
      </div>
      {problem && (
        <div
          className="px-2 pb-1.5 pl-7 text-[13px] text-[var(--color-text-muted)] leading-snug overflow-hidden pointer-events-none"
          style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
        >
          <KatexRenderer latex={(problem.latex || '').slice(0, 300)} />
        </div>
      )}
    </div>
  );
};

/* ── ShortlistRow ── */
const ShortlistRow = ({ problem, isUsed, onPreview, onRemove }) => {
  const status = problem._displayStatus || getProblemStatus(problem, problem.feedbacks);
  const topics = (problem.topics || []).map(t => TOPIC_ABBR[t] || t);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('problemId', problem.id)}
      className={[
        'flex items-center gap-2 px-3 border-b border-[var(--color-border)] cursor-grab active:cursor-grabbing transition-colors',
        isUsed ? 'opacity-40' : 'hover:bg-[var(--color-surface)]',
      ].join(' ')}
      style={{ height: '42px' }}
      onClick={() => onPreview(problem)}
    >
      <Grip />
      <span className="font-mono text-[10px] font-bold text-[var(--color-accent)] leading-none flex-shrink-0">{problem.id}</span>
      <StageChip stage={status} />
      <div className="flex items-center gap-0.5">
        {topics.map(t => (
          <span key={t} className="text-[8px] font-medium px-1 py-0 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] leading-4">{t}</span>
        ))}
      </div>
      <span className="ml-auto text-[9px] tabular-nums font-semibold text-[var(--color-text-faint)]">{problem.quality || '?'}/10</span>
      {isUsed && <span className="text-[9px] font-semibold text-[var(--color-accent)] flex-shrink-0">✓</span>}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(problem.id); }}
        className="flex-shrink-0 p-0.5 text-[var(--color-text-faint)] hover:text-rose-500 transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  );
};

/* ── BankRow ── */
const BankRow = ({ problem, isUsed, onPreview }) => {
  const status = problem._displayStatus || getProblemStatus(problem, problem.feedbacks);
  const topics = (problem.topics || []).map(t => TOPIC_ABBR[t] || t);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('problemId', problem.id)}
      className={[
        'px-4 py-1.5 border-b border-[var(--color-border)] cursor-grab active:cursor-grabbing transition-colors',
        isUsed ? 'opacity-40' : 'hover:bg-[var(--color-surface)]',
      ].join(' ')}
      onClick={() => onPreview(problem)}
    >
      <div className="flex items-center gap-1.5">
        <Grip />
        <span className="font-mono text-[13px] font-semibold text-[var(--color-accent)] leading-none flex-shrink-0">{problem.id}</span>
        <StageChip stage={status} />
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {topics.map(t => (
            <span key={t} className="text-[9px] font-medium px-1 py-0.5 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">{t}</span>
          ))}
        </div>
        <span className="flex-shrink-0 text-[10px] tabular-nums font-semibold text-[var(--color-text-faint)] ml-auto">{problem.quality || '?'}/10</span>
        {isUsed && <span className="text-[9px] font-semibold text-[var(--color-accent)] flex-shrink-0">✓</span>}
      </div>
      <div className="mt-0.5 pl-5 text-[13px] text-[var(--color-text-muted)] leading-snug overflow-hidden pointer-events-none" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        <KatexRenderer latex={(problem.latex || '').slice(0, 300)} />
      </div>
    </div>
  );
};

/* ── Problem quick-view modal ───────────────────────────────── */
const ProbModal = ({ problem, onClose }) => {
  const [showSol, setShowSol] = useState(false);
  if (!problem) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="surface-card shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)] z-10">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{problem.id}</span>
            <StageChip stage={problem._displayStatus || getProblemStatus(problem, problem.feedbacks)} />
            <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{problem.quality || '?'}/10</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={15} /></button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div>
            <p className="section-label">Problem</p>
            <div className="mt-2 text-[15px] leading-7"><KatexRenderer latex={problem.latex || ''} /></div>
          </div>
          {problem.answer && (
            <div className="flex items-center gap-3">
              <span className="section-label shrink-0">Answer</span>
              <span className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-sm font-semibold">
                <KatexRenderer latex={problem.answer} />
              </span>
            </div>
          )}
          {problem.solution && (
            <div className="rounded-sm border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={() => setShowSol((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] transition-colors text-sm font-semibold text-[var(--color-accent)]"
              >
                {showSol ? 'Hide' : 'Show'} solution
                {showSol ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showSol && (
                <div className="border-t border-[var(--color-border)] px-4 py-4 text-[15px] leading-7">
                  <KatexRenderer latex={problem.solution} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Live Preview modal ─────────────────────────────────────── */
const LivePreview = ({ slotDefs, slotMap, problemMap, includeSolutions }) => (
  <div className="space-y-4 py-4">
    {slotDefs.map((slot, i) => {
      const entry = slotMap[i];
      const problem = entry ? problemMap[entry.problemId] : null;
      return (
        <div key={i} className="surface-card px-5 py-4">
          <p className="section-label mb-2">{slot.label}</p>
          {problem ? (
            <div className="space-y-3">
              <div className="text-[15px] leading-7"><KatexRenderer latex={problem.latex || ''} /></div>
              {includeSolutions && problem.solution && (
                <div className="border-t border-[var(--color-border)] pt-3">
                  <p className="section-label mb-1">Solution</p>
                  <div className="text-sm leading-6 text-[var(--color-text-muted)]"><KatexRenderer latex={problem.solution} /></div>
                  {problem.answer && <p className="mt-1 text-sm"><strong>Answer:</strong> <KatexRenderer latex={problem.answer} /></p>}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic text-[var(--color-text-faint)]">Empty slot</p>
          )}
        </div>
      );
    })}
  </div>
);

const PreviewModal = ({ exam, slotDefs, slotMap, problemMap, includeSolutions, onClose, onDownload }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div
      className="surface-card shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)] z-10">
        <h2 className="font-bold text-sm">
          {exam.name} — {includeSolutions ? 'Answer Key' : 'Problems Only'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <Download size={12} />
            Download .tex
          </button>
          <button onClick={onClose} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="px-5 overflow-y-auto">
        <LivePreview slotDefs={slotDefs} slotMap={slotMap} problemMap={problemMap} includeSolutions={includeSolutions} />
      </div>
    </div>
  </div>
);

/* ── Configure Exam panel ───────────────────────────────────── */
const ConfigureExam = ({ exam, onSave, onCancel, slotMap }) => {
  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState({
    name:            exam.name            || '',
    competition:     exam.competition     || '',
    roundType:       exam.roundType       || 'Individual',
    roundName:       exam.roundName       || '',
    numSets:         exam.numSets         ?? 1,
    questionsPerSet: exam.questionsPerSet ?? 10,
    estimationSets:  exam.estimationSets  ?? 0,
    examTopics:      exam.examTopics      || [],
    tournamentId:    exam.tournamentId    || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    api.get('/admin/tournaments').then(r => setTournaments(r.data || [])).catch(() => {});
  }, []);

  const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setNum = k => e => setForm(f => ({ ...f, [k]: Math.max(0, parseInt(e.target.value) || 0) }));
  const toggleTopic = t =>
    setForm(f => ({
      ...f,
      examTopics: f.examTopics.includes(t) ? f.examTopics.filter(x => x !== t) : [...f.examTopics, t],
    }));

  const newTotalSlots = form.numSets * form.questionsPerSet + form.estimationSets;
  const oldTotalSlots = (exam.numSets ?? 1) * (exam.questionsPerSet ?? 10) + (exam.estimationSets ?? 0);

  const truncatedSlots = useMemo(() => {
    if (newTotalSlots >= oldTotalSlots) return [];
    return Object.entries(slotMap)
      .filter(([idx]) => parseInt(idx) >= newTotalSlots && parseInt(idx) < oldTotalSlots)
      .map(([, v]) => v.problemId)
      .filter(Boolean);
  }, [slotMap, newTotalSlots, oldTotalSlots]);

  const buildPayload = () => ({
    name:            form.name.trim(),
    competition:     form.competition.trim() || tournaments.find(t => t.id === form.tournamentId)?.name || '',
    roundType:       form.roundType  || null,
    roundName:       form.roundName  || null,
    numSets:         form.numSets,
    questionsPerSet: form.questionsPerSet,
    estimationSets:  form.estimationSets,
    examTopics:      form.examTopics,
    tournamentId:    form.tournamentId || null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Exam name is required.'); return; }
    if (form.numSets < 1)  { setError('Must have at least 1 set.'); return; }
    if (form.questionsPerSet < 1) { setError('Must have at least 1 question per set.'); return; }

    if (truncatedSlots.length > 0) {
      setWarning({ removedCount: truncatedSlots.length, removedIds: truncatedSlots, payload: buildPayload() });
      return;
    }

    await doSave(buildPayload(), slotMap);
  };

  const doSave = async (payload, currentSlotMap) => {
    setSaving(true);
    setError('');
    try {
      const newTotal = payload.numSets * payload.questionsPerSet + payload.estimationSets;
      const trimmedSlotMap = Object.fromEntries(
        Object.entries(currentSlotMap).filter(([idx]) => parseInt(idx) < newTotal)
      );
      await api.put(`/tests/${exam.id}`, payload);
      const slotsPayload = [];
      for (let i = 0; i < newTotal; i++) {
        const entry = trimmedSlotMap[i];
        slotsPayload.push(entry ? { problemId: entry.problemId } : null);
      }
      await api.put(`/tests/${exam.id}/slots`, { slots: slotsPayload });
      onSave({ ...payload, id: exam.id }, trimmedSlotMap);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
      setWarning(null);
    }
  };

  const selectedTournament = tournaments.find(t => t.id === form.tournamentId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <button onClick={onCancel} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <ArrowLeft size={14} />
        </button>
        <h2 className="text-sm font-semibold flex-1">Configure Exam</h2>
        <button
          form="configure-exam-form"
          type="submit"
          disabled={saving}
          className="btn-filled px-4 py-1.5 text-xs disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Warning overlay */}
      {warning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="surface-card shadow-2xl w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold mb-1">
                  {warning.removedCount} filled slot{warning.removedCount !== 1 ? 's' : ''} will be removed
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Reducing the total slot count will permanently remove the following problems from the exam:
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {warning.removedIds.map(id => (
                    <span key={id} className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-accent)]">{id}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setWarning(null)} className="btn-outline flex-1 py-2 text-xs">Cancel</button>
              <button
                onClick={() => doSave(warning.payload, slotMap)}
                className="flex-1 py-2 text-xs font-semibold rounded-sm bg-amber-500 hover:bg-amber-600 text-white transition-colors"
              >
                Remove & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form — centered, ~2× wider */}
      <div className="overflow-y-auto flex-1">
        <form
          id="configure-exam-form"
          onSubmit={handleSubmit}
          className="mx-auto p-8 space-y-5"
          style={{ maxWidth: '720px' }}
        >

          {/* Tournament */}
          <div>
            <label className="section-label">Tournament</label>
            <div className="relative mt-1.5">
              <select className="input-base w-full pr-8 appearance-none" value={form.tournamentId} onChange={set('tournamentId')}>
                <option value="">— None / standalone —</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            </div>
          </div>

          {/* Round type — dropdown */}
          <div>
            <label className="section-label">Round Type</label>
            <div className="relative mt-1.5">
              <select
                className="input-base w-full pr-8 appearance-none"
                value={form.roundType}
                onChange={set('roundType')}
              >
                <option value="Individual">Individual</option>
                <option value="Team">Team</option>
                <option value="Other">Other</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            </div>
          </div>

          {/* Round name */}
          <div>
            <label className="section-label">Round Name</label>
            <input className="input-base w-full mt-1.5" value={form.roundName} onChange={set('roundName')} placeholder="e.g. Individual: Algebra & NT" />
          </div>

          {/* Exam name */}
          <div>
            <label className="section-label">Exam Name *</label>
            <input className="input-base w-full mt-1.5" value={form.name} onChange={set('name')} />
          </div>

          {/* Competition label */}
          <div>
            <label className="section-label">Competition Label</label>
            <p className="text-[10px] text-[var(--color-text-faint)] mt-0.5 mb-1">Shown on the exam header. Defaults to the tournament name if blank.</p>
            <input className="input-base w-full" value={form.competition} onChange={set('competition')} placeholder={selectedTournament?.name || 'e.g. LAMT 2026'} />
          </div>

          {/* Structure */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="section-label">Sets</label>
              <input type="number" min={1} className="input-base w-full mt-1.5" value={form.numSets} onChange={setNum('numSets')} />
            </div>
            <div>
              <label className="section-label">Questions / Set</label>
              <input type="number" min={1} className="input-base w-full mt-1.5" value={form.questionsPerSet} onChange={setNum('questionsPerSet')} />
            </div>
            <div>
              <label className="section-label">Estimation Slots</label>
              <input type="number" min={0} className="input-base w-full mt-1.5" value={form.estimationSets} onChange={setNum('estimationSets')} />
            </div>
          </div>

          {/* Total count */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-xs">
            <span className="text-[var(--color-text-muted)]">Total slots:</span>
            <span className="font-bold tabular-nums text-[var(--color-accent)]">{newTotalSlots}</span>
            {newTotalSlots < oldTotalSlots && truncatedSlots.length > 0 && (
              <span className="ml-1 text-amber-500 font-semibold">
                ⚠ {truncatedSlots.length} filled slot{truncatedSlots.length !== 1 ? 's' : ''} will be removed
              </span>
            )}
          </div>

          {/* Exam topics — LAMT styled chips */}
          <div>
            <label className="section-label">Exam Topics</label>
            <p className="text-[10px] text-[var(--color-text-faint)] mt-0.5 mb-2.5">
              Which topics should appear in the problem bank for this exam? Leave blank to show all.
            </p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => {
                const cfg = TOPIC_CFG[t];
                const active = form.examTopics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className={[
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-semibold transition-all',
                      active ? cfg.active : cfg.idle,
                    ].join(' ')}
                  >
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot} ${active ? 'opacity-100' : 'opacity-40'}`} />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs text-[var(--badge-needs-review-text)] flex items-center gap-1.5">
              <AlertTriangle size={12} /> {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   EXAM DETAIL — main component
══════════════════════════════════════════════════════════════ */
const ExamDetail = () => {
  const { id: examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam]                   = useState(null);
  const [problems, setProblems]           = useState([]);
  const [slotMap, setSlotMap]             = useState({});
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [dirty, setDirty]                 = useState(false);
  const [previewProblem, setPreviewProblem] = useState(null);
  const [showPreview, setShowPreview]     = useState(false);
  const [previewWithSolutions, setPreviewWithSolutions] = useState(false);
  const [shortlist, setShortlist]         = useState([]);
  const [slotsPerRow, setSlotsPerRow]     = useState(3);
  const [showConfigure, setShowConfigure] = useState(false);

  /* ── Filters ── */
  const [bankSearch, setBankSearch]   = useState('');
  const [bankTopic, setBankTopic]     = useState('');
  const [bankStage, setBankStage]     = useState('');
  const [bankDiffMin, setBankDiffMin] = useState(1);
  const [bankDiffMax, setBankDiffMax] = useState(10);

  /* ── Resizable split ── */
  const containerRef = useRef(null);
  const isDragging   = useRef(false);
  const [splitPct, setSplitPct] = useState(28);

  const onDividerMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct  = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(Math.max(pct, 15), 70));
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current             = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  /* ── Derived ── */
  const slotDefs = useMemo(() => buildSlotsFromExam(exam), [exam]);

  const topicRestriction = useMemo(() => {
    if (!exam?.examTopics?.length) return null;
    return exam.examTopics;
  }, [exam?.examTopics]);

  const problemMap = useMemo(() => {
    const map = {};
    problems.forEach((p) => { map[p.id] = p; });
    return map;
  }, [problems]);

  const usedIds = useMemo(() => {
    const set = new Set();
    Object.values(slotMap).forEach((e) => { if (e.problemId) set.add(e.problemId); });
    return set;
  }, [slotMap]);

  const shortlistIds = useMemo(() => {
    const set = new Set();
    shortlist.forEach((p) => set.add(p.id));
    return set;
  }, [shortlist]);

  const dupes = useDuplicates(examId, slotMap);

  const bankProblems = useMemo(() => {
    let list = problems.filter((p) => p.stage !== 'Archived');
    if (topicRestriction) list = list.filter((p) => (p.topics || []).some((t) => topicRestriction.includes(t)));
    if (bankSearch) list = list.filter((p) => `${p.id} ${p.latex || ''} ${(p.topics || []).join(' ')}`.toLowerCase().includes(bankSearch.toLowerCase()));
    if (bankTopic) list = list.filter((p) => (p.topics || []).includes(bankTopic));
    if (bankStage) list = list.filter((p) => (p._displayStatus || getProblemStatus(p, p.feedbacks)) === bankStage);
    list = list.filter((p) => { const d = parseInt(p.quality) || 5; return d >= bankDiffMin && d <= bankDiffMax; });
    return list;
  }, [problems, bankSearch, bankTopic, bankStage, bankDiffMin, bankDiffMax, topicRestriction]);

  /* ── Fetch data ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [examRes, probRes] = await Promise.all([api.get(`/tests/${examId}`), api.get('/problems')]);
        setExam(examRes.data);
        setProblems(probRes.data || []);
        setSlotMap(deriveSlotMap(examRes.data.slots));
      } catch {
        console.error('Failed to load exam');
      }
      setLoading(false);
    };
    load();
  }, [examId]);

  /* ── Slot actions ── */
  const assignSlot = (index, problemId) => { setSlotMap((prev) => ({ ...prev, [index]: { problemId } })); setDirty(true); };
  const removeSlot = (index) => { setSlotMap((prev) => { const next = { ...prev }; delete next[index]; return next; }); setDirty(true); };

  /* ── Save slots ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = slotsToPayload(slotMap, slotDefs.length);
      await api.put(`/tests/${examId}/slots`, { slots: payload });
      setDirty(false);
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save.');
    }
    setSaving(false);
  };

  /* ── Configure save callback ── */
  const handleConfigureSave = (updatedExam, updatedSlotMap) => {
    setExam(prev => ({ ...prev, ...updatedExam }));
    setSlotMap(updatedSlotMap);
    setDirty(false);
    setShowConfigure(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center gap-2 text-[var(--color-text-muted)]">
          <Loader2 size={18} className="animate-spin text-[var(--color-accent)]" />
          Loading exam…
        </div>
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-sm text-[var(--color-text-muted)]">Exam not found.</p>
          <Link to="/exams" className="text-sm text-[var(--color-accent)] hover:underline mt-2 inline-block">Back to exams</Link>
        </div>
      </Layout>
    );
  }

  /* ── Configure panel shown ── */
  if (showConfigure) {
    return (
      <Layout>
        <div className="flex flex-col" style={{ height: 'calc(100vh - 3vh)', overflow: 'hidden' }}>
          <ConfigureExam
            exam={exam}
            slotMap={slotMap}
            onSave={handleConfigureSave}
            onCancel={() => setShowConfigure(false)}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 3vh)', overflow: 'hidden' }}>

        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/exams')} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex-shrink-0">
              <ArrowLeft size={14} />
            </button>

            {/* Exam name → Configure button */}
            <button
              onClick={() => setShowConfigure(true)}
              className="flex items-center gap-1.5 min-w-0 group"
              title="Configure exam"
            >
              <h1 className="text-sm font-bold truncate leading-tight group-hover:text-[var(--color-accent)] transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                {exam.name}
              </h1>
              <Settings size={12} className="flex-shrink-0 text-[var(--color-text-faint)] group-hover:text-[var(--color-accent)] transition-colors" />
            </button>

            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] leading-tight flex-shrink-0">
              {exam.roundType && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-sm bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/15">
                  {exam.roundType}
                </span>
              )}
              {exam.competition && <><span className="text-[var(--color-text-faint)]">·</span><span>{exam.competition}</span></>}
              <span className="text-[var(--color-text-faint)]">·</span>
              <span className="tabular-nums">{Object.keys(slotMap).length}/{slotDefs.length} filled</span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
              <button
                onClick={() => { setShowPreview(true); setPreviewWithSolutions(false); }}
                className="btn-outline px-2.5 py-1 text-[11px] whitespace-nowrap"
              >
                Preview Problems
              </button>
              <button
                onClick={() => { setShowPreview(true); setPreviewWithSolutions(true); }}
                className="btn-outline px-2.5 py-1 text-[11px] whitespace-nowrap"
              >
                Preview Key
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="btn-filled px-3 py-1 text-[11px] disabled:opacity-50 whitespace-nowrap"
              >
                {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
              </button>
            </div>
          </div>

          {dupes.length > 0 && (
            <div className="mt-1.5 flex items-start gap-2 rounded-sm border border-[var(--badge-idea-border)] bg-[var(--badge-idea-bg)] px-3 py-1.5 text-[10px] text-[var(--badge-idea-text)]">
              <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
              <span>Duplicates in: {dupes.map((d) => `${d.examName} (${d.problems.join(', ')})`).join('; ')}</span>
            </div>
          )}
          {topicRestriction && (
            <div className="mt-1 text-[10px] text-[var(--color-text-faint)]">
              Topic filter: {topicRestriction.join(', ')}. Bank is pre-filtered.
            </div>
          )}
        </div>

        {/* ── Body: resizable split ───────────────────────── */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden">

          {/* LEFT: Slot grid + Shortlist */}
          <div
            className="overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg)] flex-shrink-0"
            style={{ width: `${splitPct}%` }}
          >
            {/* EXAM SLOTS */}
            <div className="p-3">
              <div className="flex items-center gap-2 px-1 mb-2">
                <p className="section-label uppercase tracking-widest text-[10px] flex-1">
                  Exam Slots ({Object.keys(slotMap).length}/{slotDefs.length})
                </p>
                <label className="flex items-center gap-1.5 text-[9px] text-[var(--color-text-muted)] flex-shrink-0">
                  <span className="whitespace-nowrap">Per row</span>
                  <input
                    type="range" min={1} max={5} value={slotsPerRow}
                    onChange={(e) => setSlotsPerRow(+e.target.value)}
                    className="w-16 accent-[var(--color-accent)]"
                    style={{ height: '3px' }}
                  />
                  <span className="tabular-nums w-3 text-center">{slotsPerRow}</span>
                </label>
              </div>

              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${slotsPerRow}, minmax(0, 1fr))` }}
              >
                {slotDefs.map((slot, i) => (
                  <SlotCard
                    key={i}
                    slot={slot}
                    index={i}
                    entry={slotMap[i] || null}
                    problem={slotMap[i] ? problemMap[slotMap[i].problemId] : null}
                    onRemove={removeSlot}
                    onDrop={assignSlot}
                    onPreview={setPreviewProblem}
                  />
                ))}
              </div>
            </div>

            {/* SHORTLIST */}
            <div className="px-3 pb-3">
              <p className="section-label px-1 mb-1 uppercase tracking-widest text-[10px]">
                Shortlist ({shortlist.length})
              </p>
              {shortlist.length === 0 ? (
                <div
                  className="border border-dashed border-[var(--color-border)] rounded-sm px-3 py-3 text-[10px] text-[var(--color-text-faint)] italic text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('problemId');
                    const p = problems.find(pr => pr.id === id);
                    if (p && !shortlist.some(s => s.id === id)) setShortlist(prev => [...prev, p]);
                  }}
                >
                  Drag problems from the bank to shortlist them
                </div>
              ) : (
                <div
                  className="border border-[var(--color-border)] rounded-sm overflow-hidden"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('problemId');
                    const p = problems.find(pr => pr.id === id);
                    if (p && !shortlist.some(s => s.id === id)) setShortlist(prev => [...prev, p]);
                  }}
                >
                  {shortlist.map(p => (
                    <ShortlistRow
                      key={p.id}
                      problem={p}
                      isUsed={usedIds.has(p.id)}
                      onPreview={setPreviewProblem}
                      onRemove={(id) => setShortlist(prev => prev.filter(s => s.id !== id))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DRAG HANDLE */}
          <div
            onMouseDown={onDividerMouseDown}
            className="w-1 flex-shrink-0 cursor-col-resize bg-[var(--color-border)] hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)] transition-colors relative group"
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {[0,1,2,3,4].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[var(--color-accent)]" />)}
            </div>
          </div>

          {/* RIGHT: Problem bank */}
          <div className="overflow-y-auto bg-[var(--color-bg)] flex-1">
            <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-border)] px-3 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <input
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search bank"
                  className="input-base py-1 text-xs"
                  style={{ flex: '2 1 120px', minWidth: 0 }}
                />
                <select value={bankTopic} onChange={(e) => setBankTopic(e.target.value)} className="input-base py-1 text-xs" style={{ flex: '1 1 90px', minWidth: 0 }}>
                  <option value="">All topics</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={bankStage} onChange={(e) => setBankStage(e.target.value)} className="input-base py-1 text-xs" style={{ flex: '1 1 90px', minWidth: 0 }}>
                  <option value="">All stages</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
                  <span>Diff</span>
                  <input type="number" min={1} max={10} value={bankDiffMin} onChange={(e) => setBankDiffMin(+e.target.value)} className="input-base w-9 py-1 px-1 text-center text-xs" />
                  <span>–</span>
                  <input type="number" min={1} max={10} value={bankDiffMax} onChange={(e) => setBankDiffMax(+e.target.value)} className="input-base w-9 py-1 px-1 text-center text-xs" />
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums flex-shrink-0">{bankProblems.length}</span>
              </div>
            </div>

            {bankProblems.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">No problems match the current filters.</div>
            ) : (
              bankProblems.map((p) => (
                <BankRow
                  key={p.id}
                  problem={p}
                  isUsed={usedIds.has(p.id) || shortlistIds.has(p.id)}
                  onPreview={setPreviewProblem}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Preview modals ────────────────────────────────── */}
      {showPreview && (
        <PreviewModal
          exam={exam}
          slotDefs={slotDefs}
          slotMap={slotMap}
          problemMap={problemMap}
          includeSolutions={previewWithSolutions}
          onClose={() => setShowPreview(false)}
          onDownload={() => {
            const tex = buildLatex(exam, slotDefs, slotMap, problemMap, previewWithSolutions);
            downloadTex(tex, `${exam?.name || 'exam'}_${previewWithSolutions ? 'key' : 'problems'}.tex`);
          }}
        />
      )}

      {/* ── Problem quick-view modal ──────────────────────── */}
      {previewProblem && <ProbModal problem={previewProblem} onClose={() => setPreviewProblem(null)} />}
    </Layout>
  );
};

export default ExamDetail;
