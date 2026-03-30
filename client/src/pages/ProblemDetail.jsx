import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Edit, User, Trash2, Star, ChevronDown, ChevronUp, 
  CheckCircle, Image as ImageIcon, X,
  AlertCircle, Save, ArrowLeft 
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const DIFFICULTY_LABELS = {
  1: 'Concept Check',
  2: 'Standard Fair',
  3: 'Intermediate',
  4: 'Competition Prep',
  5: 'Standard',
  6: 'Challenging',
  7: 'Advanced Tier',
  8: 'Elite',
  9: 'Tournament Finalist',
  10: 'Legendary',
};

const parseResolutionNote = (feedbackText) => {
  if (!feedbackText) return { body: feedbackText, resolveComment: null };
  const marker = '\n\n[Resolution] ';
  const idx = feedbackText.indexOf(marker);
  if (idx === -1) return { body: feedbackText, resolveComment: null };
  return {
    body: feedbackText.slice(0, idx),
    resolveComment: feedbackText.slice(idx + marker.length),
  };
};

const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [problem, setProblem] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');

  const [editedLatex, setEditedLatex] = useState('');
  const [editedSolution, setEditedSolution] = useState('');
  const [editedAnswer, setEditedAnswer] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [editedTopics, setEditedTopics] = useState([]);
  const [editedDifficulty, setEditedDifficulty] = useState(5);
  const [editedStage, setEditedStage] = useState('');
  const [editedImages, setEditedImages] = useState([]);

  const [showSolution, setShowSolution] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveComment, setResolveComment] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editedFeedbackComment, setEditedFeedbackComment] = useState('');

  const extractImages = (text, destination) => {
    if (!text) return { cleanText: '', extractedImages: [] };
    const images = [];
    const regex = /!\[(.*?)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    let cleanText = text.replace(regex, (match, alt, dataUrl) => {
      images.push({ dataUrl, destination });
      return '';
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

  const handleResolveFeedback = async (fbId) => {
    if (!resolveComment.trim()) {
      setMessage('Resolution comment is required.');
      return;
    }
    try {
      await api.put(`/feedback/${fbId}/resolve`, { comment: resolveComment });
      setMessage('Feedback resolved.');
      setResolvingId(null);
      setResolveComment('');
      fetchProblem();
    } catch (error) {
      setMessage('Failed to resolve feedback');
    }
  };

  const handleEditFeedback = async (fbId) => {
    if (!editedFeedbackComment.trim()) {
      setMessage('Feedback cannot be empty.');
      return;
    }
    try {
      await api.patch(`/feedback/${fbId}`, { comment: editedFeedbackComment });
      setMessage('Feedback updated.');
      setEditingFeedbackId(null);
      setEditedFeedbackComment('');
      fetchProblem();
    } catch (error) {
      setMessage('Failed to update feedback');
    }
  };

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
  const stageOptions = ['Idea', 'Needs Review', 'Endorsed'];

  if (loading) return (
    <Layout>
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ucla-blue"></div>
        <p className="text-gray-400 font-medium italic">Fetching problem data...</p>
      </div>
    </Layout>
  );

  if (!problem) return (
    <Layout>
      <div className="text-center py-20">
        <AlertCircle className="mx-auto text-gray-300 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-gray-800">Problem Not Found</h2>
        <button onClick={() => navigate('/inventory')} className="mt-4 text-ucla-blue hover:underline flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Back to Inventory
        </button>
      </div>
    </Layout>
  );

  // _userId is the server-echoed req.userId — most reliable for authorId comparison
  // fallback: compare problem.authorId against both user.id and problem._userId
  const myId = user?.id;
  const serverUserId = problem._userId; // server echoes req.userId back
  const canEdit =
    problem._isAuthor ||
    problem._isAdmin ||
    (myId && problem.authorId && String(myId) === String(problem.authorId)) ||
    (serverUserId && problem.authorId && String(serverUserId) === String(problem.authorId));

  const currentDifficulty = isEditing ? editedDifficulty : (parseInt(problem.quality) || 5);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-black text-ucla-blue tracking-tight">Problem {problem.id}</h1>
              <span className={`px-4 py-1 text-xs uppercase tracking-widest rounded-full font-black shadow-sm flex items-center gap-1.5 ${
                problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review' ? 'bg-red-500 text-white' :
                problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed' ? 'bg-[#FFD100] text-ucla-blue' :
                'bg-ucla-blue text-white'
              }`}>
                {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={14} />}
                {(problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed') && <Star size={14} className="fill-current" />}
                {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review' ? 'Needs Review' :
                 problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed' ? 'Endorsed' : problem.stage}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 text-gray-500 font-medium">
              <div className="w-8 h-8 rounded-full bg-ucla-blue/10 flex items-center justify-center text-ucla-blue">
                <User size={16} />
              </div>
              <span>{problem.author.firstName} {problem.author.lastName}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {canEdit && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${
                    isEditing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-ucla-blue text-white hover:bg-ucla-dark-blue'
                  }`}
                >
                  {isEditing ? <X size={18} /> : <Edit size={18} />}
                  {isEditing ? 'Cancel' : 'Edit Problem'}
                </button>
                {!isEditing && (
                  <button onClick={handleDelete} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                    <Trash2 size={22} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {message && (
          <div className={`mb-8 p-4 rounded-xl border-l-4 font-bold text-sm ${
            message.includes('Failed') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">

            {/* Problem Statement Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Problem Statement</h2>
                {isEditing && <span className="text-[10px] font-bold text-ucla-blue bg-ucla-blue/10 px-2 py-0.5 rounded uppercase">Editing Mode</span>}
              </div>
              <div className="p-8">
                {isEditing ? (
                  <div className="space-y-6">
                    <textarea
                      value={editedLatex}
                      onChange={(e) => setEditedLatex(e.target.value)}
                      rows={10}
                      placeholder="Type LaTeX here..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-ucla-blue focus:bg-white outline-none transition-all"
                    />
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-4 ml-1">Attached Visuals</p>
                      <div className="flex flex-wrap gap-4">
                        {editedImages.map((img, idx) => (
                          <div key={idx} className="relative w-28 h-32 border border-white bg-white rounded-xl overflow-hidden group shadow-sm">
                            <img src={img.dataUrl} alt="preview" className="w-full h-20 object-cover" />
                            <button
                              type="button"
                              onClick={() => toggleImageDestination(idx)}
                              className={`w-full h-12 flex items-center justify-center text-[9px] font-black uppercase transition-colors px-2 text-center leading-tight ${
                                img.destination === 'problem' ? 'bg-blue-50 text-ucla-blue' : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              To {img.destination}
                            </button>
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <label className="w-28 h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white hover:border-ucla-blue transition-all group">
                          <ImageIcon size={24} className="text-slate-300 group-hover:text-ucla-blue" />
                          <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Add Image</span>
                          <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose-math min-h-[120px]">
                    <KatexRenderer latex={problem.latex} />
                  </div>
                )}
              </div>
            </div>

            {/* Solution Section (view mode only) */}
            {!isEditing && (problem.solution || problem._isAdmin || problem._isAuthor || canEdit) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="w-full flex justify-between items-center px-8 py-5 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 font-black text-ucla-blue uppercase text-xs tracking-widest">
                    <CheckCircle size={18} /> {showSolution ? 'Hide' : 'View'} Creator Solution
                  </div>
                  {showSolution ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                {showSolution && (
                  <div className="p-8 border-t border-gray-100 bg-white">
                    <div className="prose-math mb-8">
                      {problem.solution
                        ? <KatexRenderer latex={problem.solution} />
                        : <p className="italic text-gray-400 text-sm">No detailed solution provided.</p>}
                    </div>
                    {problem.answer && (
                      <div className="p-5 bg-ucla-blue/[0.03] rounded-2xl border border-ucla-blue/10 flex items-center gap-4">
                        <span className="font-black text-ucla-blue text-[10px] uppercase tracking-widest bg-ucla-blue/10 px-2 py-1 rounded">Final Answer</span>
                        <div className="text-lg font-bold"><KatexRenderer latex={problem.answer} /></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Edit Metadata Panel */}
            {isEditing && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-4">Metadata & Solution</h3>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Solution LaTeX</label>
                  <textarea
                    value={editedSolution}
                    onChange={(e) => setEditedSolution(e.target.value)}
                    rows={6}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-ucla-blue outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Author Notes</label>
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    rows={3}
                    placeholder="Private notes for reviewers (sources, related problems, etc.)..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-ucla-blue outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Answer</label>
                    <input
                      type="text"
                      value={editedAnswer}
                      onChange={(e) => setEditedAnswer(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ucla-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Stage</label>
                    <select
                      value={editedStage}
                      onChange={(e) => setEditedStage(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ucla-blue outline-none font-bold"
                    >
                      {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 ml-1">Difficulty Calibration</label>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={editedDifficulty}
                    onChange={(e) => setEditedDifficulty(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-ucla-blue"
                  />
                  <div className="mt-3 px-4 py-2.5 bg-ucla-blue/5 rounded-xl border border-ucla-blue/10 flex items-center justify-between">
                    <p className="text-ucla-blue font-black text-[11px] uppercase tracking-tight">
                      {DIFFICULTY_LABELS[editedDifficulty]}
                    </p>
                    <span className="text-2xl font-black text-ucla-blue">{editedDifficulty}<span className="text-sm font-bold text-gray-300">/10</span></span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 ml-1">Topic Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map(topic => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setEditedTopics(prev =>
                          prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
                        )}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                          editedTopics.includes(topic)
                            ? 'bg-ucla-blue border-ucla-blue text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-ucla-blue'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 bg-ucla-blue text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-ucla-dark-blue transition-all shadow-xl shadow-ucla-blue/20"
                >
                  <Save size={18} /> Update Problem Record
                </button>
              </div>
            )}

            {/* Feedback Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-black text-ucla-blue flex items-center gap-3">
                Feedback <span className="bg-ucla-blue/10 text-ucla-blue px-3 py-0.5 rounded-full text-sm">{feedbacks.length}</span>
              </h2>
              {feedbacks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 font-medium">No reviews submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((fb) => {
                    const myFbId = user?.id;
                    const fbUserId = fb.user?.id || fb.userId;
                    const isMyFeedback = myFbId && fbUserId && String(myFbId) === String(fbUserId);
                    const isEditingThis = editingFeedbackId === fb.id;

                    const { body: fbBody, resolveComment: fbResolveNote } = parseResolutionNote(fb.feedback);

                    return (
                      <div key={fb.id} className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${
                        fb.isEndorsement ? 'border-yellow-200' :
                        fb.resolved ? 'border-green-100' :
                        'border-red-100'
                      }`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                              fb.isEndorsement ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {fb.user.firstName[0]}{fb.user.lastName[0]}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-none mb-1">{fb.user.firstName} {fb.user.lastName}</p>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                                {new Date(fb.createdAt).toLocaleDateString()} &bull;
                                <span className={`ml-1 ${
                                  fb.isEndorsement ? 'text-yellow-600' :
                                  fb.resolved ? 'text-green-600' :
                                  'text-red-600'
                                }`}>
                                  {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved' : 'Review'}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {isMyFeedback && !fb.resolved && !fb.isEndorsement && (
                              <button
                                onClick={() => {
                                  if (isEditingThis) {
                                    setEditingFeedbackId(null);
                                  } else {
                                    setEditingFeedbackId(fb.id);
                                    setEditedFeedbackComment(fbBody);
                                  }
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-ucla-blue transition-colors"
                              >
                                {isEditingThis ? 'Cancel' : 'Edit'}
                              </button>
                            )}
                            {!fb.resolved && !fb.isEndorsement && canEdit && (
                              <button
                                onClick={() => setResolvingId(fb.id === resolvingId ? null : fb.id)}
                                className="text-[10px] font-black uppercase tracking-widest text-ucla-blue hover:underline"
                              >
                                {resolvingId === fb.id ? 'Cancel' : 'Resolve'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Testsolver answer — visible to author/admin only */}
                        {canEdit && fb.answer && (
                          <div className="mb-3 flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Their Answer</span>
                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-bold text-slate-700 font-mono">
                              <KatexRenderer latex={fb.answer} />
                            </span>
                          </div>
                        )}

                        {isEditingThis ? (
                          <div className="space-y-3">
                            <textarea
                              value={editedFeedbackComment}
                              onChange={(e) => setEditedFeedbackComment(e.target.value)}
                              className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-ucla-blue outline-none"
                              rows={3}
                            />
                            <button
                              onClick={() => handleEditFeedback(fb.id)}
                              className="bg-ucla-blue text-white px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-ucla-dark-blue transition-colors"
                            >
                              Save Edit
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{fbBody}</p>
                        )}

                        {fb.resolved && fbResolveNote && (
                          <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Resolution Note</p>
                            <p className="text-sm text-green-800 leading-relaxed">{fbResolveNote}</p>
                          </div>
                        )}

                        {resolvingId === fb.id && (
                          <div className="mt-5 p-5 bg-slate-50 rounded-xl border border-slate-200">
                            <textarea
                              value={resolveComment}
                              onChange={(e) => setResolveComment(e.target.value)}
                              placeholder="How did you address this?"
                              className="w-full p-3 border border-gray-200 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-ucla-blue outline-none bg-white"
                              rows={2}
                            />
                            <button
                              onClick={() => handleResolveFeedback(fb.id)}
                              className="w-full bg-ucla-blue text-white py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-ucla-dark-blue transition-colors"
                            >
                              Confirm Resolution
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-6 space-y-6">

              {/* Difficulty Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Problem Difficulty</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-ucla-blue leading-none">{currentDifficulty}</span>
                  <span className="text-xl font-bold text-gray-300 mb-1">/10</span>
                </div>
                <p className="mt-1 text-xs font-bold text-gray-400 italic">{DIFFICULTY_LABELS[currentDifficulty]}</p>
                <div className="mt-3 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-ucla-blue h-full transition-all duration-500"
                    style={{ width: `${currentDifficulty * 10}%` }}
                  />
                </div>
              </div>

              {/* Topics Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Topic Tags</p>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? editedTopics : problem.topics).length > 0
                    ? (isEditing ? editedTopics : problem.topics).map(t => (
                        <span key={t} className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tight rounded-md border border-slate-200">
                          {t}
                        </span>
                      ))
                    : <span className="text-gray-400 italic text-xs">No topics tagged.</span>
                  }
                </div>
              </div>

              {/* Author Notes Card — KaTeX rendered */}
              {!isEditing && problem.notes && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Author Notes</p>
                  <div className="text-sm text-gray-700 leading-relaxed prose-math">
                    <KatexRenderer latex={problem.notes} />
                  </div>
                </div>
              )}

              {/* Live Render (edit mode) */}
              {isEditing && (
                <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Live Render</p>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl overflow-x-auto min-h-[100px] text-gray-900">
                    <KatexRenderer latex={editedLatex} />
                  </div>
                  <p className="text-[9px] mt-3 font-bold text-gray-300 leading-tight italic">
                    Images hidden in preview for performance.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default ProblemDetail;
