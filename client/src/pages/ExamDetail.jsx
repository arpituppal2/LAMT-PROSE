import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, Trash2, GripVertical, Eye, EyeOff,
  ArrowLeft, Copy, Check, X, ChevronDown, ChevronUp,
  AlertCircle, Loader2, MessageSquare, Send, Download,
  AlertTriangle, ClipboardCheck
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const topicAbbr = t => ({ Algebra:'A', Geometry:'G', Combinatorics:'C', 'Number Theory':'N' }[t] ?? t[0]);

const STAGE_COLORS = {
  Idea:          { pill:'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800', dot:'bg-yellow-400', bar:'border-l-yellow-400' },
  Review:        { pill:'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', dot:'bg-blue-400', bar:'border-l-blue-400' },
  Endorsed:      { pill:'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', dot:'bg-amber-400', bar:'border-l-amber-400' },
  'Needs Review':{ pill:'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800', dot:'bg-red-400', bar:'border-l-red-400' },
  Archived:      { pill:'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700', dot:'bg-slate-400', bar:'border-l-slate-400' },
};

const stagePill = (stage) => {
  const s = STAGE_COLORS[stage] ?? STAGE_COLORS.Idea;
  return `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.pill}`;
};

const diffBadge = q => {
  const n = parseInt(q) || 0;
  if (n >= 8) return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
  if (n >= 5) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
};

// LaTeX helpers (mirrored from ExamManager for the Export button)
const escLaTeX = s => (s || '').replace(/[&%$#_{}~^\\]/g, c => `\\${c}`);
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

/* ── Sortable slot ────────────────────────────────────────────────────────── */
function SortableSlot({ slot, idx, onRemove, canEdit, showAnswer, reviewMode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slot.slotId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const p = slot.problem;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      ref={setNodeRef} style={style}
      className={`group flex items-start gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800
        hover:bg-slate-50 dark:hover:bg-slate-800/50 last:border-0
        border-l-2 ${p ? (STAGE_COLORS[p.stage]?.bar ?? 'border-l-transparent') : 'border-l-slate-200 dark:border-l-slate-700'}`}
    >
      {canEdit && (
        <button {...attributes} {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
      )}
      <span className="w-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums flex-shrink-0 mt-0.5">{idx + 1}.</span>
      {p ? (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="font-mono text-[10px] font-bold text-[#2774AE] dark:text-[#FFD100]">{p.id}</span>
            <span className={stagePill(p.stage)}>{p.stage}</span>
            {p.quality && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border tabular-nums ${diffBadge(p.quality)}`}>
                {p.quality}/10
              </span>
            )}
            {(p.topics || []).map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{topicAbbr(t)}</span>
            ))}
            {p.latex && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="ml-1 text-[9px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] hover:border-[#2774AE] dark:hover:border-[#FFD100] transition-colors"
              >
                {expanded ? 'collapse' : 'expand'}
              </button>
            )}
          </div>
          {/* Review mode: full KaTeX rendering */}
          {reviewMode ? (
            <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              <KatexRenderer latex={p.latex || ''} />
              {showAnswer && p.answer && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400">
                  Answer: <KatexRenderer latex={p.answer} />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                <KatexRenderer latex={expanded ? (p.latex || '') : (p.latex || '').slice(0, 180)} />
              </div>
              {showAnswer && p.answer && (
                <div className="mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Ans: <KatexRenderer latex={p.answer} />
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Empty slot</span>
      )}
      {canEdit && (
        <button
          onClick={() => onRemove(slot.slotId)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all rounded"
          title="Remove from exam"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/* ── Bank card ────────────────────────────────────────────────────────────── */
function BankCard({ problem, onAdd, canEdit, isInExam }) {
  const p = problem;
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`group px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0
        hover:bg-white dark:hover:bg-slate-800/80 transition-colors
        border-l-2 ${STAGE_COLORS[p.stage]?.bar ?? 'border-l-transparent'}
        ${isInExam ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="font-mono text-[10px] font-bold text-[#2774AE] dark:text-[#FFD100]">{p.id}</span>
            <span className={stagePill(p.stage)}>{p.stage}</span>
            {p.quality && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border tabular-nums ${diffBadge(p.quality)}`}>
                {p.quality}/10
              </span>
            )}
            {(p.topics || []).map(t => (
              <span key={t} className="text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">{topicAbbr(t)}</span>
            ))}
            {p.latex && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-[9px] px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors"
              >
                {expanded ? '▲' : '▼'}
              </button>
            )}
          </div>
          <div className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            <KatexRenderer latex={expanded ? (p.latex || '') : (p.latex || '').slice(0, 100)} />
          </div>
        </div>
        {canEdit && !isInExam && (
          <button
            onClick={() => onAdd(p)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-[#001628] hover:scale-110 transition-all"
            title="Add to exam"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Discussion panel ─────────────────────────────────────────────────────── */
const CommentsPanel = ({ examId, currentUserId, isAdmin }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    api.get(`/tests/${examId}/comments`)
      .then(r => setComments(r.data))
      .catch(() => setError('Failed to load comments.'))
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true); setError('');
    try {
      const res = await api.post(`/tests/${examId}/comments`, { body });
      setComments(prev => [...prev, res.data]);
      setBody('');
    } catch { setError('Failed to post comment.'); }
    finally { setPosting(false); }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/tests/${examId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { setError('Failed to delete comment.'); }
  };

  return (
    <div className="flex flex-col border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" style={{ minHeight: 200 }}>
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-shrink-0">
        <MessageSquare size={13} className="text-slate-400" />
        <h3 className="font-semibold text-xs text-slate-600 dark:text-slate-300">Discussion</h3>
        <span className="ml-auto text-[10px] text-slate-400">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 280 }}>
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
        ) : comments.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-6">No comments yet. Start the discussion.</p>
        ) : comments.map(c => (
          <div key={c.id} className="flex gap-2.5 group">
            <div className="w-6 h-6 rounded-full bg-[#2774AE] dark:bg-[#FFD100] flex items-center justify-center text-[9px] font-bold text-white dark:text-slate-900 flex-shrink-0">
              {c.user?.initials ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.user?.firstName} {c.user?.lastName}</span>
                <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
            </div>
            {(c.user?.id === currentUserId || isAdmin) && (
              <button onClick={() => handleDelete(c.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 transition flex-shrink-0">
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        {error && <p className="text-[10px] text-red-500 mb-1">{error}</p>}
        <form onSubmit={handlePost} className="flex gap-2">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(e); } }}
            placeholder="Add a comment… (Enter to send)"
            rows={2}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#2774AE]/20 dark:focus:ring-[#FFD100]/20 transition resize-none"
          />
          <button type="submit" disabled={posting || !body.trim()}
            className="self-end p-2 rounded-lg bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 transition">
            {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   ExamDetail
══════════════════════════════════════════════════════════════════════════════ */
const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bank, setBank] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMsg] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankStage, setBankStage] = useState('Endorsed');
  const [activeId, setActiveId] = useState(null);
  const [autoTopics, setAutoTopics] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [copyDone, setCopyDone] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    api.get('/auth/me').then(r => setCurrentUser(r.data.user)).catch(() => {});
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [examRes, bankRes] = await Promise.all([
        api.get(`/tests/${id}`),
        api.get('/problems'),
      ]);
      const e = examRes.data;
      setExam(e);
      setCanEdit(e.canEdit ?? false);
      const builtSlots = (e.problems || []).map((p, i) => ({
        slotId: `slot-${p.id}-${i}`,
        problem: p,
        section: p.section ?? null,
      }));
      setSlots(builtSlots);
      setBank(bankRes.data || []);
      if (e.topics?.length) setAutoTopics(e.topics);
    } catch (err) {
      console.error('fetchAll error:', err);
      setMsg('Failed to load exam.');
    } finally {
      setLoading(false);
    }
  };

  /* ── slot mutations ──────────────────────────────────────────────────────── */
  const addToSlot = useCallback((problem) => {
    setSlots(prev => {
      const emptyIdx = prev.findIndex(s => !s.problem);
      if (emptyIdx === -1) return [...prev, { slotId: `slot-${Date.now()}`, problem, section: null }];
      return prev.map((s, i) => i === emptyIdx ? { ...s, problem } : s);
    });
  }, []);

  const removeFromSlot = useCallback((slotId) => {
    setSlots(prev => prev.filter(s => s.slotId !== slotId));
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setSlots(prev => {
      const oldIdx = prev.findIndex(s => s.slotId === active.id);
      const newIdx = prev.findIndex(s => s.slotId === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, []);

  /* ── persist ─────────────────────────────────────────────────────────────── */
  const saveExam = async () => {
    setSaving(true);
    try {
      const problemIds = slots.filter(s => s.problem).map(s => s.problem.id);
      await api.put(`/tests/${id}`, { problemIds });
      setMsg('Saved!');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      console.error('saveExam error:', err);
      setMsg('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  /* ── copy LaTeX ──────────────────────────────────────────────────────────── */
  const copyLatex = async () => {
    const text = slots
      .filter(s => s.problem)
      .map((s, i) => `\\item[${i+1}.] ${s.problem.latex || s.problem.id}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 1500);
  };

  /* ── bank filter ─────────────────────────────────────────────────────────── */
  const examProblemIds = new Set(slots.filter(s => s.problem).map(s => s.problem.id));
  const filteredBank = bank.filter(p => {
    if (p.stage === 'Archived') return false;
    if (bankStage !== 'all' && p.stage !== bankStage) return false;
    const matchSearch = !bankSearch ||
      p.id.toLowerCase().includes(bankSearch.toLowerCase()) ||
      (p.latex || '').toLowerCase().includes(bankSearch.toLowerCase());
    const matchTopic = !autoTopics || (p.topics || []).some(t => autoTopics.includes(t));
    return matchSearch && matchTopic;
  });

  /* ── sections ────────────────────────────────────────────────────────────── */
  const sections = exam?.sections ?? [];
  const toggleSection = (name) =>
    setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }));

  /* ── stats ───────────────────────────────────────────────────────────────── */
  const filledSlots = slots.filter(s => s.problem);
  const topicCounts = {};
  filledSlots.forEach(s => (s.problem.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
  const dominantTopic = Object.entries(topicCounts).find(([, c]) => c / Math.max(filledSlots.length, 1) > 0.4)?.[0];

  /* ── loading ─────────────────────────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading exam…
      </div>
    </Layout>
  );

  if (!exam) return (
    <Layout>
      <div className="text-center py-20">
        <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
        <p className="text-slate-500">Exam not found.</p>
        <button onClick={() => navigate('/exams')} className="mt-4 text-[#2774AE] hover:underline text-sm flex items-center gap-1 mx-auto">
          <ArrowLeft size={14} /> Back to Exams
        </button>
      </div>
    </Layout>
  );

  /* ── render ──────────────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/exams')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors flex-shrink-0"
              title="Back to Exams"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">{exam.name}</h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {exam.competition} &middot; {exam.version}
                {filledSlots.length > 0 && ` · ${filledSlots.length}/${slots.length} problems`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Review mode toggle */}
            <button
              onClick={() => setReviewMode(v => !v)}
              title={reviewMode ? 'Exit review mode' : 'Review mode (full problem rendering)'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                reviewMode
                  ? 'bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900 border-transparent'
                  : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ClipboardCheck size={13} />
              {reviewMode ? 'Exit Review' : 'Review'}
            </button>

            {/* Show/hide answers */}
            <button onClick={() => setShowAnswers(v => !v)}
              className="p-2 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={showAnswers ? 'Hide answers' : 'Show answers'}
            >
              {showAnswers ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>

            {/* Copy LaTeX */}
            <button onClick={copyLatex}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {copyDone ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copyDone ? 'Copied!' : 'Copy LaTeX'}
            </button>

            {/* Save */}
            {canEdit && (
              <button
                onClick={saveExam} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-[#2774AE] hover:bg-[#005587] dark:bg-[#FFD100] dark:hover:bg-[#e6bc00] text-white dark:text-slate-900 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        {message && (
          <div className={`px-5 py-1.5 text-xs font-medium text-center flex-shrink-0 ${
            message.includes('fail') || message.includes('Failed')
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-b border-red-200'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-b border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Topic imbalance warning */}
        {dominantTopic && filledSlots.length >= 3 && !(exam.topics?.includes(dominantTopic)) && (
          <div className="px-5 py-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 text-xs flex-shrink-0">
            <AlertTriangle size={13} />
            <span><strong>Topic imbalance:</strong> {dominantTopic} is &gt;40% of the exam. Consider adding variety.</span>
          </div>
        )}

        {/* ── Main split ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* LEFT — Problem Bank (hidden in review mode) */}
          {!reviewMode && (
            <div className="w-80 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Problem Bank</p>
                  {autoTopics && (
                    <span className="text-[9px] text-slate-400">({autoTopics.map(topicAbbr).join('+')} filtered)</span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setAutoTopics(v => v ? null : (exam.topics?.length ? exam.topics : null))}
                      className="ml-auto text-[9px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {autoTopics ? 'Show all' : 'Filter topics'}
                    </button>
                  )}
                </div>
                <input
                  type="text" value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                  placeholder="Search bank…"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 mb-1.5"
                />
                <select
                  value={bankStage}
                  onChange={e => setBankStage(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]"
                >
                  <option value="Endorsed">Endorsed only</option>
                  <option value="all">All stages</option>
                  <option value="Idea">Idea</option>
                  <option value="Review">Review</option>
                  <option value="Needs Review">Needs Review</option>
                </select>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredBank.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-600">
                    {bankSearch ? 'No matching problems' : 'No problems match filters'}
                  </div>
                ) : filteredBank.map(p => (
                  <BankCard
                    key={p.id} problem={p}
                    onAdd={addToSlot}
                    canEdit={canEdit}
                    isInExam={examProblemIds.has(p.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* RIGHT — Exam slots + Discussion */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* Slots area */}
            <div className="flex-1 overflow-y-auto">
              {sections.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={e => setActiveId(e.active.id)}
                  onDragEnd={handleDragEnd}
                >
                  {sections.map(sec => {
                    const secName = sec.name;
                    const secSlots = slots.filter(s => s.section === secName);
                    const isExpanded = expandedSections[secName] !== false;
                    return (
                      <div key={secName} className="border-b border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => toggleSection(secName)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{secName}</span>
                            <span className="text-[10px] text-slate-400">{secSlots.filter(s=>s.problem).length}/{secSlots.length}</span>
                          </div>
                          {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </button>
                        {isExpanded && (
                          <SortableContext items={secSlots.map(s => s.slotId)} strategy={verticalListSortingStrategy}>
                            <div className={`grid gap-0 ${
                              secName==='Tiebreak'||secName==='Alternates'||secName==='Estimation'?'grid-cols-1 max-w-md':
                              secSlots.length===4?'grid-cols-4':
                              secSlots.length===3?'grid-cols-3':
                              'grid-cols-2 xl:grid-cols-5'
                            }`}>
                              {secSlots.map((slot, idx) => (
                                <SortableSlot
                                  key={slot.slotId} slot={slot} idx={idx}
                                  onRemove={removeFromSlot}
                                  canEdit={canEdit}
                                  showAnswer={showAnswers}
                                  reviewMode={reviewMode}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        )}
                      </div>
                    );
                  })}
                  <DragOverlay>
                    {activeId ? (
                      <div className="bg-white dark:bg-slate-800 border-2 border-[#2774AE] dark:border-[#FFD100] rounded-lg px-3 py-2 shadow-2xl text-xs text-slate-700 dark:text-slate-200 opacity-90">
                        Moving slot…
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={e => setActiveId(e.active.id)}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={slots.map(s => s.slotId)} strategy={verticalListSortingStrategy}>
                    {slots.length === 0 ? (
                      <div className="py-16 text-center">
                        <p className="text-slate-400 dark:text-slate-500 text-sm">No problems yet.</p>
                        {canEdit && <p className="text-xs text-slate-400 mt-1">Add from the bank on the left, or add an empty slot below.</p>}
                      </div>
                    ) : slots.map((slot, idx) => (
                      <SortableSlot
                        key={slot.slotId} slot={slot} idx={idx}
                        onRemove={removeFromSlot}
                        canEdit={canEdit}
                        showAnswer={showAnswers}
                        reviewMode={reviewMode}
                      />
                    ))}
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="bg-white dark:bg-slate-800 border-2 border-[#2774AE] dark:border-[#FFD100] rounded-lg px-3 py-2 shadow-2xl text-xs opacity-90">
                        Moving…
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}

              {canEdit && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setSlots(prev => [...prev, { slotId: `slot-empty-${Date.now()}`, problem: null, section: null }])}
                    className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-400 hover:border-[#2774AE] hover:text-[#2774AE] dark:hover:border-[#FFD100] dark:hover:text-[#FFD100] transition-colors"
                  >
                    + Add empty slot
                  </button>
                </div>
              )}
            </div>

            {/* Discussion panel pinned at bottom of slots column */}
            <CommentsPanel
              examId={exam.id}
              currentUserId={currentUser?.id}
              isAdmin={currentUser?.isAdmin ?? false}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExamDetail;
