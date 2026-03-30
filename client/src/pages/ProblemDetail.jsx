import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Edit, Clock, User, Trash2, Star, ChevronDown, ChevronUp, 
  CheckCircle, Image as ImageIcon, X, ArrowRightLeft, 
  AlertCircle, Save, ArrowLeft 
} from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../utils/AuthContext';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

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
  const [editedImages, setEditedImages] = useState([]); 

  // UI toggles
  const [showSolution, setShowSolution] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveComment, setResolveComment] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editedFeedbackComment, setEditedFeedbackComment] = useState('');

  const extractImages = (text, destination) => {
    if (!text) return { cleanText: '', extractedImages: [] };
    const images = [];
    const regex = /!\[(.*?)\]\((data:image\/[^;]+;base64,[^\)]+)\)/g;
    
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
      await api.put(`/feedback/${fbId}`, { comment: editedFeedbackComment });
      setMessage('Feedback updated.');
      setEditingFeedbackId(null);
      setEditedFeedbackComment('');
      fetchProblem();
    } catch (error) {
      setMessage('Failed to update feedback');
    }
  };

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

  const canEdit = problem._isAuthor || problem._isAdmin;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-black text-ucla-blue tracking-tight">Problem {problem.id}</h1>
              <span className={`px-4 py-1 text-xs uppercase tracking-widest rounded-full font-black shadow-sm flex items-center gap-1.5 ${
                problem._displayStatus === 'needs_review' ? 'bg-red-500 text-white' :
                problem._displayStatus === 'endorsed' ? 'bg-[#FFD100] text-ucla-blue' :
                'bg-ucla-blue text-white'
              }`}>
                {problem._displayStatus === 'needs_review' && <AlertCircle size={14} />}
                {problem._displayStatus === 'endorsed' && <Star size={14} className="fill-current" />}
                {problem._displayStatus === 'needs_review' ? 'Needs Review' : 
                 problem._displayStatus === 'endorsed' ? 'Endorsed' : problem.stage}
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
          <div className={`mb-8 p-4 rounded-xl border-l-4 font-bold text-sm animate-in fade-in slide-in-from-top-2 ${
            message.includes('Failed') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Problem Statement</h2>
                {isEditing && <span className="text-[10px] font-bold text-ucla-blue bg-ucla-blue/10 px-2 py-0.5 rounded uppercase">Editing Mode</span>}
              </div>

              <div className="p-8">
                {isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <textarea 
                        value={editedLatex} 
                        onChange={(e) => setEditedLatex(e.target.value)}
                        rows={10}
                        placeholder="Type LaTeX here..."
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-ucla-blue focus:bg-white outline-none transition-all"
                      />
                    </div>
                    
                    {/* Images upload area */}
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

            {/* Solution Section */}
            {!isEditing && (problem.solution || problem._isAdmin || problem._isAuthor) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
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
                  <div className="p-8 border-t border-gray-100 bg-white animate-in slide-in-from-top-4 duration-300">
                    <div className="prose-math mb-8">
                      {problem.solution ? <KatexRenderer latex={problem.solution} /> : <p className="italic text-gray-400 text-sm">No detailed solution provided.</p>}
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

            {/* Editing Meta Info (only visible during edit) */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Answer</label>
                    <input type="text" value={editedAnswer} onChange={(e) => setEditedAnswer(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ucla-blue outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Stage</label>
                    <select value={editedStage} onChange={(e) => setEditedStage(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ucla-blue outline-none font-bold">
                      {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 bg-ucla-blue text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-ucla-dark-blue transition-all shadow-xl shadow-ucla-blue/20">
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
                    const isMyFeedback = user && fb.user.id === user.id;
                    const isEditingThis = editingFeedbackId === fb.id;

                    return (
                      <div key={fb.id} className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${
                        fb.isEndorsement ? 'border-yellow-200' : fb.resolved ? 'border-gray-100 opacity-75' : 'border-red-100'
                      }`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${fb.isEndorsement ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                              {fb.user.firstName[0]}{fb.user.lastName[0]}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-none mb-1">{fb.user.firstName} {fb.user.lastName}</p>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                                {new Date(fb.createdAt).toLocaleDateString()} •
                                <span className={`ml-1 ${fb.isEndorsement ? 'text-yellow-600' : fb.resolved ? 'text-green-600' : 'text-red-600'}`}>
                                  {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved' : 'Review'}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Actions Container */}
                          <div className="flex gap-3">
                            {/* Edit Feedback Button (only if it's the user's own unresolved feedback) */}
                            {isMyFeedback && !fb.resolved && (
                              <button
                                onClick={() => {
                                  if (isEditingThis) {
                                    setEditingFeedbackId(null);
                                  } else {
                                    setEditingFeedbackId(fb.id);
                                    setEditedFeedbackComment(fb.feedback);
                                  }
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-ucla-blue"
                              >
                                {isEditingThis ? 'Cancel Edit' : 'Edit'}
                              </button>
                            )}

                            {/* Resolve Button (if author/admin) */}
                            {!fb.resolved && !fb.isEndorsement && (problem._isAuthor || problem._isAdmin) && (
                              <button onClick={() => setResolvingId(fb.id === resolvingId ? null : fb.id)} className="text-[10px] font-black uppercase tracking-widest text-ucla-blue hover:underline">
                                {resolvingId === fb.id ? 'Cancel Resolve' : 'Resolve'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Show Edit Input OR Standard Text */}
                        {isEditingThis ? (
                          <div className="mt-2 animate-in fade-in">
                            <textarea
                              value={editedFeedbackComment}
                              onChange={(e) => setEditedFeedbackComment(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ucla-blue outline-none mb-2"
                              rows={3}
                            />
                            <button
                              onClick={() => handleEditFeedback(fb.id)}
                              className="bg-ucla-blue text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-ucla-dark-blue"
                            >
                              Save Edit
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{fb.feedback}</p>
                        )}

                        {/* Existing Resolve Comment Box */}
                        {resolvingId === fb.id && (
                          <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in zoom-in-95">
                            <textarea 
                              value={resolveComment} 
                              onChange={(e) => setResolveComment(e.target.value)}
                              placeholder="How did you address this?" 
                              className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-ucla-blue outline-none"
                              rows={2}
                            />
                            <button onClick={() => handleResolveFeedback(fb.id)} className="w-full bg-ucla-blue text-white py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-ucla-dark-blue transition-colors">
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

          {/* Sidebar / Info Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-6 space-y-6">
              {/* Difficulty Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Problem Difficulty</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-ucla-blue leading-none">{problem.quality || editedDifficulty}</span>
                  <span className="text-xl font-bold text-gray-300 mb-1">/10</span>
                </div>
                <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-ucla-blue h-full transition-all duration-1000" 
                    style={{ width: `${(problem.quality || editedDifficulty) * 10}%` }}
                  />
                </div>
              </div>

              {/* Topics Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Topic Tags</p>
                <div className="flex flex-wrap gap-2">
                  {problem.topics.length > 0 ? problem.topics.map(t => (
                    <span key={t} className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tight rounded-md border border-slate-200">
                      {t}
                    </span>
                  )) : <span className="text-gray-400 italic text-xs">No topics tagged.</span>}
                </div>
              </div>

              {/* Preview Sync Card (Only when editing) */}
              {isEditing && (
                <div className="bg-ucla-blue p-6 rounded-2xl shadow-xl shadow-ucla-blue/20 text-white animate-in slide-in-from-right-4">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-4">Live Render</p>
                  <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 overflow-x-auto min-h-[100px]">
                    <KatexRenderer latex={editedLatex} />
                  </div>
                  <p className="text-[9px] mt-4 font-bold text-white/50 leading-tight italic">
                    Images are temporarily hidden in preview mode to maximize performance.
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
