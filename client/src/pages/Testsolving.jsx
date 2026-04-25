import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, ChevronRight, Lock, ArrowLeft, CheckCircle2,
  Circle, Loader2, AlertTriangle, X, Eye,
  ClipboardList, Trophy, Timer, MessageSquare, ChevronDown, ChevronUp, User, Trash2,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const FINAL_RATINGS = [
  { value: 'needs_work',  label: 'Needs Work',  color: 'var(--badge-needs-review-text)', bg: 'var(--badge-needs-review-bg)',  border: 'var(--badge-needs-review-border)' },
  { value: 'mostly_good', label: 'Mostly Good', color: 'var(--badge-resolved-text)',      bg: 'var(--badge-resolved-bg)',       border: 'var(--badge-resolved-border)' },
  { value: 'approved',    label: 'Approved',    color: 'var(--badge-endorsed-text)',      bg: 'var(--badge-endorsed-bg)',       border: 'var(--badge-endorsed-border)' },
];

const RATING_META = {
  needs_work:  { label: 'Needs Work',  color: 'var(--badge-needs-review-text)', bg: 'var(--badge-needs-review-bg)',  border: 'var(--badge-needs-review-border)' },
  mostly_good: { label: 'Mostly Good', color: 'var(--badge-resolved-text)',      bg: 'var(--badge-resolved-bg)',       border: 'var(--badge-resolved-border)' },
  approved:    { label: 'Approved',    color: 'var(--badge-endorsed-text)',      bg: 'var(--badge-endorsed-bg)',       border: 'var(--badge-endorsed-border)' },
};

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
const formatTime = (seconds) => {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${m}:${String(s).padStart(2, '0')}`;
};

const buildSlotLabel = (exam, index) => {
  if (!exam) return `Q${index + 1}`;
  const { numSets = 1, questionsPerSet = 10, estimationSets = 0 } = exam;
  const totalNormal = numSets * questionsPerSet;
  if (index >= totalNormal) {
    const estIndex = index - totalNormal;
    return estimationSets === 1 ? 'Estimation' : `Est. ${estIndex + 1}`;
  }
  if (numSets === 1) return `Q${index + 1}`;
  const set = Math.floor(index / questionsPerSet) + 1;
  const q   = (index % questionsPerSet) + 1;
  return `S${set}.${q}`;
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

/* ── ExamCard ─────────────────────────────────────────────── */
const ExamCard = ({ exam, onStart, onViewResults }) => (
  <div
    className="surface-card w-full text-left px-5 py-4"
    style={{ border: '1px solid var(--color-border)' }}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span
            className="text-base font-bold truncate"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            {exam.name}
          </span>
          {exam.competition && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }} className="truncate">{exam.competition}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
          {exam.roundType && (
            <span className="border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-semibold uppercase tracking-wide" style={{ fontSize: 'var(--text-xs)' }}>
              {exam.roundType}
            </span>
          )}
          {exam.roundName && <span>{exam.roundName}</span>}
          {exam.questionsPerSet && (
            <span className="tabular-nums">
              {exam.numSets > 1 ? `${exam.numSets} × ${exam.questionsPerSet}` : exam.questionsPerSet} problems
              {exam.estimationSets > 0 && ` + ${exam.estimationSets} estimation`}
            </span>
          )}
          {exam.timeLimit && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock size={11} />
              {exam.timeLimit} min
            </span>
          )}
        </div>
      </div>
      {/* UCLA-style action buttons — no icons, clean text only */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onViewResults(exam)}
          className="btn-outline btn-sm"
        >
          Results
        </button>
        <button
          type="button"
          onClick={() => onStart(exam)}
          className="btn-filled btn-sm"
        >
          Enter
        </button>
      </div>
    </div>
  </div>
);

/* ── ProblemNav ───────────────────────────────────────────── */
const ProblemNav = ({ problems, currentIndex, answers, onSelect, examMeta }) => (
  <div
    className="border-r border-[var(--color-border)] flex flex-col"
    style={{ width: '160px', minWidth: '160px', background: 'var(--color-surface)', height: '100%', overflow: 'auto' }}
  >
    <div
      className="px-3 py-3 border-b border-[var(--color-border)] section-label"
    >
      Problems
    </div>
    {problems.map((p, i) => {
      const label = buildSlotLabel(examMeta, p.slotIndex);
      const hasAnswer = !!answers[p.problemId]?.answer?.trim();
      const isCurrent = i === currentIndex;
      return (
        <button
          key={p.problemId}
          type="button"
          onClick={() => onSelect(i)}
          className="flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
          style={{
            background: isCurrent ? 'var(--sidebar-active-bg)' : 'transparent',
            borderLeft: isCurrent ? '2px solid var(--ucla-gold)' : '2px solid transparent',
            color: isCurrent ? 'var(--color-text)' : 'var(--color-text-muted)',
          }}
        >
          {hasAnswer
            ? <CheckCircle2 size={13} style={{ color: 'var(--badge-endorsed-text)', flexShrink: 0 }} />
            : <Circle size={13} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
          }
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: isCurrent ? 700 : 500, fontFamily: 'var(--font-body)' }}>
            {label}
          </span>
        </button>
      );
    })}
    {/* Overall section link */}
    <div className="mt-auto border-t border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => onSelect('overall')}
        className="flex items-center gap-2 px-3 py-2.5 w-full text-left transition-colors"
        style={{
          background: currentIndex === 'overall' ? 'var(--sidebar-active-bg)' : 'transparent',
          borderLeft: currentIndex === 'overall' ? '2px solid var(--ucla-gold)' : '2px solid transparent',
          color: currentIndex === 'overall' ? 'var(--color-text)' : 'var(--color-text-muted)',
        }}
      >
        <MessageSquare size={13} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: currentIndex === 'overall' ? 700 : 500 }}>Overall</span>
      </button>
    </div>
  </div>
);

/* ── InstructionsModal ────────────────────────────────────── */
const InstructionsModal = ({ exam, onBegin, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
    onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
  >
    <div className="w-full max-w-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
        <div>
          <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {exam.name} — Testsolve Instructions
          </p>
          <p className="mt-0.5 text-[var(--color-text-muted)]" style={{ fontSize: 'var(--text-xs)' }}>Please read before beginning</p>
        </div>
        <button type="button" onClick={onCancel} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="px-5 py-5 space-y-4">
        {/* Exam info */}
        <div
          className="border px-4 py-3 text-sm space-y-1"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <Clock size={12} />
            <span className="font-semibold">
              {exam.timeLimit ? `${exam.timeLimit} minutes suggested` : 'No hard time limit'}
            </span>
          </div>
          <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <ClipboardList size={12} />
            <span>
              {exam.numSets > 1 ? `${exam.numSets} × ${exam.questionsPerSet}` : exam.questionsPerSet || '?'} problems
              {exam.estimationSets > 0 && ` + ${exam.estimationSets} estimation`}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-sm text-[var(--color-text)]">
          <p className="font-semibold" style={{ color: 'var(--color-accent)' }}>
            How to testsolve:
          </p>
          <ul className="space-y-2 text-[var(--color-text-muted)]" style={{ listStyle: 'none', padding: 0 }}>
            {[
              'Attempt every problem — even a partial attempt or a comment is valuable.',
              "Don't spend too long on any single problem. If you're stuck, move on and come back.",
              'There is no strict time limit — but try to simulate real exam conditions.',
              'For each problem, record your answer, your work, and any comments about clarity, difficulty, or issues.',
              'At the end, fill out the Overall Comments section — this is critical for helping us improve the exam.',
              'Do not share answers or solutions with others testsolving this exam.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="flex-shrink-0 mt-0.5 h-4 w-4 flex items-center justify-center font-bold"
                  style={{ background: 'var(--color-accent)', color: 'white', fontSize: 'var(--text-xs)', borderRadius: '2px' }}
                >
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="border px-3 py-2.5 flex items-start gap-2"
          style={{ background: 'var(--badge-idea-bg)', borderColor: 'var(--badge-idea-border)', color: 'var(--badge-idea-text)', fontSize: 'var(--text-xs)' }}
        >
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>No solutions are shown during testsolving. Focus on your own approach.</span>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel} className="btn-outline px-5 py-2.5 text-sm">
            Cancel
          </button>
          <button type="button" onClick={onBegin} className="btn-filled flex-1 py-2.5 text-sm font-semibold">
            Begin Testsolve →
          </button>
        </div>
      </div>
    </div>
  </div>
);

/* ── PasswordModal ────────────────────────────────────────── */
const PasswordModal = ({ exam, onConfirm, onCancel, loading, error }) => {
  const [pwd, setPwd] = useState('');
  const [name, setName] = useState('');
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const canSubmit = pwd.trim() && name.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>{exam.name}</p>
            <p className="mt-0.5 text-[var(--color-text-muted)]" style={{ fontSize: 'var(--text-xs)' }}>Enter your name and password to continue</p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {exam.timeLimit && (
            <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              <Clock size={12} />
              Suggested time: <strong style={{ color: 'var(--color-text)' }}>{exam.timeLimit} minutes</strong>
            </div>
          )}

          <div>
            <label className="section-label">Your Name</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && onConfirm(pwd, name)}
              placeholder="e.g. Jane Smith"
              className="input-base w-full mt-2"
              autoComplete="name"
            />
            <p className="mt-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
              Used to identify your submission — multiple people may share this account.
            </p>
          </div>

          <div>
            <label className="section-label">Testsolve Password</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && onConfirm(pwd, name)}
              placeholder="Enter password"
              className="input-base w-full mt-2"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm px-3 py-2.5" style={{ background: 'var(--badge-needs-review-bg)', color: 'var(--badge-needs-review-text)', border: '1px solid var(--badge-needs-review-border)' }}>
              <AlertTriangle size={13} />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="btn-outline flex-1 py-2.5 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => canSubmit && onConfirm(pwd, name)}
              disabled={loading || !canSubmit}
              className="btn-filled flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── OverallFeedbackPanel ─────────────────────────────────── */
const OverallFeedbackPanel = ({ overall, setOverall, problems, answers, onSubmit, loading, submitError }) => {
  const answeredCount = problems.filter(p => !!answers[p.problemId]?.answer?.trim()).length;
  const unanswered = problems.length - answeredCount;

  return (
    <div className="mx-auto max-w-3xl px-6 py-6 space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <span className="gold-rule" />
        <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Overall Comments
        </h2>
      </div>

      {unanswered > 0 && (
        <div
          className="flex items-start gap-2 border px-4 py-3 text-sm"
          style={{ background: 'var(--badge-idea-bg)', borderColor: 'var(--badge-idea-border)', color: 'var(--badge-idea-text)' }}
        >
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>{unanswered} problem{unanswered !== 1 ? 's' : ''}</strong> still unanswered.
            You can still submit, but try to attempt every problem before finishing.
          </span>
        </div>
      )}

      <div className="surface-card px-5 py-5 space-y-5">
        <div>
          <label className="section-label">1. General Comments</label>
          <p className="mt-0.5 mb-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
            Overall impressions, flow, balance across topics, pacing of the exam.
          </p>
          <textarea
            value={overall.generalComments}
            onChange={e => setOverall(o => ({ ...o, generalComments: e.target.value }))}
            rows={4}
            placeholder="e.g. The exam felt well-balanced. The problems flowed nicely from easier to harder…"
            className="input-base w-full resize-y"
          />
        </div>

        <div>
          <label className="section-label">2. Difficulty &amp; Ordering of Problems</label>
          <p className="mt-0.5 mb-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
            Was the difficulty curve appropriate? Were any problems out of order?
          </p>
          <textarea
            value={overall.difficultyNotes}
            onChange={e => setOverall(o => ({ ...o, difficultyNotes: e.target.value }))}
            rows={3}
            placeholder="e.g. Q3 felt harder than Q5. The jump from Q7 to Q8 was too steep…"
            className="input-base w-full resize-y"
          />
        </div>

        <div>
          <label className="section-label">3. Repeated or Missing Techniques</label>
          <p className="mt-0.5 mb-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
            Techniques that appear too often, or topics you felt were missing.
          </p>
          <textarea
            value={overall.techniqueNotes}
            onChange={e => setOverall(o => ({ ...o, techniqueNotes: e.target.value }))}
            rows={3}
            placeholder="e.g. Q2 and Q6 both rely on AM-GM in the same way. No combinatorics problems at all…"
            className="input-base w-full resize-y"
          />
        </div>

        <div>
          <label className="section-label">4. Problems That Need Rework or Replacement</label>
          <p className="mt-0.5 mb-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
            List specific problems you think need to be revised or swapped out, and why.
          </p>
          <textarea
            value={overall.reworkNotes}
            onChange={e => setOverall(o => ({ ...o, reworkNotes: e.target.value }))}
            rows={3}
            placeholder="e.g. Q4 has an ambiguous condition. Q9 is essentially the same as a well-known Olympiad problem…"
            className="input-base w-full resize-y"
          />
        </div>

        <div>
          <label className="section-label mb-3 block">5. Final Rating</label>
          <div className="flex gap-3">
            {FINAL_RATINGS.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setOverall(o => ({ ...o, finalRating: r.value }))}
                className="flex-1 border-2 px-3 py-3 text-sm font-semibold transition-colors"
                style={
                  overall.finalRating === r.value
                    ? { borderColor: r.border, background: r.bg, color: r.color }
                    : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {submitError && (
        <div
          className="flex items-center gap-2 border px-4 py-3 text-sm"
          style={{ background: 'var(--badge-needs-review-bg)', borderColor: 'var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}
        >
          <AlertTriangle size={14} />
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="btn-filled w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? <Loader2 size={15} className="animate-spin mx-auto" />
          : 'Submit Testsolve'
        }
      </button>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   RESULTS VIEW
══════════════════════════════════════════════════════════════ */
const ResultsView = ({ exam, onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [data, setData]       = useState(null);
  const [expanded, setExpanded] = useState({});
  const [deleting, setDeleting] = useState(null);

  const fetchResults = useCallback(() => {
    setLoading(true);
    setError('');
    api.get(`/testsolve/results/${exam.id}`)
      .then(r => setData(r.data))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          setError('access_denied');
        } else {
          setError('Failed to load submissions. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [exam.id]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this testsolve submission? This cannot be undone.')) return;
    setDeleting(sessionId);
    try {
      await api.delete(`/testsolve/session/${sessionId}`);
      setData(prev => ({ ...prev, sessions: prev.sessions.filter(s => s.id !== sessionId) }));
    } catch {
      alert('Failed to delete session.');
    } finally {
      setDeleting(null);
    }
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  /* ── Check if user is an author / admin ── */
  const isAuthor = user?.isAdmin || (exam.authorId && user?.id && String(exam.authorId) === String(user.id));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 mb-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          style={{ fontSize: 'var(--text-sm)' }}
        >
          <ArrowLeft size={14} />
          Back to testsolves
        </button>
        <span className="gold-rule mb-3" />
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {exam.name}
        </h1>
        <p className="mt-1" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Testsolve submissions
        </p>
      </header>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-[var(--color-accent)]" />
        </div>
      )}

      {!loading && error && (
        error === 'access_denied' ? (
          <div className="surface-card px-6 py-16 text-center">
            <Lock size={28} className="mx-auto mb-4" style={{ color: 'var(--color-text-faint)' }} />
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Access restricted</h2>
            <p className="mt-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Only the exam author or an admin can view testsolve submissions.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 border px-4 py-3 text-sm"
            style={{ background: 'var(--badge-needs-review-bg)', borderColor: 'var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )
      )}

      {!loading && !error && data && (
        <>
          {/* Zero-state: explicitly shown when no sessions */}
          {data.sessions.length === 0 ? (
            <div className="surface-card px-6 py-16 text-center">
              <ClipboardList size={28} className="mx-auto mb-4" style={{ color: 'var(--color-text-faint)' }} />
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>No submissions yet</h2>
              <p className="mt-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                No one has submitted a testsolve for this exam yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.sessions.map(session => {
                const isOpen = !!expanded[session.id];
                const rating = RATING_META[session.overall?.finalRating];
                return (
                  <div key={session.id} className="surface-card overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                    {/* Session header */}
                    <div
                      className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                      onClick={() => toggleExpand(session.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <User size={14} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
                        <span className="font-semibold text-sm truncate">{session.solverName}</span>
                        {session.submittedAt ? (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{fmtDate(session.submittedAt)}</span>
                        ) : (
                          <span className="px-2 py-0.5 border font-semibold uppercase tracking-wide"
                            style={{ fontSize: 'var(--text-xs)', background: 'var(--badge-idea-bg)', borderColor: 'var(--badge-idea-border)', color: 'var(--badge-idea-text)' }}>
                            In progress
                          </span>
                        )}
                        {rating && (
                          <span className="px-2 py-0.5 border font-semibold uppercase tracking-wide"
                            style={{ fontSize: 'var(--text-xs)', background: rating.bg, borderColor: rating.border, color: rating.color }}>
                            {rating.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Authors and admins can delete any submission */}
                        {(user?.isAdmin || isAuthor) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                            disabled={deleting === session.id}
                            className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--badge-needs-review-text)] transition-colors disabled:opacity-40"
                            title="Delete submission"
                          >
                            {deleting === session.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />
                            }
                          </button>
                        )}
                        {isOpen ? <ChevronUp size={15} style={{ color: 'var(--color-text-faint)' }} /> : <ChevronDown size={15} style={{ color: 'var(--color-text-faint)' }} />}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isOpen && (
                      <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                        {/* Per-problem responses */}
                        {session.responses.length > 0 && (
                          <div className="px-5 py-4 space-y-4">
                            <p className="section-label">Problem Responses</p>
                            {session.responses.map((resp) => {
                              const slot = data.slots.find(s => s.slotIndex === resp.slotIndex);
                              const label = buildSlotLabel(null, resp.slotIndex);
                              return (
                                <div key={resp.id} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{label}</span>
                                    {resp.answer && (
                                      <span className="px-2 py-0.5 border font-mono"
                                        style={{ fontSize: 'var(--text-xs)', background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                                        {resp.answer}
                                      </span>
                                    )}
                                    {resp.timeMinutes != null && (
                                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                                        <Clock size={11} className="inline mr-0.5" />{resp.timeMinutes} min
                                      </span>
                                    )}
                                  </div>
                                  {slot?.latex && (
                                    <div className="px-3 py-2 text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                      <KatexRenderer latex={slot.latex} />
                                    </div>
                                  )}
                                  {resp.workArea && (
                                    <div>
                                      <span className="section-label">Work</span>
                                      <pre className="mt-1 whitespace-pre-wrap font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{resp.workArea}</pre>
                                    </div>
                                  )}
                                  {resp.comment && (
                                    <div>
                                      <span className="section-label">Comment</span>
                                      <p className="mt-1" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{resp.comment}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Overall feedback */}
                        {session.overall && (
                          <div className="px-5 py-4 space-y-3">
                            <p className="section-label">Overall Feedback</p>
                            {[
                              ['General Comments', session.overall.generalComments],
                              ['Difficulty & Ordering', session.overall.difficultyNotes],
                              ['Repeated/Missing Techniques', session.overall.techniqueNotes],
                              ['Problems Needing Rework', session.overall.reworkNotes],
                            ].map(([label, value]) => value ? (
                              <div key={label}>
                                <span className="section-label">{label}</span>
                                <p className="mt-1" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{value}</p>
                              </div>
                            ) : null)}
                          </div>
                        )}

                        {session.responses.length === 0 && !session.overall && (
                          <div className="px-5 py-6 text-center" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>
                            No responses recorded yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   Props:
     initialTestId  — exam id to jump straight to (from URL param)
     initialPhase   — 'results' to skip the list and open results view
══════════════════════════════════════════════════════════════ */
const Testsolving = ({ initialTestId = null, initialPhase = 'list' }) => {
  /* ── Phase: 'list' | 'results' | 'active' | 'done' ── */
  const [phase, setPhase] = useState(initialPhase);

  /*
    When arriving via /testsolving/:testId/results the exam list hasn't
    loaded yet, so we synthesise a minimal stub { id } for ResultsView.
    Once the list loads we swap it for the full exam object so metadata
    (name, round, etc.) renders correctly.
  */
  const [resultsExam, setResultsExam] = useState(
    initialTestId ? { id: initialTestId, name: 'Loading…' } : null,
  );

  /* ── List phase ── */
  const [exams, setExams]             = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError]     = useState('');

  /* ── Password + instructions modal state ── */
  const [pendingExam, setPendingExam]           = useState(null);
  const [pwdLoading, setPwdLoading]             = useState(false);
  const [pwdError, setPwdError]                 = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [verifiedSession, setVerifiedSession]   = useState(null);

  /* ── Active testsolve ── */
  const [session, setSession]             = useState(null);
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [answers, setAnswers]             = useState({});
  const [elapsed, setElapsed]             = useState(0);
  const [overall, setOverall]             = useState({
    generalComments: '', difficultyNotes: '', techniqueNotes: '',
    reworkNotes: '', finalRating: 'needs_work',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError]     = useState('');

  /* ── Unsaved guard ── */
  const isDirtyRef = useRef(false);
  useEffect(() => { isDirtyRef.current = phase === 'active'; }, [phase]);
  useEffect(() => {
    const handler = (e) => { if (!isDirtyRef.current) return; e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  /* ── Load exam list ── */
  useEffect(() => {
    setListLoading(true);
    api.get('/testsolve/available')
      .then(res => {
        const list = res.data || [];
        setExams(list);
        /*
          If we deep-linked to a results view, replace the stub exam object
          with the full one from the list so name/metadata render correctly.
        */
        if (initialTestId && initialPhase === 'results') {
          const full = list.find(e => String(e.id) === String(initialTestId));
          if (full) setResultsExam(full);
        }
      })
      .catch(() => setListError('Failed to load available exams. Please try again.'))
      .finally(() => setListLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Timer ── */
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* ── Derived timer ── */
  const timeLimitSeconds = session?.timeLimit ? session.timeLimit * 60 : null;
  const remaining = timeLimitSeconds != null ? timeLimitSeconds - elapsed : null;
  const timerOverrun = remaining != null && remaining < 0;

  const handleStartExam = (exam) => {
    setPendingExam(exam);
    setPwdError('');
    setShowInstructions(false);
    setVerifiedSession(null);
  };

  const handleViewResults = (exam) => {
    setResultsExam(exam);
    setPhase('results');
  };

  const handleConfirmPassword = useCallback(async (password, solverName) => {
    if (!pendingExam) return;
    setPwdLoading(true);
    setPwdError('');
    try {
      const res = await api.post('/testsolve/start', { testId: pendingExam.id, password, solverName });
      setVerifiedSession(res.data);
      setPendingExam(null);
      setShowInstructions(true);
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Incorrect password. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  }, [pendingExam]);

  const handleBeginAfterInstructions = useCallback(() => {
    if (!verifiedSession) return;
    const { sessionId, problems, timeLimit: tl, testName, examMeta, solverName } = verifiedSession;
    setSession({ sessionId, problems, timeLimit: tl, testName, examMeta, solverName });
    setAnswers({});
    setOverall({ generalComments: '', difficultyNotes: '', techniqueNotes: '', reworkNotes: '', finalRating: 'needs_work' });
    setElapsed(0);
    setCurrentIdx(0);
    setShowInstructions(false);
    setVerifiedSession(null);
    setPhase('active');
  }, [verifiedSession]);

  const setField = useCallback((problemId, field, value) => {
    setAnswers(prev => ({ ...prev, [problemId]: { ...prev[problemId], [field]: value } }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    setSubmitLoading(true);
    setSubmitError('');
    try {
      const responses = session.problems.map(p => ({
        problemId:   p.problemId,
        slotIndex:   p.slotIndex,
        answer:      answers[p.problemId]?.answer      || '',
        workArea:    answers[p.problemId]?.workArea     || '',
        comment:     answers[p.problemId]?.comment      || '',
        timeMinutes: answers[p.problemId]?.timeMinutes  || null,
      }));
      await api.post(`/testsolve/session/${session.sessionId}/submit`, { responses, overall });
      isDirtyRef.current = false;
      setPhase('done');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  }, [session, answers, overall]);

  /* ════════════════════════════════════════════════════════════
     RENDER — RESULTS
  ════════════════════════════════════════════════════════════ */
  if (phase === 'results' && resultsExam) {
    return (
      <Layout pageKey="testsolving">
        <ResultsView exam={resultsExam} onBack={() => { setPhase('list'); setResultsExam(null); }} />
      </Layout>
    );
  }

  /* ════════════════════════════════════════════════════════════
     RENDER — DONE
  ════════════════════════════════════════════════════════════ */
  if (phase === 'done') {
    return (
      <Layout pageKey="testsolving">
        <div className="mx-auto max-w-xl py-20 text-center space-y-6">
          <div className="flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center"
              style={{ background: 'var(--badge-endorsed-bg)' }}
            >
              <Trophy size={28} style={{ color: 'var(--badge-endorsed-text)' }} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Testsolve submitted!
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Thank you for testsolving <strong>{session?.testName}</strong>. Your responses and feedback have been recorded.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setPhase('list'); setSession(null); setAnswers({}); setElapsed(0); setOverall({ generalComments: '', difficultyNotes: '', techniqueNotes: '', reworkNotes: '', finalRating: 'needs_work' }); }}
            className="btn-filled px-6 py-2.5 text-sm"
          >
            Back to testsolves
          </button>
        </div>
      </Layout>
    );
  }

  /* ════════════════════════════════════════════════════════════
     RENDER — ACTIVE TESTSOLVE
  ════════════════════════════════════════════════════════════ */
  if (phase === 'active' && session) {
    const problems    = session.problems;
    const isOverall   = currentIdx === 'overall';
    const current     = !isOverall ? problems[currentIdx] : null;
    const resp        = current ? (answers[current.problemId] || {}) : {};
    const answeredCount = problems.filter(p => !!answers[p.problemId]?.answer?.trim()).length;

    return (
      <Layout noPadding pageKey="testsolving">
        {/* ── Top bar ── */}
        <div
          className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2 sticky top-0 z-20"
          style={{ background: 'var(--color-surface)', minHeight: '48px' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Leave testsolve? Your progress will be lost.')) {
                  isDirtyRef.current = false;
                  setPhase('list');
                  setSession(null);
                }
              }}
              className="flex items-center gap-1 font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              style={{ fontSize: 'var(--text-xs)' }}
            >
              <ArrowLeft size={13} />
              Exit
            </button>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <span className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {session.testName}
            </span>
            {session.solverName && (
              <span className="inline-flex items-center gap-1 truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                <User size={11} />
                {session.solverName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums"
              style={{ color: timerOverrun ? 'var(--badge-needs-review-text)' : 'var(--color-text-muted)' }}
            >
              <Clock size={13} />
              {remaining != null
                ? (timerOverrun ? `+${formatTime(-remaining)}` : formatTime(remaining))
                : formatTime(elapsed)
              }
            </span>
            <span className="tabular-nums" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
              {answeredCount}/{problems.length}
            </span>
            <button
              type="button"
              onClick={() => setCurrentIdx('overall')}
              className="btn-outline px-3 py-1.5"
              style={{ fontSize: 'var(--text-xs)', ...(isOverall ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : {}) }}
            >
              Overall
            </button>
          </div>
        </div>

        {/* ── Body: nav + problem ── */}
        <div className="flex" style={{ height: 'calc(100vh - 48px - 52px)', overflow: 'hidden' }}>
          <ProblemNav
            problems={problems}
            currentIndex={currentIdx}
            answers={answers}
            onSelect={setCurrentIdx}
            examMeta={session.examMeta}
          />

          <div className="flex-1 overflow-y-auto">
            {isOverall ? (
              <OverallFeedbackPanel
                overall={overall}
                setOverall={setOverall}
                problems={problems}
                answers={answers}
                onSubmit={handleSubmit}
                loading={submitLoading}
                submitError={submitError}
              />
            ) : current ? (
              <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">

                <div className="flex items-center gap-3">
                  <span className="gold-rule" />
                  <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                    {buildSlotLabel(session.examMeta, current.slotIndex)}
                  </h2>
                  <span className="tabular-nums" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                    {typeof currentIdx === 'number' ? currentIdx + 1 : '?'} / {problems.length}
                  </span>
                </div>

                <div className="surface-card px-5 py-5">
                  <p className="section-label">Problem</p>
                  <div className="mt-3 text-[15px] leading-7">
                    {current.latex
                      ? <KatexRenderer latex={current.latex} />
                      : <span className="italic text-[var(--color-text-faint)]">No problem text.</span>
                    }
                  </div>
                </div>

                <div className="surface-card px-5 py-5 space-y-4">
                  <div>
                    <label className="section-label">Your Answer</label>
                    <input
                      type="text"
                      value={resp.answer || ''}
                      onChange={e => setField(current.problemId, 'answer', e.target.value)}
                      placeholder="Enter your final answer"
                      className="input-base w-full mt-2"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="section-label">Work Area</label>
                    <textarea
                      value={resp.workArea || ''}
                      onChange={e => setField(current.problemId, 'workArea', e.target.value)}
                      rows={7}
                      placeholder="Scratch work, approach, full solution attempt…"
                      className="input-base w-full resize-y mt-2"
                    />
                  </div>
                </div>

                <div className="surface-card px-5 py-5 space-y-4">
                  <p className="section-label">Problem Feedback</p>

                  <div>
                    <label className="section-label" style={{ fontSize: 'var(--text-xs)' }}>
                      Comments on this problem{' '}
                      <span className="font-normal" style={{ color: 'var(--color-text-faint)' }}>(required for each problem)</span>
                    </label>
                    <p className="mt-0.5 mb-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                      Clarity issues, notation, difficulty impression, what you'd change…
                    </p>
                    <textarea
                      value={resp.comment || ''}
                      onChange={e => setField(current.problemId, 'comment', e.target.value)}
                      rows={3}
                      placeholder="e.g. The problem statement was unclear about whether x is an integer…"
                      className="input-base w-full resize-y"
                    />
                  </div>

                  <div>
                    <label className="section-label" style={{ fontSize: 'var(--text-xs)' }}>
                      Estimated time spent on this problem
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={resp.timeMinutes || ''}
                        onChange={e => setField(current.problemId, 'timeMinutes', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="0"
                        className="input-base w-24 text-center"
                      />
                      <span className="text-sm text-[var(--color-text-muted)]">minutes</span>
                    </div>
                    <p className="mt-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                      Approximate is fine — helps us calibrate difficulty.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pb-8">
                  <button
                    type="button"
                    onClick={() => setCurrentIdx(i => typeof i === 'number' ? Math.max(0, i - 1) : problems.length - 1)}
                    disabled={currentIdx === 0}
                    className="btn-outline px-4 py-2 text-sm disabled:opacity-40"
                  >
                    ← Previous
                  </button>
                  <div className="flex-1" />
                  {typeof currentIdx === 'number' && currentIdx < problems.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIdx(i => typeof i === 'number' ? i + 1 : 0)}
                      className="btn-filled px-4 py-2 text-sm"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentIdx('overall')}
                      className="btn-filled px-4 py-2 text-sm"
                    >
                      Overall Comments →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-faint)]">
                No problems loaded.
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  /* ════════════════════════════════════════════════════════════
     RENDER — EXAM LIST
  ════════════════════════════════════════════════════════════ */
  return (
    <Layout pageKey="testsolving">
      <div className="mx-auto max-w-2xl space-y-5">

        <header>
          <span className="gold-rule mb-3" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Testsolve
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Take a locked exam in testsolve mode. Your answers and feedback will help calibrate the final version.
          </p>
        </header>

        {listLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[var(--color-accent)]" />
          </div>
        )}

        {listError && (
          <div
            className="flex items-center gap-2 border px-4 py-3 text-sm"
            style={{ background: 'var(--badge-needs-review-bg)', borderColor: 'var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}
          >
            <AlertTriangle size={14} />
            {listError}
          </div>
        )}

        {!listLoading && !listError && exams.length === 0 && (
          <div className="surface-card px-6 py-16 text-center">
            <ClipboardList size={28} className="mx-auto mb-4" style={{ color: 'var(--color-text-faint)' }} />
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              No active testsolves
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              There are no exams currently open for testsolving. Check back when an exam is locked and marked active.
            </p>
          </div>
        )}

        {!listLoading && exams.length > 0 && (
          <div className="space-y-2">
            {exams.map(exam => (
              <ExamCard key={exam.id} exam={exam} onStart={handleStartExam} onViewResults={handleViewResults} />
            ))}
          </div>
        )}
      </div>

      {pendingExam && (
        <PasswordModal
          exam={pendingExam}
          onConfirm={handleConfirmPassword}
          onCancel={() => { setPendingExam(null); setPwdError(''); }}
          loading={pwdLoading}
          error={pwdError}
        />
      )}

      {showInstructions && verifiedSession && (
        <InstructionsModal
          exam={verifiedSession.examMeta || exams.find(e => e.id === verifiedSession.testId) || { name: verifiedSession.testName }}
          onBegin={handleBeginAfterInstructions}
          onCancel={() => { setShowInstructions(false); setVerifiedSession(null); }}
        />
      )}
    </Layout>
  );
};

export default Testsolving;
