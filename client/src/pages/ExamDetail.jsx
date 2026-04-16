import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, Trash2, GripVertical, Eye, EyeOff,
  ArrowLeft, Download, Copy, Check, X, ChevronDown, ChevronUp,
  AlertCircle, Loader2
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

/* ── Sortable slot ────────────────────────────────────────────────────────── */
function SortableSlot({ slot, idx, onRemove, canEdit, showAnswer }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slot.slotId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const p = slot.problem;

  return (
    <div
      ref={setNodeRef} style={style}
      className={`group flex items-start gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800
        hover:bg-slate-50 dark:hover:bg-slate-800/50 last:border-0
        border-l-2 ${p ? (STAGE_COLORS[p.stage]?.bar ?? 'border-l-transparent') : 'border-l-transparent'}`}
    >
      {canEdit && (
        <button {...attributes} {...listeners}
          className="mt-0.5 cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 flex-shrink-0"
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
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
            <KatexRenderer latex={(p.latex || '').slice(0, 120)} />
          </div>
          {showAnswer && p.answer && (
            <div className="mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Ans: <KatexRenderer latex={p.answer} />
            </div>
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

/* ── Bank card (draggable source) ─────────────────────────────────────────── */
function BankCard({ problem, onAdd, canEdit, isInExam }) {
  const p = problem;
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
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            <KatexRenderer latex={(p.latex || '').slice(0, 100)} />
          </div>
        </div>
        {canEdit && !isInExam && (
          <button
            onClick={() => onAdd(p)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-[#001628] hover:scale-110 transition-all"
            title="Add to exam"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ExamDetail
══════════════════════════════════════════════════════════════════════════════ */
const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bank, setBank] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMsg] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [autoTopics, setAutoTopics] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [copyDone, setCopyDone] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      // NOTE: server registers exams under /api/tests, not /api/exams
      const [examRes, bankRes] = await Promise.all([
        api.get(`/tests/${id}`),
        api.get('/problems?stage=Endorsed'),
      ]);
      const e = examRes.data;
      setExam(e);
      setCanEdit(e.canEdit ?? false);
      // Build slots from problems array (legacy flat list)
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

  /* ── slot mutations ────────────────────────────────────────────────────── */
  const addToSlot = useCallback((problem) => {
    setSlots(prev => {
      const emptyIdx = prev.findIndex(s => !s.problem);
      if (emptyIdx === -1) return [...prev, { slotId: `slot-${Date.now()}`, problem }];
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

  /* ── persist ───────────────────────────────────────────────────────────── */
  const saveExam = async () => {
    setSaving(true);
    try {
      // Save as a flat problem list via /tests/:id
      const problemIds = slots.filter(s => s.problem).map(s => s.problem.id);
      await api.put(`/tests/${id}`, { problemIds });
      setMsg('Saved.');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      console.error('saveExam error:', err);
      setMsg('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  /* ── copy LaTeX ────────────────────────────────────────────────────────── */
  const copyLatex = async () => {
    const text = slots
      .filter(s => s.problem)
      .map((s, i) => `\\item[${i+1}.] ${s.problem.latex}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 1500);
  };

  /* ── bank filter ───────────────────────────────────────────────────────── */
  const examProblemIds = new Set(slots.filter(s => s.problem).map(s => s.problem.id));
  const filteredBank = bank.filter(p => {
    const matchSearch = !bankSearch ||
      p.id.toLowerCase().includes(bankSearch.toLowerCase()) ||
      (p.latex || '').toLowerCase().includes(bankSearch.toLowerCase());
    const matchTopic = !autoTopics || (p.topics || []).some(t => autoTopics.includes(t));
    return matchSearch && matchTopic;
  });

  /* ── sections ──────────────────────────────────────────────────────────── */
  const sections = exam?.sections ?? [];

  const toggleSection = (name) =>
    setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }));

  /* ── loading ───────────────────────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading exam...
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

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/exams')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors flex-shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">{exam.name}</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">{slots.filter(s=>s.problem).length} / {slots.length} slots filled</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowAnswers(v => !v)}
              className="p-2 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={showAnswers ? 'Hide answers' : 'Show answers'}
            >
              {showAnswers ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
            <button onClick={copyLatex}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {copyDone ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copyDone ? 'Copied!' : 'Copy LaTeX'}
            </button>
            {canEdit && (
              <button
                onClick={saveExam} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-[#2774AE] hover:bg-[#005587] text-white transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className="px-5 py-2 text-xs font-medium text-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-b border-green-200 dark:border-green-800 flex-shrink-0">
            {message}
          </div>
        )}

        {/* ── Main split ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* LEFT — Problem Bank */}
          <div className="w-96 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Problem Bank</p>
                {autoTopics&&<span className="text-[9px] text-slate-400">({autoTopics.map(topicAbbr).join('+')} filtered)</span>}
                {canEdit&&(
                  <button
                    onClick={() => setAutoTopics(v => v ? null : (exam.topics?.length ? exam.topics : null))}
                    className="ml-auto text-[9px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {autoTopics ? 'Show all' : 'Filter by exam topics'}
                  </button>
                )}
              </div>
              <input
                type="text" value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
                placeholder="Search bank…"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredBank.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-600">
                  {bankSearch ? 'No matching problems' : 'No endorsed problems yet'}
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

          {/* RIGHT — Exam slots */}
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
                    <div className="bg-white dark:bg-slate-800 border border-[#2774AE] rounded-lg px-3 py-2 shadow-xl text-xs text-slate-700 dark:text-slate-200 opacity-90">
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
                  {slots.map((slot, idx) => (
                    <SortableSlot
                      key={slot.slotId} slot={slot} idx={idx}
                      onRemove={removeFromSlot}
                      canEdit={canEdit}
                      showAnswer={showAnswers}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-white dark:bg-slate-800 border border-[#2774AE] rounded-lg px-3 py-2 shadow-xl text-xs opacity-90">
                      Moving…
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {canEdit && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSlots(prev => [...prev, { slotId: `slot-${Date.now()}`, problem: null }])}
                  className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-400 hover:border-[#2774AE] hover:text-[#2774AE] dark:hover:border-[#FFD100] dark:hover:text-[#FFD100] transition-colors"
                >
                  + Add empty slot
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExamDetail;
