import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Plus, X, Search,
  Loader2, MessageSquare, Send, GripVertical,
  Eye, EyeOff, Check
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

// ── Slot definitions ──────────────────────────────────────────────────────────
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
  // Individual
  const qs = Array.from({ length: 10 }, (_, i) => ({ key: `Q${i+1}`, label: `Q${i+1}`, group: 'Questions' }));
  return [
    ...qs,
    { key: 'TB',   label: 'Tiebreak', group: 'Tiebreak'  },
    { key: 'ALT1', label: 'Alt 1',    group: 'Alternates' },
    { key: 'ALT2', label: 'Alt 2',    group: 'Alternates' },
    { key: 'ALT3', label: 'Alt 3',    group: 'Alternates' },
  ];
};

// Derive slot map from exam (use stored slots JSON, or fall back to problems array order)
const deriveSlotMap = (exam) => {
  if (exam.slots && typeof exam.slots === 'object' && Object.keys(exam.slots).length > 0)
    return exam.slots;
  const slots = buildSlots(exam.templateType);
  const map = {};
  (exam.problems || []).forEach((p, i) => { if (slots[i]) map[slots[i].key] = p.id; });
  return map;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fixLatex = (s) => {
  if (!s) return '';
  // Unescape double-backslashes only if no single backslashes exist
  if (!(/(?<!\\)\\(?!\\)/.test(s)) && s.includes('\\\\'))
    return s.replace(/\\\\/g, '\\');
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
    const p = slotMap[s.key] ? problemById[slotMap[s.key]] : null;
    const body = p ? `[${p.id}]\n${fixLatex(p.latex || '')}` : `[${s.label} — empty]`;
    return `\\item[${s.label.replace('Q', '')}${s.key.startsWith('Q') ? '.' : ''}] ${body}`;
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

// ── Small shared components ───────────────────────────────────────────────────
const StageBadge = ({ stage }) => {
  const c = stage === 'Endorsed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : stage === 'Published' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c}`}>{stage}</span>;
};
const Spin = () => <Loader2 size={14} className="animate-spin" />;

// ── Slot card — drop target ───────────────────────────────────────────────────
const SlotCard = ({ slot, problem, canEdit, onDrop, onRemove, onPreview, dragOver, onDragEnter, onDragLeave }) => {
  const handleDragOver = e => e.preventDefault();
  const handleDrop = e => {
    e.preventDefault();
    const pid      = e.dataTransfer.getData('problemId');
    const fromSlot = e.dataTransfer.getData('fromSlot') || null;
    if (pid) onDrop(slot.key, pid, fromSlot);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={() => onDragEnter(slot.key)}
      onDragLeave={onDragLeave}
      className={`rounded-xl border-2 transition-all flex flex-col min-h-[90px]
        ${dragOver === slot.key
          ? 'border-ucla-blue dark:border-[#FFD100] bg-blue-50/60 dark:bg-blue-900/20 scale-[1.01]'
          : problem
          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
          : 'border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20'
        }`}
    >
      {/* Header row */}
      <div className="px-3 pt-2 flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">{slot.label}</span>
        {problem && canEdit && (
          <button
            onClick={() => onRemove(slot.key)}
            className="ml-auto p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 transition"
            title="Remove"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Body */}
      {problem ? (
        <div
          className="flex-1 px-3 pb-2 pt-1 cursor-pointer"
          draggable={canEdit}
          onDragStart={e => {
            e.dataTransfer.setData('problemId', problem.id);
            e.dataTransfer.setData('fromSlot', slot.key);
          }}
          onClick={() => onPreview(problem)}
        >
          {/* ID + tags */}
          <div className="flex flex-wrap items-center gap-1 mb-1.5">
            <span className="font-mono text-xs font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
            {(problem.topics || []).slice(0,2).map(t => (
              <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{t}</span>
            ))}
            <StageBadge stage={problem.stage} />
            {canEdit && <GripVertical size={11} className="ml-auto text-slate-300" />}
          </div>
          {/* KaTeX inline preview — first ~120 chars */}
          {problem.latex && (
            <div className="text-[11px] leading-snug text-slate-600 dark:text-slate-300 line-clamp-3 pointer-events-none">
              <KatexRenderer latex={fixLatex((problem.latex || '').slice(0, 200))} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-2">
          <p className="text-[10px] text-slate-300 dark:text-slate-700 italic select-none">
            {canEdit ? 'drag here' : '—'}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Picker row — drag source ──────────────────────────────────────────────────
const PickerRow = ({ problem, assigned, onAdd }) => (
  <div
    className={`flex items-center gap-2 px-3 py-2 border-b border-slate-50 dark:border-slate-800 transition group
      ${assigned ? 'opacity-35' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing'}`}
    draggable={!assigned}
    onDragStart={e => {
      e.dataTransfer.setData('problemId', problem.id);
      e.dataTransfer.setData('fromSlot', '');
    }}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="font-mono text-[11px] font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
        {(problem.topics || []).map(t => (
          <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{t}</span>
        ))}
        <StageBadge stage={problem.stage} />
      </div>
      {problem.latex && (
        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 pointer-events-none leading-tight">
          <KatexRenderer latex={fixLatex((problem.latex || '').slice(0, 120))} />
        </div>
      )}
    </div>
    {!assigned && (
      <button
        onClick={() => onAdd(problem)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition flex-shrink-0"
        title="Add to first empty slot"
      >
        <Plus size={12} />
      </button>
    )}
  </div>
);

// ── Live exam preview ─────────────────────────────────────────────────────────
const ExamPreview = ({ slots, slotMap, problemById }) => {
  const groups = useMemo(() => {
    const g = {};
    slots.forEach(s => { if (!g[s.group]) g[s.group] = []; g[s.group].push(s); });
    return g;
  }, [slots]);

  return (
    <div className="space-y-5 text-sm">
      {Object.entries(groups).map(([gName, gSlots]) => (
        <div key={gName}>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{gName}</p>
          {gSlots.map((slot, si) => {
            const p = slotMap[slot.key] ? problemById[slotMap[slot.key]] : null;
            return (
              <div key={slot.key} className="flex gap-2 mb-4">
                <span className="w-10 flex-shrink-0 text-[10px] font-bold text-slate-400 pt-0.5 text-right">{slot.label}</span>
                <div className="flex-1 min-w-0 border-l-2 border-slate-100 dark:border-slate-800 pl-2.5">
                  {p ? (
                    <>
                      <span className="text-[8px] font-mono text-slate-300">{p.id}</span>
                      <div className="text-slate-700 dark:text-slate-200 leading-relaxed mt-0.5">
                        <KatexRenderer latex={fixLatex(p.latex || '')} />
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-300 dark:text-slate-700 italic">empty</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ── Comments panel ────────────────────────────────────────────────────────────
const CommentsPanel = ({ examId, currentUserId, isAdmin }) => {
  const [comments, setComments] = useState([]);
  const [body, setBody]         = useState('');
  const [posting, setPosting]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!examId) return;
    api.get(`/tests/${examId}/comments`).then(r => setComments(r.data)).catch(() => {});
  }, [examId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const post = async e => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const r = await api.post(`/tests/${examId}/comments`, { body });
      setComments(p => [...p, r.data]);
      setBody('');
    } catch {} finally { setPosting(false); }
  };
  const del = async cid => {
    try {
      await api.delete(`/tests/${examId}/comments/${cid}`);
      setComments(p => p.filter(c => c.id !== cid));
    } catch {}
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col" style={{ maxHeight: '45vh' }}>
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <MessageSquare size={13} className="text-slate-400" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Discussion</p>
        <span className="ml-auto text-[10px] text-slate-400">{comments.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {comments.length === 0
          ? <p className="text-center text-[11px] text-slate-400 py-4">No comments yet.</p>
          : comments.map(c => (
            <div key={c.id} className="flex gap-2 group">
              <div className="w-6 h-6 rounded-full bg-ucla-blue dark:bg-[#FFD100] flex items-center justify-center text-[9px] font-bold text-white dark:text-slate-900 flex-shrink-0">
                {c.user?.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{c.user?.firstName}</span>
                  <span className="text-[9px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
              {(c.user?.id === currentUserId || isAdmin) && (
                <button onClick={() => del(c.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition flex-shrink-0">
                  <X size={11} />
                </button>
              )}
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-2.5 border-t border-slate-100 dark:border-slate-800">
        <form onSubmit={post} className="flex gap-2">
          <textarea value={body} onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); post(e); } }}
            placeholder="Comment… (Enter to send)" rows={2}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-ucla-blue/20 resize-none transition" />
          <button type="submit" disabled={posting || !body.trim()}
            className="self-end px-2.5 py-2 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 font-bold hover:opacity-90 disabled:opacity-40 transition">
            {posting ? <Spin /> : <Send size={12} />}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Problem detail modal ──────────────────────────────────────────────────────
const ProblemModal = ({ problem, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
          <StageBadge stage={problem.stage} />
          {(problem.topics||[]).map(t=><span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{t}</span>)}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={15}/></button>
      </div>
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Problem</p>
        <div className="text-sm leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <KatexRenderer latex={fixLatex(problem.latex||'')} />
        </div>
      </div>
      {problem.solution && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Solution</p>
          <div className="text-sm leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <KatexRenderer latex={fixLatex(problem.solution||'')} />
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

// ── Main page ─────────────────────────────────────────────────────────────────
const ExamDetail = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [exam,           setExam]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [allProblems,    setAllProblems]    = useState([]);
  const [probLoading,    setProbLoading]    = useState(false);
  const [currentUser,    setCurrentUser]    = useState(null);
  const [error,          setError]          = useState('');
  const [slotMap,        setSlotMap]        = useState({});
  const [dragOver,       setDragOver]       = useState(null);
  const [saveState,      setSaveState]      = useState('idle'); // idle | saving | saved | error
  const [showPreview,    setShowPreview]    = useState(true);
  const [previewProblem, setPreviewProblem] = useState(null);
  const [search,         setSearch]         = useState('');
  const [topicFilter,    setTopicFilter]    = useState('all');
  const [stageFilter,    setStageFilter]    = useState('Endorsed');

  // Use a ref for the save timer to avoid stale closure issues
  const saveTimerRef = useRef(null);
  const slotsRef     = useRef([]);

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
      const derived = deriveSlotMap(r.data);
      setSlotMap(derived);
    } catch { setError('Failed to load exam.'); }
    finally { setLoading(false); }
  };

  const fetchProblems = async () => {
    setProbLoading(true);
    try { const r = await api.get('/problems'); setAllProblems(r.data); }
    catch {} finally { setProbLoading(false); }
  };

  const isAdmin = currentUser?.isAdmin || false;
  const canEdit = exam && (isAdmin || exam.authorId === currentUser?.id || exam.author?.id === currentUser?.id);
  const slots   = exam ? buildSlots(exam.templateType) : [];

  // Keep slotsRef current so the save callback always sees fresh slots
  useEffect(() => { slotsRef.current = slots; }, [slots]);

  const problemById = useMemo(() => {
    const m = {}; allProblems.forEach(p => { m[p.id] = p; }); return m;
  }, [allProblems]);

  const assignedIds = useMemo(() => new Set(Object.values(slotMap).filter(Boolean)), [slotMap]);

  // ── Persist slot map to backend via the correct endpoint ──
  const persistSlotMap = useCallback((map) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.put(`/tests/${id}/slots`, { slots: map });
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1500);
      } catch {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 3000);
      }
    }, 500);
  }, [id]);

  const handleDrop = useCallback((toKey, problemId, fromKey) => {
    setSlotMap(prev => {
      const next = { ...prev };
      // Swap if coming from another slot
      if (fromKey) {
        if (next[toKey]) next[fromKey] = next[toKey];
        else delete next[fromKey];
      }
      next[toKey] = problemId;
      persistSlotMap(next);
      return next;
    });
    setDragOver(null);
  }, [persistSlotMap]);

  const handleRemove = useCallback((slotKey) => {
    setSlotMap(prev => {
      const next = { ...prev };
      delete next[slotKey];
      persistSlotMap(next);
      return next;
    });
  }, [persistSlotMap]);

  const handleAddToFirst = useCallback((problem) => {
    const emptySlot = slotsRef.current.find(s => !slotMap[s.key]);
    if (emptySlot) handleDrop(emptySlot.key, problem.id, null);
  }, [slotMap, handleDrop]);

  const pickerProblems = useMemo(() => allProblems.filter(p => {
    if (p.stage === 'Archived') return false;
    if (topicFilter !== 'all' && !(p.topics||[]).includes(topicFilter)) return false;
    if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
    if (search && !p.id.toLowerCase().includes(search.toLowerCase()) &&
        !(p.latex||'').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allProblems, topicFilter, stageFilter, search]);

  const slotGroups = useMemo(() => {
    const g = {};
    slots.forEach(s => { if (!g[s.group]) g[s.group] = []; g[s.group].push(s); });
    return g;
  }, [slots]);

  const handleExport = () => {
    if (!exam) return;
    downloadLatex(`${(exam.name||'exam').replace(/\s+/g,'-').toLowerCase()}.tex`,
      generateLatex(exam, slotMap, problemById));
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">Loading…</div></Layout>;
  if (error || !exam) return (
    <Layout>
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <p className="text-red-500 mb-3">{error||'Exam not found.'}</p>
        <button onClick={() => navigate('/exams')} className="text-sm underline text-slate-500">← Back</button>
      </div>
    </Layout>
  );

  const filledCount = Object.values(slotMap).filter(Boolean).length;

  return (
    <Layout>
      <div className="max-w-[1700px] mx-auto px-4 pb-20">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 pt-4 mb-5">
          <button onClick={() => navigate('/exams')}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600 flex-shrink-0">
            <ArrowLeft size={16}/>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{exam.competition} · {exam.version}</p>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">{exam.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Save indicator */}
            <span className={`text-[10px] font-semibold transition ${
              saveState==='saving' ? 'text-slate-400' :
              saveState==='saved'  ? 'text-green-500' :
              saveState==='error'  ? 'text-red-500'   : 'text-slate-300'
            }`}>
              {saveState==='saving' ? 'Saving…' : saveState==='saved' ? '✓ Saved' : saveState==='error' ? 'Save failed' : `${filledCount}/${slots.length} filled`}
            </span>
            <button onClick={() => setShowPreview(v=>!v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              {showPreview ? <EyeOff size={13}/> : <Eye size={13}/>}
              {showPreview ? 'Hide preview' : 'Live preview'}
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Download size={13}/> Export .tex
            </button>
          </div>
        </div>

        {/* ── Three columns ── */}
        <div className="flex gap-4 items-start">

          {/* COL 1 — Problem bank */}
          <div className="w-64 flex-shrink-0 sticky top-4 space-y-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Problem Bank</p>
                <span className="ml-auto text-[9px] text-slate-400 italic">drag to slot</span>
              </div>
              <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800 space-y-1.5">
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                    className="w-full pl-6 pr-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-ucla-blue/20 transition"/>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['all',...TOPICS].map(t=>(
                    <button key={t} onClick={()=>setTopicFilter(t)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition ${topicFilter===t?'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900':'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
                      {t==='all'?'All':t.slice(0,4)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {['all','Endorsed','Published','Idea'].map(s=>(
                    <button key={s} onClick={()=>setStageFilter(s)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition ${stageFilter===s?'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900':'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
                      {s==='all'?'All':s.slice(0,4)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto" style={{maxHeight:'calc(100vh - 340px)'}}>
                {probLoading ? <div className="flex justify-center py-6"><Spin/></div>
                  : pickerProblems.length===0 ? <p className="text-center text-[11px] text-slate-400 py-6">No matches.</p>
                  : pickerProblems.map(p=>(
                    <PickerRow key={p.id} problem={p} assigned={assignedIds.has(p.id)} onAdd={handleAddToFirst}/>
                  ))
                }
              </div>
            </div>
            <CommentsPanel examId={exam.id} currentUserId={currentUser?.id} isAdmin={isAdmin}/>
          </div>

          {/* COL 2 — Slot board */}
          <div className="flex-1 min-w-0">
            {Object.entries(slotGroups).map(([groupName, groupSlots]) => (
              <div key={groupName} className="mb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{groupName}</p>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {groupSlots.map(slot => (
                    <SlotCard
                      key={slot.key}
                      slot={slot}
                      problem={slotMap[slot.key] ? problemById[slotMap[slot.key]] : null}
                      canEdit={canEdit}
                      onDrop={handleDrop}
                      onRemove={handleRemove}
                      onPreview={setPreviewProblem}
                      dragOver={dragOver}
                      onDragEnter={setDragOver}
                      onDragLeave={() => setDragOver(null)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* COL 3 — Live KaTeX preview */}
          {showPreview && (
            <div className="w-80 flex-shrink-0 sticky top-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Eye size={12} className="text-slate-400"/>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Live Preview</p>
                </div>
                <div className="overflow-y-auto p-4" style={{maxHeight:'calc(100vh - 160px)'}}>
                  <ExamPreview slots={slots} slotMap={slotMap} problemById={problemById}/>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {previewProblem && <ProblemModal problem={previewProblem} onClose={()=>setPreviewProblem(null)}/>}
    </Layout>
  );
};

export default ExamDetail;
