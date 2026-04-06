import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, Plus, Trash2, Check, Search, X,
  ChevronRight, AlertCircle, Loader2, FileText
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

// ─── helpers ────────────────────────────────────────────────────────────────
const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

const StageBadge = ({ stage }) => {
  const colours =
    stage === 'Endorsed'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : stage === 'Published'
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colours}`}>
      {stage}
    </span>
  );
};

const Spinner = () => (
  <Loader2 size={16} className="animate-spin text-ucla-blue dark:text-[#FFD100]" />
);

const ErrorMsg = ({ msg }) =>
  msg ? (
    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-2">
      <AlertCircle size={14} />
      {msg}
    </div>
  ) : null;

// ─── New Exam Modal ──────────────────────────────────────────────────────────
const NewExamModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({ competition: '', name: '', description: '', version: 'v1' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.competition.trim() || !form.name.trim() || !form.version.trim()) {
      setError('Competition, Name, and Version are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/tests', { ...form, problemIds: [] });
      onCreate(res.data);
      onClose();
    } catch {
      setError('Failed to create exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-ucla-blue/30 dark:focus:ring-[#FFD100]/30 transition';
  const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">New Exam</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X size={18} className="text-slate-500" />
          </button>
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
              {loading ? <Spinner /> : <Plus size={15} />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const ExamManager = () => {
  // exams state
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');

  // selected exam
  const [selectedExam, setSelectedExam] = useState(null);

  // all problems (for the add-questions panel)
  const [allProblems, setAllProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [problemsError, setProblemsError] = useState('');

  // remove / add action errors
  const [actionError, setActionError] = useState('');

  // modal
  const [showModal, setShowModal] = useState(false);

  // problem filters
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('Endorsed');

  // ── fetch exams on mount
  useEffect(() => {
    fetchExams();
  }, []);

  // ── fetch all problems once (lazy — when first exam is selected)
  useEffect(() => {
    if (selectedExam && allProblems.length === 0 && !problemsLoading) {
      fetchProblems();
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    setExamsLoading(true);
    setExamsError('');
    try {
      const res = await api.get('/tests');
      setExams(res.data);
    } catch {
      setExamsError('Failed to load exams.');
    } finally {
      setExamsLoading(false);
    }
  };

  const fetchProblems = async () => {
    setProblemsLoading(true);
    setProblemsError('');
    try {
      const res = await api.get('/problems');
      setAllProblems(res.data);
    } catch {
      setProblemsError('Failed to load problems.');
    } finally {
      setProblemsLoading(false);
    }
  };

  // ── create exam callback
  const handleCreated = (newExam) => {
    setExams(prev => [newExam, ...prev]);
    setSelectedExam(newExam);
  };

  // ── remove problem from exam (optimistic)
  const handleRemoveProblem = async (problemId) => {
    setActionError('');
    const prev = selectedExam.problems;
    setSelectedExam(e => ({ ...e, problems: e.problems.filter(p => p.id !== problemId) }));
    setExams(es => es.map(e =>
      e.id === selectedExam.id
        ? { ...e, problems: e.problems.filter(p => p.id !== problemId) }
        : e
    ));
    try {
      await api.delete(`/tests/${selectedExam.id}/problems/${problemId}`);
    } catch {
      setActionError('Failed to remove problem. Please try again.');
      setSelectedExam(e => ({ ...e, problems: prev }));
      setExams(es => es.map(e => e.id === selectedExam.id ? { ...e, problems: prev } : e));
    }
  };

  // ── add problem to exam (optimistic)
  const handleAddProblem = async (problem) => {
    setActionError('');
    const prev = selectedExam.problems;
    setSelectedExam(e => ({ ...e, problems: [...e.problems, problem] }));
    setExams(es => es.map(e =>
      e.id === selectedExam.id
        ? { ...e, problems: [...e.problems, problem] }
        : e
    ));
    try {
      await api.post(`/tests/${selectedExam.id}/problems`, { problemId: problem.id });
    } catch {
      setActionError('Failed to add problem. Please try again.');
      setSelectedExam(e => ({ ...e, problems: prev }));
      setExams(es => es.map(e => e.id === selectedExam.id ? { ...e, problems: prev } : e));
    }
  };

  // ── delete exam
  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await api.delete(`/tests/${examId}`);
      setExams(prev => prev.filter(e => e.id !== examId));
      if (selectedExam?.id === examId) setSelectedExam(null);
    } catch {
      setActionError('Failed to delete exam.');
    }
  };

  // ── filtered problems for the add-questions table
  const filteredProblems = useMemo(() => {
    return allProblems.filter(p => {
      const matchSearch = search === '' || p.id.toLowerCase().includes(search.toLowerCase());
      const matchTopic = topicFilter === 'all' || (p.topics || []).includes(topicFilter);
      const matchStage = stageFilter === 'all' || p.stage === stageFilter;
      return matchSearch && matchTopic && matchStage;
    });
  }, [allProblems, search, topicFilter, stageFilter]);

  const examProblemIds = useMemo(
    () => new Set((selectedExam?.problems || []).map(p => p.id)),
    [selectedExam]
  );

  // ── shared input style
  const inputCls =
    'px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium outline-none focus:ring-2 focus:ring-ucla-blue/20 dark:focus:ring-[#FFD100]/20 transition';

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClipboardList size={26} className="text-ucla-blue dark:text-[#FFD100]" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Exams</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Build and manage competition exam sets</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 rounded-lg font-bold text-sm hover:opacity-90 transition shadow-sm"
          >
            <Plus size={16} /> New Exam
          </button>
        </div>

        {/* Two-panel layout */}
        <div className="flex gap-5" style={{ minHeight: '70vh' }}>

          {/* ── LEFT PANEL: Exam list ─────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3">
            {examsLoading ? (
              <div className="flex items-center justify-center py-16"><Spinner /></div>
            ) : examsError ? (
              <ErrorMsg msg={examsError} />
            ) : exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText size={36} className="text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No exams yet.</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Create your first exam to get started.</p>
              </div>
            ) : exams.map(exam => (
              <div
                key={exam.id}
                onClick={() => setSelectedExam(exam)}
                className={`group relative cursor-pointer rounded-xl border p-4 transition-all ${
                  selectedExam?.id === exam.id
                    ? 'border-ucla-blue dark:border-[#FFD100] bg-blue-50 dark:bg-[#FFD100]/5 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{exam.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{exam.competition}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                    title="Delete exam"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {exam.version}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {exam.problems?.length ?? 0} problem{exam.problems?.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {selectedExam?.id === exam.id && (
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ucla-blue dark:text-[#FFD100]" />
                )}
              </div>
            ))}
          </div>

          {/* ── RIGHT PANEL: Exam detail ──────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {!selectedExam ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24">
                <ClipboardList size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Select an exam to view and edit it</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Or create a new one with the button above</p>
              </div>
            ) : (
              <div className="space-y-5">

                {/* Exam header card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selectedExam.name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedExam.competition} &middot; <span className="font-mono">{selectedExam.version}</span>
                      </p>
                      {selectedExam.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{selectedExam.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold px-3 py-1 rounded-full bg-ucla-blue/10 dark:bg-[#FFD100]/10 text-ucla-blue dark:text-[#FFD100]">
                      {selectedExam.problems?.length ?? 0} problems
                    </span>
                  </div>
                </div>

                <ErrorMsg msg={actionError} />

                {/* Problems in this exam */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Problems in this Exam</h3>
                  </div>
                  {selectedExam.problems?.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-slate-400 dark:text-slate-500 text-sm">No problems added yet. Use the table below to add some.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60">
                        <tr>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-8">#</th>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Problem ID</th>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Topics</th>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quality</th>
                          <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stage</th>
                          <th className="px-5 py-2.5 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedExam.problems.map((p, i) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="px-5 py-3 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                            <td className="px-5 py-3 font-mono text-sm font-bold text-ucla-blue dark:text-[#FFD100]">{p.id}</td>
                            <td className="px-5 py-3">
                              <div className="flex flex-wrap gap-1">
                                {(p.topics || []).map(t => (
                                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{p.quality ? `${p.quality}/10` : '—'}</td>
                            <td className="px-5 py-3"><StageBadge stage={p.stage} /></td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => handleRemoveProblem(p.id)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition"
                                title="Remove from exam"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Add Questions */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Add Questions</h3>
                  </div>

                  {/* Filters */}
                  <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs outline-none focus:ring-2 focus:ring-ucla-blue/20 dark:focus:ring-[#FFD100]/20 transition"
                      />
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

                  {problemsLoading ? (
                    <div className="flex items-center justify-center py-10"><Spinner /></div>
                  ) : problemsError ? (
                    <div className="p-5"><ErrorMsg msg={problemsError} /></div>
                  ) : (
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
                          {filteredProblems.length === 0 ? (
                            <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">No matching problems.</td></tr>
                          ) : filteredProblems.map(p => {
                            const alreadyIn = examProblemIds.has(p.id);
                            return (
                              <tr key={p.id} className={`transition ${
                                alreadyIn ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}>
                                <td className="px-5 py-3 font-mono text-sm font-bold text-ucla-blue dark:text-[#FFD100]">{p.id}</td>
                                <td className="px-5 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(p.topics || []).map(t => (
                                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">{t}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{p.quality ? `${p.quality}/10` : '—'}</td>
                                <td className="px-5 py-3"><StageBadge stage={p.stage} /></td>
                                <td className="px-5 py-3 text-right">
                                  {alreadyIn ? (
                                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold">
                                      <Check size={13} /> Added
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleAddProblem(p)}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
                                    >
                                      <Plus size={12} /> Add
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <NewExamModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreated}
        />
      )}
    </Layout>
  );
};

export default ExamManager;
