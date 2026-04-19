import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Trash2, X,
  ChevronRight, AlertCircle, Loader2, FileText,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

// ─── constants ────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    key: 'indiv-alg-nt',
    label: 'Individual: Algebra & Number Theory',
    description: '10 problems + 1 Estimation. Topic: Algebra / Number Theory. 50 min.',
    slots: 11,
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
    slots: 25,
    estimationSlot: true,
    allowedTopics: null,
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

// ─── helpers ──────────────────────────────────────────────────────────────────
const Spinner = () => <Loader2 size={16} className="animate-spin text-ucla-blue dark:text-[#FFD100]" />;

const ErrorMsg = ({ msg }) =>
  msg ? (
    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-2">
      <AlertCircle size={14} />{msg}
    </div>
  ) : null;

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
        templateType: selectedTemplate?.key || null,
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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

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

// ─── Main Page ────────────────────────────────────────────────────────────────
const ExamManager = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => setCurrentUser(r.data.user)).catch(() => {});
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setExamsLoading(true);
    setExamsError('');
    try {
      const r = await api.get('/tests');
      setExams(r.data);
    } catch {
      setExamsError('Failed to load exams.');
    } finally {
      setExamsLoading(false);
    }
  };

  const isAdmin = currentUser?.isAdmin || false;
  const canEditExam = (exam) =>
    isAdmin || !exam.authorId || exam.author?.id === currentUser?.id || exam.authorId === currentUser?.id;

  const handleCreated = (newExam) => {
    setExams(prev => [newExam, ...prev]);
    navigate(`/exams/${newExam.id}`);
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await api.delete(`/tests/${examId}`);
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete exam.');
    }
  };

  return (
    <Layout>
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
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

        {/* Exam list */}
        {examsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-ucla-blue dark:text-[#FFD100]" />
          </div>
        ) : examsError ? (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={14} />{examsError}
          </div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FileText size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No exams yet.</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Create your first exam to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {exams.map(exam => (
              <div
                key={exam.id}
                onClick={() => navigate(`/exams/${exam.id}`)}
                className="group relative cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{exam.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{exam.competition}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canEditExam(exam) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                        title="Delete exam"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
    {exam.version}
  </span>
  <span className="text-[10px] text-slate-400 dark:text-slate-500">
    {exam.problems?.length ?? 0} problem{exam.problems?.length !== 1 ? 's' : ''}
  </span>
  {exam.templateType && (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-ucla-blue/10 dark:bg-[#FFD100]/10 text-ucla-blue dark:text-[#FFD100]">
      {exam.templateType}
    </span>
  )}
  {(exam.author?.firstName || exam.author?.lastName) && (
    <>
      <span className="text-[10px] text-slate-300 dark:text-slate-700">·</span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500">
        {[exam.author.firstName, exam.author.lastName].filter(Boolean).join(' ')}
      </span>
    </>
  )}
  {exam.updatedAt && (
    <>
      <span className="text-[10px] text-slate-300 dark:text-slate-700">·</span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500">
        {new Date(exam.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    </>
  )}
</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <NewExamModal onClose={() => setShowModal(false)} onCreate={handleCreated} />}
    </Layout>
  );
};

export default ExamManager;
