import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, Clock3,
  RefreshCw, Search, Loader2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import { STATUS_BADGE_CLASS } from '../utils/problemStatus';

const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
const STAGES = ['Idea', 'Needs Review', 'Resolved', 'Endorsed'];

/* ══════════════════════════════════════════════════════════════
   GIVE FEEDBACK  —  lamt.net treatment + skip fix
══════════════════════════════════════════════════════════════ */
const GiveFeedback = () => {
  const { problemId: routeProblemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem]               = useState(null);
  const [answer, setAnswer]                 = useState('');
  const [work, setWork]                     = useState('');
  const [feedback, setFeedback]             = useState('');
  const [elapsed, setElapsed]               = useState(0);
  const [loading, setLoading]               = useState(false);
  const [message, setMessage]               = useState('');
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [showSolution, setShowSolution]     = useState(false);
  const [reviewType, setReviewType]         = useState(null);

  const [mode, setMode]                     = useState(routeProblemId ? 'targeted' : 'random');
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterTopic, setFilterTopic]       = useState('');
  const [filterStage, setFilterStage]       = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [reviewableProblems, setReviewableProblems] = useState([]);
  const [reviewableLoading, setReviewableLoading]   = useState(false);

  /* ── Unsaved-work guard ── */
  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = !!(problem && hasSubmittedAnswer && (answer || work || feedback));
  }, [problem, hasSubmittedAnswer, answer, work, feedback]);
  useEffect(() => {
    const handler = (e) => { if (!isDirtyRef.current) return; e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  /* ── Ref-based filters (avoids stale closures) ── */
  const searchQueryRef = useRef(searchQuery);
  const filterTopicRef = useRef(filterTopic);
  const filterStageRef = useRef(filterStage);
  const filterDiffRef  = useRef(filterDifficulty);
  useEffect(() => { searchQueryRef.current = searchQuery; },     [searchQuery]);
  useEffect(() => { filterTopicRef.current = filterTopic; },     [filterTopic]);
  useEffect(() => { filterStageRef.current = filterStage; },     [filterStage]);
  useEffect(() => { filterDiffRef.current  = filterDifficulty; },[filterDifficulty]);

  /* ── Data fetchers ── */
  const loadReviewableProblems = useCallback(async () => {
    setReviewableLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQueryRef.current) params.set('search',     searchQueryRef.current);
      if (filterTopicRef.current) params.set('topic',      filterTopicRef.current);
      if (filterStageRef.current) params.set('stage',      filterStageRef.current);
      if (filterDiffRef.current)  params.set('difficulty', filterDiffRef.current);
      const qs = params.toString();
      const res = await api.get(`/feedback/reviewable${qs ? `?${qs}` : ''}`);
      setReviewableProblems(res.data || []);
    } catch {
      setReviewableProblems([]);
    } finally {
      setReviewableLoading(false);
    }
  }, []);

  const loadNextProblem = useCallback(async () => {
    setLoading(true);
    setProblem(null);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (filterDiffRef.current) params.set('difficulty', filterDiffRef.current);
      const qs = params.toString();
      const res = await api.get(`/feedback/next${qs ? `?${qs}` : ''}`);
      if (!res.data) {
        setMessage('No problems available for review right now.');
      } else {
        const detail = await api.get(`/problems/${res.data.id}`);
        setProblem(detail.data);
      }
    } catch {
      setMessage('Failed to load a problem. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── FIXED skip — uses /feedback/next?exclude=… instead of broken /feedback/skip ── */
  const skipProblem = useCallback(async () => {
    if (!problem) return;
    setLoading(true);
    setProblem(null);
    setMessage('');
    try {
      const params = new URLSearchParams();
      params.set('exclude', problem.id);
      if (filterDiffRef.current) params.set('difficulty', filterDiffRef.current);
      const res = await api.get(`/feedback/skip?exclude=${problem.id}&${filterDiffRef.current ? 'difficulty=' + filterDiffRef.current : ''}`);
      if (!res.data) {
        setMessage('No other problems available right now.');
      } else {
        const detail = await api.get(`/problems/${res.data.id}`);
        setProblem(detail.data);
      }
    } catch {
      setMessage('Failed to skip. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [problem]);

  const loadSpecificProblem = useCallback(async (problemId) => {
    setLoading(true);
    try {
      const res = await api.get(`/problems/${problemId}`);
      setProblem(res.data);
      setMessage('');
    } catch {
      setMessage('Problem not found or unavailable for review.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Mode bootstrap ── */
  useEffect(() => {
    if (routeProblemId) { loadSpecificProblem(routeProblemId); return; }
    if (mode === 'random') { loadNextProblem(); return; }
    if (mode === 'browse') { setProblem(null); setMessage(''); loadReviewableProblems(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, routeProblemId]);

  useEffect(() => {
    if (mode !== 'browse') return;
    const id = setTimeout(loadReviewableProblems, 250);
    return () => clearTimeout(id);
  }, [searchQuery, filterTopic, filterStage, filterDifficulty, loadReviewableProblems]);

  /* ── Reset on new problem ── */
  useEffect(() => {
    if (problem) {
      setElapsed(0);
      setHasSubmittedAnswer(false);
      setShowSolution(false);
      setAnswer('');
      setWork('');
      setFeedback('');
      setReviewType(null);
    }
  }, [problem]);

  /* ── Timer ── */
  useEffect(() => {
    if (!problem || hasSubmittedAnswer) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [problem, hasSubmittedAnswer]);

  /* ── Handlers ── */
  const submitAnswer = () => { if (!answer.trim()) return; setHasSubmittedAnswer(true); setShowSolution(true); };

  const submitFeedback = async (isEndorsement = false) => {
    if (!problem) return;
    setLoading(true);
    try {
      await api.post('/feedback', {
        problemId: problem.id,
        answer,
        work,
        feedback,
        comment: feedback,
        isEndorsement,
        timeSpent: elapsed,
      });
      setMessage(isEndorsement ? 'Problem endorsed!' : 'Feedback submitted!');
      isDirtyRef.current = false;
      if (routeProblemId) {
        setTimeout(() => navigate(`/problem/${problem.id}`), 1200);
      } else if (mode === 'random') {
        setTimeout(loadNextProblem, 800);
      } else {
        loadReviewableProblems();
        setProblem(null);
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const selectProblem = async (selected) => { await loadSpecificProblem(selected.id); setMode('targeted'); };
  const statusForProblem = (p) => p._displayStatus || p.stage || 'Idea';

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-5">

        {/* ── Page header ───────────────────────────────────── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="gold-rule mb-3" />
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Give Feedback
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {['random', 'browse'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (m === 'browse') { setProblem(null); setMessage(''); }
                  setMode(m);
                }}
                className={mode === m ? 'btn-filled px-4 py-2 text-sm' : 'btn-outline px-4 py-2 text-sm'}
              >
                {m === 'random' ? 'Random' : 'Browse'}
              </button>
            ))}
          </div>
        </header>

        {/* ── Toast ─────────────────────────────────────────── */}
        {message && (
          <div className={[
            'rounded-sm border px-4 py-3 text-sm font-medium',
            message.includes('!') || message.includes('submitted') || message.includes('endorsed')
              ? 'bg-[var(--badge-endorsed-bg)] border-[var(--badge-endorsed-border)] text-[var(--badge-endorsed-text)]'
              : 'bg-[var(--badge-needs-review-bg)] border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)]',
          ].join(' ')}>
            {message}
          </div>
        )}

        {/* ── Browse panel ──────────────────────────────────── */}
        {mode === 'browse' && !routeProblemId && (
          <section className="surface-card overflow-hidden">
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <p className="section-label">Browse problems</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="relative block">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
                  <input
                    type="text"
                    placeholder="Search ID or topic"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-base w-full pl-8"
                  />
                </label>
                <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className="input-base">
                  <option value="">All topics</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="input-base">
                  <option value="">All stages</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="input-base">
                  <option value="">All difficulties</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}/10</option>
                  ))}
                </select>
              </div>

              {reviewableLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={18} className="animate-spin text-[var(--color-accent)]" />
                </div>
              ) : reviewableProblems.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                  No problems match the current filters.
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)] rounded-sm border border-[var(--color-border)] overflow-hidden">
                  {reviewableProblems.map((rp) => (
                    <button
                      key={rp.id}
                      type="button"
                      onClick={() => selectProblem(rp)}
                      className="block w-full px-4 py-4 text-left hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          {/* Topics in first row per instructions */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{rp.id}</span>
                            {(rp.topics || []).map((t) => (
                              <span key={t} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium">
                                {t}
                              </span>
                            ))}
                            <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold border ${STATUS_BADGE_CLASS[statusForProblem(rp)] || STATUS_BADGE_CLASS.Idea}`}>
                              {statusForProblem(rp)}
                            </span>
                            {rp.quality && (
                              <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{rp.quality}/10</span>
                            )}
                          </div>
                          <div className="text-sm leading-6 text-[var(--color-text-muted)] line-clamp-2">
                            {rp.latex ? <KatexRenderer latex={rp.latex} /> : null}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-faint)]">
                          {rp.feedbacks?.length || 0} reviews
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Loading spinner ───────────────────────────────── */}
        {loading && !problem && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[var(--color-accent)]" />
          </div>
        )}

        {/* ── Problem card ──────────────────────────────────── */}
        {problem && (
          <section className="surface-card overflow-hidden">

            {/* Problem header — topics in first row */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{problem.id}</span>
                {(problem.topics || []).map((t) => (
                  <span key={t} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 text-[10px] font-medium">
                    {t}
                  </span>
                ))}
                <span className={`inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold border ${STATUS_BADGE_CLASS[statusForProblem(problem)] || STATUS_BADGE_CLASS.Idea}`}>
                  {statusForProblem(problem)}
                </span>
                {problem.quality && (
                  <span className="text-xs text-[var(--color-text-muted)] tabular-nums">Difficulty {problem.quality}/10</span>
                )}
                <div className="ml-auto flex items-center gap-3">
                  {!hasSubmittedAnswer && (
                    <span className="flex items-center gap-1.5 font-mono text-sm text-[var(--color-text-muted)]">
                      <Clock3 size={13} />
                      {formatTime(elapsed)}
                    </span>
                  )}
                  {mode === 'random' && (
                    <button
                      type="button"
                      onClick={skipProblem}
                      className="btn-outline px-3 py-1.5 text-sm flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} />
                      Skip
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Problem body */}
            <div className="px-5 py-5">
              <p className="section-label">Problem</p>
              <div className="mt-3 text-[15px] leading-7">
                {problem.latex ? <KatexRenderer latex={problem.latex} /> : <span className="italic text-[var(--color-text-faint)]">No problem text.</span>}
              </div>
              {problem.notes && (
                <div className="mt-5 rounded-sm border border-[var(--color-border)] bg-[var(--badge-idea-bg)] px-4 py-4">
                  <p className="section-label">Author notes</p>
                  <div className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                    <KatexRenderer latex={problem.notes} />
                  </div>
                </div>
              )}
            </div>

            {/* Answer / Review section */}
            <div className="border-t border-[var(--color-border)] px-5 py-5 space-y-5">
              {!hasSubmittedAnswer ? (
                <>
                  <div>
                    <label className="section-label">Your answer</label>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && answer.trim() && submitAnswer()}
                      placeholder="Enter your answer and press Enter"
                      className="input-base w-full mt-2"
                    />
                  </div>
                  <div>
                    <label className="section-label">Your work</label>
                    <textarea
                      value={work}
                      onChange={(e) => setWork(e.target.value)}
                      rows={6}
                      placeholder="Show your approach, scratch work, or reasoning — helps the author understand how a solver reads their problem"
                      className="input-base w-full resize-y mt-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={!answer.trim()}
                    className="btn-filled px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to review
                  </button>
                </>
              ) : (
                <>
                  {/* Answer recap */}
                  <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        Your answer: <span className="font-mono">{answer}</span>
                      </span>
                    </div>
                    {work && (
                      <div>
                        <p className="section-label">Your work</p>
                        <div className="mt-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 text-sm leading-6 text-[var(--color-text-muted)] whitespace-pre-wrap">
                          {work}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSolution((s) => !s)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:underline"
                    >
                      {showSolution ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showSolution ? 'Hide' : 'Show'} author solution
                    </button>
                    {showSolution && problem.solution && (
                      <div className="pt-3 border-t border-[var(--color-border)]">
                        <p className="section-label">Author solution</p>
                        <div className="mt-2 text-[15px] leading-7">
                          <KatexRenderer latex={problem.solution} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comment box */}
                  <div>
                    <label className="section-label">Review comments</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={5}
                      placeholder="Comment on correctness, clarity, difficulty calibration, notation, or what you'd change..."
                      className="input-base w-full resize-y mt-2"
                    />
                  </div>

                  {/* Decision cards */}
                  <div>
                    <p className="section-label mb-3">Decision</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setReviewType('feedback')}
                        className={[
                          'rounded-sm border-2 p-4 text-left transition-colors',
                          reviewType === 'feedback'
                            ? 'border-[var(--badge-needs-review-border)] bg-[var(--badge-needs-review-bg)]'
                            : 'border-[var(--color-border)] hover:border-[var(--badge-needs-review-border)]',
                        ].join(' ')}
                      >
                        <p className="text-sm font-semibold">Needs Review</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Flag for revisions — your comment explains what to fix</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewType('endorse')}
                        className={[
                          'rounded-sm border-2 p-4 text-left transition-colors',
                          reviewType === 'endorse'
                            ? 'border-[var(--badge-endorsed-border)] bg-[var(--badge-endorsed-bg)]'
                            : 'border-[var(--color-border)] hover:border-[var(--badge-endorsed-border)]',
                        ].join(' ')}
                      >
                        <p className="text-sm font-semibold">Endorse</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Problem is ready as-is — no changes needed</p>
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  {reviewType && (
                    <button
                      type="button"
                      onClick={() => submitFeedback(reviewType === 'endorse')}
                      disabled={loading || !feedback.trim()}
                      className={[
                        'btn-filled px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed',
                        reviewType === 'endorse' ? '' : '',
                      ].join(' ')}
                    >
                      {loading ? 'Submitting…' : reviewType === 'endorse' ? 'Endorse problem' : 'Submit — Needs Review'}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!problem && !loading && mode === 'random' && (
          <div className="surface-card px-6 py-16 text-center">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>No problem available</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">There are no problems available for review right now, or you've authored all the problems.</p>
            <button
              type="button"
              onClick={loadNextProblem}
              className="btn-filled mt-6 px-5 py-2.5 text-sm"
            >
              Try again
            </button>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default GiveFeedback;
