import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, ChevronRight, Lock, ArrowLeft, CheckCircle2,
  Circle, Loader2, AlertTriangle, X, Send, Eye,
  ClipboardList, Trophy,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const FINAL_RATINGS = [
  { value: 'needs_work',   label: 'Needs Work',   color: 'var(--badge-needs-review-text)',  bg: 'var(--badge-needs-review-bg)',  border: 'var(--badge-needs-review-border)' },
  { value: 'mostly_good',  label: 'Mostly Good',  color: 'var(--badge-resolved-text)',       bg: 'var(--badge-resolved-bg)',       border: 'var(--badge-resolved-border)' },
  { value: 'ready',        label: 'Ready',         color: 'var(--badge-endorsed-text)',       bg: 'var(--badge-endorsed-bg)',       border: 'var(--badge-endorsed-border)' },
];

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

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

/* ── ExamCard ─────────────────────────────────────────────── */
const ExamCard = ({ exam, onStart }) => (
  <button
    type="button"
    onClick={() => onStart(exam)}
    className="surface-card group w-full text-left px-5 py-4 hover:border-[var(--color-accent)] transition-colors"
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
            <span className="text-xs text-[var(--color-text-muted)] truncate">{exam.competition}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-faint)]">
          {exam.roundType && (
            <span className="border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
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
      <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] group-hover:gap-2.5 transition-all">
        <Lock size={12} />
        Enter
        <ChevronRight size={13} />
      </div>
    </div>
  </button>
);

/* ── ProblemNav ───────────────────────────────────────────── */
const ProblemNav = ({ problems, currentIndex, answers, onSelect, examMeta }) => (
  <div
    className="border-r border-[var(--color-border)] flex flex-col"
    style={{ width: '160px', minWidth: '160px', background: 'var(--color-surface)', height: '100%', overflow: 'auto' }}
  >
    <div
      className="px-3 py-3 border-b border-[var(--color-border)]"
      style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-faint)' }}
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
          <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, fontFamily: 'var(--font-body)' }}>
            {label}
          </span>
        </button>
      );
    })}
  </div>
);

/* ── PasswordModal ────────────────────────────────────────── */
const PasswordModal = ({ exam, onConfirm, onCancel, loading, error }) => {
  const [pwd, setPwd] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>{exam.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Enter testsolve password to begin</p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="section-label">Password</label>
            <input
              ref={inputRef}
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && pwd.trim() && onConfirm(pwd)}
              placeholder="Testsolve password"
              className="input-base w-full mt-2"
              autoComplete="off"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm rounded-sm px-3 py-2.5" style={{ background: 'var(--badge-needs-review-bg)', color: 'var(--badge-needs-review-text)', border: '1px solid var(--badge-needs-review-border)' }}>
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
              onClick={() => pwd.trim() && onConfirm(pwd)}
              disabled={loading || !pwd.trim()}
              className="btn-filled flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Begin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── ReviewModal ──────────────────────────────────────────── */
const ReviewModal = ({ problems, answers, examMeta, onClose, onSubmit, loading }) => {
  const [overall, setOverall] = useState({
    generalComments: '', difficultyNotes: '', techniqueNotes: '',
    reworkNotes: '', finalRating: 'needs_work',
  });
  const answered = problems.filter(p => !!answers[p.problemId]?.answer?.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>Review & Submit</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {answered}/{problems.length} answered
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">

          {/* Per-problem summary */}
          <div>
            <p className="section-label mb-3">Answers</p>
            <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
              {problems.map((p) => {
                const label = buildSlotLabel(examMeta, p.slotIndex);
                const resp = answers[p.problemId] || {};
                const hasAnswer = !!resp.answer?.trim();
                return (
                  <div key={p.problemId} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <span className="w-16 flex-shrink-0 font-semibold tabular-nums text-[var(--color-text-muted)]">{label}</span>
                    <span className="flex-1 font-mono text-[var(--color-text)] truncate">
                      {hasAnswer ? resp.answer : <span className="italic text-[var(--color-text-faint)]">—</span>}
                    </span>
                    {hasAnswer
                      ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--badge-endorsed-text)' }} />
                      : <Circle size={14} className="flex-shrink-0 mt-0.5 text-[var(--color-text-faint)]" />
                    }
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall feedback */}
          <div className="space-y-4">
            <p className="section-label">Overall Feedback</p>

            <div>
              <label className="section-label text-xs">General comments</label>
              <textarea
                value={overall.generalComments}
                onChange={e => setOverall(o => ({ ...o, generalComments: e.target.value }))}
                rows={3}
                placeholder="Overall impressions, flow, balance across topics…"
                className="input-base w-full resize-y mt-2"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="section-label text-xs">Difficulty notes</label>
                <textarea
                  value={overall.difficultyNotes}
                  onChange={e => setOverall(o => ({ ...o, difficultyNotes: e.target.value }))}
                  rows={3}
                  placeholder="Was the difficulty curve appropriate?"
                  className="input-base w-full resize-y mt-2"
                />
              </div>
              <div>
                <label className="section-label text-xs">Technique notes</label>
                <textarea
                  value={overall.techniqueNotes}
                  onChange={e => setOverall(o => ({ ...o, techniqueNotes: e.target.value }))}
                  rows={3}
                  placeholder="Diversity of techniques used across problems?"
                  className="input-base w-full resize-y mt-2"
                />
              </div>
            </div>

            <div>
              <label className="section-label text-xs">What needs rework?</label>
              <textarea
                value={overall.reworkNotes}
                onChange={e => setOverall(o => ({ ...o, reworkNotes: e.target.value }))}
                rows={3}
                placeholder="List specific problems or sections that need revision…"
                className="input-base w-full resize-y mt-2"
              />
            </div>

            {/* Final rating */}
            <div>
              <p className="section-label mb-3">Final rating</p>
              <div className="flex gap-3">
                {FINAL_RATINGS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setOverall(o => ({ ...o, finalRating: r.value }))}
                    className="flex-1 rounded-sm border-2 px-3 py-2.5 text-sm font-semibold transition-colors"
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

          {/* Action row */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline px-5 py-2.5 text-sm">
              Back
            </button>
            <button
              type="button"
              onClick={() => onSubmit(overall)}
              disabled={loading}
              className="btn-filled flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                : <><Send size={14} /> Submit Testsolve</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const Testsolving = () => {
  /* ── Phase: 'list' | 'active' | 'done' ── */
  const [phase, setPhase] = useState('list');

  /* ── List phase ── */
  const [exams, setExams]             = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError]     = useState('');

  /* ── Password modal ── */
  const [pendingExam, setPendingExam] = useState(null);
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdError, setPwdError]       = useState('');

  /* ── Active testsolve ── */
  const [session, setSession]               = useState(null);
  const [currentIdx, setCurrentIdx]         = useState(0);
  const [answers, setAnswers]               = useState({});
  const [elapsed, setElapsed]               = useState(0);
  const [showReview, setShowReview]         = useState(false);
  const [submitLoading, setSubmitLoading]   = useState(false);
  const [submitError, setSubmitError]       = useState('');

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
      .then(res => setExams(res.data || []))
      .catch(() => setListError('Failed to load available exams. Please try again.'))
      .finally(() => setListLoading(false));
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

  /* ── Start exam ── */
  const handleStartExam = (exam) => { setPendingExam(exam); setPwdError(''); };

  const handleConfirmPassword = useCallback(async (password) => {
    if (!pendingExam) return;
    setPwdLoading(true);
    setPwdError('');
    try {
      const res = await api.post('/testsolve/start', { testId: pendingExam.id, password });
      const { sessionId, problems, timeLimit: tl, testName } = res.data;
      setSession({ sessionId, problems, timeLimit: tl, testName, examMeta: pendingExam });
      setAnswers({});
      setElapsed(0);
      setCurrentIdx(0);
      setPendingExam(null);
      setPhase('active');
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Failed to start. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  }, [pendingExam]);

  /* ── Update answer field ── */
  const setField = useCallback((problemId, field, value) => {
    setAnswers(prev => ({ ...prev, [problemId]: { ...prev[problemId], [field]: value } }));
  }, []);

  /* ── Final submit ── */
  const handleSubmit = useCallback(async (overall) => {
    if (!session) return;
    setSubmitLoading(true);
    setSubmitError('');
    try {
      const responses = session.problems.map(p => ({
        problemId:   p.problemId,
        slotIndex:   p.slotIndex,
        answer:      answers[p.problemId]?.answer   || '',
        workArea:    answers[p.problemId]?.workArea  || '',
        comment:     answers[p.problemId]?.comment   || '',
        timeMinutes: null,
      }));
      await api.post(`/testsolve/session/${session.sessionId}/submit`, { responses, overall });
      isDirtyRef.current = false;
      setPhase('done');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  }, [session, answers]);

  /* ════════════════════════════════════════════════════════════
     RENDER — DONE
  ════════════════════════════════════════════════════════════ */
  if (phase === 'done') {
    return (
      <Layout>
        <div className="mx-auto max-w-xl py-20 text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--badge-endorsed-bg)' }}>
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
            onClick={() => { setPhase('list'); setSession(null); setAnswers({}); setElapsed(0); }}
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
    const problems = session.problems;
    const current  = problems[currentIdx];
    const resp     = current ? (answers[current.problemId] || {}) : {};
    const answeredCount = problems.filter(p => !!answers[p.problemId]?.answer?.trim()).length;

    return (
      <Layout>
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
              className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <ArrowLeft size={13} />
              Exit
            </button>
            <span className="text-[var(--color-border)]">|</span>
            <span className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {session.testName}
            </span>
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
            <span className="text-xs text-[var(--color-text-faint)] tabular-nums">
              {answeredCount}/{problems.length}
            </span>
            <button
              type="button"
              onClick={() => setShowReview(true)}
              className="btn-filled px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <ClipboardList size={13} />
              Review &amp; Submit
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
            {current ? (
              <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">

                <div className="flex items-center gap-3">
                  <span className="gold-rule" />
                  <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                    {buildSlotLabel(session.examMeta, current.slotIndex)}
                  </h2>
                  <span className="text-xs text-[var(--color-text-faint)] tabular-nums">
                    {currentIdx + 1} / {problems.length}
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
                    <label className="section-label">Your answer</label>
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
                    <label className="section-label">Work area</label>
                    <textarea
                      value={resp.workArea || ''}
                      onChange={e => setField(current.problemId, 'workArea', e.target.value)}
                      rows={6}
                      placeholder="Scratch work, approach, reasoning…"
                      className="input-base w-full resize-y mt-2"
                    />
                  </div>
                  <div>
                    <label className="section-label">
                      Comment on this problem{' '}
                      <span className="font-normal text-[var(--color-text-faint)]">(optional)</span>
                    </label>
                    <textarea
                      value={resp.comment || ''}
                      onChange={e => setField(current.problemId, 'comment', e.target.value)}
                      rows={3}
                      placeholder="Clarity issues, notation, difficulty, what you'd change…"
                      className="input-base w-full resize-y mt-2"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pb-8">
                  <button
                    type="button"
                    onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                    disabled={currentIdx === 0}
                    className="btn-outline px-4 py-2 text-sm disabled:opacity-40"
                  >
                    ← Previous
                  </button>
                  <div className="flex-1" />
                  {currentIdx < problems.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIdx(i => i + 1)}
                      className="btn-filled px-4 py-2 text-sm"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowReview(true)}
                      className="btn-filled px-4 py-2 text-sm flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      Review all
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

        {showReview && (
          <ReviewModal
            problems={problems}
            answers={answers}
            examMeta={session.examMeta}
            onClose={() => setShowReview(false)}
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        )}
        {submitError && (
          <div
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-sm border px-4 py-3 text-sm font-medium shadow-lg"
            style={{ background: 'var(--badge-needs-review-bg)', border: '1px solid var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}
          >
            <AlertTriangle size={14} />
            {submitError}
          </div>
        )}
      </Layout>
    );
  }

  /* ════════════════════════════════════════════════════════════
     RENDER — EXAM LIST
  ════════════════════════════════════════════════════════════ */
  return (
    <Layout>
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
            className="flex items-center gap-2 rounded-sm border px-4 py-3 text-sm"
            style={{ background: 'var(--badge-needs-review-bg)', border: '1px solid var(--badge-needs-review-border)', color: 'var(--badge-needs-review-text)' }}
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
              <ExamCard key={exam.id} exam={exam} onStart={handleStartExam} />
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
    </Layout>
  );
};

export default Testsolving;
