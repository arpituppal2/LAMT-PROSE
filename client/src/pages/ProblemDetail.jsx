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

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
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
  const n =
    stage === 'needs_review' || stage === 'Needs Review' ? 'needs_review'
    : stage === 'endorsed'   || stage === 'Endorsed'     ? 'endorsed'
    : stage === 'Resolved'                                ? 'resolved'
    : stage === 'Archived'                                ? 'archived'
    : 'idea';
  if (n === 'needs_review') return 'status-badge status-needs-review';
  if (n === 'endorsed')     return 'status-badge status-endorsed';
  if (n === 'resolved')     return 'status-badge status-resolved';
  if (n === 'archived')     return 'status-badge status-archived';
  return 'status-badge status-idea';
};

/* ─────────────────────────────────────────────────────────────
   Shared class strings — PROSE design-system tokens only
───────────────────────────────────────────────────────────── */
const previewPaneClass =
  'min-h-[200px] overflow-auto rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm';

/* ═════════════════════════════════════════════════════════════
   PROBLEM DETAIL
═════════════════════════════════════════════════════════════ */
const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [problem, setProblem]   = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage]   = useState('');

  const [editedLatex, setEditedLatex]           = useState('');
  const [editedSolution, setEditedSolution]     = useState('');
  const [editedAnswer, setEditedAnswer]         = useState('');
  const [editedNotes, setEditedNotes]           = useState('');
  const [editedTopics, setEditedTopics]         = useState([]);
  const [editedDifficulty, setEditedDifficulty] = useState(5);
  const [editedStage, setEditedStage]           = useState('');
  const [editedImages, setEditedImages]         = useState([]);

  const [showSolution, setShowSolution]           = useState(false);
  const [resolvingId, setResolvingId]             = useState(null);
  const [resolveComment, setResolveComment]       = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editedFeedbackComment, setEditedFeedbackComment]           = useState('');
  const [editedFeedbackAnswer, setEditedFeedbackAnswer]             = useState('');
  const [editedFeedbackIsEndorsement, setEditedFeedbackIsEndorsement] = useState(false);

  const [replyingId, setReplyingId]   = useState(null);
  const [replyText, setReplyText]     = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason]       = useState('');
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [deleting, setDeleting]                 = useState(false);
  const [showPreview, setShowPreview]           = useState(false);
  const [previewShowSolution, setPreviewShowSolution] = useState(false);

  /* ── image helpers ── */
  const extractImages = (text, destination) => {
    if (!text) return { cleanText: '', extractedImages: [] };
    const images = [];
    const regex = /!\[(.*?)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    const cleanText = text.replace(regex, (_, _alt, dataUrl) => {
      images.push({ dataUrl, destination });
      return '';
    });
    return { cleanText: cleanText.trim(), extractedImages: images };
  };

  useEffect(() => { fetchProblem(); }, [id]);

  const fetchProblem = async () => {
    try {
      const response = await api.get(`/problems/${id}`);
      const data = response.data;
      setProblem(data);
      setFeedbacks(data.feedbacks || []);
      const { cleanText: cleanLatex,    extractedImages: latexImages } = extractImages(data.latex,    'problem');
      const { cleanText: cleanSolution, extractedImages: solImages   } = extractImages(data.solution, 'solution');
      setEditedLatex(cleanLatex);
      setEditedSolution(cleanSolution);
      setEditedImages([...latexImages, ...solImages]);
      setEditedAnswer(data.answer || '');
      setEditedNotes(data.notes || '');
      setEditedTopics(data.topics || []);
      setEditedStage(data.stage);
      setEditedDifficulty(parseInt(data.quality) || 5);
    } catch {
      setMessage('Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setEditedImages((prev) => [...prev, { dataUrl: reader.result, destination: 'problem' }]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) =>
    setEditedImages((prev) => prev.filter((_, i) => i !== index));

  const toggleImageDestination = (index) =>
    setEditedImages((prev) =>
      prev.map((img, i) =>
        i === index
          ? { ...img, destination: img.destination === 'problem' ? 'solution' : 'problem' }
          : img
      )
    );

  const handleSave = async () => {
    try {
      let finalLatex    = editedLatex;
      let finalSolution = editedSolution;
      const problemImages  = editedImages.filter((img) => img.destination === 'problem');
      const solutionImages = editedImages.filter((img) => img.destination === 'solution');
      if (problemImages.length)
        finalLatex += '\n\n' + problemImages.map((img, i) => `![Problem Image ${i + 1}](${img.dataUrl})`).join('\n');
      if (solutionImages.length)
        finalSolution += '\n\n' + solutionImages.map((img, i) => `![Solution Image ${i + 1}](${img.dataUrl})`).join('\n');
      await api.put(`/problems/${id}`, {
        latex: finalLatex, solution: finalSolution, answer: editedAnswer,
        notes: editedNotes, topics: editedTopics, quality: String(editedDifficulty), stage: editedStage,
      });
      setMessage('Problem updated.');
      setIsEditing(false);
      fetchProblem();
    } catch {
      setMessage('Failed to update problem');
    }
  };

  const handleArchive = async () => {
    try {
      if (archiveReason.trim()) {
        const timestamp   = new Date().toLocaleDateString();
        const reasonNote  = `[Archived ${timestamp}] ${archiveReason.trim()}`;
        const currentNotes = problem.notes || '';
        await api.put(`/problems/${id}`, {
          latex: problem.latex, solution: problem.solution, answer: problem.answer,
          notes: currentNotes ? `${reasonNote}\n\n${currentNotes}` : reasonNote,
          topics: problem.topics, quality: problem.quality, stage: problem.stage,
        });
      }
      await api.put(`/problems/${id}/archive`);
      navigate('/dashboard');
    } catch {
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
    if (!resolveComment.trim()) { setMessage('Resolution comment is required.'); return; }
    try {
      await api.put(`/feedback/${fbId}/resolve`, { comment: resolveComment });
      setMessage('Feedback resolved.');
      setResolvingId(null);
      setResolveComment('');
      fetchProblem();
    } catch { setMessage('Failed to resolve feedback'); }
  };

  const handleEditFeedback = async (fbId) => {
    try {
      const payload = { comment: editedFeedbackComment, answer: editedFeedbackAnswer };
      const originalFb = feedbacks.find((f) => f.id === fbId);
      if (originalFb && editedFeedbackIsEndorsement !== originalFb.isEndorsement)
        payload.isEndorsement = editedFeedbackIsEndorsement;
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
    if (!replyText.trim()) { setMessage('Reply cannot be empty.'); return; }
    setSavingReply(true);
    try {
      await api.put(`/feedback/${fbId}/reply`, { reply: replyText });
      setMessage('Reply saved.');
      setReplyingId(null);
      setReplyText('');
      fetchProblem();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Failed to save reply');
    } finally { setSavingReply(false); }
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

  /* ── loading / not-found states ── */
  if (loading) return (
    <Layout>
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading problem…</p>
      </div>
    </Layout>
  );

  if (!problem) return (
    <Layout>
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto mb-4 text-[var(--color-text-faint)]" size={48} />
        <h2 className="text-xl font-semibold">Problem Not Found</h2>
        <button
          onClick={() => navigate('/inventory')}
          className="mx-auto mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          <ArrowLeft size={15} /> Back to Inventory
        </button>
      </div>
    </Layout>
  );

  const myId         = user?.id;
  const serverUserId = problem._userId;
  const canEdit =
    problem._isAuthor || problem._isAdmin ||
    (myId && problem.authorId && String(myId) === String(problem.authorId)) ||
    (serverUserId && problem.authorId && String(serverUserId) === String(problem.authorId));
  const isAdmin = problem._isAdmin;

  const currentDifficulty = isEditing ? editedDifficulty : (parseInt(problem.quality) || 5);
  const currentTopics     = isEditing ? editedTopics     : (problem.topics || []);

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <>
      <Layout>
        <div className="mx-auto max-w-5xl space-y-6 pb-20">

          {/* ── Page header ── */}
          <header className="flex flex-col gap-4 pt-1 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="gold-rule" />
                <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  Problem {problem.id}
                </h1>
                <span className={getStageBadgeClass(problem._displayStatus)}>
                  {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={11} />}
                  {(problem._displayStatus === 'endorsed'     || problem._displayStatus === 'Endorsed')     && <Star size={11} className="fill-current" />}
                  {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                    ? 'Needs Review'
                    : problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed'
                    ? 'Endorsed'
                    : problem.stage}
                </span>
                {currentTopics.length > 0 && currentTopics.map((t) => (
                  <span key={t} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium">
                    {TOPIC_ABBREV[t] ?? t}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                  <User size={13} />
                  {problem.author.firstName} {problem.author.lastName}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-border)]">
                    <div
                      className="h-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${currentDifficulty * 10}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-sm font-semibold text-[var(--color-accent)]">
                    {currentDifficulty}<span className="text-xs font-normal text-[var(--color-text-faint)]">/10</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={() => { setShowPreview(true); setPreviewShowSolution(false); }}
                className="btn-outline px-3 py-2 text-sm flex items-center gap-1.5"
              >
                <Eye size={15} />
                <span className="hidden sm:inline">Preview</span>
              </button>

              {canEdit && (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={isEditing ? 'btn-outline px-4 py-2 text-sm flex items-center gap-1.5' : 'btn-filled px-4 py-2 text-sm flex items-center gap-1.5'}
                  >
                    {isEditing ? <X size={15} /> : <Edit size={15} />}
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  {!isEditing && problem.stage !== 'Archived' && (
                    <button
                      onClick={() => { setShowArchiveModal(true); setArchiveReason(''); }}
                      className="btn-outline px-3 py-2 text-sm flex items-center gap-1.5"
                      title="Archive this problem"
                    >
                      <Archive size={15} />
                      <span className="hidden sm:inline">Archive</span>
                    </button>
                  )}
                  {!isEditing && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium text-[var(--color-notification)] transition-colors hover:bg-[var(--color-notification-highlight)]"
                      title="Permanently delete this problem"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </header>

          {/* ── Toast ── */}
          {message && (
            <div className={[
              'rounded-sm border px-4 py-3 text-sm font-medium',
              message.toLowerCase().includes('fail') || message.toLowerCase().includes('cannot')
                ? 'bg-[var(--badge-needs-review-bg)] border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)]'
                : 'bg-[var(--badge-endorsed-bg)] border-[var(--badge-endorsed-border)] text-[var(--badge-endorsed-text)]',
            ].join(' ')}>
              {message}
            </div>
          )}

          {/* ── Problem statement card ── */}
          <section className="surface-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <p className="section-label">Problem Statement</p>
              {isEditing && <span className="status-badge status-resolved">Editing</span>}
            </div>
            <div className="p-5">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <textarea
                      value={editedLatex}
                      onChange={(e) => setEditedLatex(e.target.value)}
                      rows={18}
                      placeholder="Type LaTeX here…"
                      className="input-base w-full resize-y font-mono"
                    />
                    <div className={previewPaneClass}>
                      {editedLatex.trim()
                        ? <KatexRenderer latex={editedLatex} />
                        : <p className="text-xs italic text-[var(--color-text-faint)]">Preview will appear here…</p>}
                    </div>
                  </div>

                  {/* Image uploader */}
                  <div className="rounded-sm border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <p className="section-label mb-3">Images</p>
                    <div className="flex flex-wrap gap-3">
                      {editedImages.map((img, idx) => (
                        <div key={idx} className="group relative h-28 w-24 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)]">
                          <img src={img.dataUrl} alt="preview" className="h-16 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => toggleImageDestination(idx)}
                            className={`flex h-12 w-full items-center justify-center text-[9px] font-semibold uppercase transition-colors ${
                              img.destination === 'problem'
                                ? 'bg-[var(--color-surface)] text-[var(--color-accent)]'
                                : 'bg-[var(--badge-endorsed-bg)] text-[var(--badge-endorsed-text)]'
                            }`}
                          >
                            → {img.destination}
                          </button>
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute right-1 top-1 rounded-full bg-[var(--color-notification)] p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <label className="group flex h-28 w-24 cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]">
                        <ImageIcon size={20} className="text-[var(--color-text-faint)] transition-colors group-hover:text-[var(--color-accent)]" />
                        <span className="mt-1.5 text-[10px] font-semibold uppercase text-[var(--color-text-faint)]">Add</span>
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
          </section>

          {/* ── Solution card (view mode) ── */}
          {!isEditing && (problem.solution || canEdit) && (
            <section className="surface-card overflow-hidden">
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--color-surface)]"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)]">
                  <CheckCircle size={15} />
                  {showSolution ? 'Hide' : 'View'} Solution
                </span>
                {showSolution ? <ChevronUp size={17} className="text-[var(--color-text-faint)]" /> : <ChevronDown size={17} className="text-[var(--color-text-faint)]" />}
              </button>
              {showSolution && (
                <div className="border-t border-[var(--color-border)] px-5 py-5 space-y-4">
                  <div className="prose-math">
                    {problem.solution
                      ? <KatexRenderer latex={problem.solution} />
                      : <p className="text-sm italic text-[var(--color-text-faint)]">No detailed solution provided.</p>}
                  </div>
                  {problem.answer && (
                    <div className="flex items-center gap-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                      <span className="section-label">Answer</span>
                      <div className="font-mono text-base font-semibold">
                        <KatexRenderer latex={problem.answer} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Edit metadata card ── */}
          {isEditing && (
            <section className="surface-card overflow-hidden">
              <div className="border-b border-[var(--color-border)] px-5 py-4">
                <p className="section-label">Edit Metadata</p>
              </div>
              <div className="p-5 space-y-5">

                {/* Solution */}
                <div>
                  <label className="section-label mb-2 block">
                    Solution
                    <span className="ml-1.5 font-normal normal-case tracking-normal text-[var(--color-text-faint)]">— live preview on the right</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <textarea
                      value={editedSolution}
                      onChange={(e) => setEditedSolution(e.target.value)}
                      rows={12}
                      placeholder="Write solution in LaTeX…"
                      className="input-base w-full resize-y font-mono"
                    />
                    <div className={previewPaneClass}>
                      {editedSolution.trim()
                        ? <KatexRenderer latex={editedSolution} />
                        : <p className="text-xs italic text-[var(--color-text-faint)]">Preview will appear here…</p>}
                    </div>
                  </div>
                </div>

                {/* Author notes */}
                <div>
                  <label className="section-label mb-2 block">Author Notes</label>
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    rows={3}
                    placeholder="Private notes for reviewers…"
                    className="input-base w-full resize-y font-mono"
                  />
                </div>

                {/* Answer + Stage */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="section-label mb-2 block">Answer</label>
                    <input
                      type="text"
                      value={editedAnswer}
                      onChange={(e) => setEditedAnswer(e.target.value)}
                      className="input-base w-full font-mono"
                    />
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Stage</label>
                    <select
                      value={editedStage}
                      onChange={(e) => setEditedStage(e.target.value)}
                      className="input-base w-full"
                    >
                      {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="section-label mb-2 block">Difficulty</label>
                  <input
                    type="range"
                    min="1" max="10" step="1"
                    value={editedDifficulty}
                    onChange={(e) => setEditedDifficulty(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-accent)]"
                  />
                  <div className="mt-2 flex items-center justify-between rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                    <span className="text-xs text-[var(--color-text-muted)]">Level</span>
                    <span className="tabular-nums text-sm font-semibold text-[var(--color-accent)]">{editedDifficulty}/10</span>
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <label className="section-label mb-2 block">Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() =>
                          setEditedTopics((prev) =>
                            prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
                          )
                        }
                        className={[
                          'rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors',
                          editedTopics.includes(topic)
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]',
                        ].join(' ')}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSave} className="btn-filled w-full py-3 text-sm flex items-center justify-center gap-2">
                  <Save size={15} /> Save Changes
                </button>
              </div>
            </section>
          )}

          {/* ── Author notes (view mode) ── */}
          {!isEditing && problem.notes && (
            <section className="surface-card p-5">
              <p className="section-label mb-3">Author Notes</p>
              <div className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                <KatexRenderer latex={problem.notes} />
              </div>
            </section>
          )}

          {/* ── Reviews ── */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Reviews
              <span className="rounded-full bg-[var(--color-surface-offset)] px-2.5 py-0.5 text-sm font-medium text-[var(--color-text-muted)]">
                {feedbacks.length}
              </span>
            </h2>

            {feedbacks.length === 0 ? (
              <div className="surface-card py-14 text-center">
                <p className="text-sm text-[var(--color-text-faint)]">No reviews yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map((fb) => {
                  const fbUserId = fb.user?.id || fb.userId;
                  const isMyFeedback =
                    (myId         && fbUserId && String(myId)         === String(fbUserId)) ||
                    (serverUserId && fbUserId && String(serverUserId) === String(fbUserId));
                  const canEditThisFeedback = !fb.resolved && (isMyFeedback || isAdmin);
                  const isEditingThis  = editingFeedbackId === fb.id;
                  const isReplyingThis = replyingId === fb.id;
                  const { body: fbBody, resolveComment: fbResolveNote } = parseResolutionNote(fb.feedback);

                  return (
                    <div key={fb.id} className="surface-card p-5 space-y-3">
                      {/* Review header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={[
                            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                            fb.isEndorsement
                              ? 'border border-[var(--badge-endorsed-border)] bg-[var(--badge-endorsed-bg)] text-[var(--badge-endorsed-text)]'
                              : fb.resolved
                              ? 'border border-[var(--badge-resolved-border)] bg-[var(--badge-resolved-bg)] text-[var(--badge-resolved-text)]'
                              : 'bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]',
                          ].join(' ')}>
                            {fb.user.firstName[0]}{fb.user.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-none">{fb.user.firstName} {fb.user.lastName}</p>
                            <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
                              {new Date(fb.createdAt).toLocaleDateString()} ·{' '}
                              <span className={
                                fb.isEndorsement ? 'text-[var(--badge-endorsed-text)]'
                                : fb.resolved    ? 'text-[var(--badge-resolved-text)]'
                                : 'text-[var(--color-text-muted)]'
                              }>
                                {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved' : 'Review'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Per-review actions */}
                        <div className="flex items-center gap-3">
                          {canEditThisFeedback && (
                            <button
                              onClick={() => {
                                if (isEditingThis) {
                                  setEditingFeedbackId(null); setEditedFeedbackAnswer('');
                                } else {
                                  setEditingFeedbackId(fb.id);
                                  setEditedFeedbackComment(fbBody);
                                  setEditedFeedbackAnswer(fb.answer || '');
                                  setEditedFeedbackIsEndorsement(fb.isEndorsement);
                                  setReplyingId(null);
                                }
                              }}
                              className="text-xs font-medium text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-accent)]"
                            >
                              {isEditingThis ? 'Cancel' : 'Edit'}
                            </button>
                          )}
                          {(isMyFeedback || isAdmin) && (
                            <button
                              onClick={(e) => handleDeleteFeedback(e, fb.id)}
                              className="flex items-center gap-0.5 text-xs font-medium text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-notification)]"
                              title="Delete feedback"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => {
                                if (isReplyingThis) { setReplyingId(null); setReplyText(''); }
                                else { setReplyingId(fb.id); setReplyText(fb.authorReply || ''); setResolvingId(null); setEditingFeedbackId(null); }
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                            >
                              <MessageSquare size={11} />
                              {isReplyingThis ? 'Cancel' : fb.authorReply ? 'Edit Reply' : 'Reply'}
                            </button>
                          )}
                          {!fb.resolved && !fb.isEndorsement && canEdit && (
                            <button
                              onClick={() => { setResolvingId(fb.id === resolvingId ? null : fb.id); setReplyingId(null); }}
                              className="text-xs font-medium text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-text)]"
                            >
                              {resolvingId === fb.id ? 'Cancel' : 'Resolve'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Their answer pill */}
                      {(canEdit || isMyFeedback) && fb.answer && !isEditingThis && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Their answer:</span>
                          <span className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-sm">
                            <KatexRenderer latex={fb.answer} />
                          </span>
                        </div>
                      )}

                      {/* Edit inline form */}
                      {isEditingThis ? (
                        <div className="space-y-3">
                          {isMyFeedback && (
                            <div>
                              <label className="section-label mb-1 block">Your Answer</label>
                              <input
                                type="text"
                                value={editedFeedbackAnswer}
                                onChange={(e) => setEditedFeedbackAnswer(e.target.value)}
                                placeholder="Update your answer…"
                                className="input-base w-full font-mono"
                              />
                            </div>
                          )}
                          <div>
                            <label className="section-label mb-1 block">Comment</label>
                            <textarea
                              value={editedFeedbackComment}
                              onChange={(e) => setEditedFeedbackComment(e.target.value)}
                              className="input-base w-full"
                              rows={3}
                            />
                          </div>
                          {isMyFeedback && (
                            <div className="flex items-center gap-2">
                              <span className="section-label">Type:</span>
                              {[
                                { val: false, label: 'Review' },
                                { val: true,  label: 'Endorsement' },
                              ].map(({ val, label }) => (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => setEditedFeedbackIsEndorsement(val)}
                                  className={[
                                    'rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors',
                                    editedFeedbackIsEndorsement === val
                                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]',
                                  ].join(' ')}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={() => handleEditFeedback(fb.id)} className="btn-filled px-4 py-2 text-xs">
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">{fbBody}</p>
                      )}

                      {/* Author reply (read) */}
                      {!isReplyingThis && fb.authorReply && (
                        <div className="ml-4 border-l-2 border-[var(--color-border)] pl-3">
                          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
                            <MessageSquare size={10} /> Author Reply
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">{fb.authorReply}</p>
                        </div>
                      )}

                      {/* Reply textarea */}
                      {isReplyingThis && (
                        <div className="ml-4 border-l-2 border-[var(--color-accent)] pl-3 space-y-2">
                          <p className="flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
                            <MessageSquare size={10} /> {fb.authorReply ? 'Edit Reply' : 'Reply'}
                          </p>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply…"
                            className="input-base w-full"
                            rows={3}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveReply(fb.id)}
                            disabled={savingReply}
                            className="btn-filled px-4 py-2 text-xs disabled:opacity-50"
                          >
                            {savingReply ? 'Saving…' : 'Save Reply'}
                          </button>
                        </div>
                      )}

                      {/* Resolution note */}
                      {fb.resolved && fbResolveNote && (
                        <div className="rounded-sm border border-[var(--badge-resolved-border)] bg-[var(--badge-resolved-bg)] p-3">
                          <p className="section-label mb-1 text-[var(--badge-resolved-text)]">Resolution Note</p>
                          <p className="text-sm leading-relaxed text-[var(--badge-resolved-text)]">{fbResolveNote}</p>
                        </div>
                      )}

                      {/* Resolve form */}
                      {resolvingId === fb.id && (
                        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
                          <textarea
                            value={resolveComment}
                            onChange={(e) => setResolveComment(e.target.value)}
                            placeholder="How did you address this?"
                            className="input-base w-full"
                            rows={2}
                          />
                          <button onClick={() => handleResolveFeedback(fb.id)} className="btn-filled w-full py-2 text-xs">
                            Confirm Resolution
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </Layout>

      {/* ═══════════════════════════════════════════════════════
          ARCHIVE MODAL
      ═══════════════════════════════════════════════════════ */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-highlight)]">
                <Archive size={18} className="text-[var(--color-warning)]" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                  Archive Problem {problem.id}?
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">You can restore it later from the Archive page.</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="section-label mb-2 block">
                Reason <span className="ml-1 font-normal normal-case tracking-normal text-[var(--color-text-faint)]">(optional — saved to notes)</span>
              </label>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                rows={3}
                placeholder="e.g. Duplicate of MS0042, answer unclear, needs rework…"
                autoFocus
                className="input-base w-full resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowArchiveModal(false)} className="btn-outline flex-1 py-2.5 text-sm">
                Cancel
              </button>
              <button
                onClick={() => { setShowArchiveModal(false); handleArchive(); }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-[var(--color-warning)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-warning-hover)]"
              >
                <Archive size={14} /> Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          DELETE MODAL
      ═══════════════════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-notification-highlight)]">
                <Trash2 size={18} className="text-[var(--color-notification)]" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                  Delete Problem {problem.id}?
                </p>
                <p className="mt-0.5 text-xs font-medium text-[var(--color-notification)]">
                  This permanently deletes the problem and all its reviews. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="btn-outline flex-1 py-2.5 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-[var(--color-notification)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-notification-hover)] disabled:opacity-60"
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PREVIEW MODAL
      ═══════════════════════════════════════════════════════ */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false); }}
        >
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-sm border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl sm:max-w-2xl sm:rounded-sm">

            {/* Modal header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Problem {problem.id}</span>
                <span className={getStageBadgeClass(problem._displayStatus)}>
                  {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={10} />}
                  {(problem._displayStatus === 'endorsed'     || problem._displayStatus === 'Endorsed')     && <Star size={10} className="fill-current" />}
                  {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                    ? 'Needs Review'
                    : problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed'
                    ? 'Endorsed'
                    : problem.stage}
                </span>
                <span className="flex items-center gap-1 text-xs text-[var(--color-text-faint)]">
                  <User size={11} /> {problem.author.firstName} {problem.author.lastName}
                  {problem.examType && <><span className="opacity-40">·</span> {problem.examType}</>}
                </span>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <p className="section-label mb-2">Problem Statement</p>
                <div className="prose-math leading-relaxed">
                  <KatexRenderer latex={problem.latex} />
                </div>
              </div>

              {problem.answer && (
                <div className="flex items-center gap-2.5">
                  <span className="section-label">Answer</span>
                  <span className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-sm font-semibold">
                    <KatexRenderer latex={problem.answer} />
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="section-label">Difficulty</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div className="h-full bg-[var(--color-accent)]" style={{ width: `${(parseInt(problem.quality) || 5) * 10}%` }} />
                    </div>
                    <span className="tabular-nums text-sm font-semibold text-[var(--color-accent)]">{parseInt(problem.quality) || 5}/10</span>
                  </div>
                </div>
                {problem.topics?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {problem.topics.map((t) => (
                      <span key={t} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {problem.solution && (
                <div className="overflow-hidden rounded-sm border border-[var(--color-border)]">
                  <button
                    onClick={() => setPreviewShowSolution(!previewShowSolution)}
                    className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--color-surface)]"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)]">
                      <CheckCircle size={14} /> {previewShowSolution ? 'Hide' : 'Show'} Solution
                    </span>
                    {previewShowSolution ? <ChevronUp size={15} className="text-[var(--color-text-faint)]" /> : <ChevronDown size={15} className="text-[var(--color-text-faint)]" />}
                  </button>
                  {previewShowSolution && (
                    <div className="prose-math border-t border-[var(--color-border)] p-4 text-sm leading-relaxed">
                      <KatexRenderer latex={problem.solution} />
                    </div>
                  )}
                </div>
              )}

              {problem.notes && (
                <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="section-label mb-2">Author Notes</p>
                  <div className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                    <KatexRenderer latex={problem.notes} />
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5">
              {canEdit && (
                <button
                  onClick={() => { setShowPreview(false); setIsEditing(true); }}
                  className="btn-filled px-3 py-2 text-xs flex items-center gap-1.5"
                >
                  <Edit size={13} /> Edit
                </button>
              )}
              <button
                onClick={() => navigate(`/feedback/${id}`)}
                className="btn-outline px-3 py-2 text-xs flex items-center gap-1.5"
              >
                <MessageSquare size={13} /> Give Feedback
              </button>
              {canEdit && problem.stage !== 'Archived' && (
                <button
                  onClick={() => { setShowPreview(false); setShowArchiveModal(true); setArchiveReason(''); }}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning-highlight)]"
                >
                  <Archive size={13} /> Archive
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => { setShowPreview(false); setShowDeleteModal(true); }}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-notification)] transition-colors hover:bg-[var(--color-notification-highlight)]"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <button
                onClick={() => setShowPreview(false)}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-text)]"
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
