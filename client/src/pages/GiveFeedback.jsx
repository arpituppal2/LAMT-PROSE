import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, Search, CheckCircle, ChevronDown, ChevronUp,
  Info, RefreshCw, FileEdit, MessageSquare
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const GiveFeedback = () => {
  const { problemId: routeProblemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState('');
  const [work, setWork] = useState('');
  const [feedback, setFeedback] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [reviewType, setReviewType] = useState(null);

  const [mode, setMode] = useState(routeProblemId ? 'targeted' : 'random');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [reviewableProblems, setReviewableProblems] = useState([]);
  const [reviewableLoading, setReviewableLoading] = useState(false);

  const topics = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
  const stages = ['Idea', 'Needs Review', 'Resolved', 'Endorsed'];

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

  const searchQueryRef = useRef(searchQuery);
  const filterTopicRef = useRef(filterTopic);
  const filterStageRef = useRef(filterStage);
  const filterDifficultyRef = useRef(filterDifficulty);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);
  useEffect(() => { filterTopicRef.current = filterTopic; }, [filterTopic]);
  useEffect(() => { filterStageRef.current = filterStage; }, [filterStage]);
  useEffect(() => { filterDifficultyRef.current = filterDifficulty; }, [filterDifficulty]);

  const loadReviewableProblems = useCallback(async () => {
    setReviewableLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQueryRef.current) params.set('search', searchQueryRef.current);
      if (filterTopicRef.current) params.set('topic', filterTopicRef.current);
      if (filterStageRef.current) params.set('stage', filterStageRef.current);
      if (filterDifficultyRef.current) params.set('difficulty', filterDifficultyRef.current);
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
      if (filterDifficultyRef.current) params.set('difficulty', filterDifficultyRef.current);
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

  // Skip: calls /feedback/skip — random Idea, fallback Endorsed
  const skipProblem = useCallback(async () => {
    setLoading(true);
    setProblem(null);
    setMessage('');
    try {
      const res = await api.get('/feedback/skip');
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
    if (routeProblemId) {
      loadSpecificProblem(routeProblemId);
      return;
    }
    if (mode === 'random') {
      loadNextProblem();
      return;
    }
    if (mode === 'browse') {
      setProblem(null);
      setMessage('');
      loadReviewableProblems();
    }
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
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectProblem = async (selected) => {
    await loadSpecificProblem(selected.id);
    setMode('targeted');
  };

  const panelCls = 'bg-white dark:bg-[#001628] border border-slate-200 dark:border-white/15 rounded-lg';
  const inputCls = 'w-full px-4 py-2.5 text-base bg-white dark:bg-[#020c16] border border-slate-200 dark:border-white/15 rounded-md text-black dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2774AE] dark:focus:ring-[#FFD100]';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Give Feedback</h1>
          <div className="flex items-center gap-2">
            {['random', 'browse'].map(m => (
              <button
                key={m}
                onClick={() => {
                  if (m === 'browse') {
                    setProblem(null);
                    setMessage('');
                  }
                  setMode(m);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                    : 'bg-white dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}>
                {m === 'random' ? 'Random Problem' : 'Browse Problems'}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={`mb-5 p-3.5 rounded-md border text-sm ${
            message.includes('submitted') || message.includes('endorsed') || message.includes('!')
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>{message}</div>
        )}

        {/* Browse mode */}
        {mode === 'browse' && !routeProblemId && (
          <div className={`${panelCls} p-5 mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input type="text" placeholder="Search problems..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-10`} />
              </div>
              <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className={inputCls}>
                <option value="">All Topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className={inputCls}>
                <option value="">All Stages</option>
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className={inputCls}>
                <option value="">All Difficulties</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}/10</option>
                ))}
              </select>
            </div>
            {reviewableLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2774AE] dark:border-[#FFD100]" />
              </div>
            ) : reviewableProblems.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">No problems found matching your criteria.</div>
            ) : (
              <div className="space-y-2">
                {reviewableProblems.map(rp => (
                  <div key={rp.id} onClick={() => selectProblem(rp)}
                    className="p-4 border border-slate-200 dark:border-white/10 rounded-md hover:border-[#2774AE] dark:hover:border-[#FFD100] cursor-pointer transition-colors bg-slate-50/80 dark:bg-[#020c16]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{rp.id}</span>
                          <span className="px-2 py-0.5 text-xs font-semibold rounded border border-slate-200 dark:border-white/15 text-black dark:text-white">{rp._displayStatus || rp.stage}</span>
                          {rp.quality && <span className="text-sm text-gray-400">{rp.quality}/10</span>}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {rp.latex ? <KatexRenderer latex={rp.latex} /> : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(rp.topics || []).map(t => (
                            <span key={t} className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-400 dark:text-gray-500 shrink-0">
                        <div>{rp.feedbacks?.length || 0} reviews</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && !problem && (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#2774AE] dark:border-[#FFD100]" />
          </div>
        )}

        {problem && (
          <div className={`${panelCls} overflow-hidden`}>
            <div className="p-6 border-b border-slate-200 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="font-mono text-lg font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded border border-slate-200 dark:border-white/15 text-black dark:text-white">{problem._displayStatus || problem.stage}</span>
                {problem.quality && <span className="text-sm text-gray-400">Difficulty: {problem.quality}/10</span>}
                {!hasSubmittedAnswer && (
                  <div className="flex items-center gap-1 text-sm text-gray-400 ml-auto font-mono">
                    <Clock size={13} />{formatTime(elapsed)}
                  </div>
                )}
                {mode === 'random' && (
                  <button onClick={skipProblem} title="Skip to a fresh Idea problem"
                    className="ml-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] transition-colors">
                    <RefreshCw size={13} /> Skip
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(problem.topics || []).map(t => (
                  <span key={t} className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">{t}</span>
                ))}
              </div>
              <div className="text-base text-black dark:text-white leading-relaxed prose-math">
                {problem.latex ? <KatexRenderer latex={problem.latex} /> : null}
              </div>
              {problem.notes && (
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Author notes</p>
                  <div className="text-sm text-black dark:text-white prose-math">
                    <KatexRenderer latex={problem.notes} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              {!hasSubmittedAnswer ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">Your Answer</label>
                    <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && answer.trim() && submitAnswer()}
                      placeholder="Enter your answer..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">Your Work</label>
                    <textarea
                      value={work}
                      onChange={(e) => setWork(e.target.value)}
                      rows={6}
                      placeholder="Show your approach, scratch work, or reasoning — helps the author understand how a solver reads their problem"
                      className={`${inputCls} resize-y`}
                    />
                  </div>
                  <button onClick={submitAnswer} disabled={!answer.trim()}
                    className="px-5 py-2.5 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                    Continue to Review
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 bg-white/50 dark:bg-white/[0.04] rounded-md border border-gray-100 dark:border-white/8">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Your answer: <span className="font-mono">{answer}</span></span>
                    </div>
                    {work && (
                      <div className="mt-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                          <FileEdit size={12} /> Your work
                        </div>
                        <div className="rounded border border-gray-100 dark:border-white/8 bg-white/70 dark:bg-white/[0.03] px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {work}
                        </div>
                      </div>
                    )}
                    <button onClick={() => setShowSolution(!showSolution)}
                      className="flex items-center gap-1.5 text-sm text-[#2774AE] dark:text-[#FFD100] hover:underline mt-3">
                      {showSolution ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showSolution ? 'Hide' : 'Show'} Author's Solution
                    </button>
                    {showSolution && problem.solution && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/8">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Author's Solution</p>
                        <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
                          <KatexRenderer latex={problem.solution} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">Comments</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-3.5 text-gray-400" size={15} />
                      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5}
                        placeholder="After reviewing the author's solution: comment on correctness, clarity, difficulty calibration, notation, or what you'd change..."
                        className={`${inputCls} resize-y pl-10`} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">Decision</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => setReviewType('feedback')}
                        className={`p-4 rounded-md border-2 text-left transition-colors ${
                          reviewType === 'feedback'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-600'
                        }`}>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">Needs Review</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Flag for revisions — your comment explains what to fix</div>
                      </button>
                      <button onClick={() => setReviewType('endorse')}
                        className={`p-4 rounded-md border-2 text-left transition-colors ${
                          reviewType === 'endorse'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-green-400 dark:hover:border-green-600'
                        }`}>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">Endorse</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Problem is ready as-is</div>
                      </button>
                    </div>
                  </div>

                  {reviewType && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => submitFeedback(reviewType === 'endorse')}
                        disabled={loading || !feedback.trim()}
                        className={`px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          reviewType === 'endorse' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'
                        }`}>
                        {loading ? 'Submitting...' : reviewType === 'endorse' ? 'Endorse Problem' : 'Submit Needs Review'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!problem && !loading && mode === 'random' && (
          <div className="text-center py-16">
            <Info className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={40} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Problem Available</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">There are no problems available for review right now, or you've written all the problems!</p>
            <button onClick={loadNextProblem}
              className="px-5 py-2.5 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded-md text-sm font-semibold hover:opacity-90 transition-opacity">
              Try Again
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GiveFeedback;
