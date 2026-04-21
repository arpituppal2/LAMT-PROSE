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
// dot: colored indicator pip
// rail: left border on live-preview entries
// All chip styling now delegates to .status-badge + .status-{key} from index.css
const STAGE_CFG = {
  Endorsed:      { dot: 'bg-[var(--badge-endorsed-text)]',      rail: 'border-l-[var(--badge-endorsed-text)]' },
  Published:     { dot: 'bg-[var(--ucla-blue)]',                 rail: 'border-l-[var(--ucla-blue)]' },
  'Needs Review':{ dot: 'bg-[var(--badge-needs-review-text)]',   rail: 'border-l-[var(--badge-needs-review-text)]' },
  Idea:          { dot: 'bg-[var(--badge-idea-text)]',           rail: 'border-l-[var(--badge-idea-text)]' },
};
const stageCfg = (s) => STAGE_CFG[s] || { dot: 'bg-slate-400 dark:bg-slate-500', rail: 'border-l-slate-300 dark:border-l-slate-600' };

// Maps stage name → CSS modifier class for the status-badge system
const stageToClass = (s) => ({
  'Endorsed':      'status-endorsed',
  'Published':     'status-resolved',
  'Needs Review':  'status-needs-review',
  'Idea':          'status-idea',
}[s] || 'status-archived');

const StageChip = ({ stage }) => (
  <span className={`status-badge ${stageToClass(stage)}`}>{stage}</span>
);

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

// ── Shopping table ─────────────────────────────────────────────────────────────
const SHOPPING_TABLE = [
  { q: 1,  cost: 10, pts: 20 },  { q: 2,  cost: 11, pts: 23 },
  { q: 3,  cost: 12, pts: 26 },  { q: 4,  cost: 13, pts: 29 },
  { q: 5,  cost: 14, pts: 32 },  { q: 6,  cost: 15, pts: 35 },
  { q: 7,  cost: 16, pts: 38 },  { q: 8,  cost: 17, pts: 41 },
  { q: 9,  cost: 18, pts: 44 },  { q: 10, cost: 19, pts: 47 },
  { q: 11, cost: 20, pts: 50 },  { q: 12, cost: 22, pts: 70 },
  { q: 13, cost: 24, pts: 75 },  { q: 14, cost: 26, pts: 80 },
  { q: 15, cost: 28, pts: 95 },  { q: 16, cost: 30, pts: 100 },
  { q: 17, cost: 32, pts: 120 }, { q: 18, cost: 34, pts: 128 },
  { q: 19, cost: 36, pts: 138 }, { q: 20, cost: 38, pts: 142 },
  { q: 21, cost: 40, pts: 156 }, { q: 22, cost: 42, pts: 170 },
  { q: 23, cost: 44, pts: 186 }, { q: 24, cost: 48, pts: 208 },
];

// ── LaTeX export ───────────────────────────────────────────────────────────────
const escLaTeX = s => (s || '').replace(/[&%$#_{}~^\\]/g, c => `\\${c}`);

const buildTexExport = (exam, slotMap, byId, gutsPerSet, slots) => {
  const type = exam.templateType;
  const getProb = (key) => {
    const ids = getSlotIds(slotMap, key);
    return ids.map(id => byId[id]).filter(Boolean);
  };

  if (type === 'indiv-alg-nt' || type === 'indiv-geo' || type === 'indiv-combo') {
    const titles = {
      'indiv-alg-nt': 'Individual Round 1: Algebra \\& Number Theory',
      'indiv-geo': 'Individual Round 2: Geometry',
      'indiv-combo': 'Individual Round 3: Combinatorics',
    };
    const times = { 'indiv-alg-nt': '10:45 AM', 'indiv-geo': '12:00 PM', 'indiv-combo': '02:00 PM' };
    const title = titles[type];
    const time = times[type];
    const qs = Array.from({ length: 10 }, (_, i) => getProb(`Q${i+1}`)[0] || null);
    const tb = getProb('TB')[0] || null;

    const problemLines = qs.map((p, i) =>
      p ? `\\item[${i+1}.] [${p.id}]\n${fixLatex(p.latex || '')}`
        : `\\item[${i+1}.] [Slot ${i+1} — empty]`
    ).join('\n\n');
    const tbLine = tb
      ? `\\item[Tiebreak.] [${tb.id}]\n${fixLatex(tb.latex || '')}`
      : `\\item[Tiebreak.] [Tiebreak slot — empty]`;

    return `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb}
\\usepackage{tabularx}
\\usepackage{tcolorbox}
\\usepackage{fancyhdr}
\\usepackage{xcolor}
\\usepackage{enumitem}

\\definecolor{uclablue}{HTML}{2774AE}
\\definecolor{uclagold}{HTML}{FFD100}

\\pagestyle{fancy}
\\fancyhf{}
\\lhead{\\textbf{\\textcolor{uclablue}{Los Angeles Math Tournament (LAMT)}}}
\\rhead{\\textbf{Competitor Test Packet}}
\\cfoot{\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{\\textcolor{uclablue}{${title}}}} \\\\[0.5em]
  {\\Large \\textbf{Time: ${time}} \\quad $\\vert$ \\quad \\textbf{Duration: 50 Minutes}}
\\end{center}

\\newpage
\\begin{enumerate}
${problemLines}

${tbLine}
\\end{enumerate}

\\end{document}`;
  }

  if (type === 'shopping') {
    const qs = Array.from({ length: 24 }, (_, i) => getProb(`SQ${i+1}`)[0] || null);
    const est = getProb('SEST')[0] || null;
    const rows = SHOPPING_TABLE.map((row, i) => {
      const p = qs[i];
      return `\\item[Q${row.q}.] ${p ? `[${p.id}]\n${fixLatex(p.latex || '')}` : `[Slot Q${row.q} — empty]`}`;
    }).join('\n\n');
    const estLine = est ? `\\item[Q25.] [${est.id}]\n${fixLatex(est.latex || '')}` : `\\item[Q25.] [Estimation slot — empty]`;

    return `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb}
\\usepackage{fancyhdr}
\\usepackage{xcolor}
\\usepackage{enumitem}

\\definecolor{uclablue}{HTML}{2774AE}

\\pagestyle{fancy}
\\fancyhf{}
\\lhead{\\textbf{\\textcolor{uclablue}{Los Angeles Math Tournament (LAMT)}}}
\\rhead{\\textbf{Shopping Spree}}
\\cfoot{\\thepage}

\\begin{document}
\\begin{center}
  {\\Huge \\textbf{\\textcolor{uclablue}{Team Round 1: Shopping Spree}}}
\\end{center}

\\begin{description}
${rows}

${estLine}
\\end{description}

\\end{document}`;
  }

  if (type === 'guts') {
    const allSlotKeys = slots.filter(s => s.section.startsWith('Set')).map(s => s.key);
    const estKeys = ['GEST1', 'GEST2', 'GEST3'];
    const setMap = {};
    allSlotKeys.forEach(k => {
      const m = k.match(/^G(\d+)-(\d+)$/);
      if (m) {
        const set = m[1];
        if (!setMap[set]) setMap[set] = [];
        setMap[set].push(getProb(k)[0] || null);
      }
    });
    const estProbs = estKeys.map(k => getProb(k)[0] || null);

    const setBlocks = Object.entries(setMap).map(([set, ps]) => {
      const pLines = ps.map((p, i) =>
        `\\item[${i+1}.] ${p ? `[${p.id}]\n${fixLatex(p.latex || '')}` : '[empty]'}\n\n\\vspace{1.5in}`
      ).join('\n');
      return `{\\Large \\textbf{SET ${set}}}\n\\begin{description}\n${pLines}\n\\end{description}\n\\vspace{0.3in}\n\\noindent\\rule{\\textwidth}{0.4pt}`;
    }).join('\n\n');

    const estLines = estProbs.map((p, i) =>
      `\\item[Est. ${i+1}.] ${p ? `[${p.id}]\n${fixLatex(p.latex || '')}` : '[empty]'}`
    ).join('\n\n');

    return `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb}
\\usepackage{fancyhdr}
\\usepackage{xcolor}
\\usepackage{enumitem}

\\definecolor{uclablue}{HTML}{2774AE}

\\pagestyle{fancy}
\\fancyhf{}
\\lhead{\\textbf{\\textcolor{uclablue}{Los Angeles Math Tournament (LAMT)}}}
\\rhead{\\textbf{Guts Round}}
\\cfoot{\\thepage}

\\begin{document}
\\begin{center}
  {\\Huge \\textbf{\\textcolor{uclablue}{Team Round 2: Guts}}}
\\end{center}

${setBlocks}

\\subsection*{Estimation}
\\begin{description}
${estLines}
\\end{description}

\\end{document}`;
  }

  // Generic fallback
  const allProbs = slots.flatMap(s => getProb(s.key));
  return `% ${escLaTeX(exam.name)}\n\\begin{enumerate}\n${allProbs.map(p => `  \\item ${fixLatex(p?.latex || p?.id || '')}`).join('\n')}\n\\end{enumerate}`;
};

// ── Cross-exam duplicate detection ────────────────────────────────────────────
const buildDupeMap = (allExams, currentExamId, currentUserId) => {
  const map = {};
  allExams.forEach((exam) => {
    if (exam.id === currentExamId) return;
    if (exam.authorId !== currentUserId && exam.author?.id !== currentUserId) return;
    const ids = exam.slots
      ? Object.values(exam.slots).flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []))
      : (exam.problems || []).map((p) => p.id);
    ids.forEach((pid) => {
      if (!map[pid]) map[pid] = new Set();
      map[pid].add(exam.name);
    });
  });
  return map;
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
    <div className="flex items-start gap-2.5 px-4 py-3 bg-[var(--badge-idea-bg)] border-b border-[var(--badge-idea-border)] text-[var(--badge-idea-text)] flex-shrink-0">
      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 opacity-80" />
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
      <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100 transition">
        <X size={12} />
      </button>
    </div>
  );
};

// ── Topic Banner ───────────────────────────────────────────────────────────────
const TopicBanner = ({ topic }) => {
  if (!topic) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--badge-idea-bg)] border-b border-[var(--badge-idea-border)] text-[var(--badge-idea-text)] flex-shrink-0 text-[12px]">
      <AlertTriangle size={13} className="flex-shrink-0 opacity-70" />
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
      className={`rounded-[var(--radius-md)] border flex flex-col transition min-h-[90px]
        ${over
          ? 'border-[var(--ucla-blue)] bg-[var(--ucla-lightest-blue)]/30 dark:bg-[var(--ucla-blue)]/10'
          : isEmpty
            ? 'border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-white/3'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-white/3'}`}
    >
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{slot.label}</span>
        {slot.multi && !isEmpty && <span className="text-[9px] text-slate-300 dark:text-slate-600">multi</span>}
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center pb-3">
          <p className="text-[10px] text-slate-300 dark:text-slate-600 italic select-none">
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
                className={`group relative rounded-[var(--radius-sm)] border cursor-pointer transition
                  ${isDupe
                    ? 'border-[var(--badge-idea-border)] bg-[var(--badge-idea-bg)]'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--ucla-navy)]/60 hover:border-[var(--ucla-blue)]/50 dark:hover:border-[var(--ucla-blue)]/40'}`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l ${sc.dot}`} />
                <div className="pl-2.5 pr-2 pt-2 pb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">{p.id}</span>
                    {isDupe && (
                      <span title={`Also on: ${[...dupeMap[p.id]].join(', ')}`}
                        className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--badge-idea-text)]" />
                    )}
                    {p.quality != null && (
                      <span className="text-[10px] text-slate-400 tabular-nums ml-auto flex-shrink-0">d{p.quality}</span>
                    )}
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemove(slot.key, p.id); }}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/8 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        <X size={9} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {(p.topics || []).map((t) => (
                      <span key={t} className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{topicAbbr(t)}</span>
                    ))}
                    {p.stage && <StageChip stage={p.stage} />}
                  </div>
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
        ${assigned
          ? 'opacity-30 pointer-events-none'
          : 'hover:bg-[var(--ucla-lightest-blue)]/20 dark:hover:bg-[var(--ucla-blue)]/8 cursor-grab active:cursor-grabbing'}`}
    >
      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100">{problem.id}</span>
          {isDupe && !assigned && (
            <span title={`Also on: ${[...dupeMap[problem.id]].join(', ')}`}
              className="text-[9px] font-medium text-[var(--badge-idea-text)] flex-shrink-0">⚑ dup</span>
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
                  <div className={`flex-1 min-w-0 border-l-2 pl-4 ${sc.rail}`}>
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
      <div className="bg-white dark:bg-[var(--ucla-navy)] rounded-[var(--radius-lg)] border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
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
            <span className="ml-2 text-[11px] font-medium text-[var(--badge-idea-text)]">
              ⚑ also on: {[...dupes].join(', ')}
            </span>
          )}
          <button onClick={close} className="ml-auto p-1.5 rounded-[var(--radius-sm)] hover:bg-slate-100 dark:hover:bg-white/8 transition text-slate-400">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-2">Problem</p>
            <div className="bg-slate-50 dark:bg-white/4 rounded-[var(--radius-md)] px-5 py-4 text-base leading-loose border border-slate-200 dark:border-slate-700">
              <KatexRenderer latex={fixLatex(p.latex || '')} />
            </div>
          </div>
          {p.solution && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-2">Solution</p>
              <div className="bg-slate-50 dark:bg-white/4 rounded-[var(--radius-md)] px-5 py-4 text-sm leading-relaxed border border-slate-200 dark:border-slate-700">
                <KatexRenderer latex={fixLatex(p.solution)} />
              </div>
            </div>
          )}
          {p.answer && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-white/4">
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
    try {
      const r = await api.post(`/tests/${examId}/comments`, { body });
      setList((p) => [...p, r.data]);
      setBody('');
    } catch {} finally { setPosting(false); }
  };

  const del = async (cid) => {
    try {
      await api.delete(`/tests/${examId}/comments/${cid}`);
      setList((p) => p.filter((c) => c.id !== cid));
    } catch {}
  };

  return (
    <div>
      <div className="space-y-3 max-h-48 overflow-y-auto py-1">
        {list.length === 0
          ? <p className="text-center text-[11px] text-slate-400 py-4">No comments yet.</p>
          : list.map((c) => (
            <div key={c.id} className="flex gap-2.5 group">
              <div className="w-6 h-6 rounded-full bg-[var(--ucla-lightest-blue)] dark:bg-[var(--ucla-blue)]/20 flex items-center justify-center text-[9px] font-bold text-[var(--ucla-darker-blue)] dark:text-[var(--ucla-lighter-blue)] flex-shrink-0">
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
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--badge-needs-review-bg)] text-slate-300 hover:text-[var(--badge-needs-review-text)] transition">
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
          className="flex-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/4 text-[12px] outline-none focus:ring-1 focus:ring-[var(--ucla-blue)] dark:focus:ring-[var(--ucla-lighter-blue)] resize-none transition" />
        <button type="submit" disabled={posting || !body.trim()}
          className="px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--ucla-blue)] text-white hover:bg-[var(--ucla-blue-hover)] disabled:opacity-40 transition">
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

  const dupeMap = useMemo(() => {
    if (!me || !allExams.length) return {};
    return buildDupeMap(allExams, id, me.id);
  }, [allExams, id, me]);

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

  const assignedProbs = useMemo(() => [...assigned].map((pid) => byId[pid]).filter(Boolean), [assigned, byId]);
  const topicWarn = topicWarning(assignedProbs);

  const sections = useMemo(() => {
    const m = {};
    slots.forEach((s) => (m[s.section] || (m[s.section] = [])).push(s));
    return m;
  }, [slots]);

  const filledSlots = Object.keys(currentMap).filter((k) => getSlotIds(currentMap, k).length > 0).length;

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
          <p className="text-[var(--badge-needs-review-text)] mb-3">{err || 'Not found.'}</p>
          <button onClick={() => navigate('/exams')} className="underline text-sm text-slate-500">← Back</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullHeight noPadding>
      <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[var(--app-bg)]">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--app-surface)] flex-shrink-0">
          <button onClick={() => navigate('/exams')}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-slate-100 dark:hover:bg-white/8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
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
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/8 transition">
                  <Copy size={11} /> Copy layout <ChevronDown size={10} />
                </button>
                {showCopy && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-[var(--radius-md)] shadow-xl w-56 overflow-hidden">
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
                          className="w-full text-left px-3 py-2 hover:bg-[var(--ucla-lightest-blue)]/30 dark:hover:bg-white/4 border-b border-slate-50 dark:border-slate-800 transition">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border text-[11px] font-semibold transition
                  ${isDirty
                    ? 'bg-[var(--ucla-blue)] text-white border-transparent hover:bg-[var(--ucla-blue-hover)]'
                    : 'text-slate-400 border-slate-200 dark:border-slate-800 cursor-default'}`}>
                {saveState === 'saving' ? <Spin /> : <Save size={12} />}
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'err' ? 'Error' : 'Save'}
              </button>
            )}

            {/* Preview toggle */}
            <button onClick={() => setShowPreview((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border text-[11px] font-semibold transition
                ${showPreview
                  ? 'bg-[var(--ucla-blue)] text-white border-transparent'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/8 dark:text-slate-300'}`}>
              {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPreview ? 'Exit preview' : 'Preview'}
            </button>

            {/* Export */}
            <button onClick={() => {
                const tex = buildTexExport(exam, currentMap, byId, gutsPerSet, slots);
                dl(`${(exam.name || 'exam').replace(/\s+/g, '-').toLowerCase()}.tex`, tex);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/8 transition">
              <Download size={12} /> Export .tex
            </button>

            {/* Discussion */}
            <button onClick={() => setDiscOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border text-[11px] font-semibold transition
                ${discOpen
                  ? 'bg-[var(--ucla-blue)] text-white border-transparent'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/8'}`}>
              <MessageSquare size={12} />
              Notes
            </button>
          </div>
        </div>

        {/* ── Warning banners ──────────────────────────────────────────────── */}
        {dupeWarnings.length > 0 && !dupeDismissed && (
          <DupeBanner dupeWarnings={dupeWarnings} onDismiss={() => setDupeDismissed(true)} />
        )}
        {topicWarn && <TopicBanner topic={topicWarn} />}

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: slot grid */}
          <div className={`flex flex-col overflow-hidden transition-all duration-200 ${discOpen ? 'w-[38%]' : showPreview ? 'w-[40%]' : 'w-[42%]'} border-r border-slate-200 dark:border-slate-800`}>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {Object.entries(sections).map(([sec, ss]) => (
                <div key={sec}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-0.5">{sec}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ss.map((slot) => (
                      <SlotCard
                        key={slot.key}
                        slot={slot}
                        problems={getSlotIds(currentMap, slot.key).map((pid) => byId[pid]).filter(Boolean)}
                        canEdit={canEdit}
                        onDrop={handleDrop}
                        onRemove={handleRemove}
                        onPreview={setPreview}
                        dragOverKey={dragOver}
                        onDragEnter={setDragOver}
                        onDragLeave={() => setDragOver(null)}
                        dupeMap={dupeMap}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle: preview OR problem bank */}
          {showPreview ? (
            <div className="flex-1 overflow-y-auto bg-white dark:bg-[var(--app-surface)]">
              <LivePreview slots={slots} slotMap={currentMap} byId={byId} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[var(--app-surface)]">
              {/* Bank filters */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 flex-wrap">
                <div className="relative flex-1 min-w-[120px]">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none" />
                  <input
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-[var(--radius-sm)] border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/4 text-[11px] outline-none focus:ring-1 focus:ring-[var(--ucla-blue)] dark:focus:ring-[var(--ucla-lighter-blue)] transition"
                  />
                </div>
                <select value={topicF} onChange={(e) => setTopicF(e.target.value)}
                  className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/4 text-[11px] text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[var(--ucla-blue)]">
                  <option value="all">All topics</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={stageF} onChange={(e) => setStageF(e.target.value)}
                  className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/4 text-[11px] text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[var(--ucla-blue)]">
                  <option value="all">All stages</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/4 text-[11px] text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[var(--ucla-blue)]">
                  <option value="id">Sort: ID</option>
                  <option value="diff-asc">Sort: Easy → Hard</option>
                  <option value="diff-desc">Sort: Hard → Easy</option>
                </select>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span>d</span>
                  <input type="number" min={1} max={10} value={diffMin} onChange={(e) => setDiffMin(Number(e.target.value))}
                    className="w-8 px-1 py-1 rounded-[var(--radius-xs)] border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/4 text-[11px] text-center outline-none focus:ring-1 focus:ring-[var(--ucla-blue)]" />
                  <span>–</span>
                  <input type="number" min={1} max={10} value={diffMax} onChange={(e) => setDiffMax(Number(e.target.value))}
                    className="w-8 px-1 py-1 rounded-[var(--radius-xs)] border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/4 text-[11px] text-center outline-none focus:ring-1 focus:ring-[var(--ucla-blue)]" />
                </div>
                {probLoading && <Spin size={11} />}
                <span className="text-[10px] text-slate-400 ml-auto tabular-nums">{picker.length}</span>
              </div>

              {/* Bank list */}
              <div className="flex-1 overflow-y-auto">
                {picker.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-400 py-8 italic">No problems match.</p>
                ) : (
                  picker.map((p) => (
                    <BankRow key={p.id} problem={p} assigned={assigned.has(p.id)} onPreview={setPreview} dupeMap={dupeMap} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Right: discussion panel */}
          {discOpen && (
            <div className="w-64 flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[var(--app-surface)]">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Notes</span>
                <button onClick={() => setDiscOpen(false)}
                  className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/8 text-slate-400 transition">
                  <X size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <Discussion examId={id} userId={me?.id} isAdmin={isAdmin} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Problem modal ────────────────────────────────────────────────── */}
      {preview && <ProbModal p={preview} close={() => setPreview(null)} dupeMap={dupeMap} />}
    </Layout>
  );
}
