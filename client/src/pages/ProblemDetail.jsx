import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Clock, User, Trash2, Star, ChevronDown, ChevronUp, CheckCircle, Image as ImageIcon, X, ArrowRightLeft } from 'lucide-react';
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
  const [editedImages, setEditedImages] = useState([]); // Array of { dataUrl, destination }

  // UI toggles
  const [showSolution, setShowSolution] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveComment, setResolveComment] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editedFeedbackComment, setEditedFeedbackComment] = useState('');

  // Helper to extract base64 markdown images from text to populate the UI editor
  const extractImages = (text, destination) => {
    if (!text) return { cleanText: '', extractedImages: [] };
    const images = [];
    const regex = /!\[(.*?)\]\((data:image\/[^;]+;base64,[^\)]+)\)/g;
    
    let cleanText = text.replace(regex, (match, alt, dataUrl) => {
      images.push({ dataUrl, destination });
      return ''; // remove from the text editor view
    });
    
    return { cleanText: cleanText.trim(), extractedImages: images };
  };

  useEffect(() => {
    fetchProblem();
  }, [id]);

  const fetchProblem = async () => {
    try {
      const response = await api.get(`/problems/${id}`);
      const data = response.data;
      setProblem(data);
      setFeedbacks(data.feedbacks || []);
      
      // Extract images from backend markdown strings so the text editors stay clean
      const { cleanText: cleanLatex, extractedImages: latexImages } = extractImages(data.latex, 'problem');
      const { cleanText: cleanSolution, extractedImages: solImages } = extractImages(data.solution, 'solution');

      setEditedLatex(cleanLatex);
      setEditedSolution(cleanSolution);
      setEditedImages([...latexImages, ...solImages]);
      
      setEditedAnswer(data.answer || '');
      setEditedNotes(data.notes || '');
      setEditedTopics(data.topics || []);
      setEditedStage(data.stage);
      setEditedDifficulty(parseInt(data.quality) || 5);
    } catch (error) {
      setMessage('Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedImages(prev => [...prev, { dataUrl: reader.result, destination: 'problem' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setEditedImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleImageDestination = (index) => {
    setEditedImages(prev => prev.map((img, i) => 
      i === index 
        ? { ...img, destination: img.destination === 'problem' ? 'solution' : 'problem' }
        : img
    ));
  };

  const handleSave = async () => {
    try {
      let finalLatex = editedLatex;
      let finalSolution = editedSolution;

      // Re-attach the base64 images to the markdown
      const problemImages = editedImages.filter(img => img.destination === 'problem');
      const solutionImages = editedImages.filter(img => img.destination === 'solution');

      if (problemImages.length > 0) {
        finalLatex += '\n\n' + problemImages.map((img, i) => `![Problem Image ${i+1}](${img.dataUrl})`).join('\n');
      }
      if (solutionImages.length > 0) {
        finalSolution += '\n\n' + solutionImages.map((img, i) => `![Solution Image ${i+1}](${img.dataUrl})`).join('\n');
      }

      await api.put(`/problems/${id}`, {
        latex: finalLatex,
        solution: finalSolution,
        answer: editedAnswer,
        notes: editedNotes,
        topics: editedTopics,
        quality: String(editedDifficulty),
        stage: editedStage
      });
      setMessage('Problem updated successfully!');
      setIsEditing(false);
      fetchProblem(); // Re-fetch to update the view state
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

  // Fixed minor typos in the endorsement handler
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
      await api.put(`/feedback/${fbId}/resolve`, {
        comment: resolveComment
      });
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
      await api.patch(`/feedback/${fbId}`, {
        comment: editedFeedbackComment
      });
      setMessage('Feedback updated.');
      setEditingFeedbackId(null);
      fetchProblem();
    } catch (error) {
      setMessage('Failed to update feedback');
    }
  };

  const stageOptions = ['Idea', 'Review', 'Live/Ready for Review', 'On Test', 'Published', 'Needs Review', 'Endorsed'];

  if (loading) return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    </Layout>
  );

  if (!problem) return (
    <Layout>
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">Problem Not Found</h2>
      </div>
    </Layout>
  );

  const canEdit = problem._isAuthor || problem._isAdmin;
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
            {canEdit && (
              <>
                <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 px-4 py-2 bg-ucla-blue text-white rounded-lg hover:bg-ucla-dark-blue shadow-sm font-bold transition-all">
                  <Edit size={18} /> {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm font-bold transition-all">
                  <Trash2 size={18} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg border font-medium ${message.includes('Failed') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-6 tracking-wider border-b pb-2">Problem Statement</h2>
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">LaTeX Content</label>
                <textarea 
                  value={editedLatex} 
                  onChange={(e) => setEditedLatex(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-ucla-blue outline-none"
                />
              </div>

              {/* Added Image Uploader Block here */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachments / Images
                </label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {editedImages.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-28 border border-gray-200 rounded-lg overflow-hidden group flex flex-col shadow-sm">
                      <div className="h-20 w-full overflow-hidden bg-gray-50">
                        <img src={img.dataUrl} alt="upload preview" className="w-full h-full object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleImageDestination(idx)}
                        className={`flex-1 flex items-center justify-center text-[10px] font-bold uppercase tracking-wide transition-colors ${
                          img.destination === 'problem' 
                            ? 'bg-blue-100 text-ucla-blue hover:bg-blue-200' 
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                        title="Click to move image"
                      >
                        {img.destination} <ArrowRightLeft size={10} className="ml-1 opacity-50" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-28 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                    <ImageIcon size={24} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wide">Upload</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Writer's Solution</label>
                <textarea 
                  value={editedSolution} 
                  onChange={(e) => setEditedSolution(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-ucla-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Final Answer</label>
                <input 
                  type="text" 
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty (1-10)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    value={editedDifficulty}
                    onChange={(e) => setEditedDifficulty(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stage</label>
                  <select 
                    value={editedStage}
                    onChange={(e) => setEditedStage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue outline-none"
                  >
                    {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (Private)</label>
                <textarea 
                  value={editedNotes} 
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ucla-blue outline-none"
                />
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-ucla-blue text-white py-3 rounded-lg font-bold hover:bg-ucla-dark-blue transition-colors shadow-lg"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="prose max-w-none">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 min-h-[100px]">
                <KatexRenderer latex={problem.latex} />
              </div>
              <div className="mt-6 flex flex-wrap gap-2 items-center">
                {(problem.quality !== undefined && problem.quality !== null) && (
                  <span className="px-3 py-1 bg-blue-100 text-ucla-blue text-xs font-bold rounded-full border border-blue-200">
                    Difficulty: {problem.quality}/10
                  </span>
                )}
                {problem.topics.map(t => (
                  <span key={t} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full border border-gray-200">
                    {t}
                  </span>
                ))}
                <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={14} /> {new Date(problem.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {!isEditing && (problem.solution || problem._isAdmin || problem._isAuthor) && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <button 
              onClick={() => setShowSolution(!showSolution)}
              className="w-full flex justify-between items-center px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-ucla-blue">
                <CheckCircle size={20} /> Show Creator Solution
              </div>
              {showSolution ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {showSolution && (
              <div className="p-8 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Solution</h3>
                <div className="prose max-w-none mb-6">
                  {problem.solution ? (
                    <KatexRenderer latex={problem.solution} />
                  ) : (
                    <p className="italic text-gray-400 text-sm">No solution provided by author.</p>
                  )}
                </div>
                {problem.answer && (
                  <div className="p-4 bg-ucla-blue/5 rounded-lg border border-ucla-blue/10">
                    <span className="font-bold text-ucla-blue text-sm uppercase mr-2 tracking-tight">Final Answer:</span>
                    <KatexRenderer latex={problem.answer} />
                  </div>
                )}
                {(problem.notes && (problem._isAdmin || problem._isAuthor)) && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <span className="font-bold text-yellow-800 uppercase text-xs tracking-wider">Notes (Private):</span>
                    <p className="mt-2 text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{problem.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
            Feedback <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-sm">{feedbacks.length}</span>
          </h2>
          {feedbacks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400">No feedback yet. Authors can see reviews here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {feedbacks.map((fb) => (
                <div key={fb.id} className={`border-l-4 pl-6 py-4 rounded-r-lg transition-all ${
                  fb.isEndorsement ? 'border-yellow-400 bg-yellow-50/20' : 
                  !fb.resolved ? 'border-red-500 bg-red-50/30' : 
                  'border-gray-200 bg-gray-50/30'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{fb.user.firstName} {fb.user.lastName}</p>
                        {fb.isEndorsement && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(fb.createdAt).toLocaleDateString()} · 
                        <span className={`ml-1 ${fb.isEndorsement ? 'text-yellow-700' : fb.resolved ? 'text-green-700' : 'text-red-700'}`}>
                          {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved Review' : 'Active Review'}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-3">
                      {!fb.resolved && !fb.isEndorsement && (problem._isAuthor || problem._isAdmin) && (
                        <button 
                          onClick={() => setResolvingId(fb.id === resolvingId ? null : fb.id)}
                          className="text-xs font-bold text-ucla-blue hover:underline"
                        >
                          {resolvingId === fb.id ? 'Cancel' : 'Mark as Resolved'}
                        </button>
                      )}
                      {(fb.userId === problem._userId || problem._isAdmin) && (
                        <button 
                          onClick={() => {
                            setEditingFeedbackId(fb.id);
                            setEditedFeedbackComment(fb.feedback);
                          }}
                          className="text-xs font-bold text-gray-400 hover:text-gray-600 underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {editingFeedbackId === fb.id ? (
                    <div className="mt-4 space-y-3">
                      <textarea 
                        value={editedFeedbackComment}
                        onChange={(e) => setEditedFeedbackComment(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ucla-blue outline-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditFeedback(fb.id)}
                          className="px-4 py-1.5 bg-ucla-blue text-white text-xs font-bold rounded-lg hover:bg-ucla-dark-blue transition-colors"
                        >
                          Update
                        </button>
                        <button 
                          onClick={() => setEditingFeedbackId(null)}
                          className="px-4 py-1.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{fb.feedback}</p>
                      {fb.answer && (
                        <p className="text-sm font-semibold text-gray-800 mt-3 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                          <span className="text-gray-600 font-medium">Reviewer's answer:</span> {fb.answer}
                        </p>
                      )}
                    </div>
                  )}

                  {resolvingId === fb.id && (
                    <div className="mt-6 p-5 bg-white border border-red-100 rounded-xl shadow-sm">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                        Resolution Comment <span className="text-red-500">*</span>
                      </label>
                      <textarea 
                        value={resolveComment}
                        onChange={(e) => setResolveComment(e.target.value)}
                        placeholder="Describe how the feedback was addressed..."
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-red-500 outline-none"
                        rows={2}
                        required
                      />
                      <button 
                        onClick={() => handleResolveFeedback(fb.id)}
                        className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                      >
                        Confirm Resolution
                      </button>
                    </div>
                  )}

                  {fb.resolved && (
                    <div className="mt-3 text-xs font-bold text-green-700 flex items-center gap-1.5 bg-green-50 w-fit px-2 py-1 rounded">
                      <CheckCircle size={14} /> Resolved
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

export default ProblemDetail;
