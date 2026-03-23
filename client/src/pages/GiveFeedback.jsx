import { useState, useEffect } from 'react';
import { Clock, Search } from 'lucide-react';
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
    }
  }, [problem]);

  useEffect(() => {
    if (!problem) return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [problem]);

  const loadSpecificProblem = async (id) => {
    try {
      const res = await api.get(`/problems/${id}`);
      setProblem(res.data);
      setAnswer('');
      setFeedback('');
      setReviewType(null);
      setMessage('');
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-ucla-blue mb-2">Give Feedback</h1>
        <p className="text-gray-600 mb-6">Help improve problems by providing solutions and feedback</p>

        {/* Mode toggle */}
        {!routeProblemId && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => { setMode('random'); setProblem(null); setMessage(''); }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'random' ? 'bg-ucla-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Random Problem
            </button>
            <button
              onClick={() => { setMode('targeted'); setProblem(null); setMessage(''); loadReviewableProblems(); }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'targeted' ? 'bg-ucla-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Select Problem to Review
            </button>
          </div>
        )}

        {/* Targeted mode: problem selector */}
        {mode === 'targeted' && !problem && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Select a Problem to Review</h2>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                onChange={(e) => { setFilterTopic(e.target.value); }}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Topics</option>
                {topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={filterStage}
                onChange={(e) => { setFilterStage(e.target.value); }}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Stages</option>
                {stages.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={loadReviewableProblems}
                className="px-4 py-2 bg-ucla-blue text-white rounded-lg hover:bg-ucla-dark-blue"
              >
                Filter
              </button>
            </div>
            {reviewableLoading ? (
              <p className="text-gray-500 text-center py-4">Loading problems...</p>
            ) : filteredProblems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No reviewable problems found.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProblems.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadSpecificProblem(p.id)}
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-ucla-blue hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-ucla-blue">{p.id}</span>
                        <span className="text-sm text-gray-500 ml-2">by {p.author.firstName} {p.author.lastName}</span>
                      </div>
                      <div className="flex gap-2">
                        {p.topics.map((t) => (
                          <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{t}</span>
                        ))}
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                          p._displayStatus === 'needs_review' ? 'bg-red-100 text-red-700' :
                          p._displayStatus === 'endorsed' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {p._displayStatus === 'needs_review' ? 'Needs Review' :
                           p._displayStatus === 'endorsed' ? 'Endorsed' : p.stage}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No problem in random mode */}
        {mode === 'random' && !problem && !message && (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">Loading next problem...</div>
          </div>
        )}
        {message && !problem && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-lg">{message}</div>
        )}

        {/* Problem display + feedback form */}
        {problem && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-ucla-blue">Problem {problem.id}</h2>
                  <p className="text-sm text-gray-600">by {problem.author?.firstName} {problem.author?.lastName}</p>
                  <p className="text-xs text-gray-500 mt-1">Difficulty: {problem.quality}/10</p>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={20} />
                  <span className="font-mono w-12 text-right">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <div className="prose max-w-none">
                <KatexRenderer latex={problem.latex} />
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                {problem.topics?.map((topic) => (
                  <span key={topic} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">{topic}</span>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Skip this Problem
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Answer</label>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
                    placeholder="Enter your solution..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <p className="text-xs text-gray-500 mt-1">Please select a review type to submit.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feedback & Comments</label>
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
                    message.includes('submitted') ? 'bg-green-50 border-green-200 text-green-700' :
                    message.includes('select') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                    'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || reviewType === null}
                  className="w-full bg-ucla-blue text-white py-2 rounded-lg hover:bg-ucla-dark-blue transition-colors disabled:opacity-50 font-bold"
                >
                  {loading ? 'Submitting...' : 'Submit & Next'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GiveFeedback;
