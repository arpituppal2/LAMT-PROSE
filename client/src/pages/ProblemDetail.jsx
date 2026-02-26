import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Clock, User } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLatex, setEditedLatex] = useState('');
  const [editedSolution, setEditedSolution] = useState('');
  const [editedTopics, setEditedTopics] = useState([]);
  const [editedQuality, setEditedQuality] = useState(5);
  const [editedStage, setEditedStage] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProblem();
  }, [id]);

  const fetchProblem = async () => {
    try {
      const response = await api.get(`/problems/${id}`);
      setProblem(response.data);
      setFeedbacks(response.data.feedbacks || []);
      setEditedLatex(response.data.latex);
      setEditedSolution(response.data.solution || '');
      setEditedTopics(response.data.topics);
      setEditedQuality(parseInt(response.data.quality));
      setEditedStage(response.data.stage);
    } catch (error) {
      console.error('Failed to fetch problem:', error);
      setMessage('Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/problems/${id}`, {
        latex: editedLatex,
        solution: editedSolution,
        topics: editedTopics,
        quality: String(editedQuality),
        stage: editedStage
      });
      setMessage('Problem updated successfully!');
      setIsEditing(false);
      fetchProblem();
    } catch (error) {
      setMessage('Failed to update problem');
    }
  };

  const handleTopicToggle = (topic) => {
    setEditedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
  const stageOptions = ['Idea', 'Endorsed', 'On Test', 'Published', 'Needs Review'];

  if (loading) {
    return (
      <Layout>
        <div className=\"flex items-center justify-center h-64\">
          <div className=\"text-gray-600\">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!problem) {
    return (
      <Layout>
        <div className=\"text-center py-12\">
          <h2 className=\"text-2xl font-bold text-gray-700 mb-4\">Problem Not Found</h2>
          <button
            onClick={() => navigate('/inventory')}
            className=\"px-6 py-2 bg-ucla-blue text-white rounded-lg hover:bg-ucla-dark-blue\"
          >
            Back to Inventory
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className=\"max-w-6xl mx-auto\">
        {/* Header */}
        <div className=\"flex justify-between items-start mb-6\">
          <div>
            <h1 className=\"text-3xl font-bold text-ucla-blue\">Problem {problem.id}</h1>
            <p className=\"text-gray-600 mt-2\">
              by {problem.author.firstName} {problem.author.lastName} ({problem.author.initials})
            </p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className=\"flex items-center gap-2 px-4 py-2 bg-ucla-blue text-white rounded-lg hover:bg-ucla-dark-blue\"
          >
            <Edit size={18} />
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </button>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded ${
            message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Problem Content */}
        <div className=\"bg-white rounded-lg shadow-md p-6 mb-6\">
          <div className=\"flex justify-between items-center mb-4\">
            <h2 className=\"text-xl font-semibold\">Problem Statement</h2>
            <div className=\"flex gap-4 text-sm text-gray-600\">
              <div className=\"flex items-center gap-1\">
                <Clock size={16} />
                <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
              </div>
              <div className=\"flex items-center gap-1\">
                <User size={16} />
                <span>{feedbacks.length} reviewers</span>
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className=\"space-y-4\">
              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">Problem (LaTeX)</label>
                <textarea
                  value={editedLatex}
                  onChange={(e) => setEditedLatex(e.target.value)}
                  rows={8}
                  className=\"w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm\"
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">Solution (LaTeX)</label>
                <textarea
                  value={editedSolution}
                  onChange={(e) => setEditedSolution(e.target.value)}
                  rows={6}
                  className=\"w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm\"
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-2\">Topics</label>
                <div className=\"flex gap-2 flex-wrap\">
                  {topicOptions.map(topic => (
                    <button
                      key={topic}
                      type=\"button\"
                      onClick={() => handleTopicToggle(topic)}
                      className={`px-4 py-2 rounded-lg ${
                        editedTopics.includes(topic)
                          ? 'bg-ucla-blue text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                  Difficulty: <span className=\"font-bold text-ucla-blue\">{editedQuality}/10</span>
                </label>
                <input
                  type=\"range\"
                  min=\"1\"
                  max=\"10\"
                  value={editedQuality}
                  onChange={(e) => setEditedQuality(Number(e.target.value))}
                  className=\"w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-ucla-blue\"
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-2\">Stage</label>
                <select
                  value={editedStage}
                  onChange={(e) => setEditedStage(e.target.value)}
                  className=\"px-4 py-2 border border-gray-300 rounded-lg\"
                >
                  {stageOptions.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSave}
                className=\"w-full bg-ucla-blue text-white py-2 rounded-lg hover:bg-ucla-dark-blue\"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className=\"prose max-w-none\">
              <KatexRenderer latex={problem.latex} displayMode />
              <div className=\"mt-6 flex gap-2\">
                {problem.topics.map(topic => (
                  <span key={topic} className=\"px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded\">
                    {topic}
                  </span>
                ))}
              </div>
              <div className=\"mt-4 flex gap-4 text-sm text-gray-600\">
                <span>Quality: {problem.quality}/10</span>
                <span className={`px-2 py-1 text-xs rounded ${
                  problem.stage === 'On Test' ? 'bg-blue-100 text-blue-800' :
                  problem.stage === 'Endorsed' ? 'bg-yellow-100 text-yellow-800' :
                  problem.stage === 'Published' ? 'bg-green-100 text-green-800' :
                  problem.stage === 'Needs Review' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {problem.stage}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Writer's Solution */}
        {problem.solution && !isEditing && (
          <div className=\"bg-white rounded-lg shadow-md p-6 mb-6\">
            <h2 className=\"text-xl font-semibold mb-4\">Writer's Solution</h2>
            <div className=\"prose max-w-none\">
              <KatexRenderer latex={problem.solution} displayMode />
            </div>
          </div>
        )}

        {/* Feedback Section */}
        <div className=\"bg-white rounded-lg shadow-md p-6\">
          <h2 className=\"text-xl font-semibold mb-4\">
            Feedback ({feedbacks.length} reviews)
          </h2>
          
          {feedbacks.length === 0 ? (
            <p className=\"text-gray-500 text-center py-8\">No feedback yet</p>
          ) : (
            <div className=\"space-y-6\">
              {feedbacks.map((fb) => (
                <div key={fb.id} className=\"border-l-4 border-ucla-blue pl-4 py-2\">
                  <div className=\"flex justify-between items-start mb-2\">
                    <div>
                      <p className=\"font-semibold text-gray-800\">
                        {fb.user.firstName} {fb.user.lastName}
                      </p>
                      <p className=\"text-sm text-gray-500\">
                        {new Date(fb.createdAt).toLocaleDateString()} · 
                        Answered: <span className=\"font-mono text-ucla-blue\">{fb.answer}</span>
                        {fb.timeSpent && <span> · {Math.floor(fb.timeSpent / 60)}:{(fb.timeSpent % 60).toString().padStart(2, '0')}</span>}
                      </p>
                    </div>
                    {fb.resolved && (
                      <span className=\"px-2 py-1 bg-green-100 text-green-800 text-xs rounded\">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className=\"text-gray-700 mt-2 whitespace-pre-wrap\">{fb.feedback}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProblemDetail;
