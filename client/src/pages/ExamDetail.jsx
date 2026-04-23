import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp,
  GripVertical, Loader2, X, AlertTriangle,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import { getProblemStatus, STATUS_BADGE_CLASS } from '../utils/problemStatus';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const TEMPLATE_LABELS = {
  'indiv-alg-nt': 'Individual: Algebra & NT',
  'indiv-geo':    'Individual: Geometry',
  'indiv-combo':  'Individual: Combinatorics',
  shopping:       'Team: Shopping Spree',
  guts:           'Team: Guts',
};

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

/* ── Slot builders per template ─────────────────────────────── */
const buildSlots = (templateType) => {
  if (!templateType) return Array.from({ length: 10 }, (_, i) => ({ label: `Q${i + 1}`, slotType: 'normal' }));
  switch (templateType) {
    case 'indiv-alg-nt':
    case 'indiv-geo':
    case 'indiv-combo':
      return [
        ...Array.from({ length: 10 }, (_, i) => ({ label: `Q${i + 1}`, slotType: 'normal' })),
        { label: 'Estimation', slotType: 'estimation' },
      ];
    case 'shopping':
      return [
        ...Array.from({ length: 24 }, (_, i) => ({ label: `Q${i + 1}`, slotType: 'normal' })),
        { label: 'Estimation Wager', slotType: 'estimation' },
      ];
    case 'guts': {
      const slots = [];
      for (let set = 1; set <= 7; set++)
        for (let q = 1; q <= 3; q++)
          slots.push({ label: `S${set}.${q}`, slotType: 'normal' });
      slots.push({ label: 'S8.1', slotType: 'normal' });
      slots.push({ label: 'S8.2', slotType: 'normal' });
      slots.push({ label: 'Estimation', slotType: 'estimation' });
      return slots;
    }
    default:
      return Array.from({ length: 10 }, (_, i) => ({ label: `Q${i + 1}`, slotType: 'normal' }));
  }
};

const examTopicFilter = (templateType) => {
  if (templateType === 'indiv-alg-nt') return ['Algebra', 'Number Theory'];
  if (templateType === 'indiv-geo') return ['Geometry'];
  if (templateType === 'indiv-combo') return ['Combinatorics'];
  return null;
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

const fixLatex = (str = '') => str.replace(/\$([\\s\\S]*?)\$/g, (_, m) => `$${m}$`);

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

/* ── SlotCard — fixed height, 2-row design ──────────────────── */
const SlotCard = ({ slot, index, entry, problem, onRemove, onDrop, onPreview }) => {
  const [over, setOver] = useState(false);

  const topics = problem ? (problem.topics || []).map(t => TOPIC_ABBR[t] || t) : [];
  const diff = problem ? (problem.quality || '?') : null;

  return (
    <div
      className={[
        'border rounded-sm flex flex-col transition-all cursor-pointer',
        over ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-[var(--color-border)]',
        slot.slotType === 'estimation' ? 'border-l-2 border-l-[var(--ucla-gold)]' : '',
        problem ? 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]' : 'bg-[var(--color-bg)]',
      ].join(' ')}
      style={{ height: '72px' }}
      onClick={() => problem && onPreview(problem)}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('problemId'); if (id) onDrop(index, id); }}
    >
      {/* ROW 1 */}
      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5" style={{ minHeight: '28px' }}>
        {/* 6-dot grip */}
        <div className="flex-shrink-0 grid grid-cols-2 gap-[2px] opacity-30">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="w-[3px] h-[3px] rounded-full bg-[var(--color-text-muted)]" />
          ))}
        </div>
        {/* Slot label */}
        <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex-shrink-0">{slot.label}</span>

        {problem ? (
          <>
            {/* Problem ID */}
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(problem); }}
              className="font-mono text-[10px] font-bold text-[var(--color-accent)] hover:underline leading-none flex-shrink-0"
            >
              {problem.id}
            </button>
            {/* Difficulty */}
            <span className="text-[9px] tabular-nums font-semibold text-[var(--color-text-faint)] flex-shrink-0">{diff}/10</span>
            {/* Topics */}
            <div className="flex items-center gap-0.5 flex-wrap">
              {topics.map(t => (
                <span key={t} className="text-[8px] font-medium px-1 py-0 rounded-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] leading-4">{t}</span>
              ))}
            </div>
            {/* Remove */}
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

      {/* ROW 2–3: LaTeX preview */}
      <div className="px-2 pb-1.5 flex-1 overflow-hidden">
        {problem ? (
          <div className="text-[10px] text-[var(--color-text-muted)] leading-tight line-clamp-2 pointer-events-none">
            <KatexRenderer latex={(problem.latex || '').slice(0, 300)} />
          </div>
        ) : (
          <div className="h-full" />
        )}
      </div>
    </div>
  );
};

/* ── ShortlistRow — thin 1-per-row, drag-only ───────────────── */
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
      style={{ height: '28px' }}
      onClick={() => onPreview(problem)}
    >
      <div className="flex-shrink-0 grid grid-cols-2 gap-[2px] opacity-30">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="w-[3px] h-[3px] rounded-full bg-[var(--color-text-muted)]" />
        ))}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onPreview(problem); }}
        className="font-mono text-[10px] font-bold text-[var(--color-accent)] hover:underline leading-none flex-shrink-0"
      >
        {problem.id}
      </button>
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

/* ── BankRow ────────────────────────────────────────────────── */
const BankRow = ({ problem, isUsed, onPreview, onAddToShortlist, isShortlisted }) => {
  const status = problem._displayStatus || getProblemStatus(problem, problem.feedbacks);
  const topics = (problem.topics || []).map(t => TOPIC_ABBR[t] || t);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('problemId', problem.id)}
      className={[
        'px-4 border-b border-[var(--color-border)] cursor-grab active:cursor-grabbing transition-colors',
        isUsed ? 'opacity-40' : 'hover:bg-[var(--color-surface)]',
      ].join(' ')}
      style={{ height: '38px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <div className="flex items-center gap-1.5">
        <div className="flex-shrink-0 grid grid-cols-2 gap-[2px] opacity-30">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="w-[3px] h-[3px] rounded-full bg-[var(--color-text-muted)]" />
          ))}
        </div>
        <button
          onClick={() => onPreview(problem)}
          className="font-mono text-[13px] font-semibold text-[var(--color-accent)] hover:underline leading-none flex-shrink-0"
        >
          {problem.id}
        </button>
        <StageChip stage={status} />
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {topics.map(t => (
            <span key={t} className="text-[9px] font-medium px-1 py-0.5 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">{t}</span>
          ))}
        </div>
        <span className="text-[9px] text-[var(--color-text-muted)] leading-none overflow-hidden" style={{ flex: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', minWidth: 0 }}>
          <KatexRenderer latex={(problem.latex || '').slice(0, 220)} />
        </span>
        <span className="flex-shrink-0 text-[10px] tabular-nums font-semibold text-[var(--color-text-faint)]">{problem.quality || '?'}/10</span>
        <button
          onClick={(e) => { e.stopPropagation(); onAddToShortlist(problem); }}
          className={`text-[9px] px-1.5 py-0.5 rounded-sm border transition-colors flex-shrink-0 ${
            isShortlisted
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10'
              : 'border-[var(--color-border)] text-[var(--color-text-faint)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
          }`}
        >
          {isShortlisted ? '★' : '☆'}
        </button>
        {isUsed && <span className="text-[9px] font-semibold text-[var(--color-accent)] flex-shrink-0">✓</span>}
      </div>
    </div>
  );
};

/* ── Preview Modal ──────────────────────────────────────────── */
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

/* ── Live Preview ───────────────────────────────────────────── */
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
  const slotDefs = useMemo(() => buildSlots(exam?.templateType), [exam?.templateType]);
  const topicRestriction = useMemo(() => examTopicFilter(exam?.templateType), [exam?.templateType]);

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

  const shortlistIds = useMemo(() => new Set(shortlist.map(p => p.id)), [shortlist]);

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
  const assignSlot  = (index, problemId) => { setSlotMap((prev) => ({ ...prev, [index]: { problemId } })); setDirty(true); };
  const removeSlot  = (index) => { setSlotMap((prev) => { const next = { ...prev }; delete next[index]; return next; }); setDirty(true); };

  /* ── Shortlist ── */
  const toggleShortlist = (problem) => {
    setShortlist(prev =>
      prev.some(p => p.id === problem.id)
        ? prev.filter(p => p.id !== problem.id)
        : [...prev, problem]
    );
  };

  const addToShortlist = (problem) => {
    setShortlist(prev =>
      prev.some(p => p.id === problem.id) ? prev : [...prev, problem]
    );
  };

  /* ── Save ── */
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

  const doExport = (withSolutions) => {
    const tex = buildLatex(exam, slotDefs, slotMap, problemMap, withSolutions);
    downloadTex(tex, `${exam?.name || 'exam'}_${withSolutions ? 'solutions' : 'problems'}.tex`);
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

  return (
    <Layout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 3vh)', overflow: 'hidden' }}>

        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2">
          <div className="flex items-center gap-2">
            {/* Back */}
            <button onClick={() => navigate('/exams')} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex-shrink-0">
              <ArrowLeft size={14} />
            </button>

            {/* Title block */}
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold truncate leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {exam.name}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] leading-tight">
                <span>{exam.competition}</span>
                {exam.templateType && (
                  <><span className="text-[var(--color-text-faint)]">·</span><span>{TEMPLATE_LABELS[exam.templateType] || exam.templateType}</span></>
                )}
                <span className="text-[var(--color-text-faint)]">·</span>
                <span className="tabular-nums">{Object.keys(slotMap).length}/{slotDefs.length} filled</span>
                <span className="text-[var(--color-text-faint)]">·</span>
                <span>Edited {exam.updatedAt ? new Date(exam.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'unknown'}</span>
              </div>
            </div>

            {/* Action buttons — no icons, compact */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => { setShowPreview(true); setPreviewWithSolutions(false); }} className="btn-outline px-2.5 py-1 text-[11px] whitespace-nowrap">
                Preview
              </button>
              <button onClick={() => { setShowPreview(true); setPreviewWithSolutions(true); }} className="btn-outline px-2.5 py-1 text-[11px] whitespace-nowrap">
                Preview + Solutions
              </button>
              <button onClick={() => doExport(false)} className="btn-outline px-2.5 py-1 text-[11px] whitespace-nowrap">
                Download .tex
              </button>
              <button onClick={() => doExport(true)} className="btn-outline px-2.5 py-1 text-[11px] whitespace-nowrap">
                Download + Solutions
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

          {/* Banners */}
          {dupes.length > 0 && (
            <div className="mt-1.5 flex items-start gap-2 rounded-sm border border-[var(--badge-idea-border)] bg-[var(--badge-idea-bg)] px-3 py-1.5 text-[10px] text-[var(--badge-idea-text)]">
              <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
              <span>Duplicates in: {dupes.map((d) => `${d.examName} (${d.problems.join(', ')})`).join('; ')}</span>
            </div>
          )}
          {topicRestriction && (
            <div className="mt-1 text-[10px] text-[var(--color-text-faint)]">
              Topic restriction: {topicRestriction.join(', ')}. Bank is pre-filtered.
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
              <p className="section-label px-1 mb-2 uppercase tracking-widest text-[10px]">
                Exam Slots ({Object.keys(slotMap).length}/{slotDefs.length})
              </p>
              <div className="grid grid-cols-3 gap-1.5">
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
            {/* Bank filter bar — single row, dynamically shrinks */}
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

            {/* Bank list */}
            {bankProblems.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">No problems match the current filters.</div>
            ) : (
              bankProblems.map((p) => (
                <BankRow
                  key={p.id}
                  problem={p}
                  isUsed={usedIds.has(p.id)}
                  onPreview={setPreviewProblem}
                  onAddToShortlist={toggleShortlist}
                  isShortlisted={shortlistIds.has(p.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Preview overlay ───────────────────────────────── */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="surface-card shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)] z-10">
              <h2 className="font-bold text-sm">{exam.name} — {previewWithSolutions ? 'w/ Solutions' : 'Problems Only'}</h2>
              <button onClick={() => setShowPreview(false)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={15} /></button>
            </div>
            <div className="px-5">
              <LivePreview slotDefs={slotDefs} slotMap={slotMap} problemMap={problemMap} includeSolutions={previewWithSolutions} />
            </div>
          </div>
        </div>
      )}

      {/* ── Problem quick-view modal ──────────────────────── */}
      {previewProblem && <ProbModal problem={previewProblem} onClose={() => setPreviewProblem(null)} />}
    </Layout>
  );
};

export default ExamDetail;
