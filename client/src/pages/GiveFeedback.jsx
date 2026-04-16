import { useState, useEffect, useRef } from 'react';
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
  // Use a stable ref so useBlocker doesn't recreate the callback on every render
  const isDirty = !!(problem && hasSubmittedAnswer && (answer || feedback));
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname
  );
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

  const loadNextProblem = async () => {
    setLoading(true);
    setMessage('');
    setAnswer('');
    setFeedback('');
    setReviewType(null);
    try {
      const res = await api.get('/problems/next-for-review');
      setProblem(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setProblem(null);
        setMessage('No problems available for review right now.');
      } else {
        setMessage('Failed to load problem.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificProblem = async (id) => {
    setLoading(true);
    setMessage('');
    setAnswer('');
    setFeedback('');
    setReviewType(null);
    try {
      const res = await api.get(`/problems/${id}`);
      setProblem(res.data);
    } catch (error) {
      setMessage('Failed to load problem.');
    } finally {
      setLoading(false);
    }
  };

  const loadReviewableProblems = async () => {
    setReviewableLoading(true);
    try {
      const res = await api.get('/problems/reviewable');
      setReviewableProblems(res.data);
    } catch (error) {
      console.error('Failed to fetch reviewable problems', error);
    } finally {
      setReviewableLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setMessage('Please enter your answer.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post(`/problems/${problem.id}/check-answer`, { answer });
      setHasSubmittedAnswer(true);
      setShowSolution(true);
      setReviewType(res.data.correct ? 'endorse' : 'needs_review');
    } catch (error) {
      setMessage('Failed to check answer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewType) {
      setMessage('Please select a review type.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      await api.post(`/problems/${problem.id}/feedback`, {
        answer,
        feedback,
        isEndorsement: reviewType === 'endorse',
        timeSpent,
      });
      setMessage('Review submitted!');
      setTimeout(() => {
        if (mode === 'random') loadNextProblem();
        else loadReviewableProblems();
      }, 1000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = reviewableProblems.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (p.id || '').toLowerCase().includes(q) || (p.latex || '').toLowerCase().includes(q);
    const matchTopic = !filterTopic || (p.topics || []).includes(filterTopic);
    const matchStage = !filterStage || p.stage === filterStage;
    const matchDiff = !filterDifficulty || String(p.quality) === filterDifficulty;
    return matchSearch && matchTopic && matchStage && matchDiff;
  });

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 mb-6 p-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg w-fit">
          {[['random', 'Random'], ['browse', 'Browse'], ['targeted', 'By ID']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setMode(val); setProblem(null); setMessage(''); }}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === val
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Browse mode: list of reviewable problems */}
        {mode === 'browse' && !problem && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ID or content"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30"
                />
              </div>
              <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                <option value="">All topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                <option value="">All stages</option>
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                <option value="">All difficulties</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={String(n)}>{n}/10</option>
                ))}
              </select>
            </div>
            {reviewableLoading ? (
              <div className="text-center py-12 text-sm text-gray-400">Loading…</div>
            ) : (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/8">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ID</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Topics</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Difficulty</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stage</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {filteredProblems.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No problems found.</td></tr>
                    ) : filteredProblems.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{p.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.topics || []).map(t => (
                              <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-[#2774AE] dark:text-[#FFD100] tabular-nums">
                          {p.quality ? `${parseInt(p.quality)}/10` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">{p.stage}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => loadSpecificProblem(p.id)}
                            className="px-3 py-1.5 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Targeted mode: enter ID */}
        {mode === 'targeted' && !problem && (
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Problem ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. P-001"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchQuery && loadSpecificProblem(searchQuery)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30"
              />
              <button
                onClick={() => searchQuery && loadSpecificProblem(searchQuery)}
                className="px-4 py-2 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Load
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !problem && (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading problem…</div>
        )}

        {/* Message (no problem) */}
        {!loading && !problem && message && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">{message}</div>
        )}

        {/* Random mode: load button */}
        {mode === 'random' && !problem && !loading && !message && (
          <div className="text-center py-12">
            <button
              onClick={loadNextProblem}
              className="px-6 py-3 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Load a problem
            </button>
          </div>
        )}

        {/* Problem card */}
        {problem && (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
            {/* Problem header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#2774AE] dark:bg-ucla-navy">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-white">{problem.id}</span>
                {problem.topics?.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/20 text-white">{t}</span>
                ))}
                {problem.quality && (
                  <span className="text-xs text-white/60">{parseInt(problem.quality)}/10</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!hasSubmittedAnswer && (
                  <span className="flex items-center gap-1.5 text-xs text-white/60">
                    <Clock size={12} /> {formatTime(elapsed)}
                  </span>
                )}
                <button
                  onClick={() => { setProblem(null); setMessage(''); }}
                  className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Problem statement */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Problem Statement</p>
                <div className="prose-math text-gray-900 dark:text-gray-100 leading-relaxed">
                  <KatexRenderer latex={problem.latex || ''} />
                </div>
              </div>

              {/* Answer input */}
              {!hasSubmittedAnswer && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Your Answer</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmitAnswer()}
                        placeholder="Enter your answer…"
                        className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30"
                      />
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={loading}
                        className="px-4 py-2 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Post-answer: solution + review form */}
              {hasSubmittedAnswer && (
                <div className="space-y-4">
                  {/* Solution */}
                  {problem.solution && (
                    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setShowSolution(s => !s)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                          <CheckCircle size={13} />
                          {showSolution ? 'Hide' : 'Show'} Solution
                        </div>
                        {showSolution ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                      </button>
                      {showSolution && (
                        <div className="p-4 border-t border-gray-100 dark:border-white/8 prose-math text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                          <KatexRenderer latex={problem.solution} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review type */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Verdict</p>
                    <div className="flex gap-2">
                      {[['endorse', 'Endorse ✓'], ['needs_review', 'Needs Review']].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setReviewType(val)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                            reviewType === val
                              ? val === 'endorse'
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'bg-amber-500 border-amber-500 text-white'
                              : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback text */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Comment (optional)</label>
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      rows={3}
                      placeholder="Any feedback for the problem author…"
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSubmitReview}
                      disabled={loading || !reviewType}
                      className="px-5 py-2 bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading ? 'Submitting…' : 'Submit Review'}
                    </button>
                    {message && (
                      <p className={`text-sm ${
                        message.includes('submitted') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                      }`}>{message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GiveFeedback;
