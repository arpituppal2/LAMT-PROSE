import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  X,
  Search,
  Loader2,
  MessageSquare,
  Send,
  Eye,
  Save,
  Copy,
  ChevronDown,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

// ── Slot config ───────────────────────────────────────────────────────────────
const buildSlots = (type, gutsPerSet = 3) => {
  if (type === 'guts') {
    const s = [];
    for (let set = 1; set <= 8; set++) {
      for (let q = 1; q <= gutsPerSet; q++) {
        s.push({
          key: `G${set}-${q}`,
          label: `Set ${set} Problem ${q}`,
          short: `S${set}P${q}`,
          section: `Set ${set}`,
          multi: false,
        });
      }
    }
    s.push({ key: 'GEST1', label: 'Estimation 1', short: 'Est. 1', section: 'Estimation', multi: false });
    s.push({ key: 'GEST2', label: 'Estimation 2', short: 'Est. 2', section: 'Estimation', multi: false });
    s.push({ key: 'GEST3', label: 'Estimation 3', short: 'Est. 3', section: 'Estimation', multi: false });
    return s;
  }

  if (type === 'shopping') {
    return [
      ...Array.from({ length: 24 }, (_, i) => ({
        key: `SQ${i + 1}`,
        label: `Question ${i + 1}`,
        short: `Q${i + 1}`,
        section: 'Questions',
        multi: false,
      })),
      { key: 'SEST', label: 'Estimation', short: 'Est.', section: 'Estimation', multi: false },
      { key: 'SALT', label: 'Alternate Questions', short: 'Alt', section: 'Alternates', multi: true },
    ];
  }

  if (type === 'team') {
    return [
      ...Array.from({ length: 15 }, (_, i) => ({
        key: `T${i + 1}`,
        label: `Question ${i + 1}`,
        short: `Q${i + 1}`,
        section: 'Questions',
        multi: false,
      })),
      { key: 'TEST', label: 'Tiebreak / Estimation', short: 'TB', section: 'Tiebreak', multi: false },
      { key: 'TALT', label: 'Alternate Questions', short: 'Alt', section: 'Alternates', multi: true },
    ];
  }

  return [
    ...Array.from({ length: 10 }, (_, i) => ({
      key: `Q${i + 1}`,
      label: `Question ${i + 1}`,
      short: `Q${i + 1}`,
      section: 'Questions',
      multi: false,
    })),
    { key: 'TB', label: 'Tiebreak / Estimation', short: 'TB', section: 'Tiebreak', multi: false },
    { key: 'ALT', label: 'Alternate Questions', short: 'Alt', section: 'Alternates', multi: true },
  ];
};

const examTopicFilter = (type) =>
  ({
    'indiv-alg-nt': ['Algebra', 'Number Theory'],
    'indiv-geo': ['Geometry'],
    'indiv-combo': ['Combinatorics'],
  }[type] || null);

const TEMPLATE_LABELS = {
  'indiv-alg-nt': 'Individual · Algebra & Number Theory',
  'indiv-geo': 'Individual · Geometry',
  'indiv-combo': 'Individual · Combinatorics',
  guts: 'Guts Round',
  shopping: 'Shopping Round',
  team: 'Team Round',
};

const deriveSlotMap = (exam) => {
  if (exam.slots && typeof exam.slots === 'object' && Object.keys(exam.slots).length > 0) return exam.slots;
  return {};
};

const getSlotIds = (map, key) => {
  const v = map[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
};

const setSlotIds = (map, key, ids, multi) => {
  const cleaned = (ids || []).filter(Boolean);
  if (cleaned.length === 0) {
    const next = { ...map };
    delete next[key];
    return next;
  }
  return {
    ...map,
    [key]: multi ? cleaned : cleaned[0],
  };
};

const fixLatex = (s) => {
  if (!s) return '';
  if (!/(?<!\\\\)\\\\(?!\\\\)/.test(s) && s.includes('\\\\\\\\')) return s.replace(/\\\\\\\\/g, '\\\\');
  return s;
};

const dl = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

const makeTex = (exam, slotMap, byId, gutsPerSet = 3) => {
  const slots = buildSlots(exam.templateType, gutsPerSet);
  const lines = slots
    .flatMap((s) => {
      const ids = getSlotIds(slotMap, s.key);
      if (ids.length === 0) return [`\\\\item[${s.short}.] [empty]`];
      return ids.map((pid, i) => {
        const p = byId[pid];
        return `\\\\item[${s.multi && ids.length > 1 ? `${s.short} ${i + 1}.` : s.short + '.'}] [${pid}]\\n${fixLatex(
          p?.latex || ''
        )}`;
      });
    })
    .join('\\n\\n');

  return `\\\\documentclass[11pt]{article}
\\\\usepackage[margin=1in]{geometry}
\\\\usepackage{amsmath,amssymb,enumitem}
\\\\begin{document}
\\\\begin{center}{\\\\Huge\\\\textbf{${exam.name || 'Exam'}}}\\\\end{center}
\\\\vspace{.3in}
\\\\begin{enumerate}
${lines}
\\\\end{enumerate}
\\\\end{document}`;
};

// Topic abbreviations
const topicAbbr = (t) => ({ Algebra: 'A', 'Number Theory': 'NT', Geometry: 'G', Combinatorics: 'C' }[t] || t[0]);

// Stage config — toned down
const STAGE = {
  Endorsed: {
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-700 dark:bg-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
    rail: 'border-l-slate-500 dark:border-l-slate-400',
  },
  Published: {
    text: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-500 dark:bg-slate-400',
    border: 'border-slate-300 dark:border-slate-700',
    rail: 'border-l-slate-400 dark:border-l-slate-500',
  },
  'Needs Review': {
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-amber-600 dark:bg-amber-400',
    border: 'border-slate-300 dark:border-slate-700',
    rail: 'border-l-amber-500 dark:border-l-amber-400',
  },
  Idea: {
    text: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400 dark:bg-slate-500',
    border: 'border-slate-300 dark:border-slate-700',
    rail: 'border-l-slate-300 dark:border-l-slate-600',
  },
};

const stageConfig = (s) =>
  STAGE[s] || {
    text: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400 dark:bg-slate-500',
    border: 'border-slate-300 dark:border-slate-700',
    rail: 'border-l-slate-300 dark:border-l-slate-600',
  };

const Spin = () => <Loader2 size={13} className="animate-spin" />;

// ── Problem chip ──────────────────────────────────────────────────────────────
const ProbChip = ({ problem, slotKey, canEdit, onRemove, onPreview }) => {
  const sc = stageConfig(problem.stage);
  const topics = (problem.topics || []).map(topicAbbr).join(' · ');

  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData('problemId', problem.id);
        e.dataTransfer.setData('fromSlot', slotKey);
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPreview(problem);
      }}
      className={`group flex items-center gap-2 rounded-md border px-2.5 py-2 transition cursor-pointer bg-white dark:bg-slate-950 ${sc.border} hover:border-slate-400 dark:hover:border-slate-500`}
    >
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">{problem.id}</span>
          {problem.quality != null && (
            <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">{problem.quality}/10</span>
          )}
        </div>
        {(topics || problem.stage) && (
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 min-w-0">
            {topics && <span className="truncate">{topics}</span>}
            {problem.stage && <span className="flex-shrink-0">{problem.stage}</span>}
          </div>
        )}
      </div>
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(slotKey, problem.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0 text-slate-400"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
};

// ── Slot card ─────────────────────────────────────────────────────────────────
const SlotCard = ({
  slot,
  problems,
  canEdit,
  onDrop,
  onRemove,
  onPreview,
  dragOverKey,
  onDragEnter,
  onDragLeave,
}) => {
  const over = dragOverKey === slot.key;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnter(slot.key);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const pid = e.dataTransfer.getData('problemId');
        const from = e.dataTransfer.getData('fromSlot') || null;
        if (pid) onDrop(slot.key, pid, from, slot.multi);
      }}
      className={`rounded-xl border p-3 flex flex-col gap-2 min-h-[96px] transition
        ${
          over
            ? 'border-slate-500 dark:border-slate-400 bg-slate-100 dark:bg-slate-800/60'
            : problems.length > 0
            ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            : 'border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40'
        }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-none">{slot.label}</p>
        <span className="text-[9px] text-slate-300 dark:text-slate-600">{slot.short}</span>
      </div>

      {problems.map((p) => (
        <ProbChip key={p.id} problem={p} slotKey={slot.key} canEdit={canEdit} onRemove={onRemove} onPreview={onPreview} />
      ))}

      {problems.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 italic select-none">
            {canEdit ? (over ? 'drop here' : 'empty') : '—'}
          </p>
        </div>
      )}

      {slot.multi && problems.length > 0 && canEdit && !over && (
        <p className="text-[9px] text-slate-400 text-center select-none">drag more here</p>
      )}
    </div>
  );
};

// ── Picker row ────────────────────────────────────────────────────────────────
const PickerRow = ({ problem, assigned, onPreview }) => {
  const sc = stageConfig(problem.stage);
  const topics = (problem.topics || []).map(topicAbbr).join(' · ');

  return (
    <div
      draggable={!assigned}
      onDragStart={(e) => {
        e.dataTransfer.setData('problemId', problem.id);
        e.dataTransfer.setData('fromSlot', '');
      }}
      onClick={() => !assigned && onPreview(problem)}
      className={`flex items-start gap-2.5 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 transition group select-none
        ${
          assigned
            ? 'opacity-35 pointer-events-none'
            : 'hover:bg-white dark:hover:bg-slate-900 cursor-grab active:cursor-grabbing'
        }`}
    >
      <div className={`w-1 h-8 rounded-full flex-shrink-0 ${sc.dot} mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100">{problem.id}</span>
          {problem.quality != null && (
            <span className="text-[10px] text-slate-400 tabular-nums ml-auto">{problem.quality}/10</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <span className="text-[10px] text-slate-400 truncate">{topics || problem.stage}</span>
        </div>
        {problem.latex && (
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 leading-tight pointer-events-none">
            {(problem.latex || '')
              .replace(/\$[^$]*\$/g, (match) => match)
              .replace(/\\[a-z]+\{[^}]*\}/g, '…')
              .slice(0, 72)}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Live preview ──────────────────────────────────────────────────────────────
const LivePreview = ({ slots, slotMap, byId }) => {
  const sections = useMemo(() => {
    const m = {};
    slots.forEach((s) => {
      (m[s.section] || (m[s.section] = [])).push(s);
    });
    return m;
  }, [slots]);

  return (
    <div className="space-y-10">
      {Object.entries(sections).map(([sec, ss]) => (
        <div key={sec}>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-5">{sec}</p>
          {ss.map((slot) => {
            const ids = getSlotIds(slotMap, slot.key);

            if (ids.length === 0) {
              return (
                <div key={slot.key} className="flex gap-6 mb-5 opacity-35">
                  <span className="text-xs text-slate-500 w-32 flex-shrink-0 text-right pt-0.5">{slot.label}</span>
                  <span className="text-xs italic text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-4">empty</span>
                </div>
              );
            }

            return ids.map((pid, i) => {
              const p = byId[pid];
              const sc = stageConfig(p?.stage);

              return (
                <div key={`${slot.key}-${pid}`} className="flex gap-6 mb-7">
                  <div className="w-32 flex-shrink-0 text-right pt-1">
                    {i === 0 && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight block">
                        {slot.label}
                      </span>
                    )}
                  </div>
                  <div className={`flex-1 min-w-0 border-l pl-4 ${sc.rail}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-slate-400">{pid}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {p?.quality != null && <span className="text-[10px] text-slate-400">d={p.quality}</span>}
                    </div>
                    <div className="text-slate-800 dark:text-slate-100 leading-relaxed text-sm">
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

// ── Problem preview modal ─────────────────────────────────────────────────────
const Modal = ({ p, close }) => {
  const sc = stageConfig(p.stage);
  const topics = (p.topics || []).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={close}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${sc.rail} border-slate-100 dark:border-slate-800 rounded-t-2xl`}>
          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{p.id}</span>
          <span className="text-[11px] text-slate-400">{p.stage}</span>
          {topics && <span className="text-[11px] text-slate-400 truncate">{topics}</span>}
          {p.quality != null && (
            <span className="text-xs text-slate-400 font-medium ml-1">Difficulty {p.quality}/10</span>
          )}
          <button
            onClick={close}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-[11px] font-medium text-slate-500 mb-2">Problem</p>
            <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl px-6 py-5 text-base leading-loose text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800">
              <KatexRenderer latex={fixLatex(p.latex || '')} />
            </div>
          </div>

          {p.solution && (
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-2">Solution</p>
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl px-6 py-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                <KatexRenderer latex={fixLatex(p.solution || '')} />
              </div>
            </div>
          )}

          {p.answer && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Answer</span>
              <span className="font-semibold">{p.answer}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Discussion ────────────────────────────────────────────────────────────────
const Discussion = ({ examId, userId, isAdmin }) => {
  const [list, setList] = useState([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const bot = useRef(null);

  useEffect(() => {
    if (examId) api.get(`/tests/${examId}/comments`).then((r) => setList(r.data)).catch(() => {});
  }, [examId]);

  useEffect(() => {
    bot.current?.scrollIntoView({ behavior: 'smooth' });
  }, [list]);

  const post = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const r = await api.post(`/tests/${examId}/comments`, { body });
      setList((p) => [...p, r.data]);
      setBody('');
    } catch {}
    finally {
      setPosting(false);
    }
  };

  const del = async (cid) => {
    try {
      await api.delete(`/tests/${examId}/comments/${cid}`);
      setList((p) => p.filter((c) => c.id !== cid));
    } catch {}
  };

  return (
    <div>
      <div className="flex-1 overflow-y-auto py-2 space-y-3 max-h-36 min-h-0">
        {list.length === 0 ? (
          <p className="text-center text-[11px] text-slate-400 py-3">No comments.</p>
        ) : (
          list.map((c) => (
            <div key={c.id} className="flex gap-2.5 group">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">
                {c.user?.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">{c.user?.firstName}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[12px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{c.body}</p>
              </div>
              {(c.user?.id === userId || isAdmin) && (
                <button
                  onClick={() => del(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 hover:text-red-500 transition"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))
        )}
        <div ref={bot} />
      </div>

      <form onSubmit={post} className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              post(e);
            }
          }}
          placeholder="Add comment…"
          rows={1}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[12px] outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 resize-none transition"
        />
        <button
          type="submit"
          disabled={posting || !body.trim()}
          className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium hover:opacity-90 disabled:opacity-40 transition"
        >
          {posting ? <Spin /> : <Send size={12} />}
        </button>
      </form>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
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
      } catch {
        setErr('Failed to load.');
      } finally {
        setLoading(false);
      }
    })();

    (async () => {
      setProbLoading(true);
      try {
        const r = await api.get('/problems');
        setAllProbs(r.data);
      } catch {}
      finally {
        setProbLoading(false);
      }
    })();
  }, [id]);

  const isAdmin = me?.isAdmin || false;
  const canEdit = exam && (isAdmin || exam.authorId === me?.id || exam.author?.id === me?.id);

  const currentMap = pendingMap || slotMap;

  const gutsPerSet = useMemo(() => {
    if (exam?.templateType !== 'guts') return 3;

    const keys = Object.keys(currentMap || {});
    const hasLegacyFourth = keys.some((k) => /^G\d+-4$/.test(k));
    if (hasLegacyFourth) return 4;

    const assignedCount = Object.values(currentMap || {}).reduce((acc, v) => {
      if (!v) return acc;
      return acc + (Array.isArray(v) ? v.length : 1);
    }, 0);

    if (assignedCount > 27) return 4;
    return 3;
  }, [exam, currentMap]);

  const slots = exam ? buildSlots(exam.templateType, gutsPerSet) : [];
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const autoTopics = exam ? examTopicFilter(exam.templateType) : null;

  const byId = useMemo(() => {
    const m = {};
    allProbs.forEach((p) => {
      m[p.id] = p;
    });
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
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }, [id, pendingMap]);

  const updateMap = useCallback(
    (updater) => {
      setPendingMap((prev) => updater(prev || slotMap));
    },
    [slotMap]
  );

  const handleDrop = useCallback(
    (toKey, pid, fromKey, multi) => {
      updateMap((prev) => {
        let next = { ...prev };

        if (fromKey) {
          const src = slotsRef.current.find((s) => s.key === fromKey);
          next = setSlotIds(
            next,
            fromKey,
            getSlotIds(next, fromKey).filter((x) => x !== pid),
            src?.multi
          );
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
    },
    [updateMap]
  );

  const handleRemove = useCallback(
    (slotKey, pid) => {
      updateMap((prev) => {
        const slot = slotsRef.current.find((s) => s.key === slotKey);
        return setSlotIds(
          { ...prev },
          slotKey,
          getSlotIds(prev, slotKey).filter((x) => x !== pid),
          slot?.multi
        );
      });
    },
    [updateMap]
  );

  const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

  const picker = useMemo(() => {
    const filtered = allProbs.filter((p) => {
      if (p.stage === 'Archived') return false;
      if (autoTopics && topicF === 'all' && !(p.topics || []).some((t) => autoTopics.includes(t))) return false;
      if (topicF !== 'all' && !(p.topics || []).includes(topicF)) return false;
      if (stageF !== 'all' && p.stage !== stageF) return false;
      const d = p.quality ?? 0;
      if (d < diffMin || d > diffMax) return false;
      if (
        search &&
        !p.id.toLowerCase().includes(search.toLowerCase()) &&
        !(p.latex || '').toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });

    if (sortBy === 'diff-asc') return [...filtered].sort((a, b) => (a.quality ?? 0) - (b.quality ?? 0));
    if (sortBy === 'diff-desc') return [...filtered].sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0));
    return filtered;
  }, [allProbs, topicF, stageF, search, autoTopics, diffMin, diffMax, sortBy]);

  const sections = useMemo(() => {
    const m = {};
    slots.forEach((s) => {
      (m[s.section] || (m[s.section] = [])).push(s);
    });
    return m;
  }, [slots]);

  const filledSlots = Object.keys(currentMap).filter((k) => getSlotIds(currentMap, k).length > 0).length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">Loading…</div>
      </Layout>
    );
  }

  if (err || !exam) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-6 py-12 text-center">
          <p className="text-red-500 mb-3">{err || 'Not found.'}</p>
          <button onClick={() => navigate('/exams')} className="underline text-sm text-slate-500">
            ← Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
          <button
            onClick={() => navigate('/exams')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft size={15} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-slate-400">
              {exam.competition} · {exam.version}
            </p>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">{exam.name}</h1>
            <p className="text-[11px] text-slate-400">
              {TEMPLATE_LABELS[exam.templateType] || exam.templateType}
              {exam.author && <> · by {exam.author.firstName} {exam.author.lastName}</>}
              {exam.templateType === 'guts' && gutsPerSet === 4 && <span className="ml-2">· legacy 4-per-set</span>}
              {copySource && <span className="ml-2">· copied from {copySource.name}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-slate-400">{filledSlots}/{slots.length}</span>

            {canEdit && (
              <button
                onClick={handleSave}
                disabled={saveState === 'saving' || !isDirty}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border
                  ${
                    isDirty
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent hover:opacity-90'
                      : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 cursor-default'
                  }`}
              >
                {saveState === 'saving' ? <Spin /> : <Save size={12} />}
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save'}
              </button>
            )}

            <button
              onClick={() => setShowPreview((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition
                ${
                  showPreview
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
              <Eye size={12} /> {showPreview ? 'Hide preview' : 'Preview'}
            </button>

            <button
              onClick={() =>
                dl(
                  `${(exam.name || 'exam').replace(/\s+/g, '-').toLowerCase()}.tex`,
                  makeTex(exam, currentMap, byId, gutsPerSet)
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Download size={12} /> .tex
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT — Problem bank */}
          <div className="w-80 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Problem Bank</p>
                {autoTopics && <span className="text-[10px] text-slate-400">filtered to {autoTopics.map(topicAbbr).join(' · ')}</span>}

                {canEdit && (
                  <div className="relative ml-auto">
                    <button
                      onClick={() => setShowCopy((v) => !v)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition font-medium"
                    >
                      <Copy size={10} /> Copy layout <ChevronDown size={10} />
                    </button>

                    {showCopy && (
                      <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-56 overflow-hidden">
                        <p className="text-[10px] font-medium text-slate-400 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                          Copy layout from
                        </p>
                        {allExams.filter((e) => e.id !== id && e.templateType === exam.templateType).length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic px-3 py-3">No compatible exams.</p>
                        ) : (
                          allExams
                            .filter((e) => e.id !== id && e.templateType === exam.templateType)
                            .map((e) => (
                              <button
                                key={e.id}
                                onClick={() => {
                                  setCopySource(e);
                                  updateMap(() => ({ ...deriveSlotMap(e) }));
                                  setShowCopy(false);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 transition"
                              >
                                <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{e.name}</p>
                                <p className="text-[10px] text-slate-400">{e.author?.firstName} {e.author?.lastName}</p>
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID or text…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[12px] text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition"
                />
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {['all', ...TOPICS].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopicF(t)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition border
                      ${
                        topicF === t
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                      }`}
                  >
                    {t === 'all' ? 'All topics' : t}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 flex-wrap mb-2">
                {['all', 'Endorsed', 'Published', 'Idea', 'Needs Review'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStageF(s)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition border
                      ${
                        stageF === s
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                      }`}
                  >
                    {s === 'all' ? 'All stages' : s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] font-medium text-slate-400 flex-shrink-0">Difficulty</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={diffMin}
                  onChange={(e) => setDiffMin(Math.min(Number(e.target.value), diffMax))}
                  className="w-12 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px] text-center text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-slate-300"
                />
                <span className="text-[10px] text-slate-400">to</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={diffMax}
                  onChange={(e) => setDiffMax(Math.max(Number(e.target.value), diffMin))}
                  className="w-12 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px] text-center text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-slate-300"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="ml-auto text-[10px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 px-2 py-1 outline-none focus:ring-1 focus:ring-slate-300"
                >
                  <option value="id">Sort: ID</option>
                  <option value="diff-asc">Diff ↑</option>
                  <option value="diff-desc">Diff ↓</option>
                </select>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fromSlot = e.dataTransfer.getData('fromSlot');
                const pid = e.dataTransfer.getData('problemId');
                if (pid && fromSlot) handleRemove(fromSlot, pid);
              }}
            >
              {probLoading ? (
                <div className="flex justify-center py-8"><Spin /></div>
              ) : picker.length === 0 ? (
                <p className="text-center text-[11px] text-slate-400 py-8 italic">No matches.</p>
              ) : (
                picker.map((p) => <PickerRow key={p.id} problem={p} assigned={assigned.has(p.id)} onPreview={setPreview} />)
              )}
            </div>
          </div>

          {/* CENTER */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
            {showPreview ? (
              <LivePreview slots={slots} slotMap={currentMap} byId={byId} />
            ) : (
              <>
                {isDirty && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-600 dark:text-slate-300">
                    <span>Unsaved changes</span>
                    {canEdit && <button onClick={handleSave} className="underline font-medium">Save now</button>}
                    <button onClick={() => setPendingMap(null)} className="underline text-slate-400 ml-auto">Discard</button>
                  </div>
                )}

                {Object.entries(sections).map(([secName, secSlots]) => (
                  <div
                    key={secName}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
                      <h2 className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{secName}</h2>
                      {secName === 'Alternates' && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Drag multiple problems here</p>
                      )}
                    </div>

                    <div
                      className={`p-3 grid gap-3 ${
                        secName === 'Tiebreak' || secName === 'Alternates' || secName === 'Estimation'
                          ? 'grid-cols-1 max-w-lg'
                          : secSlots.length === 4
                          ? 'grid-cols-4'
                          : secSlots.length === 3
                          ? 'grid-cols-3'
                          : 'grid-cols-2 xl:grid-cols-5'
                      }`}
                    >
                      {secSlots.map((slot) => {
                        const probs = getSlotIds(currentMap, slot.key).map((pid) => byId[pid]).filter(Boolean);

                        return (
                          <SlotCard
                            key={slot.key}
                            slot={slot}
                            problems={probs}
                            canEdit={!!canEdit}
                            onDrop={handleDrop}
                            onRemove={handleRemove}
                            onPreview={setPreview}
                            dragOverKey={dragOver}
                            onDragEnter={setDragOver}
                            onDragLeave={() => setDragOver(null)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setDiscOpen((v) => !v)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <MessageSquare size={13} className="text-slate-400" />
                    <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Discussion</span>
                    <ChevronDown
                      size={12}
                      className={`text-slate-400 ml-auto transition-transform ${discOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {discOpen && (
                    <div className="px-4 pb-4">
                      <Discussion examId={exam.id} userId={me?.id} isAdmin={isAdmin} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {preview && <Modal p={preview} close={() => setPreview(null)} />}
    </Layout>
  );
}
