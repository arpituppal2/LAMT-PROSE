import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronUp, Clock3,
  FileEdit, Info, MessageSquare, RefreshCw, Search
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import { STATUS_BADGE_CLASS } from '../utils/problemStatus';

const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
const STAGES = ['Idea', 'Needs Review', 'Resolved', 'Endorsed'];

const inputCls =
  'w-full px-3 py-2.5 text-sm bg-white dark:bg-[#020c16] border border-slate-200 dark:border-white/10 rounded-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-[#2774AE] dark:focus:border-[#FFD100]';

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

  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = !!(problem && hasSubmittedAnswer && (answer || work || feedback));
  }, [problem, hasSubmittedAnswer, answer, work, feedback]);

  useEffect(() => {
    const handler = (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const searchQueryRef     = useRef(searchQuery);
  const filterTopicRef     = useRef(filterTopic);
  const filterStageRef     = useRef(filterStage);
  const filterDiffRef      = useRef(filterDifficulty);
  useEffect(() => { searchQueryRef.current  = searchQuery; },     [searchQuery]);
  useEffect(() => { filterTopicRef.current  = filterTopic; },     [filterTopic]);
  useEffect(() => { filterStageRef.current  = filterStage; },     [filterStage]);
  useEffect(() => { filterDiffRef.current   = filterDifficulty; },[filterDifficulty]);

  const loadReviewableProblems = useCallback(async () => {
    setReviewableLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQueryRef.current)  params.set('search',     searchQueryRef.current);
      if (filterTopicRef.current)  params.set('topic',      filterTopicRef.current);
      if (filterStageRef.current)  params.set('stage',      filterStageRef.current);
      if (filterDiffRef.current)   params.set('difficulty', filterDiffRef.current);
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

  const skipProblem = useCallback(async () => {
    setLoading(true);
    setProblem(null);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (currentProblemId) params.set('exclude', currentProblemId);
      const qs = params.toString();
      const res = await api.get(`/feedback/skip${qs ? `?${qs}` : ''}`);
      if (!res.data) {
        setMessage('No problems available to skip to right now.');
      } else {
        const detail = await api.get(`/problems/${res.data.id}`);
        setProblem(detail.data);
      }
    } catch {
      setMessage('Failed to skip. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (!problem || hasSubmittedAnswer) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [problem, hasSubmittedAnswer]);

  const submitAnswer = () => {
    if (!answer.trim()) return;
    setHasSubmittedAnswer(true);
    setShowSolution(true);
  };

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

  const selectProblem = async (selected) => {
    await loadSpecificProblem(selected.id);
    setMode('targeted');
  };

  const statusForProblem = (p) => p._displayStatus || p.stage || 'Idea';

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-5">

        {/* ── Page header ──────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white px-5 py-5 dark:border-white/10 dark:bg-[#03111d] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Feedback workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Give Feedback</h1>
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
                className={`rounded-sm px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-[#03111d] dark:text-slate-200 dark:hover:border-white/20'
                }`}
              >
                {m === 'random' ? 'Random' : 'Browse'}
              </button>
            ))}
          </div>
        </header>

        {/* ── Toast message ─────────────────────────────────────────── */}
        {message && (
          <div className={`rounded-sm border px-4 py-3 text-sm font-medium ${
            message.includes('!') || message.includes('submitted') || message.includes('endorsed')
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/25 dark:bg-green-500/10 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* ── Browse panel ──────────────────────────────────────────── */}
        {mode === 'browse' && !routeProblemId && (
          <section className="rounded-sm border border-slate-200 bg-white dark:border-white/10 dark:bg-[#03111d]">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Browse problems</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="relative block">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ID or topic"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${inputCls} pl-8`}
                  />
                </label>
                <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className={inputCls}>
                  <option value="">All topics</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className={inputCls}>
                  <option value="">All stages</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className={inputCls}>
                  <option value="">All difficulties</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}/10</option>
                  ))}
                </select>
              </div>

              {reviewableLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#2774AE] dark:border-white/10 dark:border-t-[#FFD100]" />
                </div>
              ) : reviewableProblems.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">No problems match the current filters.</div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-white/10 rounded-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                  {reviewableProblems.map((rp) => (
                    <button
                      key={rp.id}
                      type="button"
                      onClick={() => selectProblem(rp)}
                      className="block w-full px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{rp.id}</span>
                            <span className={STATUS_BADGE_CLASS[statusForProblem(rp)] || STATUS_BADGE_CLASS.Idea}>
                              {statusForProblem(rp)}
                            </span>
                            {rp.quality && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{rp.quality}/10</span>
                            )}
                          </div>
                          <div className="text-sm leading-6 text-slate-600 dark:text-slate-400 line-clamp-2">
                            {rp.latex ? <KatexRenderer latex={rp.latex} /> : null}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(rp.topics || []).map((t) => (
                              <span key={t} className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500">
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

        {/* ── Loading spinner ───────────────────────────────────────── */}
        {loading && !problem && (
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#2774AE] dark:border-white/10 dark:border-t-[#FFD100]" />
          </div>
        )}

        {/* ── Problem card ──────────────────────────────────────────── */}
        {problem && (
          <section className="rounded-sm border border-slate-200 bg-white dark:border-white/10 dark:bg-[#03111d] overflow-hidden">

            {/* Problem header */}
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-[#020c16]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                <span className={STATUS_BADGE_CLASS[statusForProblem(problem)] || STATUS_BADGE_CLASS.Idea}>
                  {statusForProblem(problem)}
                </span>
                {problem.quality && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">Difficulty {problem.quality}/10</span>
                )}
                <div className="ml-auto flex items-center gap-3">
                  {!hasSubmittedAnswer && (
                    <span className="flex items-center gap-1.5 font-mono text-sm text-slate-500 dark:text-slate-400">
                      <Clock3 size={13} />
                      {formatTime(elapsed)}
                    </span>
                  )}
                  {mode === 'random' && (
                    <button
                      type="button"
                      onClick={skipProblem}
                      className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <RefreshCw size={13} />
                      Skip
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(problem.topics || []).map((t) => (
                  <span key={t} className="rounded-sm border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Problem body */}
            <div className="px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Problem</p>
              <div className="mt-3 text-[15px] leading-7 text-slate-900 dark:text-slate-100 prose-math">
                {problem.latex ? <KatexRenderer latex={problem.latex} /> : <span className="italic text-slate-400">No problem text.</span>}
              </div>
              {problem.notes && (
                <div className="mt-5 rounded-sm border border-slate-200 bg-amber-50/40 px-4 py-4 dark:border-white/10 dark:bg-amber-500/10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Author notes</p>
                  <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300 prose-math">
                    <KatexRenderer latex={problem.notes} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-5 py-5 dark:border-white/10 space-y-5">
              {!hasSubmittedAnswer ? (
                /* ── Answer entry ──────────────────────────────────── */
                <>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">Your answer</label>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && answer.trim() && submitAnswer()}
                      placeholder="Enter your answer and press Enter"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">Your work</label>
                    <textarea
                      value={work}
                      onChange={(e) => setWork(e.target.value)}
                      rows={6}
                      placeholder="Show your approach, scratch work, or reasoning — helps the author understand how a solver reads their problem"
                      className={`${inputCls} resize-y`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={!answer.trim()}
                    className="inline-flex items-center gap-2 rounded-sm bg-[#2774AE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6395] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#FFD100] dark:text-[#001628] dark:hover:bg-[#f5c800]"
                  >
                    Continue to review
                  </button>
                </>
              ) : (
                /* ── Review stage ──────────────────────────────────── */
                <>
                  {/* Answer recap */}
                  <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-[#020c16] space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-green-600 dark:text-green-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Your answer: <span className="font-mono">{answer}</span>
                      </span>
                    </div>
                    {work && (
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">
                          <FileEdit size={12} /> Your work
                        </div>
                        <div className="rounded-sm border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          {work}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSolution((s) => !s)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2774AE] hover:underline dark:text-[#FFD100]"
                    >
                      {showSolution ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showSolution ? 'Hide' : 'Show'} author solution
                    </button>
                    {showSolution && problem.solution && (
                      <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">Author solution</p>
                        <div className="text-[15px] leading-7 text-slate-800 dark:text-slate-200 prose-math">
                          <KatexRenderer latex={problem.solution} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comment box */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">
                      <MessageSquare size={12} />
                      Review comments
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={5}
                      placeholder="Comment on correctness, clarity, difficulty calibration, notation, or what you'd change..."
                      className={`${inputCls} resize-y`}
                    />
                  </div>

                  {/* Decision cards */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-3">Decision</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setReviewType('feedback')}
                        className={`rounded-sm border-2 p-4 text-left transition-colors ${
                          reviewType === 'feedback'
                            ? 'border-red-500 bg-red-50 dark:border-red-400/60 dark:bg-red-500/10'
                            : 'border-slate-200 hover:border-red-300 dark:border-white/10 dark:hover:border-red-400/40'
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Needs Review</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Flag for revisions — your comment explains what to fix</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewType('endorse')}
                        className={`rounded-sm border-2 p-4 text-left transition-colors ${
                          reviewType === 'endorse'
                            ? 'border-green-500 bg-green-50 dark:border-green-400/60 dark:bg-green-500/10'
                            : 'border-slate-200 hover:border-green-400 dark:border-white/10 dark:hover:border-green-400/40'
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Endorse</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Problem is ready as-is — no changes needed</p>
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  {reviewType && (
                    <button
                      type="button"
                      onClick={() => submitFeedback(reviewType === 'endorse')}
                      disabled={loading || !feedback.trim()}
                      className={`inline-flex items-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        reviewType === 'endorse'
                          ? 'bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700'
                          : 'bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700'
                      }`}
                    >
                      {loading ? 'Submitting…' : reviewType === 'endorse' ? 'Endorse problem' : 'Submit — Needs Review'}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!problem && !loading && mode === 'random' && (
          <div className="rounded-sm border border-slate-200 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-[#03111d]">
            <Info className="mx-auto text-slate-300 dark:text-slate-600" size={36} />
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">No problem available</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">There are no problems available for review right now, or you've authored all the problems.</p>
            <button
              type="button"
              onClick={loadNextProblem}
              className="mt-6 inline-flex items-center gap-2 rounded-sm bg-[#2774AE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f6395] dark:bg-[#FFD100] dark:text-[#001628] dark:hover:bg-[#f5c800]"
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
