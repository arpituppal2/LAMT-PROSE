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

  const loadSpecificProblem = async (problemId) => {
    setLoading(true);
    try {
      const res = await api.get(`/problems/${problemId}`);
      setProblem(res.data);
      setMessage('');
    } catch (error) {
      console.error('Failed to load problem:', error);
      setMessage('Problem not found or unavailable for review.');
    } finally {
      setLoading(false);
    }
  };

  const loadNextProblem = async () => {
    setLoading(true);
    try {
      const res = await api.get('/problems/review/random');
      if (res.data) {
        setProblem(res.data);
        setMessage('');
      } else {
        setProblem(null);
        setMessage('No problems available for review right now.');
      }
    } catch (error) {
      console.error('Failed to load next problem:', error);
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
      console.error('Failed to load reviewable problems:', error);
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

  const submitAnswer = () => {
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

      if (routeProblemId) {
        setTimeout(() => navigate(`/problem/${problem.id}`), 1200);
      } else if (mode === 'random') {
        setTimeout(loadNextProblem, 800);
      } else {
        loadReviewableProblems();
        setProblem(null);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
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

  const selectProblem = async (selectedProblem) => {
    await loadSpecificProblem(selectedProblem.id);
    setMode('targeted');
  };

  if (loading && !problem) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2774AE] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading problem...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Give Feedback</h1>
            <p className="text-gray-600 dark:text-gray-400">Review problems and help improve the collection</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('random')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'random'
                  ? 'bg-[#2774AE] text-white'
                  : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'
              }`}
            >
              Random Problem
            </button>
            <button
              onClick={() => setMode('browse')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'browse'
                  ? 'bg-[#2774AE] text-white'
                  : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'
              }`}
            >
              Browse Problems
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.includes('successfully') || message.includes('endorsed')
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            {message}
          </div>
        )}

        {mode === 'browse' && !routeProblemId && (
          <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2774AE] focus:border-transparent"
                />
              </div>

              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2774AE] focus:border-transparent"
              >
                <option value="">All Topics</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>

              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2774AE] focus:border-transparent"
              >
                <option value="">All Stages</option>
                {stages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>

              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2774AE] focus:border-transparent"
              >
                <option value="">All Difficulties</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(diff => (
                  <option key={diff} value={diff}>{diff}/10</option>
                ))}
              </select>
            </div>

            {reviewableLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2774AE] mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading problems...</p>
              </div>
            ) : reviewableProblems.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No problems found matching your criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewableProblems.map(reviewableProblem => (
                  <div
                    key={reviewableProblem.id}
                    onClick={() => selectProblem(reviewableProblem)}
                    className="p-4 border border-gray-200 dark:border-white/10 rounded-lg hover:border-[#2774AE] dark:hover:border-[#FFD100] cursor-pointer transition-colors bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-semibold text-[#2774AE] dark:text-[#FFD100]">
                            {reviewableProblem.id}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                            {reviewableProblem.stage}
                          </span>
                          {reviewableProblem.quality && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {reviewableProblem.quality}/10
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                          <KatexRenderer latex={reviewableProblem.latex || ''} />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(reviewableProblem.topics || []).map(topic => (
                            <span
                              key={topic}
                              className="px-2 py-1 text-xs rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        <div>{reviewableProblem.feedbackCount || 0} reviews</div>
                        {reviewableProblem.latestFeedback && (
                          <div className="mt-1">Latest: {new Date(reviewableProblem.latestFeedback).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {problem && (
          <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="font-mono text-lg font-semibold text-[#2774AE] dark:text-[#FFD100]">
                  {problem.id}
                </span>
                <span className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                  {problem.stage}
                </span>
                {problem.quality && (
                  <span className="text-gray-600 dark:text-gray-400">Difficulty: {problem.quality}/10</span>
                )}
                {!hasSubmittedAnswer && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 ml-auto">
                    <Clock size={16} />
                    {formatTime(elapsed)}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {(problem.topics || []).map(topic => (
                  <span
                    key={topic}
                    className="px-2 py-1 text-xs rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              <div className="prose prose-gray dark:prose-invert max-w-none">
                <KatexRenderer latex={problem.latex || ''} />
              </div>
            </div>

            <div className="p-6">
              {!hasSubmittedAnswer ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your Answer
                    </label>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Enter your answer..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2774AE] focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={submitAnswer}
                    disabled={!answer.trim()}
                    className="px-6 py-3 bg-[#2774AE] text-white rounded-lg font-medium hover:bg-[#1e5f8f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Submit Answer
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                      <span className="font-medium text-gray-900 dark:text-white">Your Answer: {answer}</span>
                    </div>

                    <button
                      onClick={() => setShowSolution(!showSolution)}
                      className="flex items-center gap-2 text-[#2774AE] dark:text-[#FFD100] hover:underline"
                    >
                      {showSolution ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {showSolution ? 'Hide' : 'Show'} Solution
                    </button>

                    {showSolution && problem.solution && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Solution</h3>
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                          <KatexRenderer latex={problem.solution} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Review Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setReviewType('feedback')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          reviewType === 'feedback'
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-orange-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-1">Needs Improvement</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Provide constructive feedback</div>
                      </button>

                      <button
                        onClick={() => setReviewType('endorse')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          reviewType === 'endorse'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-green-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-1">Endorse</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Problem is ready as-is</div>
                      </button>
                    </div>
                  </div>

                  {reviewType === 'feedback' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Feedback
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={6}
                        placeholder="What should be improved about this problem?"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2774AE] focus:border-transparent resize-vertical"
                      />
                    </div>
                  )}

                  {reviewType && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => submitFeedback(false)}
                        disabled={loading || (reviewType === 'feedback' && !feedback.trim())}
                        className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Submitting...' : 'Submit Feedback'}
                      </button>

                      <button
                        onClick={() => submitFeedback(true)}
                        disabled={loading}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Submitting...' : 'Endorse Problem'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!problem && !loading && mode !== 'browse' && (
          <div className="text-center py-12">
            <Info className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Problem Available</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">There are no problems available for review right now.</p>
            <button
              onClick={loadNextProblem}
              className="px-6 py-3 bg-[#2774AE] text-white rounded-lg font-medium hover:bg-[#1e5f8f] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GiveFeedback;
