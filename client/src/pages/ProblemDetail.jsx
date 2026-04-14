import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Edit, User, Archive, Star, ChevronDown, ChevronUp, 
  CheckCircle, Image as ImageIcon, X,
  AlertCircle, Save, ArrowLeft, MessageSquare, Trash2,
  Eye, ExternalLink, Info
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

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
  const [isDirty, setIsDirty] = useState(false);

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
  const [editedFeedbackAnswer, setEditedFeedbackAnswer] = useState('');
  const [editedFeedbackIsEndorsement, setEditedFeedbackIsEndorsement] = useState(false);
  // Solver photo uploads on feedback entries
  const [feedbackPhotos, setFeedbackPhotos] = useState({});

  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewShowSolution, setPreviewShowSolution] = useState(false);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const markDirty = () => setIsDirty(true);

  const handleCancelEdit = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setIsEditing(false);
    setIsDirty(false);
    // re-init fields from problem
    if (problem) {
      setEditedLatex(problem.latex || '');
      setEditedSolution(problem.solution || '');
      setEditedAnswer(problem.answer || '');
      setEditedNotes(problem.notes || '');
      setEditedTopics(problem.topics || []);
      setEditedDifficulty(parseInt(problem.quality) || 5);
      setEditedStage(problem.stage);
    }
  };

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
      setIsDirty(false);
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
        markDirty();
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setEditedImages(prev => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const toggleImageDestination = (index) => {
    setEditedImages(prev => prev.map((img, i) =>
      i === index
        ? { ...img, destination: img.destination === 'problem' ? 'solution' : 'problem' }
        : img
    ));
    markDirty();
  };

  // Feedback photo upload
  const handleFeedbackPhotoUpload = (fbId, e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeedbackPhotos(prev => ({
          ...prev,
          [fbId]: [...(prev[fbId] || []), reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFeedbackPhoto = (fbId, idx) => {
    setFeedbackPhotos(prev => ({
      ...prev,
      [fbId]: (prev[fbId] || []).filter((_, i) => i !== idx)
    }));
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
      setMessage('Problem updated.');
      setIsEditing(false);
      setIsDirty(false);
      fetchProblem();
    } catch (error) {
      setMessage('Failed to update problem');
    }
  };

  const handleArchive = async () => {
    try {
      if (archiveReason.trim()) {
        const timestamp = new Date().toLocaleDateString();
        const reasonNote = `[Archived ${timestamp}] ${archiveReason.trim()}`;
        const currentNotes = problem.notes || '';
        const updatedNotes = currentNotes ? `${reasonNote}\n\n${currentNotes}` : reasonNote;
        await api.put(`/problems/${id}`, {
          latex: problem.latex,
          solution: problem.solution,
          answer: problem.answer,
          notes: updatedNotes,
          topics: problem.topics,
          quality: problem.quality,
          stage: problem.stage
        });
      }
      await api.put(`/problems/${id}/archive`);
      navigate('/dashboard');
    } catch (error) {
      setMessage('Failed to archive problem');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/problems/${id}`);
      navigate('/dashboard');
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Failed to delete problem');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
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
    try {
      const payload = { comment: editedFeedbackComment, answer: editedFeedbackAnswer };
      const originalFb = feedbacks.find(f => f.id === fbId);
      if (originalFb && editedFeedbackIsEndorsement !== originalFb.isEndorsement) {
        payload.isEndorsement = editedFeedbackIsEndorsement;
      }
      await api.patch(`/feedback/${fbId}`, payload);
      setMessage('Review updated.');
      setEditingFeedbackId(null);
      setEditedFeedbackComment('');
      setEditedFeedbackAnswer('');
      fetchProblem();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Failed to update review');
    }
  };

  const handleSaveReply = async (fbId) => {
    if (!replyText.trim()) {
      setMessage('Reply cannot be empty.');
      return;
    }
    setSavingReply(true);
    try {
      await api.put(`/feedback/${fbId}/reply`, { reply: replyText });
      setMessage('Reply saved.');
      setReplyingId(null);
      setReplyText('');
      fetchProblem();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Failed to save reply');
    } finally {
      setSavingReply(false);
    }
  };

  const handleDeleteFeedback = async (e, fbId) => {
    e.stopPropagation();
    if (!window.confirm('Remove this feedback? This cannot be undone.')) return;
    try {
      await api.delete(`/feedback/${fbId}`);
      setMessage('Feedback removed.');
      fetchProblem();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Failed to delete feedback');
    }
  };

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
  const stageOptions = ['Idea', 'Needs Review', 'Endorsed'];

  if (loading) return (
    <Layout>
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-ucla-blue border-t-transparent"></div>
        <p className="text-slate-400 text-sm">Loading problem...</p>
      </div>
    </Layout>
  );

  if (!problem) return (
    <Layout>
      <div className="text-center py-20">
        <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-slate-800">Problem Not Found</h2>
        <button onClick={() => navigate('/inventory')} className="mt-4 text-ucla-blue hover:underline flex items-center gap-2 mx-auto text-sm">
          <ArrowLeft size={15} /> Back to Inventory
        </button>
      </div>
    </Layout>
  );

  const myId = user?.id;
  const serverUserId = problem._userId;
  const canEdit =
    problem._isAuthor ||
    problem._isAdmin ||
    (myId && problem.authorId && String(myId) === String(problem.authorId)) ||
    (serverUserId && problem.authorId && String(serverUserId) === String(problem.authorId));
  const isAdmin = problem._isAdmin;

  const currentDifficulty = isEditing ? editedDifficulty : (parseInt(problem.quality) || 5);

  const stageBadgeClass = (stage) => {
    const s = stage === 'needs_review' || stage === 'Needs Review' ? 'needs_review'
            : stage === 'endorsed' || stage === 'Endorsed' ? 'endorsed'
            : stage === 'Archived' ? 'archived'
            : 'idea';
    if (s === 'needs_review') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s === 'endorsed') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (s === 'archived') return 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  };

  // Normalize answer for comparison (trim, lowercase)
  const normalizeAnswer = (a) => (a || '').trim().replace(/\s+/g, '').toLowerCase();

  return (
    <>
      <Layout>
        <div className="max-w-6xl mx-auto px-6 pb-20">

        {/* Back button */}
        <button
          onClick={() => {
            if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
            navigate(-1);
          }}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#2774AE] dark:hover:text-[#FFD100] mb-5 transition-colors pt-2"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Problem {problem.id}</h1>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
                problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={12} />}
                {(problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed') && <Star size={12} className="fill-current" />}
                {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review' ? 'Needs Review' :
                 problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed' ? 'Endorsed' : problem.stage}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm">
              <User size={14} />
              <span>{problem.author.firstName} {problem.author.lastName}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setShowPreview(true); setPreviewShowSolution(false); }}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors text-sm font-medium border border-slate-200 dark:border-slate-700"
              title="Preview problem"
            >
              <Eye size={16} />
              <span className="hidden sm:inline">Preview</span>
            </button>

            {canEdit && (
              <>
                <button
                  onClick={() => {
                    if (isEditing) {
                      handleCancelEdit();
                    } else {
                      setIsEditing(true);
                      setIsDirty(false);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    isEditing
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      : 'bg-ucla-blue text-white hover:bg-[#1a5a8a]'
                  }`}
                >
                  {isEditing ? <X size={16} /> : <Edit size={16} />}
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                {!isEditing && problem.stage !== 'Archived' && (
                  <button
                    onClick={() => { setShowArchiveModal(true); setArchiveReason(''); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors text-sm font-medium"
                    title="Archive this problem"
                  >
                    <Archive size={16} />
                    <span className="hidden sm:inline">Archive</span>
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors text-sm font-medium"
                    title="Permanently delete this problem"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dirty banner */}
        {isDirty && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={13} /> You have unsaved changes.
          </div>
        )}

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            message.includes('Failed') || message.includes('Cannot')
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">

            {/* Problem Statement Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Problem Statement</h2>
                {isEditing && <span className="text-[10px] font-semibold text-white bg-[#2774AE] dark:bg-[#FFD100] dark:text-slate-900 px-2 py-0.5 rounded uppercase tracking-wide">Editing</span>}
              </div>
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <textarea
                        value={editedLatex}
                        onChange={(e) => { setEditedLatex(e.target.value); markDirty(); }}
                        rows={18}
                        placeholder="Type LaTeX here..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all resize-y"
                      />
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[200px] overflow-auto prose-math text-sm">
                        {editedLatex.trim()
                          ? <KatexRenderer latex={editedLatex} />
                          : <p className="text-slate-400 italic text-xs">Preview will appear here…</p>}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Images</p>
                      <div className="flex flex-wrap gap-3">
                        {editedImages.map((img, idx) => (
                          <div key={idx} className="relative w-24 h-28 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg overflow-hidden group">
                            <img src={img.dataUrl} alt="preview" className="w-full h-16 object-cover" />
                            <button
                              type="button"
                              onClick={() => toggleImageDestination(idx)}
                              className={`w-full h-12 flex items-center justify-center text-[9px] font-semibold uppercase transition-colors ${
                                img.destination === 'problem' ? 'bg-slate-100 dark:bg-slate-700 text-ucla-blue' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700'
                              }`}
                            >
                              → {img.destination}
                            </button>
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <label className="w-24 h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-white hover:border-ucla-blue transition-all group">
                          <ImageIcon size={20} className="text-slate-300 group-hover:text-ucla-blue" />
                          <span className="text-[10px] text-slate-400 mt-1.5 font-semibold uppercase">Add Image</span>
                          <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose-math min-h-[100px]">
                    <KatexRenderer latex={problem.latex} />
                  </div>
                )}
              </div>
            </div>

            {/* Solution Section */}
            {!isEditing && (problem.solution || canEdit) && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="w-full flex justify-between items-center px-6 py-4 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2 font-semibold text-ucla-blue dark:text-ucla-gold text-sm">
                    <CheckCircle size={16} /> {showSolution ? 'Hide' : 'View'} Solution
                  </div>
                  {showSolution ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                {showSolution && (
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="prose-math mb-6">
                      {problem.solution
                        ? <KatexRenderer latex={problem.solution} />
                        : <p className="italic text-slate-400 text-sm">No detailed solution provided.</p>}
                    </div>
                    {problem.answer && (
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Answer</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono"><KatexRenderer latex={problem.answer} /></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Edit Metadata Panel */}
            {isEditing && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">Edit Metadata</h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    Solution <span className="font-normal normal-case text-slate-400 ml-1">— live preview on the right</span>
                  </label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <textarea
                      value={editedSolution}
                      onChange={(e) => { setEditedSolution(e.target.value); markDirty(); }}
                      rows={12}
                      placeholder="Write solution in LaTeX..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all resize-y"
                    />
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[200px] overflow-auto prose-math text-sm">
                      {editedSolution.trim()
                        ? <KatexRenderer latex={editedSolution} />
                        : <p className="text-slate-400 italic text-xs">Preview will appear here…</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Author Notes</label>
                  <textarea
                    value={editedNotes}
                    onChange={(e) => { setEditedNotes(e.target.value); markDirty(); }}
                    rows={3}
                    placeholder="Private notes for reviewers..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Answer</label>
                    <input
                      type="text"
                      value={editedAnswer}
                      onChange={(e) => { setEditedAnswer(e.target.value); markDirty(); }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Stage</label>
                    <select
                      value={editedStage}
                      onChange={(e) => { setEditedStage(e.target.value); markDirty(); }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none font-medium"
                    >
                      {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Difficulty</label>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={editedDifficulty}
                    onChange={(e) => { setEditedDifficulty(Number(e.target.value)); markDirty(); }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-ucla-blue"
                  />
                  <div className="mt-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Level</span>
                    <span className="text-sm font-bold text-ucla-blue dark:text-ucla-gold tabular-nums">{editedDifficulty}/10</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map(topic => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => {
                          setEditedTopics(prev =>
                            prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
                          );
                          markDirty();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          editedTopics.includes(topic)
                            ? 'bg-ucla-blue border-ucla-blue text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-ucla-blue'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 bg-ucla-blue text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#1a5a8a] transition-all"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            )}

            {/* Feedback Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Reviews
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full text-sm font-medium">{feedbacks.length}</span>
              </h2>
              {feedbacks.length === 0 ? (
                <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 text-sm">No reviews yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((fb) => {
                    const fbUserId = fb.user?.id || fb.userId;
                    const isMyFeedback =
                      (myId && fbUserId && String(myId) === String(fbUserId)) ||
                      (serverUserId && fbUserId && String(serverUserId) === String(fbUserId));
                    const canEditThisFeedback = !fb.resolved && (isMyFeedback || isAdmin);
                    const isEditingThis = editingFeedbackId === fb.id;
                    const isReplyingThis = replyingId === fb.id;

                    const { body: fbBody, resolveComment: fbResolveNote } = parseResolutionNote(fb.feedback);

                    // Answer mismatch check
                    const correctAnswer = problem.answer;
                    const solverAnswer = fb.answer;
                    const answerMismatch = correctAnswer && solverAnswer &&
                      normalizeAnswer(correctAnswer) !== normalizeAnswer(solverAnswer);

                    return (
                      <div key={fb.id} className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm ${
                        fb.isEndorsement ? 'border-amber-200 dark:border-amber-900/50' :
                        fb.resolved ? 'border-green-200 dark:border-green-900/50' :
                        'border-slate-200 dark:border-slate-800'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs ${
                              fb.isEndorsement ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {fb.user.firstName[0]}{fb.user.lastName[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm leading-none mb-0.5">{fb.user.firstName} {fb.user.lastName}</p>
                              <p className="text-xs text-slate-400">
                                {new Date(fb.createdAt).toLocaleDateString()} &bull;
                                <span className={`ml-1 ${
                                  fb.isEndorsement ? 'text-amber-600 dark:text-amber-500' :
                                  fb.resolved ? 'text-green-600 dark:text-green-500' :
                                  'text-slate-500'
                                }`}>
                                  {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved' : 'Review'}
                                </span>
                                {fb.timeTaken > 0 && (
                                  <span className="ml-1.5 font-mono">⏱ {Math.floor(fb.timeTaken / 60)}m {fb.timeTaken % 60}s</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {canEditThisFeedback && (
                              <button
                                onClick={() => {
                                  if (isEditingThis) {
                                    setEditingFeedbackId(null);
                                    setEditedFeedbackAnswer('');
                                  } else {
                                    setEditingFeedbackId(fb.id);
                                    setEditedFeedbackComment(fbBody);
                                    setEditedFeedbackAnswer(fb.answer || '');
                                    setEditedFeedbackIsEndorsement(fb.isEndorsement);
                                    setReplyingId(null);
                                  }
                                }}
                                className="text-xs font-medium text-slate-400 hover:text-ucla-blue transition-colors"
                              >
                                {isEditingThis ? 'Cancel' : 'Edit'}
                              </button>
                            )}
                            {(isMyFeedback || isAdmin) && (
                              <button
                                onClick={(e) => handleDeleteFeedback(e, fb.id)}
                                className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors flex items-center gap-0.5"
                                title="Delete feedback"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => {
                                  if (isReplyingThis) {
                                    setReplyingId(null);
                                    setReplyText('');
                                  } else {
                                    setReplyingId(fb.id);
                                    setReplyText(fb.authorReply || '');
                                    setResolvingId(null);
                                    setEditingFeedbackId(null);
                                  }
                                }}
                                className="flex items-center gap-1 text-xs font-medium text-ucla-blue hover:underline transition-colors"
                              >
                                <MessageSquare size={11} />
                                {isReplyingThis ? 'Cancel' : fb.authorReply ? 'Edit Reply' : 'Reply'}
                              </button>
                            )}
                            {!fb.resolved && !fb.isEndorsement && canEdit && (
                              <button
                                onClick={() => {
                                  setResolvingId(fb.id === resolvingId ? null : fb.id);
                                  setReplyingId(null);
                                }}
                                className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              >
                                {resolvingId === fb.id ? 'Cancel' : 'Resolve'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Answer + mismatch warning */}
                        {(canEdit || isMyFeedback) && fb.answer && !isEditingThis && (
                          <div className="mb-3 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Their answer:</span>
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-sm font-mono text-slate-700 dark:text-slate-300">
                              <KatexRenderer latex={fb.answer} inline />
                            </span>
                            {answerMismatch && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 rounded text-[10px] font-semibold">
                                <AlertCircle size={10} /> Doesn't match stored answer
                              </span>
                            )}
                          </div>
                        )}

                        {isEditingThis ? (
                          <div className="space-y-3">
                            {isMyFeedback && (
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Answer</label>
                                <input
                                  type="text"
                                  value={editedFeedbackAnswer}
                                  onChange={(e) => setEditedFeedbackAnswer(e.target.value)}
                                  placeholder="Update your answer..."
                                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-mono focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all dark:text-white"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Feedback / Comment</label>
                              <textarea
                                value={editedFeedbackComment}
                                onChange={(e) => setEditedFeedbackComment(e.target.value)}
                                className="w-full p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all dark:text-white"
                                rows={3}
                              />
                            </div>
                            {/* Photo upload for solver */}
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Attach Photos</label>
                              <div className="flex flex-wrap gap-2">
                                {(feedbackPhotos[fb.id] || []).map((src, idx) => (
                                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group">
                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                    <button onClick={() => removeFeedbackPhoto(fb.id, idx)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <X size={12} className="text-white" />
                                    </button>
                                  </div>
                                ))}
                                <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-ucla-blue transition-all">
                                  <ImageIcon size={16} className="text-slate-400" />
                                  <span className="text-[9px] text-slate-400 mt-1">Add</span>
                                  <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFeedbackPhotoUpload(fb.id, e)} />
                                </label>
                              </div>
                            </div>
                            {isMyFeedback && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase">Type:</span>
                                <button
                                  type="button"
                                  onClick={() => setEditedFeedbackIsEndorsement(false)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                    !editedFeedbackIsEndorsement
                                      ? 'bg-red-500 border-red-500 text-white'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-300'
                                  }`}
                                >
                                  Review
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditedFeedbackIsEndorsement(true)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                    editedFeedbackIsEndorsement
                                      ? 'bg-amber-400 border-amber-400 text-white'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-amber-300'
                                  }`}
                                >
                                  Endorsement
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => handleEditFeedback(fb.id)}
                              className="bg-ucla-blue text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#1a5a8a] transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{fbBody}</p>
                        )}

                        {!isReplyingThis && fb.authorReply && (
                          <div className="mt-3 ml-4 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-semibold text-ucla-blue dark:text-ucla-gold mb-1 flex items-center gap-1">
                              <MessageSquare size={10} /> Author Reply
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{fb.authorReply}</p>
                          </div>
                        )}

                        {isReplyingThis && (
                          <div className="mt-3 ml-4 pl-3 border-l-2 border-ucla-blue/30">
                            <p className="text-xs font-semibold text-ucla-blue dark:text-ucla-gold mb-2 flex items-center gap-1">
                              <MessageSquare size={10} /> {fb.authorReply ? 'Edit Reply' : 'Reply'}
                            </p>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your reply..."
                              className="w-full p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-ucla-blue/20 outline-none transition-all"
                              rows={3}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveReply(fb.id)}
                              disabled={savingReply}
                              className="mt-2 bg-ucla-blue text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#1a5a8a] transition-colors disabled:opacity-50"
                            >
                              {savingReply ? 'Saving...' : 'Save Reply'}
                            </button>
                          </div>
                        )}

                        {fb.resolved && fbResolveNote && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs font-semibold text-green-600 dark:text-green-500 uppercase mb-1">Resolution Note</p>
                            <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">{fbResolveNote}</p>
                          </div>
                        )}

                        {resolvingId === fb.id && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <textarea
                              value={resolveComment}
                              onChange={(e) => setResolveComment(e.target.value)}
                              placeholder="How did you address this?"
                              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-ucla-blue/20 outline-none bg-white dark:bg-slate-900 transition-all"
                              rows={2}
                            />
                            <button
                              onClick={() => handleResolveFeedback(fb.id)}
                              className="w-full bg-ucla-blue text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#1a5a8a] transition-colors"
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

          {/* Sidebar — only show non-editing info cards; hide Difficulty/Topics/LiveRender when editing */}
          <div className="lg:col-span-4 space-y-4">
            <div className="sticky top-6 space-y-4">

              {/* Difficulty Card — only when NOT editing */}
              {!isEditing && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Difficulty</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-ucla-blue dark:text-ucla-gold leading-none tabular-nums">{currentDifficulty}</span>
                    <span className="text-base font-medium text-slate-300 dark:text-slate-600">/10</span>
                  </div>
                </div>
              )}

              {/* Topics Card — only when NOT editing */}
              {!isEditing && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {problem.topics.length > 0
                      ? problem.topics.map(t => (
                          <span key={t} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700">
                            {t}
                          </span>
                        ))
                      : <span className="text-slate-400 italic text-xs">No topics tagged.</span>
                    }
                  </div>
                </div>
              )}

              {/* Author Notes Card — only when NOT editing */}
              {!isEditing && problem.notes && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Author Notes</p>
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose-math">
                    <KatexRenderer latex={problem.notes} />
                  </div>
                </div>
              )}

              {/* When editing: show a compact hint instead */}
              {isEditing && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                    <Info size={12} /> Editing mode
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Difficulty, topics, and stage are editable in the metadata panel below. Live preview is inline.</p>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </Layout>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Archive size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">Archive Problem {problem.id}?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">You can restore it later from the Archive page.</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Reason <span className="font-normal normal-case text-slate-400">(optional — saved to notes)</span>
              </label>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                rows={3}
                placeholder="e.g. Duplicate of MS0042, answer unclear, needs rework..."
                autoFocus
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowArchiveModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={() => { setShowArchiveModal(false); handleArchive(); }} className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                <Archive size={15} /> Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">Delete Problem {problem.id}?</h3>
                <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5">This permanently deletes the problem and all its reviews. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                <Trash2 size={15} /> {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Problem Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false); }}
        >
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl max-h-[92dvh] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-base">Problem {problem.id}</span>
                    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full flex items-center gap-1 ${stageBadgeClass(problem._displayStatus)}`}>
                      {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={10} />}
                      {(problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed') && <Star size={10} className="fill-current" />}
                      {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review' ? 'Needs Review' :
                       problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed' ? 'Endorsed' : problem.stage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <User size={11} /> {problem.author.firstName} {problem.author.lastName}
                    {problem.examType && <><span className="text-slate-300">·</span> {problem.examType}</>}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Problem Statement</p>
                <div className="prose-math text-slate-900 dark:text-slate-100 leading-relaxed">
                  <KatexRenderer latex={problem.latex} />
                </div>
              </div>

              {problem.answer && (
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Answer</span>
                  <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <KatexRenderer latex={problem.answer} />
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Difficulty</span>
                  <span className="text-sm font-bold text-ucla-blue dark:text-ucla-gold tabular-nums">{parseInt(problem.quality) || 5}/10</span>
                </div>
                {problem.topics?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {problem.topics.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {problem.solution && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <button onClick={() => setPreviewShowSolution(!previewShowSolution)} className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ucla-blue dark:text-ucla-gold">
                      <CheckCircle size={14} /> {previewShowSolution ? 'Hide' : 'Show'} Solution
                    </div>
                    {previewShowSolution ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {previewShowSolution && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 prose-math text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                      <KatexRenderer latex={problem.solution} />
                    </div>
                  )}
                </div>
              )}

              {problem.notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Author Notes</p>
                  <div className="text-sm text-slate-700 dark:text-slate-300 prose-math leading-relaxed">
                    <KatexRenderer latex={problem.notes} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3.5 flex-shrink-0 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center gap-2">
              {canEdit && (
                <button onClick={() => { setShowPreview(false); setIsEditing(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-ucla-blue text-white rounded-lg text-xs font-semibold hover:bg-[#1a5a8a] transition-colors">
                  <Edit size={13} /> Edit
                </button>
              )}
              <button onClick={() => navigate(`/feedback/${id}`)} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <MessageSquare size={13} /> Give Feedback
              </button>
              {canEdit && problem.stage !== 'Archived' && (
                <button onClick={() => { setShowPreview(false); setShowArchiveModal(true); setArchiveReason(''); }} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  <Archive size={13} /> Archive
                </button>
              )}
              {canEdit && (
                <button onClick={() => { setShowPreview(false); setShowDeleteModal(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-500 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <button onClick={() => setShowPreview(false)} className="ml-auto flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg text-xs font-medium transition-colors">
                <ExternalLink size={13} /> Full Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProblemDetail;
