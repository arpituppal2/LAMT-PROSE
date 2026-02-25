import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const GiveFeedback = () => {
  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadNextProblem();
  }, []);

  useEffect(() => {
    if (problem) {
      setStartTime(Date.now());
    }
  }, [problem]);

  const loadNextProblem = async () => {
    try {
      const response = await api.get('/feedback/next');
      if (response.data) {
        setProblem(response.data);
        setAnswer('');
        setFeedback('');
        setMessage('');
      } else {
        setProblem(null);
        setMessage('No more problems to review!');
      }
    } catch (error) {
      console.error('Failed to fetch next problem:', error);
      setMessage('Failed to load problem');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;

    try {
      await api.post('/feedback', {
        problemId: problem.id,
        answer,
        feedback,
        timeSpent
      });

      setMessage('Feedback submitted! Loading next problem...');
      setTimeout(loadNextProblem, 1000);
    } catch (error) {
      setMessage('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const elapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-ucla-blue mb-2">Give Feedback</h1>
        <p className="text-gray-600 mb-8">Help improve problems by providing solutions and feedback</p>

        {!problem && !message && (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">Loading next problem...</div>
          </div>
        )}

        {message && !problem && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-lg">
            {message}
          </div>
        )}

        {problem && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-ucla-blue">Problem {problem.id}</h2>
                  <p className="text-sm text-gray-600">
                    by {problem.author.firstName} {problem.author.lastName}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={20} />
                  <span className="font-mono">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="prose max-w-none">
                <KatexRenderer latex={problem.latex} displayMode />
              </div>

              <div className="mt-4 flex gap-2">
                {problem.topics.map(topic => (
                  <span key={topic} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Answer
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-ucla-blue text-white py-2 rounded-lg hover:bg-ucla-dark-blue transition-colors disabled:opacity-50"
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
