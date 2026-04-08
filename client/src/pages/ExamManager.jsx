import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Trash2, Check, Search, X,
  ChevronRight, AlertCircle, Loader2, FileText, Archive,
  MessageSquare, Send, Lock, Download, AlertTriangle
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

// ─── constants ────────────────────────────────────────────────────────────────
const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
const TOPIC_WARN_THRESHOLD = 0.4; // >40% same topic triggers a warning

const TEMPLATES = [
  {
    key: 'indiv-alg-nt',
    label: 'Individual: Algebra & Number Theory',
    description: '10 problems + 1 Estimation. Topic: Algebra / Number Theory. 50 min.',
    slots: 11, // 10 + estimation
    estimationSlot: true,
    allowedTopics: ['Algebra', 'Number Theory'],
    scoring: 'Individual scoring: problems with fewer total solves are worth more points. Score = ⌈N / solves⌉ where N = number of competitors.',
  },
  {
    key: 'indiv-geo',
    label: 'Individual: Geometry',
    description: '10 problems + 1 Estimation. Topic: Geometry. 50 min.',
    slots: 11,
    estimationSlot: true,
    allowedTopics: ['Geometry'],
    scoring: 'Individual scoring: problems with fewer total solves are worth more points. Score = ⌈N / solves⌉ where N = number of competitors.',
  },
  {
    key: 'indiv-combo',
    label: 'Individual: Combinatorics',
    description: '10 problems + 1 Estimation. Topic: Combinatorics. 50 min.',
    slots: 11,
    estimationSlot: true,
    allowedTopics: ['Combinatorics'],
    scoring: 'Individual scoring: problems with fewer total solves are worth more points. Score = ⌈N / solves⌉ where N = number of competitors.',
  },
  {
    key: 'shopping',
    label: 'Team: Shopping Spree',
    description: '24 questions (any topics) + 1 Estimation Wager. Budget: $500. 75 min.',
    slots: 25, // Q1-Q24 + Q25 estimation
    estimationSlot: true,
    allowedTopics: null, // any
    topicWarn: true,
    scoring: 'Shopping scoring: see rules page in generated PDF. Final Score = leftover cash + points from correct answers + estimation bonus.',
  },
  {
    key: 'guts',
    label: 'Team: Guts',
    description: '23 questions + 1 Estimation. Sets of 3 (Sets 1–7) + Set 8: 2 problems + estimation.',
    slots: 24,
    estimationSlot: true,
    allowedTopics: null,
    topicWarn: true,
    scoring: 'Guts scoring: teams submit answers per set. Earlier correct answers yield bonus time multiplier.',
  },
];

// Shopping cost/points table (Q1-Q24)
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

// ─── LaTeX generators ─────────────────────────────────────────────────────────
const escLaTeX = s => (s || '').replace(/[&%$#_{}~^\\]/g, c => `\\${c}`);

// Fix double-escaped backslashes that occur when copying from PROSE DB
const fixLatex = (s) => {
  if (!s) return '';
  // If the string has \\( or \\\ patterns (double-escaped), unescape them
  // Only unescape if there are NO single backslashes (i.e. it's fully double-escaped)
  const hasSingleBackslash = /(?<!\\)\\(?!\\)/.test(s);
  if (!hasSingleBackslash && s.includes('\\\\')) {
    return s.replace(/\\\\/g, '\\');
  }
  return s;
};

const generateIndividualLatex = (exam, templateKey, problems) => {
  const titles = {
    'indiv-alg-nt': 'Individual Round 1: Algebra \\& Number Theory',
    'indiv-geo': 'Individual Round 2: Geometry',
    'indiv-combo': 'Individual Round 3: Combinatorics',
  };
  const times = { 'indiv-alg-nt': '10:45 AM', 'indiv-geo': '12:00 PM', 'indiv-combo': '02:00 PM' };
  const title = titles[templateKey] || escLaTeX(exam.name);
  const time = times[templateKey] || 'TBD';
  const nonEstimation = problems.slice(0, 10);
  const estimation = problems[10];

  const problemLines = nonEstimation.map((p, i) =>
    p
      ? `\\item[${i+1}.] [${p.id}]\n${fixLatex(p.latex || '')}`
      : `\\item[${i+1}.] [Slot ${i+1} — empty]`
  ).join('\n\n');
  const estimationLine = estimation
    ? `\\item[Tiebreak.] [${estimation.id}]\n${fixLatex(estimation.latex || '')}`
    : `\\item[Tiebreak.] [Estimation slot — empty]`;

  const scoringNote = `Problems with fewer solves are worth more points: $\\text{Score} = \\lceil N / \\text{solves} \\rceil$ where $N$ is the number of competitors.`;

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

\\newcommand{\\proctorscript}{
  \\begin{tcolorbox}[colback=blue!5!white,colframe=uclablue,title=\\textbf{Instructions (Please read along as the proctor speaks)}]
Calculators, smartwatches, phones, protractors, rulers, compasses, and any other computational or communication aids are strictly prohibited. Turn them off now and keep them in your bag. If you need a pencil, scratch paper, a restroom break, or have a clarification question, please remain seated and raise your hand; a proctor will come to you.

\\vspace{0.2in}

Do not discuss the exam until all students have left the testing room. Any form of cheating will result in immediately invalidated test scores and potential banning from LAMT and affiliated events. A single person's cheating will result in the entire team being banned. Do not flip over or open your exam packet until explicitly instructed to do so.
  \\end{tcolorbox}
}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{\\textcolor{uclablue}{${title}}}} \\\\[0.5em]
  {\\Large \\textbf{Time: ${time}} \\quad $\\vert$ \\quad \\textbf{Duration: 50 Minutes}}
\\end{center}

\\begin{tcolorbox}[colback=white, colframe=black, width=\\textwidth, boxrule=1pt]
  \\renewcommand{\\arraystretch}{1.5}
  \\begin{tabularx}{\\textwidth}{@{}l X l X@{}}
    \\textbf{Competitor Name:} & \\underline{\\hspace{4in}}\\\\
    \\textbf{Team Name:} & \\underline{\\hspace{4in}} \\\\
    \\textbf{Competitor ID:} & \\underline{\\hspace{3.15in}} \\textit{(e.g., 042A)}
  \\end{tabularx}
\\end{tcolorbox}

\\vspace{0.1in}
\\proctorscript
\\vspace{0.2in}

{\\noindent \\Large \\textbf{Round Rules \\& Format:}}
This round consists of 10 problems and one tiebreaker estimation problem. All answers must be single numerical values unless otherwise specified. Fractions should be simplified as much as possible, and answers must be exact; no rounding is permitted. Units are not required. Diagrams are not necessarily drawn to scale. No proofs or work are required. There is no penalty for guessing. This is an individual round.

\\vspace{0.1in}
{\\noindent \\textbf{Scoring:} ${scoringNote}}

\\vspace{0.2in}
\\begin{center}
  \\textbf{\\large \\textit{I certify that I have read and fully understand the rules and consequences of cheating, and I will not give or receive any unauthorized assistance. I will adhere to all rules listed above.}}
\\end{center}
\\vspace{0.4in}
\\noindent\\textbf{Signature:} \\underline{\\hspace{4in}}
\\vspace{0.05in}
\\noindent\\textbf{Date:} \\underline{\\hspace{1.5in}}

\\newpage
\\begin{center}
  \\section*{Individual Round Answer Sheet}
\\end{center}
\\huge
\\textbf{1. \\hspace{3in} 6.} \\vspace{1.2in}

\\textbf{2. \\hspace{3in} 7.} \\vspace{1.2in}

\\textbf{3. \\hspace{3in} 8.} \\vspace{1.2in}

\\textbf{4. \\hspace{3in} 9.} \\vspace{1.2in}

\\textbf{5. \\hspace{3in} 10.} \\vspace{1.2in}

\\textbf{Tiebreak.}

\\newpage
\\normalsize
\\begin{enumerate}
${problemLines}

${estimationLine}
\\end{enumerate}

\\end{document}`;
};

const generateShoppingLatex = (exam, problems) => {
  const rows = SHOPPING_TABLE.map((row, i) => {
    const p = problems[i];
    const latex = p ? `[${p.id}]\n${fixLatex(p.latex || '')}` : `[Slot Q${row.q} — empty]`;
    return `% Q${row.q}: \\$${row.cost} → ${row.pts} pts\n\\item[Q${row.q}.] ${latex}`;
  }).join('\n\n');
  const estP = problems[24];
  const estLatex = estP ? `[${estP.id}]\n${fixLatex(estP.latex || '')}` : '[Estimation slot — empty]';

  return `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb}
\\usepackage{tabularx}
\\usepackage{tcolorbox}
\\usepackage{fancyhdr}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{array}

\\definecolor{uclablue}{HTML}{2774AE}
\\definecolor{uclagold}{HTML}{FFD100}

\\pagestyle{fancy}
\\fancyhf{}
\\lhead{\\textbf{\\textcolor{uclablue}{Los Angeles Math Tournament (LAMT)}}}
\\rhead{\\textbf{Competitor Test Packet}}
\\cfoot{\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}

\\newcommand{\\proctorscript}{
  \\begin{tcolorbox}[colback=blue!5!white,colframe=uclablue,title=\\textbf{Instructions (Please read along as the proctor speaks)}]
Calculators, smartwatches, phones, protractors, rulers, compasses, and any other computational or communication aids are strictly prohibited. Turn them off now and keep them in your bag.\n\n\\vspace{0.2in}\n\nDo not discuss the exam until all students have left the testing room. Any form of cheating will result in immediately invalidated test scores and potential banning from LAMT and affiliated events.\n  \\end{tcolorbox}
}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{\\textcolor{uclablue}{Team Round 1: Shopping Spree}}} \\\\[0.5em]
  {\\Large \\textbf{Time: 09:15 AM} \\quad $|$ \\quad \\textbf{Duration: 75 Minutes}}
\\end{center}

\\begin{tcolorbox}[colback=white, colframe=black, width=\\textwidth, boxrule=1pt]
  \\renewcommand{\\arraystretch}{1.5}
  \\begin{tabularx}{\\textwidth}{@{}l X l X@{}}
    \\textbf{Team Name:} & \\underline{\\hspace{2in}} & \\textbf{Team ID:} & \\underline{\\hspace{1in}} \\textit{(000--999)} \\\\
  \\end{tabularx}
\\end{tcolorbox}

\\vspace{0.05in}
\\proctorscript
\\vspace{0.1in}

\\begin{center}
  \\textbf{\\large \\textit{I certify that I have read and fully understand the rules and consequences of cheating.}}
\\end{center}

\\noindent Please have all participating team members sign below:
\\vspace{0.1in}
\\renewcommand{\\arraystretch}{1.8}
\\noindent
\\begin{tabularx}{\\textwidth}{@{}l l X l X@{}}
  \\textbf{ID:} \\underline{\\hspace{0.6in}} & \\textbf{Name:} \\underline{\\hspace{1.75in}} & \\textbf{Signature:} & \\underline{\\hspace{1.75in}} \\\\
  \\textbf{ID:} \\underline{\\hspace{0.6in}} & \\textbf{Name:} \\underline{\\hspace{1.75in}} & \\textbf{Signature:} & \\underline{\\hspace{1.75in}} \\\\
  \\textbf{ID:} \\underline{\\hspace{0.6in}} & \\textbf{Name:} \\underline{\\hspace{1.75in}} & \\textbf{Signature:} & \\underline{\\hspace{1.75in}} \\\\
  \\textbf{ID:} \\underline{\\hspace{0.6in}} & \\textbf{Name:} \\underline{\\hspace{1.75in}} & \\textbf{Signature:} & \\underline{\\hspace{1.75in}} \\\\
  \\textbf{ID:} \\underline{\\hspace{0.6in}} & \\textbf{Name:} \\underline{\\hspace{1.75in}} & \\textbf{Signature:} & \\underline{\\hspace{1.75in}} \\\\
  \\textbf{ID:} \\underline{\\hspace{0.6in}} & \\textbf{Name:} \\underline{\\hspace{1.75in}} & \\textbf{Signature:} & \\underline{\\hspace{1.75in}} \\\\
\\end{tabularx}

\\newpage

\\begin{center}
  {\\Huge \\textbf{Shopping Spree}} \\\\[0.5em]
  {\\large \\textbf{Official Rules \\& Format Explanation}}
\\end{center}
\\vspace{0.2in}

Welcome to the LAMT Shopping Spree! Your team begins with a starting budget of \\textbf{\\$500}. You may choose to buy any combination of problems (Q1--Q24) from the Shopping List, provided the total \\textit{Cost} does not exceed your \\$500 budget. If you exceed the \\$500 budget, your team will receive a score of zero for this round.

\\subsection*{Special Final Question (Q25): Estimation Wager}

\\begin{itemize}
  \\item \\textbf{You must spend at least one dollar on Q25.}
  \\item Let $L$ be the amount you spend on Q25, $A$ your estimate, and $C$ the correct answer. Your Q25 bonus is:
  $$\\text{Points}_{25} = 3 \\cdot L \\cdot \\exp\\!\\left(-\\frac{\\sigma^2}{2}\\,|C - A|^2\\right)$$
  where $\\sigma$ is scaled to the magnitude of $C$. A perfect estimate ($A = C$) earns $3L$ points.
\\end{itemize}

\\subsection*{Final Score}
$$\\text{Final Score} = (500 - \\text{Total Spent}) + \\text{Points from Q1--Q24} + 3L \\cdot \\exp\\!\\left(-\\frac{\\sigma^2}{2}|C-A|^2\\right)$$

\\begin{center}\\textit{You have 75 minutes. Good luck, and spend wisely!}\\end{center}

\\newpage

\\begin{center}
  {\\Huge \\textbf{Official Team Receipt}} \\\\[1em]
\\end{center}

\\renewcommand{\\arraystretch}{1.5}
\\begin{center}
\\begin{tabular}{|c|c|c|c|c|}
\\hline
\\textbf{Buy?} & \\textbf{Q\\#} & \\textbf{Cost} & \\textbf{Potential Points} & \\textbf{Your Answer} \\\\
\\hline
${SHOPPING_TABLE.map(r => `\\bigcirc & \\textbf{${r.q}} & \\$${r.cost} & ${r.pts} pts & \\\\
\\hline`).join('\n')}
\\bigcirc & \\textbf{25} & \\$\\underline{\\hspace{2cm}} & $3L\\cdot e^{-\\frac{\\sigma^2}{2}|C-A|^2}$ & \\\\
\\hline
\\hline
\\multicolumn{2}{|r|}{\\textbf{TOTALS (Q1--Q25):}} & \\textbf{\\$ \\quad \\quad \\quad } & --- & \\textit{(Total spent must be $\\leq$ \\$500)} \\\\
\\hline
\\end{tabular}
\\end{center}

\\newpage
\\begin{center}{\\Large \\textbf{Problem Set}}\\end{center}
\\begin{description}
${rows}

\\item[Q25.] ${estLatex}
\\end{description}

\\end{document}`;
};

const generateGutsLatex = (exam, problems) => {
  // 8 sets: sets 1-7 have 3 problems each (21 total), set 8 has 2 problems + 1 estimation = 23+1
  const sets = [];
  let idx = 0;
  for (let s = 1; s <= 7; s++) {
    sets.push({ set: s, problems: problems.slice(idx, idx + 3), estimation: false });
    idx += 3;
  }
  sets.push({ set: 8, problems: problems.slice(idx, idx + 2), estimation: problems[23] || null });

  const setBlocks = sets.map(({ set, problems: ps, estimation }) => {
    const pLines = ps.map((p, i) =>
      `\\item[${i + 1}.] ${p ? `[${p.id}]\n${fixLatex(p.latex || '')}` : `[Slot — empty]`}

\\vspace{1.5in}`
    ).join('\n');
    const estLine = estimation
      ? `\\item[Est.] [${estimation.id}]\n${fixLatex(estimation.latex || '')}\n
\\vspace{1.5in}`
      : estimation === null && set === 8 ? `\\item[Est.] [Estimation slot — empty]\n
\\vspace{1.5in}` : '';

    return `{\\Large \\textbf{SET ${set}}}
\\begin{description}
${pLines}
${estLine}\\end{description}
\\vspace{0.3in}
\\noindent\\rule{\\textwidth}{0.4pt}
\\textit{--- cut here ---}
\\vspace{0.3in}
${set % 2 === 0 ? '\\newpage' : ''}`;
  }).join('\n\n');

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
\\renewcommand{\\headrulewidth}{0.4pt}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{\\textcolor{uclablue}{Team Round 2: Guts}}} \\\\[0.5em]
  {\\Large \\textbf{Duration: 75 Minutes}}
\\end{center}
\\vspace{0.3in}

${setBlocks}

\\end{document}`;
};

// ─── helpers ──────────────────────────────────────────────────────────────────
const StageBadge = ({ stage }) => {
  const colours =
    stage === 'Endorsed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : stage === 'Published' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    : stage === 'Archived' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colours}`}>{stage}</span>;
};

const Spinner = () => <Loader2 size={16} className="animate-spin text-ucla-blue dark:text-[#FFD100]" />;

const ErrorMsg = ({ msg }) =>
  msg ? <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-2"><AlertCircle size={14} />{msg}</div> : null;

const topicWarning = (problems) => {
  if (!problems || problems.length === 0) return null;
  const counts = {};
  problems.forEach(p => (p.topics || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
  const total = problems.length;
  const dominant = Object.entries(counts).find(([, c]) => c / total > TOPIC_WARN_THRESHOLD);
  return dominant ? dominant[0] : null;
};

// Download LaTeX as .tex file
const downloadLatex = (filename, content) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ─── New Exam Modal ───────────────────────────────────────────────────────────
const NewExamModal = ({ onClose, onCreate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({ competition: '', name: '', description: '', version: 'v1' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const applyTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setForm(f => ({ ...f, name: tpl.label }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.competition.trim() || !form.name.trim() || !form.version.trim()) {
      setError('Competition, Name, and Version are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/tests', {
        ...form,
        problemIds: [],
        templateType: selectedTemplate?.key || null
      });
      onCreate(res.data);
      onClose();
    } catch {
      setError('Failed to create exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-ucla-blue/30 dark:focus:ring-[#FFD100]/30 transition';
  const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl mx-4 p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">New Exam</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={18} className="text-slate-500" /></button>
        </div>

        {/* Template picker */}
        <div className="mb-5">
          <p className={labelCls}>Choose a Template</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map(tpl => (
              <button key={tpl.key} type="button"
                onClick={() => applyTemplate(tpl)}
                className={`text-left px-3 py-2.5 rounded-xl border transition text-sm ${
                  selectedTemplate?.key === tpl.key
                    ? 'border-ucla-blue dark:border-[#FFD100] bg-blue-50 dark:bg-[#FFD100]/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}>
                <p className="font-semibold text-slate-800 dark:text-white text-xs">{tpl.label}</p>
                <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">{tpl.description}</p>
              </button>
            ))}

          </div>
          {selectedTemplate && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-[#FFD100]/5 border border-blue-100 dark:border-[#FFD100]/20 text-xs text-slate-600 dark:text-slate-300">
              <strong>Scoring:</strong> {selectedTemplate.scoring}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Competition *</label>
            <input className={inputCls} value={form.competition} onChange={set('competition')} placeholder="e.g. LAMT 2026" />
          </div>
          <div>
            <label className={labelCls}>Exam Name *</label>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Team Round" />
          </div>
          <div>
            <label className={labelCls}>Version *</label>
            <input className={inputCls} value={form.version} onChange={set('version')} placeholder="e.g. v1" />
          </div>
          <div>
            <label className={labelCls}>Description <span className="normal-case font-normal">(optional)</span></label>
            <textarea className={inputCls} rows={2} value={form.description} onChange={set('description')} placeholder="Brief description..." />
          </div>
          <ErrorMsg msg={error} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading ? <Spinner /> : <Plus size={15} />} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Comments panel ───────────────────────────────────────────────────────────
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
    setPosting(true);
    setError('');
    try {
      const res = await api.post(`/tests/${examId}/comments`, { body });
      setComments(prev => [...prev, res.data]);
      setBody('');
    } catch {
      setError('Failed to post comment.');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/tests/${examId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      setError('Failed to delete comment.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col" style={{ maxHeight: '60vh' }}>
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <MessageSquare size={15} className="text-slate-400" />
        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Discussion</h3>
        <span className="ml-auto text-[11px] text-slate-400">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6"><Spinner /></div>
        ) : comments.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-6">No comments yet. Start the discussion.</p>
        ) : comments.map(c => (
          <div key={c.id} className="flex gap-3 group">
            <div className="w-7 h-7 rounded-full bg-ucla-blue dark:bg-[#FFD100] flex items-center justify-center text-[10px] font-bold text-white dark:text-slate-900 flex-shrink-0">
              {c.user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.user.firstName} {c.user.lastName}</span>
                <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
            </div>
            {(c.user.id === currentUserId || isAdmin) && (
              <button onClick={() => handleDelete(c.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 transition flex-shrink-0">
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        {error && <ErrorMsg msg={error} />}
        <form onSubmit={handlePost} className="flex gap-2">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(e); } }}
            placeholder="Add a comment or flag a change… (Enter to send)"
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-ucla-blue/20 dark:focus:ring-[#FFD100]/20 transition resize-none"
          />
          <button type="submit" disabled={posting || !body.trim()}
            className="self-end px-3 py-2 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 disabled:opacity-40 transition">
            {posting ? <Spinner /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ExamManager = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [allProblems, setAllProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [problemsError, setProblemsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('Endorsed');

  useEffect(() => {
    api.get('/auth/me').then(r => setCurrentUser(r.data.user)).catch(() => {});
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam && allProblems.length === 0 && !problemsLoading) fetchProblems();
  }, [selectedExam]);

  const fetchExams = async () => {
    setExamsLoading(true); setExamsError('');
    try { const r = await api.get('/tests'); setExams(r.data); }
    catch { setExamsError('Failed to load exams.'); }
    finally { setExamsLoading(false); }
  };

  const fetchProblems = async () => {
    setProblemsLoading(true); setProblemsError('');
    try { const r = await api.get('/problems'); setAllProblems(r.data); }
    catch { setProblemsError('Failed to load problems.'); }
    finally { setProblemsLoading(false); }
  };

  const isAdmin = currentUser?.isAdmin || false;
  const canEditExam = (exam) => isAdmin || !exam.authorId || exam.author?.id === currentUser?.id || exam.authorId === currentUser?.id;

  const handleCreated = (newExam) => { setExams(prev => [newExam, ...prev]); setSelectedExam(newExam); };

  const handleRemoveProblem = async (problemId) => {
    setActionError('');
    const updated = selectedExam.problems.filter(p => p.id !== problemId);
    setSelectedExam(e => ({ ...e, problems: updated }));
    setExams(es => es.map(e => e.id === selectedExam.id ? { ...e, problems: updated } : e));
    try {
      await api.put(`/tests/${selectedExam.id}`, {
        problemIds: updated.map(p => p.id),
      });
    } catch {
      setActionError('Failed to remove problem. Please try again.');
      // Revert
      setSelectedExam(e => ({ ...e, problems: selectedExam.problems }));
    }
  };

  const handleArchiveProblem = async (problemId) => {
    setActionError('');
    const prevExam = selectedExam.problems;
    const prevAll = allProblems;
    setSelectedExam(e => ({ ...e, problems: e.problems.filter(p => p.id !== problemId) }));
    setExams(es => es.map(e => e.id === selectedExam.id ? { ...e, problems: e.problems.filter(p => p.id !== problemId) } : e));
    setAllProblems(prev => prev.map(p => p.id === problemId ? { ...p, stage: 'Archived' } : p));
    try {
      await api.delete(`/tests/${selectedExam.id}/problems/${problemId}`);
      await api.put(`/problems/${problemId}`, { stage: 'Archived' });
    } catch {
      setActionError('Failed to archive problem. Please try again.');
      setSelectedExam(e => ({ ...e, problems: prevExam }));
      setExams(es => es.map(e => e.id === selectedExam.id ? { ...e, problems: prevExam } : e));
      setAllProblems(prevAll);
    }
  };

  const handleAddProblem = async (problem) => {
    setActionError('');
    const prev = selectedExam.problems;
    setSelectedExam(e => ({ ...e, problems: [...e.problems, problem] }));
    setExams(es => es.map(e => e.id === selectedExam.id ? { ...e, problems: [...e.problems, problem] } : e));
    try { await api.post(`/tests/${selectedExam.id}/problems`, { problemId: problem.id }); }
    catch {
      setActionError('Failed to add problem. Please try again.');
      setSelectedExam(e => ({ ...e, problems: prev }));
      setExams(es => es.map(e => e.id === selectedExam.id ? { ...e, problems: prev } : e));
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await api.delete(`/tests/${examId}`);
      setExams(prev => prev.filter(e => e.id !== examId));
      if (selectedExam?.id === examId) setSelectedExam(null);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to delete exam.';
      setActionError(msg);
    }
  };

  const handleExportLatex = () => {
    if (!selectedExam) return;
    const tpl = selectedExam.templateType;
    const ps = selectedExam.problems || [];
    let latex = '';
    const slug = selectedExam.name.replace(/\s+/g, '-').toLowerCase();
    if (tpl === 'indiv-alg-nt' || tpl === 'indiv-geo' || tpl === 'indiv-combo') {
      latex = generateIndividualLatex(selectedExam, tpl, ps);
    } else if (tpl === 'shopping') {
      latex = generateShoppingLatex(selectedExam, ps);
    } else if (tpl === 'guts') {
      latex = generateGutsLatex(selectedExam, ps);
    } else {
      // Generic export
      latex = `% ${selectedExam.name}\n\\begin{enumerate}\n${ps.map((p, i) => `  \\item ${escLaTeX(p.latex || p.id)}`).join('\n')}\n\\end{enumerate}`;
    }
    downloadLatex(`${slug}.tex`, latex);
  };

  const filteredProblems = useMemo(() =>
    allProblems.filter(p => {
      if (p.stage === 'Archived') return false;
      const matchSearch = search === '' || p.id.toLowerCase().includes(search.toLowerCase());
      const matchTopic = topicFilter === 'all' || (p.topics || []).includes(topicFilter);
      const matchStage = stageFilter === 'all' || p.stage === stageFilter;
      return matchSearch && matchTopic && matchStage;
    })
  , [allProblems, search, topicFilter, stageFilter]);

  const archivedProblems = useMemo(() => allProblems.filter(p => p.stage === 'Archived'), [allProblems]);
  const examProblemIds = useMemo(() => new Set((selectedExam?.problems || []).map(p => p.id)), [selectedExam]);
  const topicWarnFor = selectedExam ? topicWarning(selectedExam.problems) : null;
  const tplMeta = TEMPLATES.find(t => t.key === selectedExam?.templateType);
  const inputCls = 'px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium outline-none focus:ring-2 focus:ring-ucla-blue/20 dark:focus:ring-[#FFD100]/20 transition';

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClipboardList size={26} className="text-ucla-blue dark:text-[#FFD100]" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Exams</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Build and manage competition exam sets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowArchive(s => !s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm border ${
                showArchive ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-300'
              }`}>
              <Archive size={15} /> Archive
              {archivedProblems.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">{archivedProblems.length}</span>
              )}
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 rounded-lg font-bold text-sm hover:opacity-90 transition shadow-sm">
              <Plus size={16} /> New Exam
            </button>
          </div>
        </div>

        <div className="flex gap-5" style={{ minHeight: '70vh' }}>
          {/* LEFT: exam list */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3">
            {examsLoading ? <div className="flex items-center justify-center py-16"><Spinner /></div>
            : examsError ? <ErrorMsg msg={examsError} />
            : exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText size={36} className="text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No exams yet.</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Create your first exam to get started.</p>
              </div>
            ) : exams.map(exam => (
              <div key={exam.id} onClick={() => { setSelectedExam(exam); setActionError(''); }}
                className={`group relative cursor-pointer rounded-xl border p-4 transition-all ${
                  selectedExam?.id === exam.id
                    ? 'border-ucla-blue dark:border-[#FFD100] bg-blue-50 dark:bg-[#FFD100]/5 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{exam.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{exam.competition}</p>
                  </div>
                  {canEditExam(exam) && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition" title="Delete exam">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{exam.version}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{exam.problems?.length ?? 0} problem{exam.problems?.length !== 1 ? 's' : ''}</span>
                  {exam.templateType && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-ucla-blue/10 dark:bg-[#FFD100]/10 text-ucla-blue dark:text-[#FFD100]">{exam.templateType}</span>}
                </div>
                {!canEditExam(exam) && <Lock size={11} className="absolute right-3 top-3 text-slate-300 dark:text-slate-600" title="View only" />}
                {selectedExam?.id === exam.id && <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ucla-blue dark:text-[#FFD100]" />}
              </div>
            ))}
          </div>

          {/* MIDDLE: exam detail */}
          <div className="flex-1 min-w-0">
            {!selectedExam ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24">
                <ClipboardList size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Select an exam to view and edit it</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Or create a new one with the button above</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Exam header */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selectedExam.name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedExam.competition} &middot; <span className="font-mono">{selectedExam.version}</span>
                        {selectedExam.author && <span className="ml-2 text-slate-400">by {selectedExam.author.firstName} {selectedExam.author.lastName}</span>}
                      </p>
                      {selectedExam.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{selectedExam.description}</p>}
                      {tplMeta && (
                        <div className="mt-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-[#FFD100]/5 border border-blue-100 dark:border-[#FFD100]/20 text-xs text-slate-600 dark:text-slate-300">
                          <strong>Scoring:</strong> {tplMeta.scoring}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold px-3 py-1 rounded-full bg-ucla-blue/10 dark:bg-[#FFD100]/10 text-ucla-blue dark:text-[#FFD100]">{selectedExam.problems?.length ?? 0} problems</span>
                      {selectedExam.templateType && (
                        <button onClick={handleExportLatex}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                          <Download size={13} /> Export .tex
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Topic diversity warning */}
                {topicWarnFor && tplMeta?.topicWarn && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span><strong>Topic imbalance:</strong> More than 40% of problems are {topicWarnFor}. Consider adding variety.</span>
                  </div>
                )}

                <ErrorMsg msg={actionError} />

                {/* Problems list */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Problems in this Exam</h3>
                  </div>
                  {selectedExam.problems?.length === 0 ? (
                    <div className="py-10 text-center"><p className="text-slate-400 dark:text-slate-500 text-sm">No problems added yet. Use the table below to add some.</p></div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60">
                        <tr>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-8">#</th>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Problem ID</th>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Topics</th>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quality</th>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stage</th>
                          
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedExam.problems.map((p, i) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group/row">
                            <td className="px-5 py-3 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                            <td className="px-5 py-3">
                              <div className="group relative inline-block">
                                <span className="font-mono text-sm font-bold text-ucla-blue dark:text-[#FFD100] cursor-default">{p.id}</span>
                                {p.latex && (
                                  <div className="absolute left-0 top-full z-50 hidden group-hover:block w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 mt-1 max-h-48 overflow-y-auto">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Preview</p>
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">{(p.latex || '').slice(0, 400)}{p.latex?.length > 400 ? '…' : ''}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{(p.topics || []).map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">{t}</span>)}</div></td>
                            <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{p.quality ? `${p.quality}/10` : '—'}</td>
                            <td className="px-5 py-3"><StageBadge stage={p.stage} /></td>
                            <td className="px-3 py-3 w-8">
                              {canEditExam(selectedExam) && (
                                <button
                                  onClick={() => handleRemoveProblem(p.id)}
                                  className="opacity-0 group-hover/row:opacity-100 p-1.5 rounded-lg text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition"
                                  title="Remove from exam"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Add questions (editors only) */}
                {canEditExam(selectedExam) && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Add Questions</h3>
                    </div>
                    <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search by ID..." value={search} onChange={e => setSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs outline-none focus:ring-2 focus:ring-ucla-blue/20 dark:focus:ring-[#FFD100]/20 transition" />
                      </div>
                      <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className={inputCls}>
                        <option value="all">All Topics</option>
                        {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className={inputCls}>
                        <option value="Endorsed">Endorsed Only</option>
                        <option value="all">All Stages</option>
                        <option value="Idea">Idea</option>
                        <option value="Published">Published</option>
                      </select>
                    </div>
                    {problemsLoading ? <div className="flex items-center justify-center py-10"><Spinner /></div>
                    : problemsError ? <div className="p-5"><ErrorMsg msg={problemsError} /></div>
                    : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/60">
                            <tr>
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Topics</th>
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quality</th>
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stage</th>
                              <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredProblems.length === 0
                              ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">No matching problems.</td></tr>
                              : filteredProblems.map(p => {
                                const alreadyIn = examProblemIds.has(p.id);
                                return (
                                  <tr key={p.id} className={`transition ${alreadyIn ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                                    <td className="px-5 py-3">
                                      <div className="group relative inline-block">
                                        <span className="font-mono text-sm font-bold text-ucla-blue dark:text-[#FFD100] cursor-default">{p.id}</span>
                                        {p.latex && (
                                          <div className="absolute left-0 top-full z-50 hidden group-hover:block w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 mt-1 max-h-40 overflow-y-auto">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Preview</p>
                                            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">{(p.latex || '').slice(0, 300)}{p.latex?.length > 300 ? '…' : ''}</p>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{(p.topics || []).map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">{t}</span>)}</div></td>
                                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{p.quality ? `${p.quality}/10` : '—'}</td>
                                    <td className="px-5 py-3"><StageBadge stage={p.stage} /></td>
                                    <td className="px-5 py-3 text-right">
                                      {alreadyIn
                                        ? <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold"><Check size={13} /> Added</span>
                                        : <button onClick={() => handleAddProblem(p)}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition">
                                            <Plus size={12} /> Add
                                          </button>
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            }
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Comments */}
                <CommentsPanel examId={selectedExam.id} currentUserId={currentUser?.id} isAdmin={isAdmin} />
              </div>
            )}
          </div>

          {/* RIGHT: archive sidebar */}
          {showArchive && (
            <div className="w-72 flex-shrink-0">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/50 overflow-hidden shadow-sm h-full">
                <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
                  <Archive size={15} className="text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-sm text-amber-800 dark:text-amber-300">Archive</h3>
                  <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">{archivedProblems.length}</span>
                </div>
                {archivedProblems.length === 0 ? (
                  <div className="py-12 text-center">
                    <Archive size={28} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-slate-400 dark:text-slate-500 text-xs">No archived problems yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                    {archivedProblems.map(p => (
                      <div key={p.id} className="px-4 py-3">
                        <p className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400">{p.id}</p>
                        <div className="flex flex-wrap gap-1 mt-1">{(p.topics || []).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium">{t}</span>)}</div>
                        {p.quality && <p className="text-[11px] text-slate-400 mt-1 tabular-nums">{p.quality}/10</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && <NewExamModal onClose={() => setShowModal(false)} onCreate={handleCreated} />}
    </Layout>
  );
};

export default ExamManager;
