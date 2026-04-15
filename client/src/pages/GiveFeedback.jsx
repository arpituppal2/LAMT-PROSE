import { useState, useEffect, useCallback } from 'react';
import { Clock, Search, CheckCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const GiveFeedback = () => {
  const { problemId: routeProblemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [startTime, setStartTime] = useState(null);
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
  const stages = ['Idea', 'Review', 'Live/Ready for Review', 'Endorsed'];

  // Unsaved warning: block in-app navigation if mid-review
  const isDirty = !!(problem && hasSubmittedAnswer && (answer || feedback));
  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
    [isDirty]
  );
  const blocker = useBlocker(shouldBlock);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const ok = window.confirm('You have an unsaved review in progress. Leave anyway?');
      if (ok) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);

  // Warn on browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (routeProblemId) loadSpecificProblem(routeProblemId);
    else if (mode === 'random') loadNextProblem();
    else loadReviewableProblems();
  }, [mode, routeProblemId]);

  useEffect(() => {
    if (problem) {
      setStartTime(Date.now());
      setElapsed(0);
      setHasSubmittedAnswer(false);
      setShowSolution(false);
    }
  }, [problem]);

  useEffect(() => {
    if (!problem || hasSubmittedAnswer) return;
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [problem, hasSubmittedAnswer]);

  const loadSpecificProblem = async (id) => {
    try {
      const res = await api.get(`/problems/${id}`);
      setProblem(res.data);
      setAnswer(''); setFeedback(''); setReviewType(null); setMessage('');
      setHasSubmittedAnswer(false); setShowSolution(false);
    } catch { setMessage('Failed to load problem.'); }
  };

  const loadNextProblem = async () => {
    try {
      const response = await api.get('/feedback/next');
      if (response.data) {
        setProblem(response.data);
        setAnswer(''); setFeedback(''); setReviewType(null); setMessage('');
        setHasSubmittedAnswer(false); setShowSolution(false);
      } else {
        setProblem(null);
        setMessage('No more problems to review.');
      }
    } catch {
      setProblem(null);
      setMessage('Failed to load problem.');
    }
  };

  const loadReviewableProblems = async () => {
    setReviewableLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTopic) params.append('topic', filterTopic);
      if (filterStage) params.append('stage', filterStage);
      const res = await api.get(`/feedback/reviewable?${params.toString()}`);
      setReviewableProblems(res.data);
    } catch { setMessage('Failed to load problems.'); }
    finally { setReviewableLoading(false); }
  };

  const handleSkip = () => {
    if (loading) return;
    if (routeProblemId) navigate('/feedback');
    else loadNextProblem();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reviewType === null) {
      setMessage('Select a verdict before submitting.');
      return;
    }
    setLoading(true);
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
    try {
      await api.post('/feedback', {
        problemId: problem.id,
        answer,
        feedback,
        timeSpent,
        isEndorsement: reviewType === true,
      });
      setMessage('Submitted.');
      setReviewType(null);
      if (routeProblemId) setTimeout(() => navigate('/feedback'), 1000);
      else setTimeout(loadNextProblem, 800);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to submit.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = reviewableProblems.filter(p => {
    if (filterDifficulty && parseInt(p.quality) !== parseInt(filterDifficulty)) return false;
    if (!searchQuery) return true;
    return p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.latex || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">

        {/* Page header */}
        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Give Feedback</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Solve a problem, then review and endorse it — or flag it for revision.</p>
        </div>

        {/* Mode toggle — fixed-width tabs to prevent jitter */}
        {!routeProblemId && (
          <div className="flex border border-gray-200 dark:border-white/10 rounded-md overflow-hidden text-sm w-fit mb-6">
            <button
              onClick={() => { if (mode !== 'random') { setMode('random'); setProblem(null); setMessage(''); } }}
              className={`w-36 py-2 transition-colors font-medium text-center ${
                mode === 'random'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Random Problem
            </button>
            <button
              onClick={() => { setMode('targeted'); setProblem(null); setMessage(''); }}
              className={`w-36 py-2 border-l border-gray-200 dark:border-white/10 transition-colors font-medium text-center ${
                mode === 'targeted'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Select Problem
            </button>
          </div>
        )}

        {/* Targeted: problem picker */}
        {mode === 'targeted' && !problem && (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
            <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100 dark:border-white/8">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by ID or content"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition"
                />
              </div>
              <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
                className="px-3 py-2 text-sm appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer">
                <option value="">All difficulties</option>
                {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}/10</option>)}
              </select>
              <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                className="px-3 py-2 text-sm appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer">
                <option value="">All topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="px-3 py-2 text-sm appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer">
                <option value="">All stages</option>
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {reviewableLoading ? (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Loading...</div>
            ) : filteredProblems.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">No reviewable problems found.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredProblems.map(p => (
                  <button
                    key={p.id}
                    onClick={() => loadSpecificProblem(p.id)}
                    className="w-full text-left flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{p.id}</span>
                        <div className="flex gap-1.5">
                          {(p.topics || []).map(t => (
                            <span key={t} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                      {/* LaTeX-rendered preview */}
                      <div className="text-sm text-gray-500 dark:text-gray-400 overflow-hidden" style={{ maxHeight: '2.6em' }}>
                        <KatexRenderer latex={(p.latex || '').slice(0, 120)} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-sm text-gray-400 dark:text-gray-500">
                      {p.quality && <span className="tabular-nums">{p.quality}/10</span>}
                      <span>{p._displayStatus === 'needs_review' ? 'Needs Review' : p._displayStatus === 'endorsed' ? 'Endorsed' : p.stage}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!problem && mode === 'random' && message && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        )}

        {/* Problem review panel */}
        {problem && (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">

            {/* Problem header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 dark:border-white/8">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="font-mono text-base font-semibold text-gray-900 dark:text-white">{problem.id}</span>
                  {problem.quality && (
                    <span className="text-sm text-gray-400 dark:text-gray-500">{problem.quality}/10</span>
                  )}
                  {(problem.topics || []).map(t => (
                    <span key={t} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 rounded">{t}</span>
                  ))}
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  by {problem.author?.firstName} {problem.author?.lastName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {/* Timer with tooltip */}
                <div className="relative group flex items-center gap-1.5 font-mono text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded border border-gray-200 dark:border-white/10 cursor-default">
                  <Clock size={13} />
                  {minutes}:{seconds.toString().padStart(2, '0')}
                  <Info size={11} className="text-gray-300 dark:text-gray-600 ml-0.5" />
                  <span className="pointer-events-none absolute bottom-9 right-0 z-20 hidden group-hover:block w-56 rounded-lg px-3 py-2 text-xs leading-relaxed bg-gray-900 dark:bg-gray-800 text-white shadow-xl whitespace-normal">
                    Time elapsed since the problem loaded. This is recorded with your feedback to help calibrate difficulty estimates.
                  </span>
                </div>
                <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  Skip problem
                </button>
              </div>
            </div>

            {/* Problem statement */}
            <div className="px-6 py-6 border-b border-gray-100 dark:border-white/8 min-h-[140px] bg-gray-50/40 dark:bg-white/3">
              <KatexRenderer latex={problem.latex} />
            </div>

            {/* Form */}
            <div className="px-6 py-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Your answer</label>
                  <input
                    type="text"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition disabled:opacity-50"
                    placeholder="Enter your answer"
                    required
                    disabled={hasSubmittedAnswer}
                  />
                </div>

                {!hasSubmittedAnswer ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (answer.trim()) setHasSubmittedAnswer(true);
                      else setMessage('Enter an answer first.');
                    }}
                    className="w-full py-2.5 text-sm font-medium bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded hover:opacity-90 transition-opacity"
                  >
                    Check Creator Solution
                  </button>
                ) : (
                  <div className="space-y-5">

                    {/* Solution accordion */}
                    <div className="border border-gray-200 dark:border-white/10 rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowSolution(!showSolution)}
                        className="w-full flex justify-between items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle size={15} className="text-[#2774AE] dark:text-[#FFD100]" />
                          See writer's solution
                        </span>
                        {showSolution
                          ? <ChevronUp size={15} className="text-gray-400" />
                          : <ChevronDown size={15} className="text-gray-400" />}
                      </button>
                      {showSolution && (
                        <div className="px-5 py-5 border-t border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/3">
                          <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                            {problem.solution
                              ? <KatexRenderer latex={problem.solution} />
                              : <span className="text-gray-400 italic">No solution provided.</span>}
                          </div>
                          {problem.answer && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400 dark:text-gray-500">Answer:</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                <KatexRenderer latex={problem.answer} />
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Verdict */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Verdict <span className="text-red-400">*</span></label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setReviewType(false)}
                          className={`flex-1 py-2.5 text-sm font-medium rounded border-2 transition-all ${
                            reviewType === false
                              ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-500 dark:text-red-400'
                              : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          Needs Review
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewType(true)}
                          className={`flex-1 py-2.5 text-sm font-medium rounded border-2 transition-all ${
                            reviewType === true
                              ? 'border-[#FFD100] bg-yellow-50 text-yellow-700 dark:bg-[#FFD100]/10 dark:border-[#FFD100] dark:text-[#FFD100]'
                              : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          Endorse
                        </button>
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Comments</label>
                      <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition resize-y"
                        placeholder="Notes on correctness, clarity, difficulty, wording..."
                        required
                      />
                    </div>

                    {message && (
                      <p className={`text-sm ${
                        message === 'Submitted.' ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                      }`}>{message}</p>
                    )}

                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setHasSubmittedAnswer(false)}
                        className="px-5 py-2.5 text-sm font-medium border border-gray-200 dark:border-white/10 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        Edit Answer
                      </button>
                      <button
                        type="submit"
                        disabled={loading || reviewType === null}
                        className="flex-1 py-2.5 text-sm font-medium bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        {loading ? 'Submitting...' : 'Submit Feedback'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default GiveFeedback;
