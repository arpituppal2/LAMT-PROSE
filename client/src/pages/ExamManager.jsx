import { useState, useEffect } from 'react';
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
    label: 'Individual: Algebra & NT',
    description: '10 problems + 1 Estimation. Topics: Algebra / Number Theory. 50 min.',
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
const Spinner = ({ size = 16 }) => (
  <Loader2 size={size} className="animate-spin" />
);

const ErrorMsg = ({ msg }) =>
  msg ? (
    <div className="flex items-center gap-2 text-[var(--badge-needs-review-text)] text-sm mt-2">
      <AlertCircle size={14} className="flex-shrink-0" />
      <span>{msg}</span>
    </div>
  ) : null;

// ─── Input / label shared classes ─────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 rounded-[var(--radius-md)] border border-slate-200 dark:border-white/10 ' +
  'bg-white dark:bg-white/5 text-slate-800 dark:text-slate-100 text-sm outline-none ' +
  'focus:ring-2 focus:ring-[var(--ucla-blue)]/25 dark:focus:ring-[var(--ucla-gold)]/20 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 transition';

const labelCls =
  'block text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider';

// ─── New Exam Modal ───────────────────────────────────────────────────────────
const NewExamModal = ({ onClose, onCreate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({ competition: '', name: '', description: '', version: 'v1' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const applyTemplate = (tpl) => {
    setSelectedTemplate(tpl.key === selectedTemplate?.key ? null : tpl);
    if (tpl.key !== selectedTemplate?.key) {
      setForm(f => ({ ...f, name: tpl.label }));
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-[var(--app-surface)] rounded-[var(--radius-xl)] shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-xl mx-4 overflow-hidden"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/8">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">New Exam</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-[var(--radius-sm)] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/8 transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: 'calc(90dvh - 57px)' }}>
          {/* Template picker */}
          <div>
            <p className={labelCls}>Template <span className="normal-case font-normal text-slate-400">(optional)</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className={[
                    'text-left px-3 py-2.5 rounded-[var(--radius-md)] border transition text-xs',
                    selectedTemplate?.key === tpl.key
                      ? 'border-[var(--ucla-blue)] dark:border-[var(--ucla-gold)] bg-[var(--ucla-blue)]/5 dark:bg-[var(--ucla-gold)]/5'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-white/3',
                  ].join(' ')}
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{tpl.label}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 leading-snug">{tpl.description}</p>
                </button>
              ))}
            </div>
            {selectedTemplate && (
              <div className="mt-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--ucla-blue)]/5 dark:bg-[var(--ucla-gold)]/5 border border-[var(--ucla-blue)]/15 dark:border-[var(--ucla-gold)]/15 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Scoring:</strong> {selectedTemplate.scoring}
              </div>
            )}
          </div>

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="space-y-4" id="new-exam-form">
            <div>
              <label className={labelCls}>Competition *</label>
              <input className={inputCls} value={form.competition} onChange={set('competition')} placeholder="e.g. LAMT 2026" autoFocus />
            </div>
            <div>
              <label className={labelCls}>Exam Name *</label>
              <input className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Individual: Algebra & NT" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Version *</label>
                <input className={inputCls} value={form.version} onChange={set('version')} placeholder="v1" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Description <span className="normal-case font-normal">— optional</span></label>
              <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={set('description')} placeholder="Brief description..." />
            </div>
            <ErrorMsg msg={error} />
          </form>
        </div>

        {/* Sticky footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-white/8 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-[var(--radius-md)] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-exam-form"
            disabled={loading}
            className="flex-1 py-2 rounded-[var(--radius-md)] bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] text-white dark:text-slate-900 text-sm font-semibold hover:bg-[var(--ucla-blue-hover)] dark:hover:bg-[var(--ucla-gold-hover)] disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? <Spinner size={15} /> : <Plus size={15} />}
            {loading ? 'Creating…' : 'Create Exam'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Exam card ────────────────────────────────────────────────────────────────
const ExamCard = ({ exam, canEdit, onDelete, onClick }) => {
  const problemCount = exam.problems?.length ?? 0;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-[var(--radius-lg)] border border-slate-200 dark:border-white/8 bg-white dark:bg-[var(--app-surface)] px-4 py-3.5 hover:border-slate-300 dark:hover:border-white/15 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{exam.name}</p>
            {exam.templateType && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--ucla-blue)]/10 dark:bg-[var(--ucla-gold)]/10 text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] border border-[var(--ucla-blue)]/15 dark:border-[var(--ucla-gold)]/15">
                {exam.templateType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{exam.competition}</span>
            <span className="text-slate-300 dark:text-slate-700 text-xs">·</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400">
              {exam.version}
            </span>
            <span className="text-slate-300 dark:text-slate-700 text-xs">·</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              {problemCount} problem{problemCount !== 1 ? 's' : ''}
            </span>
            {(exam.author?.firstName || exam.author?.lastName) && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-xs">·</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {[exam.author.firstName, exam.author.lastName].filter(Boolean).join(' ')}
                </span>
              </>
            )}
            {exam.updatedAt && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-xs">·</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(exam.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(exam.id); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[var(--radius-sm)] text-slate-300 dark:text-slate-600 hover:text-[var(--badge-needs-review-text)] hover:bg-[var(--badge-needs-review-bg)] transition"
              title="Delete exam"
              aria-label="Delete exam"
            >
              <Trash2 size={13} />
            </button>
          )}
          <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
        </div>
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
          <div className="flex items-center gap-2.5">
            <ClipboardList size={20} className="text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] flex-shrink-0" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">Exams</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Build and manage competition exam sets</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] text-white dark:text-slate-900 rounded-[var(--radius-md)] font-semibold text-sm hover:bg-[var(--ucla-blue-hover)] dark:hover:bg-[var(--ucla-gold-hover)] transition shadow-sm"
          >
            <Plus size={15} /> New Exam
          </button>
        </div>

        {/* Exam list */}
        {examsLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 dark:text-slate-600">
            <Spinner size={20} />
          </div>
        ) : examsError ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--badge-needs-review-bg)] border border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)] text-sm">
            <AlertCircle size={14} className="flex-shrink-0" />{examsError}
          </div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-[var(--radius-xl)]">
            <FileText size={32} className="text-slate-200 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No exams yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4">Create your first exam to get started.</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] text-white dark:text-slate-900 rounded-[var(--radius-md)] font-semibold text-sm hover:bg-[var(--ucla-blue-hover)] dark:hover:bg-[var(--ucla-gold-hover)] transition"
            >
              <Plus size={14} /> New Exam
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {exams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                canEdit={canEditExam(exam)}
                onDelete={handleDeleteExam}
                onClick={() => navigate(`/exams/${exam.id}`)}
              />
            ))}
          </div>
        )}
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
