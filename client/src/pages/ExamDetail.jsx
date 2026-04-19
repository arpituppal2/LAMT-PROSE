import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, X, Search, Loader2,
  MessageSquare, Send, Eye, Save, Copy,
  ChevronDown, AlertTriangle, EyeOff,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

// ── Slot config ────────────────────────────────────────────────────────────────
const buildSlots = (type, gutsPerSet = 3) => {
  if (type === 'guts') {
    const s = [];
    for (let set = 1; set <= 8; set++) {
      for (let q = 1; q <= gutsPerSet; q++) {
        s.push({ key: `G${set}-${q}`, label: `S${set} P${q}`, short: `S${set}P${q}`, section: `Set ${set}`, multi: false });
      }
    }
    s.push({ key: 'GEST1', label: 'Est. 1', short: 'Est. 1', section: 'Estimation', multi: false });
    s.push({ key: 'GEST2', label: 'Est. 2', short: 'Est. 2', section: 'Estimation', multi: false });
    s.push({ key: 'GEST3', label: 'Est. 3', short: 'Est. 3', section: 'Estimation', multi: false });
    return s;
  }
  if (type === 'shopping') {
    return [
      ...Array.from({ length: 24 }, (_, i) => ({ key: `SQ${i+1}`, label: `Q${i+1}`, short: `Q${i+1}`, section: 'Questions', multi: false })),
      { key: 'SEST', label: 'Est.', short: 'Est.', section: 'Estimation', multi: false },
      { key: 'SALT', label: 'Alternates', short: 'Alt', section: 'Alternates', multi: true },
    ];
  }
  if (type === 'team') {
    return [
      ...Array.from({ length: 15 }, (_, i) => ({ key: `T${i+1}`, label: `Q${i+1}`, short: `Q${i+1}`, section: 'Questions', multi: false })),
      { key: 'TEST', label: 'Tiebreak', short: 'TB', section: 'Tiebreak', multi: false },
      { key: 'TALT', label: 'Alternates', short: 'Alt', section: 'Alternates', multi: true },
    ];
  }
  // individual
  return [
    ...Array.from({ length: 10 }, (_, i) => ({ key: `Q${i+1}`, label: `Q${i+1}`, short: `Q${i+1}`, section: 'Questions', multi: false })),
    { key: 'TB', label: 'Tiebreak', short: 'TB', section: 'Tiebreak', multi: false },
    { key: 'ALT', label: 'Alternates', short: 'Alt', section: 'Alternates', multi: true },
  ];
};

const TEMPLATE_LABELS = {
  'indiv-alg-nt': 'Individual · Algebra & NT',
  'indiv-geo':    'Individual · Geometry',
  'indiv-combo':  'Individual · Combinatorics',
  guts:           'Guts Round',
  shopping:       'Shopping Round',
  team:           'Team Round',
};

const examTopicFilter = (type) =>
  ({ 'indiv-alg-nt': ['Algebra', 'Number Theory'], 'indiv-geo': ['Geometry'], 'indiv-combo': ['Combinatorics'] }[type] || null);

const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
const STAGES = ['Endorsed', 'Published', 'Needs Review', 'Idea'];
const TOPIC_WARN_THRESHOLD = 0.4;

// ── Stage config ───────────────────────────────────────────────────────────────
// Semantic: Endorsed=green, Published=blue-neutral, Needs Review=red, Idea=yellow
const STAGE_CFG = {
  Endorsed:     { dot: 'bg-emerald-500',  chip: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',  rail: 'border-l-emerald-400 dark:border-l-emerald-600' },
  Published:    { dot: 'bg-sky-500',      chip: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800',                           rail: 'border-l-sky-400 dark:border-l-sky-600' },
  'Needs Review':{ dot: 'bg-red-500',    chip: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',                            rail: 'border-l-red-400 dark:border-l-red-600' },
  Idea:         { dot: 'bg-amber-400',    chip: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',               rail: 'border-l-amber-400 dark:border-l-amber-500' },
};
const stageCfg = (s) => STAGE_CFG[s] || { dot: 'bg-slate-400', chip: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700', rail: 'border-l-slate-300 dark:border-l-slate-600' };

const StageChip = ({ stage }) => {
  const c = stageCfg(stage);
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-none ${c.chip}`}>{stage}</span>;
};

// ── Slot map helpers ───────────────────────────────────────────────────────────
const deriveSlotMap = (exam) => (exam?.slots && Object.keys(exam.slots).length > 0 ? exam.slots : {});

const getSlotIds = (map, key) => {
  const v = map[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
};

const setSlotIds = (map, key, ids, multi) => {
  const cleaned = (ids || []).filter(Boolean);
  if (cleaned.length === 0) { const n = { ...map }; delete n[key]; return n; }
  return { ...map, [key]: multi ? cleaned : cleaned[0] };
};

// ── LaTeX strip ────────────────────────────────────────────────────────────────
// Strip LaTeX commands for a short plain preview
const stripLatex = (s, len = 90) => {
  if (!s) return '';
  let out = s
    .replace(/\\begin\{[^}]*\}[\s\S]*?\\end\{[^}]*\}/g, '[…]')
    .replace(/\$\$[\s\S]*?\$\$/g, '[…]')
    .replace(/\\\[[\s\S]*?\\\]/g, '[…]')
    .replace(/\$[^$\n]*\$/g, (m) => m.replace(/\\[a-zA-Z]+\{?/g, '').replace(/[{}\\$]/g, '').trim() || '[expr]')
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (out.length > len) out = out.slice(0, len).trimEnd() + '…';
  return out;
};

const fixLatex = (s) => {
  if (!s) return '';
  const hasSingle = /(?<!\\)\\(?!\\)/.test(s);
  if (!hasSingle && s.includes('\\\\')) return s.replace(/\\\\/g, '\\');
  return s;
};

const dl = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ── Cross-exam duplicate detection ────────────────────────────────────────────
/**
 * Returns a map of { problemId -> [examName, ...] } for all other exams
 * owned by the same user that contain each problem.
 */
const buildDupeMap = (allExams, currentExamId, currentUserId) => {
  const map = {}; // pid -> Set of exam names
  allExams.forEach((exam) => {
    if (exam.id === currentExamId) return;
    // only check exams created by the same user
    if (exam.authorId !== currentUserId && exam.author?.id !== currentUserId) return;
    const ids = exam.slots
      ? Object.values(exam.slots).flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []))
      : (exam.problems || []).map((p) => p.id);
    ids.forEach((pid) => {
      if (!map[pid]) map[pid] = new Set();
      map[pid].add(exam.name);
    });
  });
  return map; // { pid: Set<examName> }
};

// ── Tiny helpers ───────────────────────────────────────────────────────────────
const topicAbbr = (t) => ({ Algebra: 'Alg', 'Number Theory': 'NT', Geometry: 'Geo', Combinatorics: 'Combo' }[t] || t);

const Spin = ({ size = 13 }) => <Loader2 size={size} className="animate-spin" />;

const topicWarning = (problems) => {
  if (!problems?.length) return null;
  const counts = {};
  problems.forEach((p) => (p.topics || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
  const dominant = Object.entries(counts).find(([, c]) => c / problems.length > TOPIC_WARN_THRESHOLD);
  return dominant ? dominant[0] : null;
};

// ── Duplicate Warning Banner ───────────────────────────────────────────────────
const DupeBanner = ({ dupeWarnings, onDismiss }) => {
  if (!dupeWarnings || dupeWarnings.length === 0) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex-shrink-0">
      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <div className="flex-1 min-w-0 text-[12px] leading-relaxed">
        <span className="font-semibold">Cross-exam duplicates: </span>
        {dupeWarnings.map((w, i) => (
          <span key={w.pid}>
            <span className="font-mono">{w.pid}</span>
            {' '}already on{' '}
            <span className="font-medium italic">{[...w.exams].join(', ')}</span>
            {i < dupeWarnings.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </div>
      <button onClick={onDismiss} className="flex-shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition">
        <X size={12} />
      </button>
    </div>
  );
};

// ── Topic Banner ───────────────────────────────────────────────────────────────
const TopicBanner = ({ topic }) => {
  if (!topic) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex-shrink-0 text-[12px]">
      <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400 flex-shrink-0" />
      <span>Over 40% of assigned problems are <strong>{topic}</strong> — consider diversifying.</span>
    </div>
  );
};

// ── Assigned slot card ─────────────────────────────────────────────────────────
const SlotCard = ({ slot, problems, canEdit, onDrop, onRemove, onPreview, dragOverKey, onDragEnter, onDragLeave, dupeMap }) => {
  const over = dragOverKey === slot.key;
  const isEmpty = problems.length === 0;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter(slot.key); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const pid = e.dataTransfer.getData('problemId');
        const from = e.dataTransfer.getData('fromSlot') || null;
        if (pid) onDrop(slot.key, pid, from, slot.multi);
      }}
      className={`rounded-lg border flex flex-col transition min-h-[90px]
        ${over ? 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800/60'
          : isEmpty ? 'border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
    >
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{slot.label}</span>
        {slot.multi && !isEmpty && <span className="text-[9px] text-slate-300 dark:text-slate-600">multi</span>}
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center pb-3">
          <p className="text-[10px] text-slate-300 dark:text-slate-700 italic select-none">
            {canEdit ? (over ? 'drop here' : 'empty') : '—'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 px-2 pb-2">
          {problems.map((p) => {
            const sc = stageCfg(p.stage);
            const preview = stripLatex(p.latex);
            const isDupe = dupeMap && dupeMap[p.id] && dupeMap[p.id].size > 0;

            return (
              <div
                key={p.id}
                draggable={canEdit}
                onDragStart={(e) => {
                  e.dataTransfer.setData('problemId', p.id);
                  e.dataTransfer.setData('fromSlot', slot.key);
                  e.stopPropagation();
                }}
                onClick={() => onPreview(p)}
                className={`group relative rounded border cursor-pointer transition
                  ${isDupe
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'
                    : `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-600`}`}
              >
                {/* left accent rail */}
                <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l ${sc.dot}`} />

                <div className="pl-2.5 pr-2 pt-2 pb-1.5">
                  {/* Row 1: ID + dupe warning dot + quality + remove */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">{p.id}</span>
                    {isDupe && (
                      <span title={`Also on: ${[...dupeMap[p.id]].join(', ')}`}
                        className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
                    )}
                    {p.quality != null && (
                      <span className="text-[10px] text-slate-400 tabular-nums ml-auto flex-shrink-0">d{p.quality}</span>
                    )}
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemove(slot.key, p.id); }}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 hover:text-slate-600 transition"
                      >
                        <X size={9} />
                      </button>
                    )}
                  </div>

                  {/* Row 2: topics + stage chip */}
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {(p.topics || []).map((t) => (
                      <span key={t} className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{topicAbbr(t)}</span>
                    ))}
                    {p.stage && <StageChip stage={p.stage} />}
                  </div>

                  {/* Row 3: short statement preview */}
                  {preview && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug line-clamp-2 select-none">
                      {preview}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {slot.multi && canEdit && (
            <p className="text-[9px] text-slate-300 dark:text-slate-600 text-center mt-0.5 select-none">drop to add more</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Problem bank row ───────────────────────────────────────────────────────────
const BankRow = ({ problem, assigned, onPreview, dupeMap }) => {
  const sc = stageCfg(problem.stage);
  const isDupe = dupeMap && dupeMap[problem.id] && dupeMap[problem.id].size > 0;
  const preview = stripLatex(problem.latex, 72);

  return (
    <div
      draggable={!assigned}
      onDragStart={(e) => {
        e.dataTransfer.setData('problemId', problem.id);
        e.dataTransfer.setData('fromSlot', '');
      }}
      onClick={() => !assigned && onPreview(problem)}
      className={`flex items-start gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80 transition select-none
        ${assigned ? 'opacity-30 pointer-events-none'
          : 'hover:bg-white dark:hover:bg-slate-900 cursor-grab active:cursor-grabbing'}`}
    >
      {/* stage dot */}
      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100">{problem.id}</span>
          {isDupe && !assigned && (
            <span title={`Also on: ${[...dupeMap[problem.id]].join(', ')}`}
              className="text-[9px] font-medium text-amber-600 dark:text-amber-400 flex-shrink-0">⚑ dup</span>
          )}
          {problem.quality != null && (
            <span className="text-[10px] text-slate-400 tabular-nums ml-auto flex-shrink-0">d{problem.quality}</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {(problem.topics || []).map((t) => (
            <span key={t} className="text-[9px] text-slate-400 dark:text-slate-500">{topicAbbr(t)}</span>
          ))}
          <StageChip stage={problem.stage} />
        </div>
        {preview && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-snug line-clamp-1">{preview}</p>
        )}
      </div>
    </div>
  );
};

// ── Live preview ───────────────────────────────────────────────────────────────
const LivePreview = ({ slots, slotMap, byId }) => {
  const sections = useMemo(() => {
    const m = {};
    slots.forEach((s) => (m[s.section] || (m[s.section] = [])).push(s));
    return m;
  }, [slots]);

  return (
    <div className="space-y-10 p-6">
      {Object.entries(sections).map(([sec, ss]) => (
        <div key={sec}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-6">{sec}</p>
          {ss.map((slot) => {
            const ids = getSlotIds(slotMap, slot.key);
            if (ids.length === 0) {
              return (
                <div key={slot.key} className="flex gap-8 mb-5 opacity-30">
                  <span className="text-xs text-slate-400 w-20 flex-shrink-0 text-right pt-0.5">{slot.label}</span>
                  <span className="text-xs italic text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-4">empty</span>
                </div>
              );
            }
            return ids.map((pid, i) => {
              const p = byId[pid];
              const sc = stageCfg(p?.stage);
              return (
                <div key={`${slot.key}-${pid}`} className="flex gap-8 mb-8">
                  <div className="w-20 flex-shrink-0 text-right pt-1">
                    {i === 0 && <span className="text-[11px] font-medium text-slate-400">{slot.label}</span>}
                  </div>
                  <div className={`flex-1 min-w-0 border-l pl-4 ${sc.rail}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[10px] text-slate-400">{pid}</span>
                      <StageChip stage={p?.stage} />
                      {p?.quality != null && <span className="text-[10px] text-slate-400">d{p.quality}</span>}
                    </div>
                    <div className="text-sm leading-loose text-slate-800 dark:text-slate-100">
                      <KatexRenderer latex={fixLatex(p?.latex || `[${pid}]`)} />
                    </div>
                  </div>
                </div>
              );
            });
          })}
        </div>
      ))}
    </div>
  );
};

// ── Problem preview modal ──────────────────────────────────────────────────────
const ProbModal = ({ p, close, dupeMap }) => {
  const sc = stageCfg(p.stage);
  const dupes = dupeMap?.[p.id];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={close}>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{p.id}</span>
          <StageChip stage={p.stage} />
          {(p.topics || []).map((t) => (
            <span key={t} className="text-[11px] text-slate-400">{t}</span>
          ))}
          {p.quality != null && <span className="text-xs text-slate-400 ml-1">d{p.quality}/10</span>}
          {dupes && dupes.size > 0 && (
            <span className="ml-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              ⚑ also on: {[...dupes].join(', ')}
            </span>
          )}
          <button onClick={close} className="ml-auto p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-2">Problem</p>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-5 py-4 text-base leading-loose border border-slate-200 dark:border-slate-800">
              <KatexRenderer latex={fixLatex(p.latex || '')} />
            </div>
          </div>
          {p.solution && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-2">Solution</p>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-5 py-4 text-sm leading-relaxed border border-slate-200 dark:border-slate-800">
                <KatexRenderer latex={fixLatex(p.solution)} />
              </div>
            </div>
          )}
          {p.answer && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Answer</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{p.answer}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Discussion ─────────────────────────────────────────────────────────────────
const Discussion = ({ examId, userId, isAdmin }) => {
  const [list, setList] = useState([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const bot = useRef(null);

  useEffect(() => {
    if (examId) api.get(`/tests/${examId}/comments`).then((r) => setList(r.data)).catch(() => {});
  }, [examId]);

  useEffect(() => { bot.current?.scrollIntoView({ behavior: 'smooth' }); }, [list]);

  const post = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try { const r = await api.post(`/tests/${examId}/comments`, { body }); setList((p) => [...p, r.data]); setBody(''); }
    catch {} finally { setPosting(false); }
  };

  const del = async (cid) => {
    try { await api.delete(`/tests/${examId}/comments/${cid}`); setList((p) => p.filter((c) => c.id !== cid)); } catch {}
  };

  return (
    <div>
      <div className="space-y-3 max-h-48 overflow-y-auto py-1">
        {list.length === 0
          ? <p className="text-center text-[11px] text-slate-400 py-4">No comments yet.</p>
          : list.map((c) => (
            <div key={c.id} className="flex gap-2.5 group">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                {c.user?.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{c.user?.firstName}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[12px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{c.body}</p>
              </div>
              {(c.user?.id === userId || isAdmin) && (
                <button onClick={() => del(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-300 hover:text-red-500 transition">
                  <X size={10} />
                </button>
              )}
            </div>
          ))
        }
        <div ref={bot} />
      </div>
      <form onSubmit={post} className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <textarea value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post(e); } }}
          placeholder="Comment… (Enter to send)" rows={1}
          className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[12px] outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 resize-none transition" />
        <button type="submit" disabled={posting || !body.trim()}
          className="px-2.5 py-1.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 transition">
          {posting ? <Spin /> : <Send size={11} />}
        </button>
      </form>
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allProbs, setAllProbs] = useState([]);
  const [probLoading, setProbLoading] = useState(false);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState('');
  const [slotMap, setSlotMap] = useState({});
  const [pendingMap, setPendingMap] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState('');
  const [topicF, setTopicF] = useState('all');
  const [stageF, setStageF] = useState('all');
  const [diffMin, setDiffMin] = useState(1);
  const [diffMax, setDiffMax] = useState(10);
  const [sortBy, setSortBy] = useState('id');
  const [saveState, setSaveState] = useState('idle');
  const [discOpen, setDiscOpen] = useState(false);
  const [allExams, setAllExams] = useState([]);
  const [showCopy, setShowCopy] = useState(false);
  const [copySource, setCopySource] = useState(null);
  // dupe warning: array of { pid, exams: Set<name> } for active warnings
  const [dupeWarnings, setDupeWarnings] = useState([]);
  const [dupeDismissed, setDupeDismissed] = useState(false);
  const slotsRef = useRef([]);

  useEffect(() => {
    api.get('/auth/me').then((r) => setMe(r.data.user)).catch(() => {});
    api.get('/tests').then((r) => setAllExams(r.data || [])).catch(() => {});
    (async () => {
      setLoading(true);
      try {
        const r = await api.get(`/tests/${id}`);
        setExam(r.data);
        setSlotMap(deriveSlotMap(r.data));
        setPendingMap(null);
      } catch { setErr('Failed to load.'); }
      finally { setLoading(false); }
    })();
    (async () => {
      setProbLoading(true);
      try { const r = await api.get('/problems'); setAllProbs(r.data); }
      catch {} finally { setProbLoading(false); }
    })();
  }, [id]);

  const isAdmin = me?.isAdmin || false;
  const canEdit = exam && (isAdmin || exam.authorId === me?.id || exam.author?.id === me?.id);
  const currentMap = pendingMap || slotMap;

  const gutsPerSet = useMemo(() => {
    if (exam?.templateType !== 'guts') return 3;
    const keys = Object.keys(currentMap || {});
    if (keys.some((k) => /^G\d+-4$/.test(k))) return 4;
    const total = Object.values(currentMap || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : v ? 1 : 0), 0);
    return total > 27 ? 4 : 3;
  }, [exam, currentMap]);

  const slots = useMemo(() => (exam ? buildSlots(exam.templateType, gutsPerSet) : []), [exam, gutsPerSet]);
  useEffect(() => { slotsRef.current = slots; }, [slots]);

  const autoTopics = exam ? examTopicFilter(exam.templateType) : null;

  const byId = useMemo(() => {
    const m = {};
    allProbs.forEach((p) => (m[p.id] = p));
    return m;
  }, [allProbs]);

  const isDirty = pendingMap !== null;

  const assigned = useMemo(() => {
    const s = new Set();
    Object.values(currentMap).forEach((v) => {
      if (Array.isArray(v)) v.forEach((x) => s.add(x));
      else if (v) s.add(v);
    });
    return s;
  }, [currentMap]);

  // Build dupe map whenever allExams or me changes
  const dupeMap = useMemo(() => {
    if (!me || !allExams.length) return {};
    return buildDupeMap(allExams, id, me.id);
  }, [allExams, id, me]);

  // Recalculate active dupe warnings whenever assigned set changes
  useEffect(() => {
    if (!Object.keys(dupeMap).length) return;
    const warnings = [];
    assigned.forEach((pid) => {
      if (dupeMap[pid] && dupeMap[pid].size > 0) {
        warnings.push({ pid, exams: dupeMap[pid] });
      }
    });
    setDupeWarnings(warnings);
    if (warnings.length > 0) setDupeDismissed(false);
  }, [assigned, dupeMap]);

  const handleSave = useCallback(async () => {
    if (!pendingMap) return;
    setSaveState('saving');
    try {
      await api.put(`/tests/${id}/slots`, { slots: pendingMap });
      setSlotMap(pendingMap);
      setPendingMap(null);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch {
      setSaveState('err');
      setTimeout(() => setSaveState('idle'), 2500);
    }
  }, [id, pendingMap]);

  const updateMap = useCallback((updater) => {
    setPendingMap((prev) => updater(prev || slotMap));
  }, [slotMap]);

  const handleDrop = useCallback((toKey, pid, fromKey, multi) => {
    updateMap((prev) => {
      let next = { ...prev };
      if (fromKey) {
        const src = slotsRef.current.find((s) => s.key === fromKey);
        next = setSlotIds(next, fromKey, getSlotIds(next, fromKey).filter((x) => x !== pid), src?.multi);
      }
      const toIds = getSlotIds(next, toKey);
      if (multi) {
        if (!toIds.includes(pid)) next = setSlotIds(next, toKey, [...toIds, pid], true);
      } else {
        if (fromKey && toIds.length > 0) {
          const fSlot = slotsRef.current.find((s) => s.key === fromKey);
          next = setSlotIds(next, fromKey, [toIds[0]], fSlot?.multi);
        }
        next = setSlotIds(next, toKey, [pid], false);
      }
      return next;
    });
    setDragOver(null);
  }, [updateMap]);

  const handleRemove = useCallback((slotKey, pid) => {
    updateMap((prev) => {
      const slot = slotsRef.current.find((s) => s.key === slotKey);
      return setSlotIds({ ...prev }, slotKey, getSlotIds(prev, slotKey).filter((x) => x !== pid), slot?.multi);
    });
  }, [updateMap]);

  // topic balance warning
  const assignedProbs = useMemo(() => [...assigned].map((pid) => byId[pid]).filter(Boolean), [assigned, byId]);
  const topicWarn = topicWarning(assignedProbs);

  const sections = useMemo(() => {
    const m = {};
    slots.forEach((s) => (m[s.section] || (m[s.section] = [])).push(s));
    return m;
  }, [slots]);

  const filledSlots = Object.keys(currentMap).filter((k) => getSlotIds(currentMap, k).length > 0).length;

  // Filter + sort problem bank
  const picker = useMemo(() => {
    const filtered = allProbs.filter((p) => {
      if (p.stage === 'Archived') return false;
      if (autoTopics && topicF === 'all' && !(p.topics || []).some((t) => autoTopics.includes(t))) return false;
      if (topicF !== 'all' && !(p.topics || []).includes(topicF)) return false;
      if (stageF !== 'all' && p.stage !== stageF) return false;
      const d = p.quality ?? 0;
      if (d < diffMin || d > diffMax) return false;
      if (search && !p.id.toLowerCase().includes(search.toLowerCase()) && !(p.latex || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortBy === 'diff-asc') return [...filtered].sort((a, b) => (a.quality ?? 0) - (b.quality ?? 0));
    if (sortBy === 'diff-desc') return [...filtered].sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0));
    return filtered;
  }, [allProbs, topicF, stageF, search, autoTopics, diffMin, diffMax, sortBy]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      </Layout>
    );
  }

  if (err || !exam) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-6 py-12 text-center">
          <p className="text-red-500 mb-3">{err || 'Not found.'}</p>
          <button onClick={() => navigate('/exams')} className="underline text-sm text-slate-500">← Back</button>
        </div>
      </Layout>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout fullHeight noPadding>
      {/*
        The builder fills Layout's content region edge-to-edge.
        Layout should render this with no extra padding when fullHeight+noPadding
        are passed — adjust those props to match your Layout's API.
        The outer div uses h-full flex-col to claim the full viewport column.
      */}
      <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
          <button onClick={() => navigate('/exams')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition">
            <ArrowLeft size={15} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{exam.name}</h1>
              <span className="text-[11px] text-slate-400 flex-shrink-0">{exam.competition} · {exam.version}</span>
              <span className="text-[11px] text-slate-400 flex-shrink-0">{TEMPLATE_LABELS[exam.templateType] || exam.templateType}</span>
              {exam.author && <span className="text-[11px] text-slate-400 flex-shrink-0">by {exam.author.firstName} {exam.author.lastName}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-slate-400 tabular-nums">{filledSlots}/{slots.length}</span>

            {/* Copy layout */}
            {canEdit && (
              <div className="relative">
                <button onClick={() => setShowCopy((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                  <Copy size={11} /> Copy layout <ChevronDown size={10} />
                </button>
                {showCopy && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-56 overflow-hidden">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      Copy from
                    </p>
                    {allExams.filter((e) => e.id !== id && e.templateType === exam.templateType).length === 0
                      ? <p className="text-[11px] text-slate-400 italic px-3 py-3">No compatible exams.</p>
                      : allExams.filter((e) => e.id !== id && e.templateType === exam.templateType).map((e) => (
                        <button key={e.id} onClick={() => {
                            setCopySource(e);
                            updateMap(() => ({ ...deriveSlotMap(e) }));
                            setShowCopy(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 transition">
                          <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{e.name}</p>
                          <p className="text-[10px] text-slate-400">{e.author?.firstName} {e.author?.lastName}</p>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
            )}

            {/* Save */}
            {canEdit && (
              <button onClick={handleSave} disabled={saveState === 'saving' || !isDirty}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold transition
                  ${isDirty
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent hover:opacity-90'
                    : 'text-slate-400 border-slate-200 dark:border-slate-800 cursor-default'}`}>
                {saveState === 'saving' ? <Spin /> : <Save size={12} />}
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'err' ? 'Error' : 'Save'}
              </button>
            )}

            {/* Preview toggle */}
            <button onClick={() => setShowPreview((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold transition
                ${showPreview
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
              {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPreview ? 'Exit preview' : 'Preview'}
            </button>

            {/* Export */}
            <button onClick={() => {
                const tex = buildTexExport(exam, currentMap, byId, gutsPerSet, slots);
                dl(`${(exam.name || 'exam').replace(/\s+/g, '-').toLowerCase()}.tex`, tex);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition">
              <Download size={12} /> .tex
            </button>
          </div>
        </div>

        {/* ── Warning banners ──────────────────────────────────────────────── */}
        {!dupeDismissed && <DupeBanner dupeWarnings={dupeWarnings} onDismiss={() => setDupeDismissed(true)} />}
        <TopicBanner topic={topicWarn} />

        {isDirty && !showPreview && (
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 text-[11px] text-slate-500">
            Unsaved changes
            {canEdit && <button onClick={handleSave} className="underline font-semibold text-slate-700 dark:text-slate-300">Save now</button>}
            <button onClick={() => setPendingMap(null)} className="underline text-slate-400 ml-auto">Discard</button>
          </div>
        )}

        {/* ── Two-pane builder ─────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* LEFT — Problem bank */}
          <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">

            {/* Bank filters */}
            <div className="flex-shrink-0 px-3 py-3 space-y-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">

              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID or text…"
                  className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[12px] text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition" />
              </div>

              {/* Topics */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Topic</p>
                <div className="flex flex-wrap gap-1">
                  {['all', ...TOPICS].map((t) => (
                    <button key={t} onClick={() => setTopicF(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition
                        ${topicF === t
                          ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400'}`}>
                      {t === 'all' ? 'All' : t}
                    </button>
                  ))}
                </div>
                {autoTopics && (
                  <p className="text-[9px] text-slate-400 mt-1">Pre-filtered to {autoTopics.join(' & ')}</p>
                )}
              </div>

              {/* Stages */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Stage</p>
                <div className="flex flex-wrap gap-1">
                  {['all', ...STAGES].map((s) => {
                    const active = stageF === s;
                    const sc = s !== 'all' ? stageCfg(s) : null;
                    return (
                      <button key={s} onClick={() => setStageF(s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition
                          ${active
                            ? s === 'all'
                              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent'
                              : `${sc.chip} border`
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400'}`}>
                        {s === 'all' ? 'All' : s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty + Sort */}
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 flex-shrink-0">d</p>
                <input type="number" min={1} max={10} value={diffMin}
                  onChange={(e) => setDiffMin(Math.min(Number(e.target.value), diffMax))}
                  className="w-10 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px] text-center text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-slate-300" />
                <span className="text-[10px] text-slate-400">–</span>
                <input type="number" min={1} max={10} value={diffMax}
                  onChange={(e) => setDiffMax(Math.max(Number(e.target.value), diffMin))}
                  className="w-10 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px] text-center text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-slate-300" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="ml-auto text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-1.5 py-1 outline-none focus:ring-1 focus:ring-slate-300">
                  <option value="id">ID</option>
                  <option value="diff-asc">d ↑</option>
                  <option value="diff-desc">d ↓</option>
                </select>
              </div>
            </div>

            {/* Bank list — drop here to remove from exam */}
            <div className="flex-1 overflow-y-auto"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fromSlot = e.dataTransfer.getData('fromSlot');
                const pid = e.dataTransfer.getData('problemId');
                if (pid && fromSlot) handleRemove(fromSlot, pid);
              }}>
              {probLoading
                ? <div className="flex justify-center py-8"><Spin size={16} /></div>
                : picker.length === 0
                  ? <p className="text-center text-[11px] text-slate-400 py-8 italic">No matches.</p>
                  : picker.map((p) => (
                    <BankRow key={p.id} problem={p} assigned={assigned.has(p.id)} onPreview={setPreview} dupeMap={dupeMap} />
                  ))
              }
            </div>
          </div>

          {/* RIGHT — Exam canvas */}
<div className="flex-1 min-w-0 overflow-y-auto bg-slate-50 dark:bg-[#0f0f10]">
  {showPreview
    ? <LivePreview slots={slots} slotMap={currentMap} byId={byId} />
    : (
      <div className="p-4 space-y-6">
        {exam.templateType === 'guts'
          ? /* ── GUTS: sections = Set 1…8, Estimation ── */
            Object.entries(sections).map(([secName, secSlots]) => (
              <div key={secName}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{secName}</p>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
                {secName === 'Estimation'
                  ? /* Estimation: single column */
                  <div className="flex flex-col gap-2 max-w-xs">
                    {secSlots.map((slot) => {
                      const probs = getSlotIds(currentMap, slot.key).map((pid) => byId[pid]).filter(Boolean);
                      return <SlotCard key={slot.key} slot={slot} problems={probs} canEdit={!!canEdit}
                        onDrop={handleDrop} onRemove={handleRemove} onPreview={setPreview}
                        dragOverKey={dragOver} onDragEnter={setDragOver} onDragLeave={() => setDragOver(null)}
                        dupeMap={dupeMap} />;
                    })}
                  </div>
                  : /* Set N: horizontal row of 3 (or 4) */
                  <div className={`grid gap-2 grid-cols-${secSlots.length}`} style={{ gridTemplateColumns: `repeat(${secSlots.length}, minmax(0, 1fr))` }}>
                    {secSlots.map((slot) => {
                      const probs = getSlotIds(currentMap, slot.key).map((pid) => byId[pid]).filter(Boolean);
                      return <SlotCard key={slot.key} slot={slot} problems={probs} canEdit={!!canEdit}
                        onDrop={handleDrop} onRemove={handleRemove} onPreview={setPreview}
                        dragOverKey={dragOver} onDragEnter={setDragOver} onDragLeave={() => setDragOver(null)}
                        dupeMap={dupeMap} />;
                    })}
                  </div>
                }
              </div>
            ))
          : /* ── ALL OTHER TYPES: every section stacks vertically ── */
            Object.entries(sections).map(([secName, secSlots]) => (
              <div key={secName}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{secName}</p>
                  {secName === 'Alternates' && (
                    <span className="text-[9px] text-slate-400 italic">drop multiple here</span>
                  )}
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="flex flex-col gap-2 max-w-lg">
                  {secSlots.map((slot) => {
                    const probs = getSlotIds(currentMap, slot.key).map((pid) => byId[pid]).filter(Boolean);
                    return <SlotCard key={slot.key} slot={slot} problems={probs} canEdit={!!canEdit}
                      onDrop={handleDrop} onRemove={handleRemove} onPreview={setPreview}
                      dragOverKey={dragOver} onDragEnter={setDragOver} onDragLeave={() => setDragOver(null)}
                      dupeMap={dupeMap} />;
                  })}
                </div>
            ))
        }

        {/* Discussion */}
        <div className="mt-2">
          <button onClick={() => setDiscOpen((v) => !v)}
            className="flex items-center gap-2 w-full text-left py-2 group">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition flex-shrink-0">
              <MessageSquare size={11} /> Discussion
              <ChevronDown size={10} className={`transition-transform ${discOpen ? 'rotate-180' : ''}`} />
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </button>
          {discOpen && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
              <Discussion examId={exam.id} userId={me?.id} isAdmin={isAdmin} />
            </div>
          )}
        </div>
      </div>
    )
  }
</div>

// ── .tex export ────────────────────────────────────────────────────────────────
function buildTexExport(exam, slotMap, byId, gutsPerSet, slots) {
  const lines = slots.flatMap((s) => {
    const ids = getSlotIds(slotMap, s.key);
    if (ids.length === 0) return [`\\item[${s.short}.] [empty]`];
    return ids.map((pid, i) => {
      const p = byId[pid];
      return `\\item[${s.multi && ids.length > 1 ? `${s.short} ${i+1}.` : s.short + '.'}] [${pid}]\n${fixLatex(p?.latex || '')}`;
    });
  }).join('\n\n');
  return `\\documentclass[11pt]{article}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{amsmath,amssymb,enumitem}\n\\begin{document}\n\\begin{center}{\\Huge\\textbf{${exam.name || 'Exam'}}}\\end{center}\n\\vspace{.3in}\n\\begin{enumerate}\n${lines}\n\\end{enumerate}\n\\end{document}`;
}
