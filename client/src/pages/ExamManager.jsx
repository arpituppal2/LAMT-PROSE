import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X, AlertCircle, Loader2, FileText, Edit2 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

/* ── constants ───────────────────────────────────────────────── */
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

/* ── helpers ──────────────────────────────────────────────────── */
const Spinner = ({ size = 16 }) => <Loader2 size={size} className="animate-spin" />;

const ErrorMsg = ({ msg }) =>
  msg ? (
    <div className="flex items-center gap-2 text-[var(--badge-needs-review-text)] text-sm mt-2">
      <AlertCircle size={14} className="flex-shrink-0" />
      <span>{msg}</span>
    </div>
  ) : null;

/* ── KaTeX renderer (reuse window.katex if available) ─────────── */
const renderMath = (tex, display = false) => {
  if (typeof window !== 'undefined' && window.katex) {
    try {
      return window.katex.renderToString(tex, { throwOnError: false, displayMode: display });
    } catch { return tex; }
  }
  return tex;
};

const MathText = ({ text }) => {
  if (!text) return null;
  // Split on $...$ and $$...$$
  const parts = [];
  let remaining = text;
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', val: text.slice(last, match.index) });
    const raw = match[0];
    const display = raw.startsWith('$$');
    const inner = display ? raw.slice(2, -2) : raw.slice(1, -1);
    parts.push({ type: 'math', val: inner, display });
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', val: text.slice(last) });
  return (
    <span>
      {parts.map((p, i) =>
        p.type === 'text' ? (
          <span key={i}>{p.val}</span>
        ) : (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: renderMath(p.val, p.display) }}
          />
        )
      )}
    </span>
  );
};

/* ── Preview Modal ───────────────────────────────────────────── */
const PreviewModal = ({ exam, onClose }) => {
  const problems = exam.problems ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="surface-card shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        style={{ maxHeight: '90dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{exam.name}</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {exam.competition} · {exam.version} · {problems.length} problem{problems.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Problem list */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90dvh - 65px)' }}>
          {problems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={28} className="text-[var(--color-text-faint)] mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">No problems in this exam yet.</p>
            </div>
          ) : (
            <ol className="divide-y divide-[var(--color-border)]">
              {problems.map((p, idx) => (
                <li key={p.id} className="px-5 py-4">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 text-right text-xs font-semibold tabular-nums text-[var(--color-text-muted)] pt-0.5">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {p.topic && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]">
                            {p.topic}
                          </span>
                        )}
                        {p.subtopic && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[var(--color-surface-offset)] text-[var(--color-text-faint)]">
                            {p.subtopic}
                          </span>
                        )}
                        {p.difficulty != null && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]">
                            D{p.difficulty}
                          </span>
                        )}
                      </div>
                      {/* Problem statement */}
                      <p className="text-sm leading-relaxed">
                        <MathText text={p.problem} />
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── New Exam Modal ──────────────────────────────────────────── */
const NewExamModal = ({ onClose, onCreate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({ competition: '', name: '', description: '', version: 'v1' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyTemplate = (tpl) => {
    setSelectedTemplate(tpl.key === selectedTemplate?.key ? null : tpl);
    if (tpl.key !== selectedTemplate?.key) setForm((f) => ({ ...f, name: tpl.label }));
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
    <div className="modal-overlay">
      <div
        className="surface-card shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
        style={{ maxHeight: '90dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold">New Exam</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: 'calc(90dvh - 57px)' }}>
          {/* Template picker */}
          <div>
            <p className="section-label">
              Template <span className="normal-case font-normal text-[var(--color-text-faint)]">(optional)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className={[
                    'text-left px-3 py-2.5 rounded-sm border transition text-xs',
                    selectedTemplate?.key === tpl.key
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40 bg-[var(--color-bg)]',
                  ].join(' ')}
                >
                  <p className="font-semibold">{tpl.label}</p>
                  <p className="text-[var(--color-text-faint)] text-[11px] mt-0.5 leading-snug">{tpl.description}</p>
                </button>
              ))}
            </div>
            {selectedTemplate && (
              <div className="mt-2 px-3 py-2 rounded-sm bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/15 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                <strong>Scoring:</strong> {selectedTemplate.scoring}
              </div>
            )}
          </div>

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="space-y-4" id="new-exam-form">
            <div>
              <label className="section-label">Competition *</label>
              <input className="input-base w-full mt-1.5" value={form.competition} onChange={set('competition')} placeholder="e.g. LAMT 2026" autoFocus />
            </div>
            <div>
              <label className="section-label">Exam Name *</label>
              <input className="input-base w-full mt-1.5" value={form.name} onChange={set('name')} placeholder="e.g. Individual: Algebra & NT" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label">Version *</label>
                <input className="input-base w-full mt-1.5" value={form.version} onChange={set('version')} placeholder="v1" />
              </div>
            </div>
            <div>
              <label className="section-label">
                Description <span className="normal-case font-normal text-[var(--color-text-faint)]">— optional</span>
              </label>
              <textarea className="input-base w-full resize-none mt-1.5" rows={2} value={form.description} onChange={set('description')} placeholder="Brief description..." />
            </div>
            <ErrorMsg msg={error} />
          </form>
        </div>

        {/* Sticky footer */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2.5">
          <button type="button" onClick={onClose} className="btn-outline flex-1 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            form="new-exam-form"
            disabled={loading}
            className="btn-filled flex-1 py-2 text-sm flex items-center justify-center gap-2"
          >
            {loading ? <Spinner size={15} /> : <Plus size={15} />}
            {loading ? 'Creating…' : 'Create Exam'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Exam card ───────────────────────────────────────────────── */
const ExamCard = ({ exam, canEdit, onDelete, onClick, onPreview }) => {
  // problems array is always included from the API; fall back to problemIds length
  const problemCount =
    Array.isArray(exam.problems)
      ? exam.problems.length
      : Array.isArray(exam.problemIds)
      ? exam.problemIds.length
      : 0;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer surface-card px-5 py-3.5 hover:bg-[var(--color-surface)] transition-all"
    >
      {/* Single-line layout: name · competition · version · N problems · author */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Left: all meta on one line */}
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="font-semibold text-sm whitespace-nowrap">{exam.name}</span>

          {exam.templateType && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/15 whitespace-nowrap">
              {exam.templateType}
            </span>
          )}

          <span className="text-[var(--color-text-faint)] text-xs">·</span>
          <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap truncate max-w-[160px]">{exam.competition}</span>

          <span className="text-[var(--color-text-faint)] text-xs">·</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] whitespace-nowrap">
            {exam.version}
          </span>

          <span className="text-[var(--color-text-faint)] text-xs">·</span>
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
            {problemCount} problem{problemCount !== 1 ? 's' : ''}
          </span>

          {(exam.author?.firstName || exam.author?.lastName) && (
            <>
              <span className="text-[var(--color-text-faint)] text-xs">·</span>
              <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                {[exam.author.firstName, exam.author.lastName].filter(Boolean).join(' ')}
              </span>
            </>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(exam.id); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-sm text-[var(--color-text-faint)] hover:text-[var(--badge-needs-review-text)] hover:bg-[var(--badge-needs-review-bg)] transition"
              title="Delete exam"
              aria-label="Delete exam"
            >
              <Trash2 size={13} />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="opacity-0 group-hover:opacity-100 btn-outline flex items-center gap-1.5 px-2.5 py-1 text-xs"
            title="Edit exam"
            aria-label="Edit exam"
          >
            <Edit2 size={12} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   EXAM MANAGER
══════════════════════════════════════════════════════════════ */
const ExamManager = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [previewExam, setPreviewExam] = useState(null);

  useEffect(() => {
    api.get('/auth/me').then((r) => setCurrentUser(r.data.user)).catch(() => {});
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
    setExams((prev) => [newExam, ...prev]);
    navigate(`/exams/${newExam.id}`);
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await api.delete(`/tests/${examId}`);
      setExams((prev) => prev.filter((e) => e.id !== examId));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete exam.');
    }
  };

  return (
    <Layout>
      <div className="max-w-[960px] mx-auto space-y-5">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <span className="gold-rule mb-3" />
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Exams
            </h1>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-filled flex items-center gap-1.5 px-4 py-2.5 text-sm">
            <Plus size={15} /> New Exam
          </button>
        </header>

        {/* Exam list */}
        {examsLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Spinner size={20} />
          </div>
        ) : examsError ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-sm bg-[var(--badge-needs-review-bg)] border border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)] text-sm">
            <AlertCircle size={14} className="flex-shrink-0" />{examsError}
          </div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--color-border)] rounded-sm surface-card">
            <FileText size={32} className="text-[var(--color-text-faint)] mb-3" />
            <p className="text-sm font-medium">No exams yet</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4">Create your first exam to get started.</p>
            <button onClick={() => setShowModal(true)} className="btn-filled flex items-center gap-1.5 px-4 py-2 text-sm">
              <Plus size={14} /> New Exam
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {exams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                canEdit={canEditExam(exam)}
                onDelete={handleDeleteExam}
                onClick={() => navigate(`/exams/${exam.id}`)}
                onPreview={setPreviewExam}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewExamModal onClose={() => setShowModal(false)} onCreate={handleCreated} />
      )}

      {previewExam && (
        <PreviewModal exam={previewExam} onClose={() => setPreviewExam(null)} />
      )}
    </Layout>
  );
};

export default ExamManager;
