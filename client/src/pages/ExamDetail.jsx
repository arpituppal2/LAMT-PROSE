import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp, Copy, Download, Eye,
  GripVertical, Loader2, MessageSquare, Plus, Save, Search,
  Trash2, X, AlertTriangle, FileText,
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
      else if (typeof s === 'string') map[i] = { problemId: s };
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

/* ── LaTeX helpers ──────────────────────────────────────────── */
const stripLatex = (str = '') =>
  str.replace(/\$\$[\s\S]*?\$\$/g, '[…]').replace(/\$[^$]*?\$/g, (m) => m.slice(1, -1))
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1').replace(/[\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);

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

/* ── Components ─────────────────────────────────────────────── */
const StageChip = ({ stage }) => {
  const cfg = STAGE_CFG[stage] || STAGE_CFG.Idea;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-semibold ${cfg.rail}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {stage}
    </span>
  );
};

/* ── SlotCard ───────────────────────────────────────────────── */
const SlotCard = ({ slot, index, entry, problem, onRemove, onDrop, onPreview }) => {
  const [over, setOver] = useState(false);

  return (
    <div
      className={[
        'surface-card px-2.5 py-2 flex flex-col gap-1 transition-all border',
        over ? 'border-[var(--ucla-blue)] bg-[var(--color-accent)]/5' : '',
        slot.slotType === 'estimation' ? 'border-l-2 border-l-[var(--ucla-gold)]' : '',
      ].join(' ')}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('problemId'); if (id) onDrop(index, id); }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{slot.label}</span>
        {problem && (
          <button onClick={() => onRemove(index)} className="p-0.5 text-[var(--color-text-faint)] hover:text-[var(--badge-needs-review-text)] transition-colors">
            <X size={11} />
          </button>
        )}
      </div>

      {problem ? (
        <div className="space-y-0.5">
          <button onClick={() => onPreview(problem)} className="text-left w-full group">
            <span className="font-mono text-[10px] font-semibold text-[var(--color-accent)] group-hover:underline">{problem.id}</span>
          </button>
          <div className="flex items-center gap-1 flex-wrap">
            {(problem.topics || []).map((t) => (
              <span key={t} className="text-[8px] font-medium px-1 py-0.5 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">{t}</span>
            ))}
            <span className="text-[8px] tabular-nums font-semibold text-[var(--color-text-faint)] ml-auto">{problem.quality || '?'}/10</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 text-[10px] text-[var(--color-text-faint)] italic">
          Drop here
        </div>
      )}
    </div>
  );
};

/* ── BankRow ────────────────────────────────────────────────── */
const BankRow = ({ problem, isUsed, onPreview }) => {
  const status = problem._displayStatus || getProblemStatus(problem, problem.feedbacks);
  const isGuts = problem.id && /^GU/.test(problem.id);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('problemId', problem.id)}
      className={[
        'px-4 py-2 border-b border-[var(--color-border)] cursor-grab active:cursor-grabbing transition-colors',
        isUsed ? 'opacity-40' : 'hover:bg-[var(--color-surface)]',
      ].join(' ')}
    >
      {/* Row 1: ID (+ set# for guts) · stage · topics · difficulty */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <GripVertical size={12} className="flex-shrink-0 text-[var(--color-text-faint)]" />
        <button onClick={() => onPreview(problem)} className="font-mono text-[11px] font-semibold text-[var(--color-accent)] hover:underline leading-none">
          {problem.id}
        </button>
        {isGuts && problem.setNumber && (
          <span className="text-[9px] font-bold text-[var(--color-text-faint)] tabular-nums">(Set {problem.setNumber})</span>
        )}
        <StageChip stage={status} />
        {(problem.topics || []).map((t) => (
          <span key={t} className="text-[9px] font-medium px-1 py-0.5 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">{t}</span>
        ))}
        <span className="ml-auto text-[10px] tabular-nums font-semibold text-[var(--color-text-faint)]">{problem.quality || '?'}/10</span>
        {isUsed && <span className="text-[9px] font-semibold text-[var(--color-accent)]">✓</span>}
      </div>
      {/* Row 2: 1-line KaTeX preview */}
      <div className="mt-0.5 ml-5 text-[11px] text-[var(--color-text-muted)] leading-snug line-clamp-1">
        <KatexRenderer latex={(problem.latex || '').slice(0, 220)} />
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
              <button onClick={() => setShowSol((s) => !s)} className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] transition-colors text-sm font-semibold text-[var(--color-accent)]">
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

/* ── Discussion panel ───────────────────────────────────────── */
const Discussion = ({ examId, comments, setComments }) => {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/tests/${examId}/comments`, { body });
      setComments((prev) => [...prev, res.data]);
      setBody('');
    } catch { /* ignore */ }
    setLoading(false);
  };

  const remove = async (commentId) => {
    try {
      await api.delete(`/tests/${examId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-3">
      <p className="section-label">Discussion</p>
      {comments.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)] italic">No comments yet.</p>
      )}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="surface-card px-3 py-2.5 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{c.user?.firstName} {c.user?.lastName}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-text-muted)]">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                <button onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-faint)] hover:text-[var(--badge-needs-review-text)]">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Add a comment…"
          className="input-base flex-1 text-sm"
        />
        <button onClick={submit} disabled={loading || !body.trim()} className="btn-filled px-3 py-1.5 text-xs disabled:opacity-50">
          Post
        </button>
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
   EXAM DETAIL  — main component
══════════════════════════════════════════════════════════════ */
const ExamDetail = () => {
  const { id: examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam]                 = useState(null);
  const [problems, setProblems]         = useState([]);
  const [slotMap, setSlotMap]           = useState({});
  const [comments, setComments]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [dirty, setDirty]               = useState(false);
  const [previewProblem, setPreviewProblem] = useState(null);
  const [showPreview, setShowPreview]   = useState(false);
  const [previewWithSolutions, setPreviewWithSolutions] = useState(false);

  /* ── Filters ── */
  const [bankSearch, setBankSearch]       = useState('');
  const [bankTopic, setBankTopic]         = useState('');
  const [bankStage, setBankStage]         = useState('');
  const [bankDiffMin, setBankDiffMin]     = useState(1);
  const [bankDiffMax, setBankDiffMax]     = useState(10);

  /* ── Split locked at 25%/75% ── */
  const containerRef = useRef(null);

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
    Object.values(slotMap).forEach((e) => {
      if (e.problemId) set.add(e.problemId);
    });
    return set;
  }, [slotMap]);

  const dupes = useDuplicates(examId, slotMap);

  const bankProblems = useMemo(() => {
    let list = problems.filter((p) => p.stage !== 'Archived');

    if (topicRestriction) list = list.filter((p) => (p.topics || []).some((t) => topicRestriction.includes(t)));
    if (bankSearch) list = list.filter((p) => `${p.id} ${p.latex || ''} ${(p.topics || []).join(' ')}`.toLowerCase().includes(bankSearch.toLowerCase()));
    if (bankTopic) list = list.filter((p) => (p.topics || []).includes(bankTopic));
    if (bankStage) list = list.filter((p) => (p._displayStatus || getProblemStatus(p, p.feedbacks)) === bankStage);
    list = list.filter((p) => {
      const d = parseInt(p.quality) || 5;
      return d >= bankDiffMin && d <= bankDiffMax;
    });
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
        setComments(examRes.data.comments || []);
      } catch {
        console.error('Failed to load exam');
      }
      setLoading(false);
    };
    load();
  }, [examId]);

  /* ── Slot actions ── */
  const assignSlot = (index, problemId) => {
    setSlotMap((prev) => ({ ...prev, [index]: { problemId } }));
    setDirty(true);
  };

  const removeSlot = (index) => {
    setSlotMap((prev) => { const next = { ...prev }; delete next[index]; return next; });
    setDirty(true);
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

  /* ── Export helpers ── */
  const doExport = (withSolutions) => {
    const tex = buildLatex(exam, slotDefs, slotMap, problemMap, withSolutions);
    const suffix = withSolutions ? 'solutions' : 'problems';
    downloadTex(tex, `${exam?.name || 'exam'}_${suffix}.tex`);
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

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-56px)] -m-5 md:-m-7">

        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate('/exams')} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>
                {exam.name}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                <span>{exam.competition}</span>
                {exam.templateType && (
                  <>
                    <span className="text-[var(--color-text-faint)]">·</span>
                    <span className="font-medium">{TEMPLATE_LABELS[exam.templateType] || exam.templateType}</span>
                  </>
                )}
                <span className="text-[var(--color-text-faint)]">·</span>
                <span className="tabular-nums">{Object.keys(slotMap).length}/{slotDefs.length} filled</span>
                <span className="text-[var(--color-text-faint)]">·</span>
                <span>Edited {exam.updatedAt ? new Date(exam.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'unknown'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => { setShowPreview(true); setPreviewWithSolutions(false); }} className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5">
                <Eye size={13} /> Preview
              </button>
              <button onClick={() => { setShowPreview(true); setPreviewWithSolutions(true); }} className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5">
                <Eye size={13} /> Preview + Solutions
              </button>
              <button onClick={() => doExport(false)} className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5">
                <Download size={13} /> Download .tex
              </button>
              <button onClick={() => doExport(true)} className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5">
                <Download size={13} /> Download + Solutions
              </button>
              <button onClick={handleSave} disabled={!dirty || saving} className="btn-filled px-4 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
              </button>
            </div>
          </div>

          {/* Warning banners */}
          {dupes.length > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-sm border border-[var(--badge-idea-border)] bg-[var(--badge-idea-bg)] px-3 py-2 text-xs text-[var(--badge-idea-text)]">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                Duplicate problems found in other exams:{' '}
                {dupes.map((d) => `${d.examName} (${d.problems.join(', ')})`).join('; ')}
              </span>
            </div>
          )}
          {topicRestriction && (
            <div className="mt-2 text-[10px] text-[var(--color-text-faint)]">
              Topic restriction: {topicRestriction.join(', ')}. Bank is pre-filtered.
            </div>
          )}
        </div>

        {/* ── Body: locked 25/75 split ───────────────────── */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden">

          {/* LEFT: Slot grid (25%) */}
          <div className="overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg)]" style={{ width: '25%' }}>
            <div className="p-3">
              <p className="section-label px-1 mb-2">Exam slots ({Object.keys(slotMap).length}/{slotDefs.length})</p>
              <div className="grid grid-cols-3 gap-2">
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
          </div>

          {/* RIGHT: Problem bank (75%) */}
          <div className="overflow-y-auto bg-[var(--color-bg)] flex-1">
            {/* Bank filter bar */}
            <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative flex-1 min-w-[160px]">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
                  <input
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Search bank"
                    className="input-base w-full pl-7 py-1.5 text-xs"
                  />
                </label>
                <select value={bankTopic} onChange={(e) => setBankTopic(e.target.value)} className="input-base py-1.5 text-xs">
                  <option value="">All topics</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={bankStage} onChange={(e) => setBankStage(e.target.value)} className="input-base py-1.5 text-xs">
                  <option value="">All stages</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <span>Diff</span>
                  <input type="number" min={1} max={10} value={bankDiffMin} onChange={(e) => setBankDiffMin(+e.target.value)} className="input-base w-10 py-1 px-1 text-center text-xs" />
                  <span>–</span>
                  <input type="number" min={1} max={10} value={bankDiffMax} onChange={(e) => setBankDiffMax(+e.target.value)} className="input-base w-10 py-1 px-1 text-center text-xs" />
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums ml-auto">{bankProblems.length} problems</span>
              </div>
            </div>

            {/* Bank list */}
            {bankProblems.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">
                No problems match the current filters.
              </div>
            ) : (
              bankProblems.map((p) => (
                <BankRow key={p.id} problem={p} isUsed={usedIds.has(p.id)} onPreview={setPreviewProblem} />
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
