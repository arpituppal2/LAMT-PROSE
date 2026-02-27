import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Clock, User, Trash2, Star } from 'lucide-react';
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
  const [editedAnswer, setEditedAnswer] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
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
      const data = response.data;
      setProblem(data);
      setFeedbacks(data.feedbacks || []);
      setEditedLatex(data.latex);
      setEditedSolution(data.solution || '');
      setEditedAnswer(data.answer || '');
      setEditedNotes(data.notes || '');
      setEditedTopics(data.topics);
      setEditedQuality(parseInt(data.quality));
      setEditedStage(data.stage);
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
        answer: editedAnswer,
        notes: editedNotes,
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

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this problem?')) return;
    try {
      await api.delete(`/problems/${id}`);
      navigate('/inventory');
    } catch (error) {
      setMessage('Failed to delete problem');
    }
  };

  const handleEndorse = async () => {
    try {
      await api.post('/feedbacks', {
        problemId: id,
        isEndorsement: true,
        feedback: 'Problem endorsed.'
      });
      setMessage('Problem endorsed successfully!');
      fetchProblem();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to endorse problem');
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
  const stageOptions = ['Idea', 'Review', 'Live/Ready for Review', 'On Test', 'Published', 'Needs Review'];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!problem) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Problem Not Found</h2>
          <button
            onClick={() => navigate('/inventory')}
            className="px-6 py-2 bg-ucla-blue text-white rounded-lg hover:bg-ucla-dark-blue"
          >
            Back to Inventory
          </button>
        </div>
      </Layout>
    );
  }

  const canEdit = problem._isAuthor || problem._isAdmin;
  const canEndorse = !problem._isAuthor && problem.stage === 'Review';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-ucla-blue">Problem {problem.id}</h1>
            <p className="text-gray-600 mt-2">
              by {problem.author.firstName} {problem.author.lastName} ({problem.author.initials})
            </p>
          </div>
          <div className="flex gap-2">
            {canEndorse && (
              <button
                onClick={handleEndorse}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold shadow-sm"
              >
                <Star size={18} fill="white" />
                Endorse Problem
              </button>
            )}
            {canEdit && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2 px-4 py-2 bg-ucla-blue text-white rounded-lg hover:bg-ucla-dark-blue"
                >
                  <Edit size={18} />
                  {isEditing ? 'Cancel Edit' : 'Edit'}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded ${
            message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Problem Content */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Problem Statement</h2>
            <div className="flex gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <User size={16} />
                <span>{feedbacks.length} reviewers</span>
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Problem</label>
                <textarea
                  value={editedLatex}
                  onChange={(e) => setEditedLatex(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Writer's Solution</label>
                <textarea
                  value={editedSolution}
                  onChange={(e) => setEditedSolution(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Final Answer</label>
                <input
                  type="text"
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Private)</label>
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
                <select
                  value={editedStage}
                  onChange={(e) => setEditedStage(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg w-full"
                >
                  {stageOptions.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSave}
                className="w-full bg-ucla-blue text-white py-2 rounded-lg hover:bg-ucla-dark-blue font-bold"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="prose max-w-none">
              <KatexRenderer latex={problem.latex} />
              <div className="mt-6 flex gap-2">
                {problem.topics.map(topic => (
                  <span key={topic} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                    {topic}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-4 text-sm text-gray-600 items-center">
                <span>Difficulty:  {problem.quality}/10</span>
                <span className={`px-2 py-1 text-xs rounded ${
                  problem.stage === 'On Test' ? 'bg-blue-100 text-blue-800' :
                  problem.stage === 'Live/Ready for Review' ? 'bg-green-100 text-green-800' :
                  problem.stage === 'Published' ? 'bg-green-600 text-white' :
                  problem.stage === 'Review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {problem.stage}
                </span>
                {problem.endorsements > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-bold flex items-center gap-1">
                    <Star size={12} fill="#CA8A04" /> {problem.endorsements} Endorsed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Answer and Solution Section */}
        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-ucla-blue">
              <h2 className="text-xl font-semibold mb-4 text-ucla-blue">Final Answer</h2>
                {problem.answer ? (
                   <div className="text-2xl text-ucla-blue bg-blue-50 p-4 rounded-lg text-center">
                      <KatexRenderer latex={problem.answer} />
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No answer provided</p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Writer's Solution</h2>
              {problem.solution ? (
                <div className="prose max-w-none text-sm">
                  <KatexRenderer latex={problem.solution} />
                </div>
              ) : (
                <p className="text-gray-500 italic">No solution provided</p>
              )}
            </div>
          </div>
        )}

        {/* Private Notes */}
        {!isEditing && (problem.notes || problem._isAdmin || problem._isAuthor) && (
          <div className="bg-white border-l-4 border-yellow-400 rounded-r-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Private Notes</h2>
            <p className="text-xs text-yellow-700 mb-4 font-medium uppercase tracking-wider">Visible only to author and admins</p>
            {problem.notes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{problem.notes}</p>
            ) : (
              <p className="text-gray-500 italic">No notes added</p>
            )}
          </div>
        )}

        {/* Feedback Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Feedback ({feedbacks.length})</h2>
          {feedbacks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No feedback yet</p>
          ) : (
<div className="space-y-6">
  {feedbacks.map((fb) => (
    <div
      key={fb.id}
      className={`border-l-4 pl-4 py-2 ${
        fb.isEndorsement ? 'border-yellow-400 bg-yellow-50/30' : 'border-ucla-blue'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-gray-800">
            {fb.user.firstName} {fb.user.lastName}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(fb.createdAt).toLocaleDateString()}
            {fb.answer && (
              <span>
                {' '}
                · Answered:{' '}
                <span className="font-mono">{fb.answer}</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {fb.isEndorsement ? (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-bold flex items-center gap-1">
              <Star size={12} fill="#CA8A04" /> Endorsement
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">
              {fb.resolved ? 'Needs Review · Resolved' : 'Needs Review'}
            </span>
          )}

          {(problem._isAuthor || problem._isAdmin) &&
            !fb.isEndorsement &&
            !fb.resolved && (
              <button
                onClick={async () => {
                  await api.put(`/feedback/${fb.id}/resolve`);
                  fetchProblem();
                }}
                className="text-xs text-ucla-blue underline"
              >
                Resolve
              </button>
              {(problem._isAuthor || problem._isAdmin) && !fb.isEndorsement && (
  <button
    onClick={async () => {
      await api.put(`/feedback/${fb.id}/resolve`); // keep this if you want it resolved
      await api.put('/feedback/convert-to-endorsement', { id: fb.id });
      fetchProblem();
    }}
    className="ml-2 text-xs text-green-600 underline"
  >
    Make Endorsement (temp)
  </button>
)}

            )}
        </div>
      </div>

      <p className="text-gray-700 mt-2 whitespace-pre-wrap">
        {fb.feedback}
      </p>
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
