import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, AlertCircle, Loader2, FileText, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

const Spinner = ({ size = 16 }) => <Loader2 size={size} className="animate-spin" />;

const ErrorMsg = ({ msg }) =>
  msg ? (
    <div className="flex items-center gap-2 text-[var(--badge-needs-review-text)] text-sm mt-2">
      <AlertCircle size={14} className="flex-shrink-0" />
      <span>{msg}</span>
    </div>
  ) : null;

/* ── Field wrapper ──────────────────────────────────────────── */
const Field = ({ label, hint, children }) => (
  <div>
    <label className="section-label">{label}</label>
    {hint && <p className="text-[13px] text-[var(--color-text-faint)] mt-0.5 mb-1">{hint}</p>}
    <div className="mt-1.5">{children}</div>
  </div>
);

/* ── New Exam Modal ────────────────────────────────────────── */
const NewExamModal = ({ onClose, onCreate }) => {
  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState({
    name: '',
    competition: '',
    description: '',
    roundType: 'Individual',
    roundName: '',
    numSets: 1,
    questionsPerSet: 10,
    estimationSets: 0,
    examTopics: [],
    tournamentId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/tournaments').then(r => setTournaments(r.data || [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm(f => ({ ...f, [k]: Math.max(0, parseInt(e.target.value) || 0) }));

  const toggleTopic = (t) =>
    setForm(f => ({
      ...f,
      examTopics: f.examTopics.includes(t)
        ? f.examTopics.filter(x => x !== t)
        : [...f.examTopics, t],
    }));

  const totalSlots = form.numSets * form.questionsPerSet + form.estimationSets;

  const selectedTournament = tournaments.find(t => t.id === form.tournamentId);
  const roundOptions = selectedTournament
    ? [...selectedTournament.rounds.filter(r => !form.roundType || r.roundType === form.roundType), { id: '__other__', name: 'Other' }]
    : [{ id: '__other__', name: 'Other' }];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Exam name is required.'); return; }
    if (form.numSets < 1) { setError('Must have at least 1 set.'); return; }
    if (form.questionsPerSet < 1) { setError('Must have at least 1 question per set.'); return; }
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        competition: form.competition.trim() || (selectedTournament?.name || ''),
        description: form.description.trim() || null,
        roundType: form.roundType,
        roundName: form.roundName === '__other__' ? '' : (form.roundName || null),
        numSets: form.numSets,
        questionsPerSet: form.questionsPerSet,
        estimationSets: form.estimationSets,
        examTopics: form.examTopics,
        tournamentId: form.tournamentId || null,
        problemIds: [],
      };
      const res = await api.post('/tests', payload);
      // Normalise id field in case backend returns _id
      const newExam = { ...res.data, id: res.data.id ?? res.data._id };
      onCreate(newExam);
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
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>New Exam</h2>
          <button onClick={onClose} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="new-exam-form">
          <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(92dvh - 113px)' }}>

            {/* Tournament */}
            <Field label="Tournament" hint="Select the tournament this exam belongs to.">
              <div className="relative">
                <select className="input-base w-full pr-8 appearance-none" value={form.tournamentId} onChange={set('tournamentId')}>
                  <option value="">— None / standalone —</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
              </div>
            </Field>

            {/* Round type */}
            <Field label="Round Type">
              <div className="relative">
                <select className="input-base w-full pr-8 appearance-none" value={form.roundType} onChange={set('roundType')}>
                  <option value="Individual">Individual</option>
                  <option value="Team">Team</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
              </div>
            </Field>

            {/* Round name */}
            <Field label="Round Name" hint={selectedTournament ? 'Pick a pre-defined round or choose Other to type freely.' : 'Type the round name, or set up rounds in the Admin panel first.'}>
              {selectedTournament ? (
                <div className="space-y-1.5">
                  <div className="relative">
                    <select className="input-base w-full pr-8 appearance-none" value={form.roundName} onChange={set('roundName')}>
                      <option value="">— Select —</option>
                      {roundOptions.map(r => <option key={r.id} value={r.id === '__other__' ? '__other__' : r.name}>{r.name}</option>)}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
                  </div>
                  {form.roundName === '__other__' && (
                    <input className="input-base w-full" placeholder="e.g. Individual: Algebra & NT" onChange={e => setForm(f => ({ ...f, roundName: e.target.value }))} />
                  )}
                </div>
              ) : (
                <input className="input-base w-full" value={form.roundName} onChange={set('roundName')} placeholder="e.g. Individual: Algebra & NT" />
              )}
            </Field>

            {/* Exam name */}
            <Field label="Exam Name *">
              <input className="input-base w-full" value={form.name} onChange={set('name')} placeholder="e.g. LAMT 2026 — Individual: Algebra & NT" autoFocus />
            </Field>

            {/* Competition label */}
            <Field label="Competition Label" hint="Shown on the exam header. Defaults to the tournament name if left blank.">
              <input className="input-base w-full" value={form.competition} onChange={set('competition')} placeholder={selectedTournament?.name || 'e.g. LAMT 2026'} />
            </Field>

            {/* Structure */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Sets" hint="Groups of questions. Use 1 for most rounds; Guts uses multiple sets.">
                <input type="number" min={1} className="input-base w-full" value={form.numSets} onChange={setNum('numSets')} />
              </Field>
              <Field label="Questions / Set" hint="Number of scored questions in each set.">
                <input type="number" min={1} className="input-base w-full" value={form.questionsPerSet} onChange={setNum('questionsPerSet')} />
              </Field>
              <Field label="Estimation Slots" hint="Tiebreak / estimation questions appended after the main questions.">
                <input type="number" min={0} className="input-base w-full" value={form.estimationSets} onChange={setNum('estimationSets')} />
              </Field>
            </div>

            {/* Total count badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-xs">
              <span className="text-[var(--color-text-muted)]">Total slots:</span>
              <span className="font-bold tabular-nums text-[var(--color-accent)]">{totalSlots}</span>
              <span className="text-[var(--color-text-faint)]">
                ({form.numSets} set{form.numSets !== 1 ? 's' : ''} × {form.questionsPerSet} q{form.questionsPerSet !== 1 ? 's' : ''}
                {form.estimationSets > 0 ? ` + ${form.estimationSets} estimation` : ''})
              </span>
            </div>

            {/* Exam topics — btn-toggle */}
            <Field label="Exam Topics" hint="Which topics should appear in the problem bank for this exam? Leave blank to show all.">
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className={`btn-toggle btn-sm${form.examTopics.includes(t) ? ' active' : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {form.examTopics.length === 0 && (
                <p className="text-[13px] text-[var(--color-text-faint)] mt-1">All topics shown.</p>
              )}
            </Field>

            {/* Description */}
            <Field label={<>Description <span className="normal-case font-normal text-[var(--color-text-faint)]">— optional</span></>}>
              <textarea
                className="input-base w-full resize-none" rows={2}
                value={form.description} onChange={set('description')}
                placeholder="Notes, scoring rules, time limit…"
              />
            </Field>

            <ErrorMsg msg={error} />
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2.5">
            <button type="button" onClick={onClose} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="btn-filled flex-1 py-2 text-sm flex items-center justify-center gap-2"
            >
              {loading ? <Spinner size={15} /> : null}
              {loading ? 'Creating…' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Exam card ─────────────────────────────────────────────── */
const ExamCard = ({ exam, onClick }) => {
  const problemCount = Array.isArray(exam.problems) ? exam.problems.length : 0;
  const totalSlots   = (exam.numSets ?? 1) * (exam.questionsPerSet ?? 10) + (exam.estimationSets ?? 0);
  const authorName   = [exam.author?.firstName, exam.author?.lastName].filter(Boolean).join(' ');

  return (
    <div
      onClick={onClick}
      className="cursor-pointer surface-card px-5 py-4 hover:bg-[var(--color-surface)] transition-all"
    >
      {/* ── Exam name ── */}
      <p
        className="font-bold leading-tight mb-1.5 truncate"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}
      >
        {exam.name}
      </p>

      {/* ── Metadata row ── */}
      <div className="flex items-center gap-1.5 flex-wrap">

        {exam.roundType && (
          <span
            className="font-semibold"
            style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)' }}
          >
            {exam.roundType}
          </span>
        )}

        {exam.tournament?.name && (
          <>
            <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>·</span>
            <span
              className="truncate max-w-[200px]"
              style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}
            >
              {exam.tournament.name}
            </span>
          </>
        )}

        <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>·</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{totalSlots}</span>
          {' '}slots
        </span>

        <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>·</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{problemCount}</span>
          {' '}filled
        </span>

        {authorName && (
          <>
            <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>·</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{authorName}</span>
          </>
        )}
      </div>

      {/* ── Action row ── */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          className="btn-outline btn-sm"
        >
          Enter
        </button>
        {exam.testsolveStatus === 'active' && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 border"
            style={{
              color: 'var(--color-success)',
              borderColor: 'rgba(67,122,34,0.35)',
              background: 'var(--badge-endorsed-bg)',
            }}
          >
            Testsolving Active
          </span>
        )}
        {exam.isLocked && exam.testsolveStatus !== 'active' && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 border"
            style={{
              color: 'var(--color-orange)',
              borderColor: 'rgba(218,113,1,0.35)',
              background: 'var(--badge-idea-bg)',
            }}
          >
            Locked
          </span>
        )}
        <span
          className="ml-auto text-[11px] tabular-nums"
          style={{ color: 'var(--color-text-faint)' }}
        >
          {totalSlots > 0
            ? `${Math.round((problemCount / totalSlots) * 100)}% filled`
            : '0% filled'}
        </span>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   EXAM MANAGER
══════════════════════════════════════════════════════════ */
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
      // Normalise id field in case backend returns _id instead of id
      const normalised = (r.data || []).map(e => ({ ...e, id: e.id ?? e._id }));
      setExams(normalised);
    } catch {
      setExamsError('Failed to load exams.');
    } finally {
      setExamsLoading(false);
    }
  };

  const handleCreated = newExam => {
    const normalised = { ...newExam, id: newExam.id ?? newExam._id };
    setExams(prev => [normalised, ...prev]);
    navigate(`/exams/${normalised.id}`);
  };

  return (
    <Layout pageKey="exams">
      <div className="max-w-[960px] mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <span className="gold-rule mb-3" />
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Exams</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-filled flex items-center gap-1.5 px-4 py-2.5 text-sm">
            New Exam
          </button>
        </header>

        {examsLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]"><Spinner size={20} /></div>
        ) : examsError ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-[var(--badge-needs-review-bg)] border border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)] text-sm">
            <AlertCircle size={14} className="flex-shrink-0" />{examsError}
          </div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--color-border)] surface-card">
            <FileText size={32} className="text-[var(--color-text-faint)] mb-3" />
            <p className="text-sm font-medium">No exams yet</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4">Create your first exam to get started.</p>
            <button onClick={() => setShowModal(true)} className="btn-filled flex items-center gap-1.5 px-4 py-2 text-sm">
              New Exam
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {exams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onClick={() => navigate(`/exams/${exam.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && <NewExamModal onClose={() => setShowModal(false)} onCreate={handleCreated} />}
    </Layout>
  );
};

export default ExamManager;
