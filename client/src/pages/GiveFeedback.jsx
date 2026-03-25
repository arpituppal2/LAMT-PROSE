import { useState, useEffect } from 'react';
import { Clock, Search, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
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

  // New state for solution reveal flow
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // reviewType: null = unselected, false = needs_review, true = endorsement
  const [reviewType, setReviewType] = useState(null);

  // Targeted review: search/filter
  const [mode, setMode] = useState(routeProblemId ? 'targeted' : 'random');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [reviewableProblems, setReviewableProblems] = useState([]);
  const [reviewableLoading, setReviewableLoading] = useState(false);

  const topics = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
  const stages = ['Idea', 'Review', 'Live/Ready for Review', 'Endorsed'];

  useEffect(() => {
    if (routeProblemId) {
      loadSpecificProblem(routeProblemId);
    } else if (mode === 'random') {
      loadNextProblem();
    } else {
      loadReviewableProblems();
    }
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
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [problem, hasSubmittedAnswer]);

  const loadSpecificProblem = async (id) => {
    try {
      const res = await api.get(`/problems/${id}`);
      setProblem(res.data);
      setAnswer('');
      setFeedback('');
      setReviewType(null);
      setMessage('');
      setHasSubmittedAnswer(false);
      setShowSolution(false);
    } catch (error) {
      setMessage('Failed to load problem');
    }
  };

  const loadNextProblem = async () => {
    try {
      const response = await api.get('/feedback/next');
      if (response.data) {
        setProblem(response.data);
        setAnswer('');
        setFeedback('');
        setReviewType(null);
        setMessage('');
        setHasSubmittedAnswer(false);
        setShowSolution(false);
      } else {
        setProblem(null);
        setMessage('No more problems to review!');
      }
    } catch (error) {
      setProblem(null);
      setMessage('Failed to load problem');
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
    } catch (error) {
      setMessage('Failed to load reviewable problems');
    } finally {
      setReviewableLoading(false);
    }
  };

  const handleSkip = () => {
    if (loading) return;
    setMessage('Skipping...');
    if (routeProblemId) {
      navigate('/feedback');
    } else {
      loadNextProblem();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reviewType === null) {
      setMessage('You must select either "Needs Review" or "Endorse" before submitting.');
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

      setMessage('Feedback submitted! Loading next problem...');
      setReviewType(null);
      if (routeProblemId) {
        setTimeout(() => navigate('/feedback'), 1200);
      } else {
        setTimeout(loadNextProblem, 1000);
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = reviewableProblems.filter((p) => {
    if (!searchQuery) return true;
    return (
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.latex.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ucla-blue mb-2">Give Feedback</h1>
          <p className="text-gray-600">Help improve problems by providing solutions and feedback</p>
        </div>

        {/* Mode toggle */}
        {!routeProblemId && (
          <div className="flex gap-2 mb-8 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
            <button
              onClick={() => {
                if (mode === 'random' && problem) return;
                setMode('random');
                setProblem(null);
                setMessage('');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'random'
                  ? 'bg-ucla-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Random Problem
            </button>
            <button
              onClick={() => {
                setMode('targeted');
                setProblem(null);
                setMessage('');
                // Note: Removed loadReviewableProblems() from here. 
                // The useEffect will handle this automatically when mode changes to 'targeted'.
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'targeted'
                  ? 'bg-ucla-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Select Problem to Review
            </button>
          </div>
        )}

        {/* Targeted mode: problem selector */}
        {mode === 'targeted' && !problem && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Select a Problem to Review</h2>
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID or content..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
                />
              </div>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Topics</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Stages</option>
                {stages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {reviewableLoading ? (
              <div className="text-center py-12 text-gray-500">Loading problems...</div>
            ) : filteredProblems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No reviewable problems found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredProblems.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadSpecificProblem(p.id)}
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-ucla-blue hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-ucla-blue">{p.id}</span>
                      {/* FIXED: Changed {problem.quality} to {p.quality} here */}
                      <span className="text-sm text-gray-500">Difficulty: {p.quality}/10</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.topics.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{t}</span>
                      ))}
                      <span className="px-2 py-0.5 bg-blue-50 text-ucla-blue text-xs rounded font-medium">
                        {p._displayStatus === 'needs_review' ? 'Needs Review' : p._displayStatus === 'endorsed' ? 'Endorsed' : p.stage}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No problem in random mode */}
        {mode === 'random' && !problem && !message && (
          <div className="text-center py-20 text-gray-500">Loading next problem...</div>
        )}

        {message && !problem && (
          <div className="text-center py-20 bg-white rounded-xl shadow-md">
            <p className="text-lg text-gray-700">{message}</p>
          </div>
        )}

        {/* Problem display + feedback form */}
        {problem && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Problem {problem.id}</h2>
                  <p className="text-gray-500 text-sm">by {problem.author?.firstName} {problem.author?.lastName}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className="text-xs font-bold text-ucla-blue bg-blue-50 px-2 py-1 rounded">Difficulty: {problem.quality}/10</div>
                   <div className="flex items-center gap-2 text-ucla-blue font-mono bg-blue-50 px-3 py-1 rounded-full text-sm">
                    <Clock size={16} />
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </div>
                </div>
              </div>

              <div className="prose max-w-none mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100 min-h-[150px]">
                <KatexRenderer latex={problem.latex} />
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {problem.topics?.map((topic) => (
                  <span key={topic} className="px-3 py-1 bg-ucla-blue/10 text-ucla-blue text-sm rounded-full font-medium">
                    {topic}
                  </span>
                ))}
              </div>

              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 transition-colors"
              >
                Skip this Problem
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8 border-t-4 border-ucla-blue">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Your Solution/Answer
                  </label>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
                    placeholder="Enter your solution..."
                    required
                    disabled={hasSubmittedAnswer}
                  />
                </div>

                {!hasSubmittedAnswer ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (answer.trim()) setHasSubmittedAnswer(true);
                      else setMessage('Please provide an answer first');
                    }}
                    className="w-full bg-ucla-blue text-white py-3 rounded-lg font-bold hover:bg-ucla-dark-blue transition-colors"
                  >
                    Check Creator Solution
                  </button>
                ) : (
                  <>
                    <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowSolution(!showSolution)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-semibold text-ucla-blue">
                          <CheckCircle size={18} />
                          See Writer's Solution
                        </div>
                        {showSolution ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {showSolution && (
                        <div className="p-4 border-t border-gray-200 space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Writer's Solution</h4>
                            <div className="prose prose-sm max-w-none">
                              {problem.solution ? <KatexRenderer latex={problem.solution} /> : <p className="italic text-gray-400">No solution provided</p>}
                            </div>
                          </div>
                          {problem.answer && (
                            <div className="p-3 bg-blue-50 rounded border border-blue-100">
                              <span className="font-bold text-ucla-blue text-sm">Correct Answer: </span>
                              <KatexRenderer latex={problem.answer} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-4">
                        Review Type <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setReviewType(false)}
                          className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                            reviewType === false
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'
                          }`}
                        >
                          Needs Review
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewType(true)}
                          className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                            reviewType === true
                              ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-yellow-300'
                          }`}
                        >
                          Endorse (No Changes Needed)
                        </button>
                      </div>
                      {reviewType === null && (
                        <p className="text-xs text-gray-400 mt-2 italic">Please select a review type to submit.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Feedback & Comments
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
                        placeholder="Share your thoughts, suggestions, or concerns..."
                        required
                      />
                    </div>

                    {message && (
                      <div className={`px-4 py-3 rounded border ${
                        message.includes('submitted')
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : message.includes('select')
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        {message}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setHasSubmittedAnswer(false)}
                        className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-semibold"
                      >
                        Edit My Solution
                      </button>
                      <button
                        type="submit"
                        disabled={loading || reviewType === null}
                        className="flex-[2] bg-ucla-blue text-white py-3 rounded-lg hover:bg-ucla-dark-blue transition-colors disabled:opacity-50 font-bold"
                      >
                        {loading ? 'Submitting...' : 'Submit Feedback & Next'}
                      </button>
                    </div>
                  </>
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
