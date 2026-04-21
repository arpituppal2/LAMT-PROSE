import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Edit, User, Archive, Star, ChevronDown, ChevronUp,
  CheckCircle, Image as ImageIcon, X,
  AlertCircle, Save, ArrowLeft, MessageSquare, Trash2,
  Eye, ExternalLink
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

const TOPIC_ABBREV = {
  Algebra: 'Alg',
  Geometry: 'Geo',
  Combinatorics: 'Combo',
  'Number Theory': 'NT',
};

const getStageBadgeClass = (stage) => {
  const normalized = stage === 'needs_review' || stage === 'Needs Review'
    ? 'needs_review'
    : stage === 'endorsed' || stage === 'Endorsed'
    ? 'endorsed'
    : stage === 'Resolved'
    ? 'resolved'
    : stage === 'Archived'
    ? 'archived'
    : 'idea';

  if (normalized === 'needs_review') return 'status-badge status-needs-review';
  if (normalized === 'endorsed') return 'status-badge status-endorsed';
  if (normalized === 'resolved') return 'status-badge status-resolved';
  if (normalized === 'archived') return 'status-badge status-archived';
  return 'status-badge status-idea';
};

const cardClass = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#001628]';
const sectionHeaderClass = 'flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-3 dark:border-white/8 dark:bg-white/3';
const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[var(--ucla-blue)] focus:ring-2 focus:ring-[color:rgba(39,116,174,0.16)] dark:border-white/8 dark:bg-white/4 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[var(--ucla-gold)] dark:focus:ring-[color:rgba(255,209,0,0.16)]';
const textareaClass = `${inputClass} resize-y font-mono`;
const previewPaneClass = 'min-h-[200px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/8 dark:bg-white/4';
const actionButtonClass = 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-white/8 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white';
const subtleButtonClass = 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200';
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--ucla-blue)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ucla-blue-hover)] dark:bg-[var(--ucla-gold)] dark:text-slate-900 dark:hover:bg-[var(--ucla-gold-hover)]';

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
  const [editedFeedbackAnswer, setEditedFeedbackAnswer] = useState('');
  const [editedFeedbackIsEndorsement, setEditedFeedbackIsEndorsement] = useState(false);

  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewShowSolution, setPreviewShowSolution] = useState(false);

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
        finalLatex += '\n\n' + problemImages.map((img, i) => `![Problem Image ${i + 1}](${img.dataUrl})`).join('\n');
      }
      if (solutionImages.length > 0) {
        finalSolution += '\n\n' + solutionImages.map((img, i) => `![Solution Image ${i + 1}](${img.dataUrl})`).join('\n');
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
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--ucla-blue)] border-t-transparent dark:border-[var(--ucla-gold)] dark:border-t-transparent"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading problem...</p>
      </div>
    </Layout>
  );

  if (!problem) return (
    <Layout>
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Problem Not Found</h2>
        <button onClick={() => navigate('/inventory')} className="mx-auto mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--ucla-blue)] hover:underline dark:text-[var(--ucla-gold)]">
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
  const currentTopics = isEditing ? editedTopics : (problem.topics || []);

  return (
    <>
      <Layout>
        <div className="mx-auto max-w-5xl px-6 pb-20">
          <div className="mb-6 flex flex-col items-start justify-between gap-3 pt-2 md:flex-row">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="whitespace-nowrap text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Problem {problem.id}
                </h1>

                <span className={getStageBadgeClass(problem._displayStatus)}>
                  {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={11} />}
                  {(problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed') && <Star size={11} className="fill-current" />}
                  {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                    ? 'Needs Review'
                    : problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed'
                    ? 'Endorsed'
                    : problem.stage}
                </span>

                {currentTopics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {currentTopics.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-white/8 dark:bg-white/4 dark:text-slate-300"
                      >
                        {TOPIC_ABBREV[t] ?? t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <User size={13} />
                  <span>{problem.author.firstName} {problem.author.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-white/8">
                    <div
                      className="h-full bg-[var(--ucla-blue)] transition-all duration-500 dark:bg-[var(--ucla-gold)]"
                      style={{ width: `${currentDifficulty * 10}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-sm font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">
                    {currentDifficulty}<span className="text-xs font-normal text-slate-400">/10</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <button
                onClick={() => { setShowPreview(true); setPreviewShowSolution(false); }}
                className={actionButtonClass}
                title="Preview problem"
              >
                <Eye size={16} />
                <span className="hidden sm:inline">Preview</span>
              </button>

              {canEdit && (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={isEditing
                      ? 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:border-white/8 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12'
                      : primaryButtonClass}
                  >
                    {isEditing ? <X size={16} /> : <Edit size={16} />}
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  {!isEditing && problem.stage !== 'Archived' && (
                    <button
                      onClick={() => { setShowArchiveModal(true); setArchiveReason(''); }}
                      className={subtleButtonClass}
                      title="Archive this problem"
                    >
                      <Archive size={16} />
                      <span className="hidden sm:inline">Archive</span>
                    </button>
                  )}
                  {!isEditing && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
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

          {message && (
            <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
              message.includes('Failed') || message.includes('Cannot')
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
                : 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            <div className={cardClass}>
              <div className={sectionHeaderClass}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Problem Statement</h2>
                {isEditing && <span className="status-badge status-resolved">Editing</span>}
              </div>
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <textarea
                        value={editedLatex}
                        onChange={(e) => setEditedLatex(e.target.value)}
                        rows={18}
                        placeholder="Type LaTeX here..."
                        className={textareaClass}
                      />
                      <div className={previewPaneClass}>
                        {editedLatex.trim()
                          ? <KatexRenderer latex={editedLatex} />
                          : <p className="text-xs italic text-slate-400">Preview will appear here…</p>}
                      </div>
                    </div>
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/8 dark:bg-white/4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Images</p>
                      <div className="flex flex-wrap gap-3">
                        {editedImages.map((img, idx) => (
                          <div key={idx} className="group relative h-28 w-24 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/8 dark:bg-[#001628]">
                            <img src={img.dataUrl} alt="preview" className="h-16 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => toggleImageDestination(idx)}
                              className={`flex h-12 w-full items-center justify-center text-[9px] font-semibold uppercase transition-colors ${
                                img.destination === 'problem'
                                  ? 'bg-slate-100 text-[var(--ucla-blue)] dark:bg-white/8 dark:text-[var(--ucla-gold)]'
                                  : 'border-t border-[var(--badge-endorsed-border)] bg-[var(--badge-endorsed-bg)] text-[var(--badge-endorsed-text)]'
                              }`}
                            >
                              → {img.destination}
                            </button>
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute right-1 top-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <label className="group flex h-28 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white transition-colors hover:border-[var(--ucla-blue)] hover:bg-slate-50 dark:border-white/8 dark:bg-white/4 dark:hover:border-[var(--ucla-gold)] dark:hover:bg-white/8">
                          <ImageIcon size={20} className="text-slate-300 transition-colors group-hover:text-[var(--ucla-blue)] dark:text-slate-500 dark:group-hover:text-[var(--ucla-gold)]" />
                          <span className="mt-1.5 text-[10px] font-semibold uppercase text-slate-400">Add</span>
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

            {!isEditing && (problem.solution || canEdit) && (
              <div className={cardClass}>
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="flex w-full items-center justify-between bg-slate-50/80 px-6 py-4 transition-colors hover:bg-slate-100 dark:bg-white/3 dark:hover:bg-white/8"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">
                    <CheckCircle size={16} /> {showSolution ? 'Hide' : 'View'} Solution
                  </div>
                  {showSolution ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                {showSolution && (
                  <div className="border-t border-slate-200 p-6 dark:border-white/8">
                    <div className="prose-math mb-6">
                      {problem.solution
                        ? <KatexRenderer latex={problem.solution} />
                        : <p className="text-sm italic text-slate-400">No detailed solution provided.</p>}
                    </div>
                    {problem.answer && (
                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/8 dark:bg-white/4">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Answer</span>
                        <div className="font-mono text-base font-semibold text-slate-800 dark:text-slate-100"><KatexRenderer latex={problem.answer} /></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isEditing && (
              <div className={`${cardClass} space-y-5 p-6`}>
                <h3 className="border-b border-slate-200 pb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/8 dark:text-slate-400">Edit Metadata</h3>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Solution <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">— live preview on the right</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <textarea
                      value={editedSolution}
                      onChange={(e) => setEditedSolution(e.target.value)}
                      rows={12}
                      placeholder="Write solution in LaTeX..."
                      className={textareaClass}
                    />
                    <div className={previewPaneClass}>
                      {editedSolution.trim()
                        ? <KatexRenderer latex={editedSolution} />
                        : <p className="text-xs italic text-slate-400">Preview will appear here…</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Author Notes</label>
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    rows={3}
                    placeholder="Private notes for reviewers..."
                    className={textareaClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Answer</label>
                    <input
                      type="text"
                      value={editedAnswer}
                      onChange={(e) => setEditedAnswer(e.target.value)}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Stage</label>
                    <select
                      value={editedStage}
                      onChange={(e) => setEditedStage(e.target.value)}
                      className={`${inputClass} font-medium`}
                    >
                      {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Difficulty</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={editedDifficulty}
                    onChange={(e) => setEditedDifficulty(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--ucla-blue)] dark:bg-white/8 dark:accent-[var(--ucla-gold)]"
                  />
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/8 dark:bg-white/4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Level</span>
                    <span className="tabular-nums text-sm font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">{editedDifficulty}/10</span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setEditedTopics((prev) =>
                          prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
                        )}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          editedTopics.includes(topic)
                            ? 'border-[var(--ucla-blue)] bg-[var(--ucla-blue)] text-white dark:border-[var(--ucla-gold)] dark:bg-[var(--ucla-gold)] dark:text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-[var(--ucla-blue)] dark:border-white/8 dark:bg-white/4 dark:text-slate-300 dark:hover:border-[var(--ucla-gold)]'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSave} className={`${primaryButtonClass} w-full py-3`}>
                  <Save size={16} /> Save Changes
                </button>
              </div>
            )}

            {!isEditing && problem.notes && (
              <div className={`${cardClass} p-5`}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Author Notes</p>
                <div className="prose-math text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  <KatexRenderer latex={problem.notes} />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                Reviews
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-500 dark:bg-white/8 dark:text-slate-300">{feedbacks.length}</span>
              </h2>
              {feedbacks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center dark:border-white/8 dark:bg-[#001628]">
                  <p className="text-sm text-slate-400">No reviews yet.</p>
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

                    return (
                      <div key={fb.id} className={`${cardClass} p-5`}>
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                              fb.isEndorsement
                                ? 'border border-[var(--badge-endorsed-border)] bg-[var(--badge-endorsed-bg)] text-[var(--badge-endorsed-text)]'
                                : fb.resolved
                                ? 'border border-[var(--badge-resolved-border)] bg-[var(--badge-resolved-bg)] text-[var(--badge-resolved-text)]'
                                : 'bg-slate-100 text-slate-600 dark:bg-white/8 dark:text-slate-300'
                            }`}>
                              {fb.user.firstName[0]}{fb.user.lastName[0]}
                            </div>
                            <div>
                              <p className="mb-0.5 text-sm font-semibold leading-none text-slate-900 dark:text-white">{fb.user.firstName} {fb.user.lastName}</p>
                              <p className="text-xs text-slate-400">
                                {new Date(fb.createdAt).toLocaleDateString()} &bull;
                                <span className={`ml-1 ${
                                  fb.isEndorsement
                                    ? 'text-[var(--badge-endorsed-text)]'
                                    : fb.resolved
                                    ? 'text-[var(--badge-resolved-text)]'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                  {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved' : 'Review'}
                                </span>
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
                                className="text-xs font-medium text-slate-400 transition-colors hover:text-[var(--ucla-blue)] dark:hover:text-[var(--ucla-gold)]"
                              >
                                {isEditingThis ? 'Cancel' : 'Edit'}
                              </button>
                            )}
                            {(isMyFeedback || isAdmin) && (
                              <button
                                onClick={(e) => handleDeleteFeedback(e, fb.id)}
                                className="flex items-center gap-0.5 text-xs font-medium text-slate-400 transition-colors hover:text-red-500"
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
                                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ucla-blue)] transition-colors hover:underline dark:text-[var(--ucla-gold)]"
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
                                className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                {resolvingId === fb.id ? 'Cancel' : 'Resolve'}
                              </button>
                            )}
                          </div>
                        </div>

                        {(canEdit || isMyFeedback) && fb.answer && !isEditingThis && (
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Their answer:</span>
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-mono text-slate-700 dark:border-white/8 dark:bg-white/4 dark:text-slate-200">
                              <KatexRenderer latex={fb.answer} />
                            </span>
                          </div>
                        )}

                        {isEditingThis ? (
                          <div className="space-y-3">
                            {isMyFeedback && (
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Your Answer</label>
                                <input
                                  type="text"
                                  value={editedFeedbackAnswer}
                                  onChange={(e) => setEditedFeedbackAnswer(e.target.value)}
                                  placeholder="Update your answer..."
                                  className={`${inputClass} font-mono px-3 py-2`}
                                />
                              </div>
                            )}
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Feedback / Comment</label>
                              <textarea
                                value={editedFeedbackComment}
                                onChange={(e) => setEditedFeedbackComment(e.target.value)}
                                className={`${inputClass} min-h-[88px] p-3`}
                                rows={3}
                              />
                            </div>
                            {isMyFeedback && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase text-slate-400">Type:</span>
                                <button
                                  type="button"
                                  onClick={() => setEditedFeedbackIsEndorsement(false)}
                                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    !editedFeedbackIsEndorsement
                                      ? 'border-[var(--ucla-blue)] bg-[var(--ucla-blue)] text-white dark:border-[var(--ucla-gold)] dark:bg-[var(--ucla-gold)] dark:text-slate-900'
                                      : 'border-slate-200 bg-white text-slate-500 hover:border-[var(--ucla-blue)] dark:border-white/8 dark:bg-white/4 dark:text-slate-300 dark:hover:border-[var(--ucla-gold)]'
                                  }`}
                                >
                                  Review
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditedFeedbackIsEndorsement(true)}
                                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    editedFeedbackIsEndorsement
                                      ? 'border-[var(--badge-endorsed-border)] bg-[var(--badge-endorsed-bg)] text-[var(--badge-endorsed-text)]'
                                      : 'border-slate-200 bg-white text-slate-500 hover:border-[var(--badge-endorsed-border)] dark:border-white/8 dark:bg-white/4 dark:text-slate-300'
                                  }`}
                                >
                                  Endorsement
                                </button>
                              </div>
                            )}
                            <button onClick={() => handleEditFeedback(fb.id)} className={`${primaryButtonClass} px-4 py-2 text-xs`}>
                              Save
                            </button>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{fbBody}</p>
                        )}

                        {!isReplyingThis && fb.authorReply && (
                          <div className="mt-3 ml-4 border-l-2 border-slate-200 pl-3 dark:border-white/8">
                            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">
                              <MessageSquare size={10} /> Author Reply
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400">{fb.authorReply}</p>
                          </div>
                        )}

                        {isReplyingThis && (
                          <div className="mt-3 ml-4 border-l-2 border-[var(--ucla-blue)]/30 pl-3 dark:border-[var(--ucla-gold)]/30">
                            <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">
                              <MessageSquare size={10} /> {fb.authorReply ? 'Edit Reply' : 'Reply'}
                            </p>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your reply..."
                              className={`${inputClass} p-3`}
                              rows={3}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveReply(fb.id)}
                              disabled={savingReply}
                              className={`${primaryButtonClass} mt-2 px-4 py-2 text-xs disabled:opacity-50`}
                            >
                              {savingReply ? 'Saving...' : 'Save Reply'}
                            </button>
                          </div>
                        )}

                        {fb.resolved && fbResolveNote && (
                          <div className="mt-3 rounded-lg border border-[var(--badge-resolved-border)] bg-[var(--badge-resolved-bg)] p-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--badge-resolved-text)]">Resolution Note</p>
                            <p className="text-sm leading-relaxed text-[var(--badge-resolved-text)]">{fbResolveNote}</p>
                          </div>
                        )}

                        {resolvingId === fb.id && (
                          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/8 dark:bg-white/4">
                            <textarea
                              value={resolveComment}
                              onChange={(e) => setResolveComment(e.target.value)}
                              placeholder="How did you address this?"
                              className={`${inputClass} mb-3 p-3`}
                              rows={2}
                            />
                            <button onClick={() => handleResolveFeedback(fb.id)} className={`${primaryButtonClass} w-full py-2 text-xs`}>
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
        </div>
      </Layout>

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/8 dark:bg-[#001628]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
                <Archive size={18} className="text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Archive Problem {problem.id}?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">You can restore it later from the Archive page.</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Reason <span className="font-normal normal-case tracking-normal text-slate-400">(optional — saved to notes)</span>
              </label>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                rows={3}
                placeholder="e.g. Duplicate of MS0042, answer unclear, needs rework..."
                autoFocus
                className={`${inputClass} resize-none px-3 py-2.5`}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/8 dark:text-slate-300 dark:hover:bg-white/8"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowArchiveModal(false); handleArchive(); }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-900 dark:hover:bg-amber-300"
              >
                <Archive size={15} /> Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/8 dark:bg-[#001628]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
                <Trash2 size={18} className="text-red-600 dark:text-red-300" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delete Problem {problem.id}?</h3>
                <p className="mt-0.5 text-xs font-medium text-red-500 dark:text-red-300">This permanently deletes the problem and all its reviews. This cannot be undone.</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/8 dark:text-slate-300 dark:hover:bg-white/8"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:text-slate-950 dark:hover:bg-red-400"
              >
                <Trash2 size={15} />
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false); }}
        >
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/8 dark:bg-[#001628] sm:max-w-2xl sm:rounded-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/8">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-semibold text-slate-900 dark:text-white">Problem {problem.id}</span>
                    <span className={getStageBadgeClass(problem._displayStatus)}>
                      {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={10} />}
                      {(problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed') && <Star size={10} className="fill-current" />}
                      {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                        ? 'Needs Review'
                        : problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed'
                        ? 'Endorsed'
                        : problem.stage}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <User size={11} /> {problem.author.firstName} {problem.author.lastName}
                    {problem.examType && <><span className="text-slate-300">·</span> {problem.examType}</>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/8 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Problem Statement</p>
                <div className="prose-math leading-relaxed text-slate-900 dark:text-slate-100">
                  <KatexRenderer latex={problem.latex} />
                </div>
              </div>

              {problem.answer && (
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Answer</span>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm font-semibold text-slate-800 dark:border-white/8 dark:bg-white/4 dark:text-slate-100">
                    <KatexRenderer latex={problem.answer} />
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Difficulty</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-white/8">
                      <div className="h-full bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)]" style={{ width: `${(parseInt(problem.quality) || 5) * 10}%` }} />
                    </div>
                    <span className="tabular-nums text-sm font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">{parseInt(problem.quality) || 5}/10</span>
                  </div>
                </div>
                {problem.topics?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {problem.topics.map((t) => (
                      <span key={t} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-white/8 dark:bg-white/4 dark:text-slate-300">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {problem.solution && (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/8">
                  <button
                    onClick={() => setPreviewShowSolution(!previewShowSolution)}
                    className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100 dark:bg-white/3 dark:hover:bg-white/8"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">
                      <CheckCircle size={14} /> {previewShowSolution ? 'Hide' : 'Show'} Solution
                    </div>
                    {previewShowSolution ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {previewShowSolution && (
                    <div className="prose-math border-t border-slate-200 p-4 text-sm leading-relaxed text-slate-800 dark:border-white/8 dark:text-slate-200">
                      <KatexRenderer latex={problem.solution} />
                    </div>
                  )}
                </div>
              )}

              {problem.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/8 dark:bg-white/4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Author Notes</p>
                  <div className="prose-math text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    <KatexRenderer latex={problem.notes} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5 dark:border-white/8 dark:bg-white/3">
              {canEdit && (
                <button
                  onClick={() => { setShowPreview(false); setIsEditing(true); }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ucla-blue)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--ucla-blue-hover)] dark:bg-[var(--ucla-gold)] dark:text-slate-900 dark:hover:bg-[var(--ucla-gold-hover)]"
                >
                  <Edit size={13} /> Edit
                </button>
              )}
              <button
                onClick={() => navigate(`/feedback/${id}`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/8 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8"
              >
                <MessageSquare size={13} /> Give Feedback
              </button>
              {canEdit && problem.stage !== 'Archived' && (
                <button
                  onClick={() => { setShowPreview(false); setShowArchiveModal(true); setArchiveReason(''); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:border-white/8 dark:bg-white/4 dark:text-amber-300 dark:hover:bg-amber-500/10"
                >
                  <Archive size={13} /> Archive
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => { setShowPreview(false); setShowDeleteModal(true); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-white/8 dark:bg-white/4 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <button
                onClick={() => setShowPreview(false)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
              >
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
