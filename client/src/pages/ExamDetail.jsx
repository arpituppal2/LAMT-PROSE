import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Plus, X, Search, AlertCircle,
  Loader2, MessageSquare, Send, GripVertical,
  ChevronDown, Eye, EyeOff, LayoutGrid
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

// ── Slot definitions per exam type ──────────────────────────────────────────
const buildSlots = (templateType) => {
  if (templateType === 'guts') {
    const slots = [];
    for (let set = 1; set <= 8; set++)
      for (let q = 1; q <= 4; q++)
        slots.push({ key: `G${set}-${q}`, label: `Set ${set} Q${q}`, group: `Set ${set}` });
    slots.push({ key: 'EST', label: 'Estimation', group: 'Tiebreak' });
    return slots;
  }
  if (templateType === 'shopping') {
    const slots = [];
    for (let r = 1; r <= 10; r++)
      for (let c = 1; c <= 3; c++)
        slots.push({ key: `S${r}-${c}`, label: `Row ${r} Col ${c}`, group: `Row ${r}` });
    slots.push({ key: 'EST', label: 'Estimation', group: 'Tiebreak' });
    return slots;
  }
  // Individual rounds
  const slots = Array.from({ length: 10 }, (_, i) => ({
    key: `Q${i + 1}`, label: `Q${i + 1}`, group: 'Questions'
  }));
  slots.push({ key: 'TB', label: 'Tiebreak', group: 'Tiebreak' });
  slots.push({ key: 'ALT1', label: 'Alt 1', group: 'Alternates' });
  slots.push({ key: 'ALT2', label: 'Alt 2', group: 'Alternates' });
  slots.push({ key: 'ALT3', label: 'Alt 3', group: 'Alternates' });
  return slots;
};

// slots list → { key: problemId } map stored as exam.slotMap
// If no slotMap exists yet, derive it from problems array (Q1=problems[0], etc.)
const deriveSlotMap = (exam) => {
  if (exam.slotMap && Object.keys(exam.slotMap).length > 0) return exam.slotMap;
  const slots = buildSlots(exam.templateType);
  const map = {};
  (exam.problems || []).forEach((p, i) => {
    if (slots[i]) map[slots[i].key] = p.id;
  });
  return map;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fixLatex = (s) => {
  if (!s) return '';
  const hasSingle = /(?<!\\)\\(?!\\)/.test(s);
  if (!hasSingle && s.includes('\\\\')) return s.replace(/\\\\/g, '\\');
  return s;
};

const downloadLatex = (filename, content) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

const generateLatex = (exam, slotMap, problemById) => {
  const slots = buildSlots(exam.templateType);
  const lines = slots.map(s => {
    const pid = slotMap[s.key];
    const p = pid ? problemById[pid] : null;
    const body = p ? `[${p.id}]\n${fixLatex(p.latex || '')}` : `[${s.label} — empty]`;
    const label = s.key.startsWith('Q') ? `${s.label}.` : s.label;
    return `\\item[${label}] ${body}`;
  }).join('\n\n');
  return `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb}
\\usepackage{enumitem}

\\begin{document}
\\begin{center}{\\Huge \\textbf{${exam.name || 'Exam'}}}\\end{center}
\\vspace{0.3in}
\\begin{enumerate}
${lines}
\\end{enumerate}
\\end{document}`;
};

// ── Sub-components ───────────────────────────────────────────────────────────
const StageBadge = ({ stage }) => {
  const c = stage === 'Endorsed'
    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : stage === 'Published'
    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c}`}>{stage}</span>;
};

const Spinner = () => <Loader2 size={15} className="animate-spin text-ucla-blue dark:text-[#FFD100]" />;

// Live KaTeX preview of the full exam
const ExamPreview = ({ slots, slotMap, problemById }) => {
  const groups = useMemo(() => {
    const g = {};
    slots.forEach(s => {
      if (!g[s.group]) g[s.group] = [];
      g[s.group].push(s);
    });
    return g;
  }, [slots]);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([groupName, groupSlots]) => (
        <div key={groupName}>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">{groupName}</p>
          <div className="space-y-5">
            {groupSlots.map((slot, si) => {
              const pid = slotMap[slot.key];
              const p = pid ? problemById[pid] : null;
              return (
                <div key={slot.key} className="flex gap-3">
                  <span className="w-12 flex-shrink-0 text-[11px] font-bold text-slate-400 pt-0.5 text-right tabular-nums">{slot.label}</span>
                  <div className="flex-1 min-w-0 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                    {p ? (
                      <div>
                        <span className="text-[9px] font-semibold text-slate-300 dark:text-slate-600 font-mono">{p.id}</span>
                        <div className="text-sm text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">
                          <KatexRenderer latex={fixLatex(p.latex || '')} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 dark:text-slate-700 italic">Empty slot</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// Individual slot card (drop target)
const SlotCard = ({ slot, problem, canEdit, onDrop, onRemove, onPreview, isDragOver }) => {
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    const pid = e.dataTransfer.getData('problemId');
    const fromSlot = e.dataTransfer.getData('fromSlot');
    if (pid) onDrop(slot.key, pid, fromSlot || null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 transition-all min-h-[72px] flex flex-col
        ${isDragOver
          ? 'border-ucla-blue dark:border-[#FFD100] bg-blue-50 dark:bg-blue-900/20'
          : problem
          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
          : 'border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
        }`}
    >
      {/* Slot label */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{slot.label}</span>
        {problem && canEdit && (
          <button
            onClick={() => onRemove(slot.key)}
            className="ml-auto p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 transition"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Content */}
      {problem ? (
        <div
          className="flex-1 px-3 pb-2 cursor-pointer group"
          onClick={() => onPreview(problem)}
          draggable={canEdit}
          onDragStart={(e) => {
            e.dataTransfer.setData('problemId', problem.id);
            e.dataTransfer.setData('fromSlot', slot.key);
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-mono text-xs font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
            {(problem.topics || []).slice(0, 2).map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{t}</span>
            ))}
            <StageBadge stage={problem.stage} />
          </div>
          {problem.latex && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug group-hover:text-slate-700 dark:group-hover:text-slate-300 transition">
              {(problem.latex || '').replace(/\$[^$]*\$/g, '[math]').slice(0, 100)}
            </p>
          )}
          {canEdit && (
            <div className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-40 transition">
              <GripVertical size={14} className="text-slate-400" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center pb-2">
          {canEdit
            ? <p className="text-[10px] text-slate-300 dark:text-slate-700 italic">Drag a problem here</p>
            : <p className="text-[10px] text-slate-300 dark:text-slate-700 italic">—</p>
          }
        </div>
      )}
    </div>
  );
};

// Picker row (drag source)
const PickerRow = ({ problem, inExam, onAdd }) => (
  <div
    className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 dark:border-slate-800 transition group
      ${inExam ? 'opacity-40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing'}`}
    draggable={!inExam}
    onDragStart={(e) => {
      e.dataTransfer.setData('problemId', problem.id);
      e.dataTransfer.setData('fromSlot', '');
    }}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
        {(problem.topics || []).map(t => (
          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{t}</span>
        ))}
        {problem.quality && <span className="text-[10px] text-slate-400 ml-auto">{problem.quality}/10</span>}
        <StageBadge stage={problem.stage} />
      </div>
      {problem.latex && (
        <p className="text-[10px] text-slate-400 truncate mt-0.5">
          {(problem.latex || '').replace(/\$[^$]*\$/g, '[math]').slice(0, 80)}
        </p>
      )}
    </div>
    {!inExam && (
      <button
        onClick={() => onAdd(problem)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition opacity-0 group-hover:opacity-100"
        title="Add to first empty slot"
      >
        <Plus size={13} />
      </button>
    )}
  </div>
);

// Comments panel
const CommentsPanel = ({ examId, currentUserId, isAdmin }) => {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!examId) return;
    api.get(`/tests/${examId}/comments`).then(r => setComments(r.data)).catch(() => {});
  }, [examId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const r = await api.post(`/tests/${examId}/comments`, { body });
      setComments(p => [...p, r.data]);
      setBody('');
    } catch {} finally { setPosting(false); }
  };
  const handleDelete = async (cid) => {
    try {
      await api.delete(`/tests/${examId}/comments/${cid}`);
      setComments(p => p.filter(c => c.id !== cid));
    } catch {}
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col" style={{ maxHeight: '50vh' }}>
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <MessageSquare size={14} className="text-slate-400" />
        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Discussion</h3>
        <span className="ml-auto text-[11px] text-slate-400">{comments.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {comments.length === 0
          ? <p className="text-center text-slate-400 text-xs py-4">No comments yet.</p>
          : comments.map(c => (
            <div key={c.id} className="flex gap-2 group">
              <div className="w-6 h-6 rounded-full bg-ucla-blue dark:bg-[#FFD100] flex items-center justify-center text-[9px] font-bold text-white dark:text-slate-900 flex-shrink-0">
                {c.user?.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.user?.firstName}</span>
                  <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
              {(c.user?.id === currentUserId || isAdmin) && (
                <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition flex-shrink-0">
                  <X size={11} />
                </button>
              )}
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <form onSubmit={handlePost} className="flex gap-2">
          <textarea value={body} onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(e); } }}
            placeholder="Add a comment… (Enter to send)" rows={2}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-ucla-blue/20 resize-none transition" />
          <button type="submit" disabled={posting || !body.trim()}
            className="self-end px-3 py-2 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 disabled:opacity-40 transition">
            {posting ? <Spinner /> : <Send size={13} />}
          </button>
        </form>
      </div>
    </div>
  );
};

// Problem detail modal
const ProblemModal = ({ problem, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
          <StageBadge stage={problem.stage} />
          {(problem.topics || []).map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">{t}</span>)}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={15} /></button>
      </div>
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Problem</p>
        <div className="text-sm leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <KatexRenderer latex={fixLatex(problem.latex || '')} />
        </div>
      </div>
      {problem.solution && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Solution</p>
          <div className="text-sm leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <KatexRenderer latex={fixLatex(problem.solution || '')} />
          </div>
        </div>
      )}
      {problem.answer && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
          <span className="text-[10px] font-semibold text-green-600 uppercase">Answer</span>
          <span className="text-sm font-bold text-green-700 dark:text-green-400">{problem.answer}</span>
        </div>
      )}
    </div>
  </div>
);

// ── Main Page ────────────────────────────────────────────────────────────────
const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allProblems, setAllProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [slotMap, setSlotMap] = useState({});  // { slotKey: problemId }
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // UI
  const [showPicker, setShowPicker] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [previewProblem, setPreviewProblem] = useState(null);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('Endorsed');
  const [saveTimer, setSaveTimer] = useState(null);

  useEffect(() => {
    api.get('/auth/me').then(r => setCurrentUser(r.data.user)).catch(() => {});
    fetchExam();
    fetchProblems();
  }, [id]);

  const fetchExam = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/tests/${id}`);
      setExam(r.data);
      setSlotMap(deriveSlotMap(r.data));
    } catch { setError('Failed to load exam.'); }
    finally { setLoading(false); }
  };

  const fetchProblems = async () => {
    setProblemsLoading(true);
    try {
      const r = await api.get('/problems');
      setAllProblems(r.data);
    } catch {} finally { setProblemsLoading(false); }
  };

  const isAdmin = currentUser?.isAdmin || false;
  const canEdit = exam && (isAdmin || exam.authorId === currentUser?.id || exam.author?.id === currentUser?.id);
  const slots = exam ? buildSlots(exam.templateType) : [];

  const problemById = useMemo(() => {
    const m = {};
    allProblems.forEach(p => { m[p.id] = p; });
    return m;
  }, [allProblems]);

  const assignedIds = useMemo(() => new Set(Object.values(slotMap).filter(Boolean)), [slotMap]);

  // Debounced save to backend
  const persistSlotMap = (map) => {
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(async () => {
      try {
        const ordered = slots.map(s => map[s.key]).filter(Boolean);
        const unique = [...new Map(ordered.map(id => [id, id])).values()];
        await api.put(`/tests/${id}`, {
          problemIds: unique,
          slotMap: map,
        });
      } catch {}
    }, 600);
    setSaveTimer(t);
  };

  const handleDrop = (toSlotKey, problemId, fromSlotKey) => {
    setSlotMap(prev => {
      const next = { ...prev };
      // If dragged from another slot, clear the source
      if (fromSlotKey) delete next[fromSlotKey];
      // If target already has a problem and we came from a slot, swap
      if (fromSlotKey && next[toSlotKey]) {
        next[fromSlotKey] = next[toSlotKey];
      }
      next[toSlotKey] = problemId;
      persistSlotMap(next);
      return next;
    });
    setDragOverSlot(null);
  };

  const handleRemoveFromSlot = (slotKey) => {
    setSlotMap(prev => {
      const next = { ...prev };
      delete next[slotKey];
      persistSlotMap(next);
      return next;
    });
  };

  const handleAddToFirstEmpty = (problem) => {
    const emptySlot = slots.find(s => !slotMap[s.key]);
    if (!emptySlot) return;
    handleDrop(emptySlot.key, problem.id, null);
  };

  const pickerProblems = useMemo(() => {
    return allProblems.filter(p => {
      if (p.stage === 'Archived') return false;
      if (topicFilter !== 'all' && !(p.topics || []).includes(topicFilter)) return false;
      if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
      if (search && !p.id.toLowerCase().includes(search.toLowerCase()) &&
        !(p.latex || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allProblems, topicFilter, stageFilter, search]);

  const handleExport = () => {
    if (!exam) return;
    const latex = generateLatex(exam, slotMap, problemById);
    const slug = (exam.name || 'exam').replace(/\s+/g, '-').toLowerCase();
    downloadLatex(`${slug}.tex`, latex);
  };

  // Group slots for rendering
  const slotGroups = useMemo(() => {
    const g = {};
    slots.forEach(s => {
      if (!g[s.group]) g[s.group] = [];
      g[s.group].push(s);
    });
    return g;
  }, [slots]);

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">Loading exam…</div></Layout>;
  if (error || !exam) return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <p className="text-red-500 mb-4">{error || 'Exam not found.'}</p>
        <button onClick={() => navigate('/exams')} className="text-sm text-slate-500 hover:text-slate-700 underline">← Back to Exams</button>
      </div>
    </Layout>
  );

  const filledCount = Object.values(slotMap).filter(Boolean).length;

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 pb-20">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 pt-4 mb-6">
          <button onClick={() => navigate('/exams')}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600 flex-shrink-0">
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{exam.competition} · {exam.version}</p>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{exam.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-slate-400">{filledCount}/{slots.length} slots filled</span>
            <button onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? 'Hide Preview' : 'Live Preview'}
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Download size={13} /> Export .tex
            </button>
          </div>
        </div>

        {/* ── Three-column layout ── */}
        <div className="flex gap-4 items-start">

          {/* COL 1: Problem picker */}
          <div className="w-72 flex-shrink-0 sticky top-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Problem Bank</p>
                <span className="ml-auto text-[10px] text-slate-400 italic">Drag → slot</span>
              </div>
              {/* Filters */}
              <div className="px-3 py-2.5 border-b border-slate-50 dark:border-slate-800 space-y-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search ID or text…"
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] outline-none focus:ring-1 focus:ring-ucla-blue/20 transition" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {['all', ...TOPICS].map(t => (
                    <button key={t} onClick={() => setTopicFilter(t)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition ${topicFilter === t ? 'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                      {t === 'all' ? 'All' : t.slice(0, 5)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {['all', 'Endorsed', 'Published', 'Idea'].map(s => (
                    <button key={s} onClick={() => setStageFilter(s)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition ${stageFilter === s ? 'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                      {s === 'all' ? 'All' : s.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                {problemsLoading
                  ? <div className="flex items-center justify-center py-8"><Spinner /></div>
                  : pickerProblems.length === 0
                  ? <p className="text-center text-[11px] text-slate-400 py-8">No problems match.</p>
                  : pickerProblems.map(p => (
                    <PickerRow
                      key={p.id}
                      problem={p}
                      inExam={assignedIds.has(p.id)}
                      onAdd={handleAddToFirstEmpty}
                    />
                  ))
                }
              </div>
            </div>

            {/* Comments below picker */}
            <div className="mt-4">
              <CommentsPanel examId={exam.id} currentUserId={currentUser?.id} isAdmin={isAdmin} />
            </div>
          </div>

          {/* COL 2: Slot board */}
          <div className="flex-1 min-w-0">
            {Object.entries(slotGroups).map(([groupName, groupSlots]) => (
              <div key={groupName} className="mb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{groupName}</p>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {groupSlots.map(slot => {
                    const pid = slotMap[slot.key];
                    const problem = pid ? problemById[pid] : null;
                    return (
                      <SlotCard
                        key={slot.key}
                        slot={slot}
                        problem={problem}
                        canEdit={canEdit}
                        onDrop={handleDrop}
                        onRemove={handleRemoveFromSlot}
                        onPreview={setPreviewProblem}
                        isDragOver={dragOverSlot === slot.key}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* COL 3: Live KaTeX preview */}
          {showPreview && (
            <div className="w-96 flex-shrink-0 sticky top-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Eye size={13} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Live Preview</p>
                  <span className="ml-auto text-[10px] text-slate-400">Rendered LaTeX</span>
                </div>
                <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                  <ExamPreview slots={slots} slotMap={slotMap} problemById={problemById} />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {previewProblem && <ProblemModal problem={previewProblem} onClose={() => setPreviewProblem(null)} />}
    </Layout>
  );
};

export default ExamDetail;
