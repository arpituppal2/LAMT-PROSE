import { useState, useEffect } from 'react';
import { Clock, Search, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  const stages = ['Idea', 'Review', 'Live/Ready for Review', 'Endorsed'];

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

  const stripFormatting = (text) => {
    if (!text) return '';
    return text.replace(/\\$[^$]+\\$/g, '').replace(/[#*`\\\\]/g, '').substring(0, 60) + (text.length > 60 ? '...' : '');
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
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Feedback</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Review problems and submit verdicts</p>
        </div>

        {/* Mode toggle */}
        {!routeProblemId && (
          <div className="flex border border-gray-200 dark:border-white/10 rounded overflow-hidden text-sm w-fit mb-5">
            <button
              onClick={() => { if (mode !== 'random') { setMode('random'); setProblem(null); setMessage(''); } }}
              className={`px-4 py-1.5 transition-colors ${
                mode === 'random'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Random
            </button>
            <button
              onClick={() => { setMode('targeted'); setProblem(null); setMessage(''); }}
              className={`px-4 py-1.5 border-l border-gray-200 dark:border-white/10 transition-colors ${
                mode === 'targeted'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Select
            </button>
          </div>
        )}

        {/* Targeted: problem picker */}
        {mode === 'targeted' && !problem && (
          <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2 p-3 border-b border-gray-100 dark:border-white/8">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search ID or content"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] transition"
                />
              </div>
              <select
                value={filterDifficulty}
                onChange={e => setFilterDifficulty(e.target.value)}
                className="px-2 py-1.5 text-sm bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="">All difficulties</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}/10</option>
                ))}
              </select>
              <select
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                className="px-2 py-1.5 text-sm bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="">All topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={filterStage}
                onChange={e => setFilterStage(e.target.value)}
                className="px-2 py-1.5 text-sm bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="">All stages</option>
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Problem list */}
            {reviewableLoading ? (
              <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Loading...</div>
            ) : filteredProblems.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">No reviewable problems found.</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {filteredProblems.map(p => (
                  <button
                    key={p.id}
                    onClick={() => loadSpecificProblem(p.id)}
                    className="w-full text-left flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-sm font-medium text-[#2774AE] dark:text-[#FFD100]">{p.id}</span>
                        <div className="flex gap-1">
                          {(p.topics || []).map(t => (
                            <span key={t} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-white/8 text-gray-400 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{stripFormatting(p.latex)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.quality && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{p.quality}/10</span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {p._displayStatus === 'needs_review' ? 'Needs Review' : p._displayStatus === 'endorsed' ? 'Endorsed' : p.stage}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No-problem state for random mode */}
        {!problem && mode === 'random' && message && (
          <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
        )}

        {/* Problem review panel */}
        {problem && (
          <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded overflow-hidden">

            {/* Problem header */}
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/8">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{problem.id}</span>
                  {problem.quality && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{problem.quality}/10</span>
                  )}
                  {(problem.topics || []).map(t => (
                    <span key={t} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 rounded">{t}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {problem.author?.firstName} {problem.author?.lastName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1.5 font-mono text-sm text-gray-600 dark:text-gray-400">
                  <Clock size={13} className="text-gray-400" />
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <button
                  onClick={handleSkip}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>

            {/* Problem body */}
            <div className="px-5 py-5 border-b border-gray-100 dark:border-white/8 min-h-[120px]">
              <KatexRenderer latex={problem.latex} />
            </div>

            {/* Form */}
            <div className="px-5 py-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1.5">Your answer</label>
                  <input
                    type="text"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] transition disabled:opacity-50"
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
                    className="w-full py-2 text-sm font-medium bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded hover:opacity-90 transition-opacity"
                  >
                    Check solution
                  </button>
                ) : (
                  <div className="space-y-4">

                    {/* Solution reveal */}
                    <div className="border border-gray-100 dark:border-white/8 rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowSolution(!showSolution)}
                        className="w-full flex justify-between items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle size={13} className="text-gray-400" />
                          Writer's solution
                        </span>
                        {showSolution ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </button>
                      {showSolution && (
                        <div className="px-4 py-4 border-t border-gray-100 dark:border-white/8">
                          <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            {problem.solution
                              ? <KatexRenderer latex={problem.solution} />
                              : <span className="text-gray-400 italic">No solution provided.</span>
                            }
                          </div>
                          {problem.answer && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-xs text-gray-400 dark:text-gray-500">Answer:</span>
                              <span className="text-gray-900 dark:text-white font-medium">
                                <KatexRenderer latex={problem.answer} />
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Verdict */}
                    <div>
                      <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1.5">Verdict <span className="text-red-400">*</span></label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewType(false)}
                          className={`flex-1 py-2 text-sm rounded border transition-colors ${
                            reviewType === false
                              ? 'border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:border-red-500 dark:text-red-400'
                              : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          Needs review
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewType(true)}
                          className={`flex-1 py-2 text-sm rounded border transition-colors ${
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
                      <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1.5">Comments</label>
                      <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] transition resize-y"
                        placeholder="Notes on correctness, clarity, difficulty..."
                        required
                      />
                    </div>

                    {message && (
                      <p className={`text-sm ${
                        message === 'Submitted.' ? 'text-green-500' : 'text-red-400'
                      }`}>{message}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHasSubmittedAnswer(false)}
                        className="px-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                      >
                        Edit answer
                      </button>
                      <button
                        type="submit"
                        disabled={loading || reviewType === null}
                        className="flex-1 py-2 text-sm font-medium bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        {loading ? 'Submitting...' : 'Submit'}
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
