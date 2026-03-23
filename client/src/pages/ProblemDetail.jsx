import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Clock, User, Trash2, Star, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
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
  const [message, setMessage] = useState('');

  // Editing form state
  const [editedLatex, setEditedLatex] = useState('');
  const [editedSolution, setEditedSolution] = useState('');
  const [editedAnswer, setEditedAnswer] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [editedTopics, setEditedTopics] = useState([]);
  const [editedDifficulty, setEditedDifficulty] = useState(5);
  const [editedStage, setEditedStage] = useState('');

  // UI toggles
  const [showSolution, setShowSolution] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveComment, setResolveComment] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editedFeedbackComment, setEditedFeedbackComment] = useState('');

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
      setEditedStage(data.stage);
      setEditedDifficulty(parseInt(data.quality));
    } catch (error) {
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
        quality: String(editedDifficulty),
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
      await api.post('/feedback', {
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

  const handleResolveFeedback = async (fbId) => {
    if (!resolveComment.trim()) {
      setMessage('You must provide a comment explaining the resolution.');
      return;
    }
    try {
      await api.put(`/feedback/${fbId}/resolve`, { comment: resolveComment });
      setMessage('Feedback marked as resolved.');
      setResolvingId(null);
      setResolveComment('');
      fetchProblem();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to resolve feedback');
    }
  };

  const handleEditFeedback = async (fbId) => {
    try {
      await api.patch(`/feedback/${fbId}`, { comment: editedFeedbackComment });
      setMessage('Feedback updated.');
      setEditingFeedbackId(null);
      fetchProblem();
    } catch (error) {
      setMessage('Failed to update feedback');
    }
  };

  const stageOptions = ['Idea', 'Review', 'Live/Ready for Review', 'On Test', 'Published', 'Needs Review'];

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;
  if (!problem) return <Layout><div className="text-center py-12"><h2>Problem Not Found</h2></div></Layout>;

  const canEdit = problem._isAuthor || problem._isAdmin;
  const canEndorse = !problem._isAuthor && problem.stage === 'Review';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-ucla-blue">Problem {problem.id}</h1>
              <span className={`px-3 py-1 text-sm rounded-full font-bold shadow-sm ${
                problem._displayStatus === 'needs_review' ? 'bg-red-500 text-white' :
                problem._displayStatus === 'endorsed' ? 'bg-yellow-400 text-yellow-900' :
                'bg-ucla-blue text-white'
              }`}>
                {problem._displayStatus === 'needs_review' ? 'Needs Review' :
                 problem._displayStatus === 'endorsed' ? 'Endorsed' : problem.stage}
              </span>
            </div>
            <p className="text-gray-600 mt-2">by {problem.author.firstName} {problem.author.lastName}</p>
          </div>
          <div className="flex gap-2">
            {canEndorse && (
              <button onClick={handleEndorse} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold shadow-sm">
                <Star size={18} fill="white" /> Endorse
              </button>
            )}
            {canEdit && (
              <>
                <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 px-4 py-2 bg-ucla-blue text-white rounded-lg hover:bg-ucla-dark-blue">
                  <Edit size={18} /> {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  <Trash2 size={18} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded border ${message.includes('success') || message.includes('Feedback') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {message}
          </div>
        )}

        {/* Problem card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Problem Statement</h2>
          {isEditing ? (
            <div className="space-y-4">
              <textarea value={editedLatex} onChange={(e) => setEditedLatex(e.target.value)} rows={8} className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty (1-10)</label>
                  <input type="number" min="1" max="10" value={editedDifficulty} onChange={(e) => setEditedDifficulty(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stage</label>
                  <select value={editedStage} onChange={(e) => setEditedStage(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSave} className="w-full bg-ucla-blue text-white py-2 rounded-lg font-bold">Save Changes</button>
            </div>
          ) : (
            <div className="prose max-w-none">
              <KatexRenderer latex={problem.latex} />
              <div className="mt-4 flex gap-2">
                {problem.topics.map(t => <span key={t} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">{t}</span>)}
                <span className="ml-auto text-sm text-gray-500 flex items-center gap-1"><Clock size={16} /> {new Date(problem.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Creator Solution toggle */}
        {!isEditing && (problem.solution || problem._isAdmin || problem._isAuthor) && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="w-full flex justify-between items-center px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 font-semibold text-ucla-blue">
                <CheckCircle size={20} /> Show Creator Solution
              </div>
              {showSolution ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {showSolution && (
              <div className="p-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wider">Solution</h3>
                <div className="prose max-w-none">
                  {problem.solution ? <KatexRenderer latex={problem.solution} /> : <p className="italic text-gray-400">No solution provided</p>}
                </div>
                {problem.answer && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="font-bold text-ucla-blue">Final Answer: </span>
                    <KatexRenderer latex={problem.answer} />
                  </div>
                )}
                {(problem.notes && (problem._isAdmin || problem._isAuthor)) && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                    <span className="font-bold text-yellow-800 uppercase text-xs">Notes (Private): </span>
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap">{problem.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feedback Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Feedback ({feedbacks.length})</h2>
          {feedbacks.length === 0 ? <p className="text-gray-500 text-center py-8">No feedback yet</p> : (
            <div className="space-y-6">
              {feedbacks.map((fb) => (
                <div key={fb.id} className={`border-l-4 pl-4 py-2 ${fb.isEndorsement ? 'border-yellow-400 bg-yellow-50/20' : !fb.resolved ? 'border-red-500 bg-red-50/30' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{fb.user.firstName} {fb.user.lastName}</p>
                      <p className="text-xs text-gray-500">{new Date(fb.createdAt).toLocaleDateString()} · {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved Review' : 'Active Review'}</p>
                    </div>
                    <div className="flex gap-2">
                      {/* Resolve button with comment prompt */}
                      {!fb.resolved && !fb.isEndorsement && (problem._isAuthor || problem._isAdmin) && (
                        <button onClick={() => setResolvingId(fb.id === resolvingId ? null : fb.id)} className="text-xs text-ucla-blue underline">
                          {resolvingId === fb.id ? 'Cancel Resolve' : 'Mark as Resolved'}
                        </button>
                      )}
                      {/* Edit button for creator/admin */}
                      {(fb.userId === problem._userId || problem._isAdmin) && (
                        <button onClick={() => { setEditingFeedbackId(fb.id); setEditedFeedbackComment(fb.feedback); }} className="text-xs text-gray-500 underline">Edit</button>
                      )}
                    </div>
                  </div>

                  {editingFeedbackId === fb.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea value={editedFeedbackComment} onChange={(e) => setEditedFeedbackComment(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" />
                      <button onClick={() => handleEditFeedback(fb.id)} className="px-3 py-1 bg-ucla-blue text-white text-xs rounded">Update</button>
                    </div>
                  ) : (
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap">{fb.feedback}</p>
                  )}

                  {resolvingId === fb.id && (
                    <div className="mt-4 p-4 bg-white border border-red-200 rounded-lg shadow-sm">
                      <label className="block text-sm font-semibold mb-2">Resolution Comment <span className="text-red-500">*</span></label>
                      <textarea value={resolveComment} onChange={(e) => setResolveComment(e.target.value)} placeholder="Explain how this was addressed..." className="w-full p-2 border border-gray-300 rounded-lg text-sm mb-2" required />
                      <button onClick={() => handleResolveFeedback(fb.id)} className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-bold">Confirm Resolution</button>
                    </div>
                  )}

                  {fb.resolved && (
                    <div className="mt-2 text-xs font-bold text-green-700 flex items-center gap-1">
                      <CheckCircle size={12} /> Resolved
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProblemDetail;jt
