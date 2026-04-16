import { useState, useEffect, useRef } from 'react';
import { Clock, Search, CheckCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const stages = ['Idea', 'Review', 'Needs Review', 'Endorsed'];

  // beforeunload guard only (no useBlocker to avoid render loops)
  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = !!(problem && hasSubmittedAnswer && (answer || feedback));
  });
  useEffect(() => {
    const handler = (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

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

  const loadSpecificProblem = async (problemId) => {
    setLoading(true);
    try {
      const res = await api.get(`/problems/${problemId}`);
      setProblem(res.data);
      setMessage('');
    } catch (error) {
      setMessage('Problem not found or unavailable for review.');
    } finally {
      setLoading(false);
    }
  };

  const loadNextProblem = async () => {
    setLoading(true);
    try {
      const res = await api.get('/problems/review/random');
      if (res.data) { setProblem(res.data); setMessage(''); }
      else { setProblem(null); setMessage('No problems available for review right now.'); }
    } catch (error) {
      setProblem(null);
      setMessage('No problems available for review right now.');
    } finally {
      setLoading(false);
    }
  };

  const loadReviewableProblems = async () => {
    setReviewableLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterTopic) params.append('topic', filterTopic);
      if (filterStage) params.append('stage', filterStage);
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      const res = await api.get(`/problems/reviewable?${params}`);
      setReviewableProblems(res.data || []);
    } catch (error) {
      setReviewableProblems([]);
    } finally {
      setReviewableLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'browse') {
      const debounce = setTimeout(loadReviewableProblems, 250);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, filterTopic, filterStage, filterDifficulty]);

  const submitAnswer = () => { setHasSubmittedAnswer(true); setShowSolution(true); };

  const submitFeedback = async (isEndorsement = false) => {
    if (!problem) return;
    setLoading(true);
    try {
      await api.post('/feedback', {
        problemId: problem.id,
        answer,
        feedback,
        isEndorsement,
        timeSpent: elapsed,
      });
      setMessage(isEndorsement ? 'Problem endorsed successfully!' : 'Feedback submitted successfully!');
      setAnswer('');
      setFeedback('');
      setReviewType(null);
      setHasSubmittedAnswer(false);
      setShowSolution(false);
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

  const inputCls = 'w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition';

  if (loading && !problem) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#2774AE] dark:border-[#FFD100]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Give Feedback</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Review problems and help improve the collection</p>
          </div>
          <div className="flex items-center gap-2">
            {['random', 'browse'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-[#2774AE] text-white'
                    : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/8'
                }`}>
                {m === 'random' ? 'Random Problem' : 'Browse Problems'}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={`mb-5 p-3.5 rounded-lg border text-sm ${
            message.includes('successfully') || message.includes('endorsed')
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>{message}</div>
        )}

        {/* Browse mode */}
        {mode === 'browse' && !routeProblemId && (
          <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" placeholder="Search problems..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-9`} />
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
                    className="p-4 border border-gray-100 dark:border-white/8 rounded-lg hover:border-[#2774AE] dark:hover:border-[#FFD100]/40 cursor-pointer transition-colors bg-gray-50 dark:bg-white/3 hover:bg-white dark:hover:bg-white/8">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">{rp.id}</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">{rp.stage}</span>
                          {rp.quality && <span className="text-xs text-gray-400">{rp.quality}/10</span>}
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
                      <div className="text-right text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        <div>{rp.feedbackCount || 0} reviews</div>
                        {rp.latestFeedback && <div className="mt-1">{new Date(rp.latestFeedback).toLocaleDateString()}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active problem */}
        {problem && (
          <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-white/8">
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="font-mono text-base font-semibold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
                <span className="px-2.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">{problem.stage}</span>
                {problem.quality && <span className="text-xs text-gray-400">Difficulty: {problem.quality}/10</span>}
                {!hasSubmittedAnswer && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto font-mono">
                    <Clock size={13} />{formatTime(elapsed)}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(problem.topics || []).map(t => (
                  <span key={t} className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">{t}</span>
                ))}
              </div>
              <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {problem.latex ? <KatexRenderer latex={problem.latex} /> : null}
              </div>
            </div>

            <div className="p-5">
              {!hasSubmittedAnswer ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Your Answer</label>
                    <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Enter your answer..." className={inputCls} />
                  </div>
                  <button onClick={submitAnswer} disabled={!answer.trim()}
                    className="px-5 py-2.5 bg-[#2774AE] text-white rounded-lg text-sm font-semibold hover:bg-[#005587] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Submit Answer
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/8">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Your Answer: {answer}</span>
                    </div>
                    <button onClick={() => setShowSolution(!showSolution)}
                      className="flex items-center gap-1.5 text-sm text-[#2774AE] dark:text-[#FFD100] hover:underline">
                      {showSolution ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showSolution ? 'Hide' : 'Show'} Solution
                    </button>
                    {showSolution && problem.solution && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Solution</p>
                        <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                          <KatexRenderer latex={problem.solution} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Review Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => setReviewType('feedback')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          reviewType === 'feedback'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-600'
                        }`}>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">Needs Improvement</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Provide constructive feedback</div>
                      </button>
                      <button onClick={() => setReviewType('endorse')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          reviewType === 'endorse'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-green-400 dark:hover:border-green-600'
                        }`}>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">Endorse</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Problem is ready as-is</div>
                      </button>
                    </div>
                  </div>

                  {reviewType === 'feedback' && (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Your Feedback</label>
                      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5}
                        placeholder="What should be improved about this problem?"
                        className={`${inputCls} resize-vertical`} />
                    </div>
                  )}

                  {reviewType && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => submitFeedback(reviewType === 'endorse')}
                        disabled={loading || (reviewType === 'feedback' && !feedback.trim())}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          reviewType === 'endorse' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'
                        }`}>
                        {loading ? 'Submitting...' : reviewType === 'endorse' ? 'Endorse Problem' : 'Submit Feedback'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!problem && !loading && mode !== 'browse' && (
          <div className="text-center py-16">
            <Info className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={40} />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Problem Available</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">There are no problems available for review right now.</p>
            <button onClick={loadNextProblem}
              className="px-5 py-2.5 bg-[#2774AE] text-white rounded-lg text-sm font-semibold hover:bg-[#005587] transition-colors">
              Try Again
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GiveFeedback;
