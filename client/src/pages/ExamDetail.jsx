import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Plus, X, Search, AlertCircle,
  Loader2, Archive, MessageSquare, Send, ChevronRight,
  GripVertical, Star, AlertTriangle
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

const StageBadge = ({ stage }) => {
  const c = stage === 'Endorsed'
    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : stage === 'Published'
    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c}`}>{stage}</span>;
};

const Spinner = () => <Loader2 size={15} className="animate-spin text-ucla-blue dark:text-[#FFD100]" />;

// Fix double-escaped backslashes from PROSE DB
const fixLatex = (s) => {
  if (!s) return '';
  const hasSingleBackslash = /(?<!\\)\\(?!\\)/.test(s);
  if (!hasSingleBackslash && s.includes('\\\\')) return s.replace(/\\\\/g, '\\');
  return s;
};

const escLaTeX = s => (s || '');

const generateIndividualLatex = (exam, problems) => {
  const templateKey = exam.templateType;
  const titles = {
    'indiv-alg-nt': 'Individual Round 1: Algebra \\& Number Theory',
    'indiv-geo':    'Individual Round 2: Geometry',
    'indiv-combo':  'Individual Round 3: Combinatorics',
  };
  const times = { 'indiv-alg-nt': '10:45 AM', 'indiv-geo': '12:00 PM', 'indiv-combo': '02:00 PM' };
  const title = titles[templateKey] || escLaTeX(exam.name);
  const time  = times[templateKey] || 'TBD';
  const nonEst = problems.slice(0, 10);
  const est    = problems[10];

  const problemLines = nonEst.map((p, i) =>
    p ? `\\item[${i+1}.] [${p.id}]\n${fixLatex(p.latex || '')}` : `\\item[${i+1}.] [Slot ${i+1} — empty]`
  ).join('\n\n');
  const estLine = est
    ? `\\item[Tiebreak.] [${est.id}]\n${fixLatex(est.latex || '')}`
    : `\\item[Tiebreak.] [Estimation slot — empty]`;

  return `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath, amssymb}
\\usepackage{enumitem}

\\begin{document}
\\begin{center}{\\Huge \\textbf{${title}}} \\\\[0.4em]
{\\large Time: ${time} \\quad | \\quad Duration: 50 Minutes}\\end{center}
\\vspace{0.3in}
\\begin{enumerate}
${problemLines}

${estLine}
\\end{enumerate}
\\end{document}`;
};

const downloadLatex = (filename, content) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ── Preview popup ──
const ProblemPreview = ({ problem, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
          <StageBadge stage={problem.stage} />
          {(problem.topics || []).map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">{t}</span>
          ))}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={16} /></button>
      </div>
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Problem Statement</p>
        <pre className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed font-mono bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{problem.latex || '(no statement)'}</pre>
      </div>
      {problem.solution && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Solution</p>
          <pre className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed font-mono bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{problem.solution}</pre>
        </div>
      )}
      {problem.answer && (
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
          <span className="text-[10px] font-semibold text-green-600 uppercase">Answer</span>
          <span className="text-sm font-bold text-green-700 dark:text-green-400">{problem.answer}</span>
        </div>
      )}
    </div>
  </div>
);

// ── Comments panel ──
const CommentsPanel = ({ examId, currentUserId, isAdmin }) => {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
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
      const res = await api.post(`/tests/${examId}/comments`, { body });
      setComments(p => [...p, res.data]);
      setBody('');
    } catch { setError('Failed to post.'); }
    finally { setPosting(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tests/${examId}/comments/${id}`);
      setComments(p => p.filter(c => c.id !== id));
    } catch { setError('Failed to delete.'); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col" style={{ maxHeight: '55vh' }}>
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <MessageSquare size={14} className="text-slate-400" />
        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Discussion</h3>
        <span className="ml-auto text-[11px] text-slate-400">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {comments.length === 0
          ? <p className="text-center text-slate-400 text-xs py-6">No comments yet.</p>
          : comments.map(c => (
            <div key={c.id} className="flex gap-3 group">
              <div className="w-7 h-7 rounded-full bg-ucla-blue dark:bg-[#FFD100] flex items-center justify-center text-[10px] font-bold text-white dark:text-slate-900 flex-shrink-0">
                {c.user?.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.user?.firstName} {c.user?.lastName}</span>
                  <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              {(c.user?.id === currentUserId || isAdmin) && (
                <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 transition flex-shrink-0">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
        <form onSubmit={handlePost} className="flex gap-2">
          <textarea value={body} onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(e); } }}
            placeholder="Add a comment… (Enter to send)" rows={2}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-ucla-blue/20 transition resize-none" />
          <button type="submit" disabled={posting || !body.trim()}
            className="self-end px-3 py-2 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 disabled:opacity-40 transition">
            {posting ? <Spinner /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Main ExamDetail Page ──
const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allProblems, setAllProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('Endorsed');
  const [showPicker, setShowPicker] = useState(false);
  const [previewProblem, setPreviewProblem] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);

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
    } catch { setError('Failed to load exam.'); }
    finally { setLoading(false); }
  };

  const fetchProblems = async () => {
    setProblemsLoading(true);
    try {
      const r = await api.get('/problems');
      setAllProblems(r.data);
    } catch {}
    finally { setProblemsLoading(false); }
  };

  const isAdmin = currentUser?.isAdmin || false;
  const canEdit = exam && (isAdmin || exam.author?.id === currentUser?.id || exam.authorId === currentUser?.id);

  const saveProblems = async (problems) => {
    try {
      await api.put(`/tests/${id}`, { problemIds: problems.map(p => p.id) });
    } catch { setActionError('Failed to save changes.'); }
  };

  const handleAdd = async (problem) => {
    const already = (exam.problems || []).some(p => p.id === problem.id);
    if (already) return;
    const updated = [...(exam.problems || []), problem];
    setExam(e => ({ ...e, problems: updated }));
    await saveProblems(updated);
  };

  const handleRemove = async (problemId) => {
    const updated = (exam.problems || []).filter(p => p.id !== problemId);
    setExam(e => ({ ...e, problems: updated }));
    await saveProblems(updated);
  };

  // Drag-and-drop reorder
  const handleDragStart = (i) => setDragIdx(i);
  const handleDragEnter = (i) => setDragOver(i);
  const handleDragEnd = async () => {
    if (dragIdx === null || dragOver === null || dragIdx === dragOver) {
      setDragIdx(null); setDragOver(null); return;
    }
    const probs = [...(exam.problems || [])];
    const [moved] = probs.splice(dragIdx, 1);
    probs.splice(dragOver, 0, moved);
    setExam(e => ({ ...e, problems: probs }));
    setDragIdx(null); setDragOver(null);
    await saveProblems(probs);
  };

  const pickerProblems = useMemo(() => {
    const inExam = new Set((exam?.problems || []).map(p => p.id));
    return allProblems.filter(p => {
      if (p.stage === 'Archived') return false;
      if (topicFilter !== 'all' && !(p.topics || []).includes(topicFilter)) return false;
      if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
      if (search && !p.id.toLowerCase().includes(search.toLowerCase()) &&
          !(p.latex || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (inExam.has(a.id) ? 1 : 0) - (inExam.has(b.id) ? 1 : 0));
  }, [allProblems, exam, topicFilter, stageFilter, search]);

  const handleExport = () => {
    if (!exam) return;
    const latex = generateIndividualLatex(exam, exam.problems || []);
    const slug = exam.name.replace(/\s+/g, '-').toLowerCase();
    downloadLatex(`${slug}.tex`, latex);
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">Loading exam…</div>
    </Layout>
  );

  if (error || !exam) return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <p className="text-red-500 mb-4">{error || 'Exam not found.'}</p>
        <button onClick={() => navigate('/exams')} className="text-sm text-slate-500 hover:text-slate-700 underline">← Back to Exams</button>
      </div>
    </Layout>
  );

  const problems = exam.problems || [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 pb-20">

        {/* Header */}
        <div className="flex items-start gap-4 mb-8 pt-2">
          <button onClick={() => navigate('/exams')}
            className="mt-1 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600 flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{exam.competition}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs text-slate-400">{exam.version}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{exam.name}</h1>
            {exam.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{exam.description}</p>}
            <p className="text-xs text-slate-400 mt-2">{problems.length} problem{problems.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Download size={14} /> Export .tex
            </button>
            {canEdit && (
              <button onClick={() => setShowPicker(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  showPicker
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                    : 'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 hover:opacity-90'
                }`}>
                <Plus size={14} /> {showPicker ? 'Done Adding' : 'Add Problems'}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="flex items-center gap-2 text-red-500 text-sm mb-4 px-1">
            <AlertCircle size={14} /> {actionError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT: problem list */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <h2 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Problems in this Exam</h2>
                <span className="ml-auto text-[11px] text-slate-400">{problems.length} total</span>
                {canEdit && <span className="text-[11px] text-slate-400 italic">Drag to reorder · Click to preview</span>}
              </div>

              {problems.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Plus size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No problems yet. Add some using the button above.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {problems.map((p, i) => (
                    <div key={p.id}
                      draggable={canEdit}
                      onDragStart={() => handleDragStart(i)}
                      onDragEnter={() => handleDragEnter(i)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className={`flex items-center gap-3 px-5 py-3.5 transition group cursor-pointer
                        ${dragOver === i ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                    >
                      {canEdit && (
                        <GripVertical size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab group-hover:text-slate-400 transition" />
                      )}
                      <span className="w-6 text-[11px] font-bold text-slate-400 tabular-nums flex-shrink-0">{i + 1}</span>

                      {/* Click area → preview */}
                      <div className="flex-1 min-w-0 flex items-center gap-3" onClick={() => setPreviewProblem(p)}>
                        <span className="font-mono text-sm font-bold text-ucla-blue dark:text-[#FFD100]">{p.id}</span>
                        <div className="flex flex-wrap gap-1">
                          {(p.topics || []).map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">{t}</span>
                          ))}
                        </div>
                        <span className="ml-auto text-[11px] text-slate-400">{p.quality ? `${p.quality}/10` : ''}</span>
                        <StageBadge stage={p.stage} />
                        {/* Inline preview snippet */}
                        {p.latex && (
                          <p className="hidden lg:block text-xs text-slate-400 truncate max-w-xs ml-2">
                            {(p.latex || '').slice(0, 80)}…
                          </p>
                        )}
                      </div>

                      {canEdit && (
                        <button onClick={(e) => { e.stopPropagation(); handleRemove(p.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition flex-shrink-0"
                          title="Remove from exam">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: picker + comments */}
          <div className="w-full lg:w-96 flex-shrink-0 space-y-4">

            {/* Problem picker */}
            {showPicker && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Add Problems</p>
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search ID or text…"
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-ucla-blue/20 transition" />
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {['all', ...TOPICS].map(t => (
                      <button key={t} onClick={() => setTopicFilter(t)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                          topicFilter === t ? 'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}>{t === 'all' ? 'All Topics' : t}</button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    {['all', 'Endorsed', 'Published', 'Idea'].map(s => (
                      <button key={s} onClick={() => setStageFilter(s)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                          stageFilter === s ? 'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}>{s === 'all' ? 'All Stages' : s}</button>
                    ))}
                  </div>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
                  {problemsLoading ? (
                    <div className="flex items-center justify-center py-8"><Spinner /></div>
                  ) : pickerProblems.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-8">No problems match.</p>
                  ) : pickerProblems.map(p => {
                    const inExam = (exam.problems || []).some(ep => ep.id === p.id);
                    return (
                      <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 transition ${inExam ? 'opacity-40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewProblem(p)}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-ucla-blue dark:text-[#FFD100]">{p.id}</span>
                            {(p.topics || []).map(t => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{t}</span>
                            ))}
                            <span className="text-[10px] text-slate-400 ml-auto">{p.quality ? `${p.quality}/10` : ''}</span>
                          </div>
                          {p.latex && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{(p.latex || '').slice(0, 80)}…</p>
                          )}
                        </div>
                        {inExam ? (
                          <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">Added</span>
                        ) : (
                          <button onClick={() => handleAdd(p)}
                            className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 text-[10px] font-bold hover:opacity-90 transition">
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments */}
            <CommentsPanel examId={exam.id} currentUserId={currentUser?.id} isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      {/* Problem preview modal */}
      {previewProblem && <ProblemPreview problem={previewProblem} onClose={() => setPreviewProblem(null)} />}
    </Layout>
  );
};

export default ExamDetail;
