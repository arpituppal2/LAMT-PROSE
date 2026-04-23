import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Edit, User, Archive, Star, ChevronDown, ChevronUp,
  CheckCircle, Image as ImageIcon, X,
  AlertCircle, Save, ArrowLeft, MessageSquare, Trash2,
  Eye,
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
  const normalized =
    stage === 'needs_review' || stage === 'Needs Review' ? 'needs_review'
    : stage === 'endorsed'   || stage === 'Endorsed'     ? 'endorsed'
    : stage === 'Resolved'                               ? 'resolved'
    : stage === 'Archived'                               ? 'archived'
    : 'idea';

  if (normalized === 'needs_review') return 'status-badge status-needs-review';
  if (normalized === 'endorsed')     return 'status-badge status-endorsed';
  if (normalized === 'resolved')     return 'status-badge status-resolved';
  if (normalized === 'archived')     return 'status-badge status-archived';
  return 'status-badge status-idea';
};

/* ── Shared style tokens ─────────────────────────────────────── */
const card      = 'surface-card';
const hdr       = 'section-label';
const inp       = 'input-base';
const inpMono   = 'input-base' + ' ' + 'font-mono';
const textarea  = 'input-base resize-y font-mono';
const preview   = 'input-base min-h-[200px] overflow-auto';

/* ── Difficulty bar ──────────────────────────────────────────── */
const DiffBar = ({ value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <div style={{
      height: '6px', width: '80px', overflow: 'hidden',
      background: 'var(--color-surface-2)',
    }}>
      <div style={{
        height: '100%', width: `${value * 10}%`,
        background: 'var(--color-accent)',
        transition: 'width 0.4s var(--ease-out-expo)',
      }} />
    </div>
    <span style={{
      fontWeight: 700, fontSize: 'var(--text-sm)',
      color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums',
    }}>
      {value}<span style={{ fontWeight: 400, color: 'var(--color-text-faint)', fontSize: '0.75em' }}>/10</span>
    </span>
  </div>
);

const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [problem,   setProblem]   = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [message,   setMessage]   = useState('');

  const [editedLatex,      setEditedLatex]      = useState('');
  const [editedSolution,   setEditedSolution]   = useState('');
  const [editedAnswer,     setEditedAnswer]     = useState('');
  const [editedNotes,      setEditedNotes]      = useState('');
  const [editedTopics,     setEditedTopics]     = useState([]);
  const [editedDifficulty, setEditedDifficulty] = useState(5);
  const [editedStage,      setEditedStage]      = useState('');
  const [editedImages,     setEditedImages]     = useState([]);

  const [showSolution,             setShowSolution]             = useState(false);
  const [resolvingId,              setResolvingId]              = useState(null);
  const [resolveComment,           setResolveComment]           = useState('');
  const [editingFeedbackId,        setEditingFeedbackId]        = useState(null);
  const [editedFeedbackComment,    setEditedFeedbackComment]    = useState('');
  const [editedFeedbackAnswer,     setEditedFeedbackAnswer]     = useState('');
  const [editedFeedbackIsEndorsement, setEditedFeedbackIsEndorsement] = useState(false);

  const [replyingId,   setReplyingId]   = useState(null);
  const [replyText,    setReplyText]    = useState('');
  const [savingReply,  setSavingReply]  = useState(false);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason,    setArchiveReason]    = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [showPreview,     setShowPreview]     = useState(false);

  /* ── helpers ─────────────────────────────────────────────── */
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
      setEditedNotes(data.notes  || '');
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
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setEditedImages(prev => [...prev, { dataUrl: reader.result, destination: 'problem' }]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) =>
    setEditedImages(prev => prev.filter((_, i) => i !== index));

  const toggleImageDestination = (index) =>
    setEditedImages(prev => prev.map((img, i) =>
      i === index ? { ...img, destination: img.destination === 'problem' ? 'solution' : 'problem' } : img
    ));

  const handleSave = async () => {
    try {
      let finalLatex    = editedLatex;
      let finalSolution = editedSolution;

      const problemImages  = editedImages.filter(img => img.destination === 'problem');
      const solutionImages = editedImages.filter(img => img.destination === 'solution');

      if (problemImages.length  > 0) finalLatex    += '\n\n' + problemImages .map((img, i) => `![Problem Image ${i+1}](${img.dataUrl})`).join('\n');
      if (solutionImages.length > 0) finalSolution += '\n\n' + solutionImages.map((img, i) => `![Solution Image ${i+1}](${img.dataUrl})`).join('\n');

      await api.put(`/problems/${id}`, {
        latex: finalLatex, solution: finalSolution,
        answer: editedAnswer, notes: editedNotes,
        topics: editedTopics, quality: String(editedDifficulty), stage: editedStage,
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
        const updatedNotes = currentNotes ? `${reasonNote}\n\n${currentNotes}` : reasonNote;
        await api.put(`/problems/${id}`, {
          latex: problem.latex, solution: problem.solution,
          answer: problem.answer, notes: updatedNotes,
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
      const payload      = { comment: editedFeedbackComment, answer: editedFeedbackAnswer };
      const originalFb   = feedbacks.find(f => f.id === fbId);
      if (originalFb && editedFeedbackIsEndorsement !== originalFb.isEndorsement)
        payload.isEndorsement = editedFeedbackIsEndorsement;
      await api.patch(`/feedback/${fbId}`, payload);
      setMessage('Review updated.');
      setEditingFeedbackId(null);
      setEditedFeedbackComment('');
      setEditedFeedbackAnswer('');
      fetchProblem();
    } catch (error) { setMessage(error?.response?.data?.error || 'Failed to update review'); }
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
    } catch (error) { setMessage(error?.response?.data?.error || 'Failed to save reply'); }
    finally { setSavingReply(false); }
  };

  const handleDeleteFeedback = async (e, fbId) => {
    e.stopPropagation();
    if (!window.confirm('Remove this feedback? This cannot be undone.')) return;
    try {
      await api.delete(`/feedback/${fbId}`);
      setMessage('Feedback removed.');
      fetchProblem();
    } catch (error) { setMessage(error?.response?.data?.error || 'Failed to delete feedback'); }
  };

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
  const stageOptions = ['Idea', 'Needs Review', 'Endorsed'];

  /* ── Loading / not-found states ─────────────────────────── */
  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '24rem', gap: '1rem' }}>
        <div style={{
          width: '2.5rem', height: '2.5rem', borderRadius: '50%',
          border: '2px solid var(--color-accent)', borderTopColor: 'transparent',
          animation: 'spin 0.75s linear infinite',
        }} />
        <p className="section-label">Loading problem…</p>
      </div>
    </Layout>
  );

  if (!problem) return (
    <Layout>
      <div style={{ padding: '5rem 0', textAlign: 'center' }}>
        <AlertCircle style={{ margin: '0 auto 1rem', color: 'var(--color-text-faint)' }} size={48} />
        <h2 style={{ color: 'var(--color-text)', marginBottom: '1rem' }}>Problem Not Found</h2>
        <button
          onClick={() => navigate('/inventory')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Back to Inventory
        </button>
      </div>
    </Layout>
  );

  const myId         = user?.id;
  const serverUserId = problem._userId;
  const canEdit =
    problem._isAuthor ||
    problem._isAdmin  ||
    (myId && problem.authorId && String(myId) === String(problem.authorId)) ||
    (serverUserId && problem.authorId && String(serverUserId) === String(problem.authorId));
  const isAdmin = problem._isAdmin;

  const currentDifficulty = isEditing ? editedDifficulty : (parseInt(problem.quality) || 5);
  const currentTopics     = isEditing ? editedTopics     : (problem.topics || []);

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <>
      <Layout>
        <div className="page-content" style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem 5rem' }}>

          {/* ── Page header ─────────────────────────────────── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', paddingTop: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                  Problem {problem.id}
                </h1>
                <span className={getStageBadgeClass(problem._displayStatus)}>
                  {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={11} />}
                  {(problem._displayStatus === 'endorsed'     || problem._displayStatus === 'Endorsed')     && <Star size={11} style={{ fill: 'currentColor' }} />}
                  {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                    ? 'Needs Review'
                    : problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed'
                    ? 'Endorsed'
                    : problem.stage}
                </span>
                {currentTopics.length > 0 && currentTopics.map(t => (
                  <span key={t} className="status-badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                    {TOPIC_ABBREV[t] ?? t}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  <User size={13} /> {problem.author.firstName} {problem.author.lastName}
                </span>
                <DiffBar value={currentDifficulty} />
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 }}>
              <button onClick={() => setShowPreview(true)} className="btn-outline btn-sm" title="Preview problem">
                <Eye size={14} /> Preview
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={isEditing ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
                  >
                    {isEditing ? <><X size={14} /> Cancel</> : <><Edit size={14} /> Edit</>}
                  </button>
                  {!isEditing && problem.stage !== 'Archived' && (
                    <button onClick={() => { setShowArchiveModal(true); setArchiveReason(''); }} className="btn-ghost btn-sm" title="Archive">
                      <Archive size={14} /> Archive
                    </button>
                  )}
                  {!isEditing && (
                    <button onClick={() => setShowDeleteModal(true)} className="btn-danger btn-sm" title="Delete">
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Flash message ────────────────────────────────── */}
          {message && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '0.75rem 1rem',
              border: '1px solid',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              borderColor: message.includes('Failed') || message.includes('Cannot') || message.includes('required')
                ? 'var(--badge-needs-review-border)' : 'var(--badge-endorsed-border)',
              background: message.includes('Failed') || message.includes('Cannot') || message.includes('required')
                ? 'var(--badge-needs-review-bg)' : 'var(--badge-endorsed-bg)',
              color: message.includes('Failed') || message.includes('Cannot') || message.includes('required')
                ? 'var(--badge-needs-review-text)' : 'var(--badge-endorsed-text)',
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Problem Statement card ───────────────────── */}
            <div className={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '0.75rem 1.5rem' }}>
                <span className={hdr}>Problem Statement</span>
                {isEditing && <span className="status-badge status-resolved">Editing</span>}
              </div>
              <div style={{ padding: '1.5rem' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <textarea
                        value={editedLatex}
                        onChange={e => setEditedLatex(e.target.value)}
                        rows={18}
                        placeholder="Type LaTeX here…"
                        className={textarea}
                      />
                      <div className={preview}>
                        {editedLatex.trim()
                          ? <KatexRenderer latex={editedLatex} />
                          : <p style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--color-text-faint)' }}>Preview will appear here…</p>}
                      </div>
                    </div>

                    {/* Image uploader */}
                    <div style={{ border: '1.5px dashed var(--color-border)', background: 'var(--color-surface-2)', padding: '1rem' }}>
                      <p className={hdr} style={{ marginBottom: '0.75rem' }}>Images</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {editedImages.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative', width: '6rem', height: '7rem', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                            <img src={img.dataUrl} alt="preview" style={{ height: '4rem', width: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => toggleImageDestination(idx)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                height: '3rem', width: '100%',
                                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                                background: img.destination === 'problem' ? 'var(--color-surface-offset)' : 'var(--badge-endorsed-bg)',
                                color: img.destination === 'problem' ? 'var(--color-accent)' : 'var(--badge-endorsed-text)',
                              }}
                            >
                              → {img.destination}
                            </button>
                            <button
                              onClick={() => removeImage(idx)}
                              style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', width: '1rem', height: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '6rem', height: '7rem', border: '1.5px dashed var(--color-border)', cursor: 'pointer', background: 'var(--color-surface)', gap: '0.375rem' }}>
                          <ImageIcon size={20} style={{ color: 'var(--color-text-faint)' }} />
                          <span className={hdr}>Add</span>
                          <input type="file" style={{ display: 'none' }} accept="image/*" multiple onChange={handleImageUpload} />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose-math" style={{ minHeight: '6rem' }}>
                    <KatexRenderer latex={problem.latex} />
                  </div>
                )}
              </div>
            </div>

            {/* ── Solution accordion (view mode) ──────────── */}
            {!isEditing && (problem.solution || canEdit) && (
              <div className={card}>
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'var(--color-surface-2)', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    <CheckCircle size={16} /> {showSolution ? 'Hide' : 'View'} Solution
                  </span>
                  {showSolution
                    ? <ChevronUp size={18} style={{ color: 'var(--color-text-faint)' }} />
                    : <ChevronDown size={18} style={{ color: 'var(--color-text-faint)' }} />}
                </button>
                {showSolution && (
                  <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="prose-math">
                      {problem.solution
                        ? <KatexRenderer latex={problem.solution} />
                        : <p style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic', color: 'var(--color-text-faint)' }}>No detailed solution provided.</p>}
                    </div>
                    {problem.answer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', padding: '0.75rem 1rem' }}>
                        <span className={hdr}>Answer</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                          <KatexRenderer latex={problem.answer} />
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Edit metadata panel ──────────────────────── */}
            {isEditing && (
              <div className={card} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className={hdr} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>Edit Metadata</h3>

                {/* Solution */}
                <div>
                  <label className={hdr} style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Solution <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-text-faint)' }}>— live preview on the right</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <textarea value={editedSolution} onChange={e => setEditedSolution(e.target.value)} rows={12} placeholder="Write solution in LaTeX…" className={textarea} />
                    <div className={preview}>
                      {editedSolution.trim()
                        ? <KatexRenderer latex={editedSolution} />
                        : <p style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--color-text-faint)' }}>Preview will appear here…</p>}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className={hdr} style={{ display: 'block', marginBottom: '0.5rem' }}>Author Notes</label>
                  <textarea value={editedNotes} onChange={e => setEditedNotes(e.target.value)} rows={3} placeholder="Private notes for reviewers…" className={textarea} />
                </div>

                {/* Answer + Stage */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className={hdr} style={{ display: 'block', marginBottom: '0.5rem' }}>Answer</label>
                    <input type="text" value={editedAnswer} onChange={e => setEditedAnswer(e.target.value)} className={inpMono} />
                  </div>
                  <div>
                    <label className={hdr} style={{ display: 'block', marginBottom: '0.5rem' }}>Stage</label>
                    <select value={editedStage} onChange={e => setEditedStage(e.target.value)} className={inp} style={{ fontWeight: 600 }}>
                      {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className={hdr} style={{ display: 'block', marginBottom: '0.5rem' }}>Difficulty</label>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={editedDifficulty}
                    onChange={e => setEditedDifficulty(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-accent)', height: '6px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', padding: '0.5rem 0.75rem', marginTop: '0.5rem' }}>
                    <span className={hdr}>Level</span>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>{editedDifficulty}/10</span>
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <label className={hdr} style={{ display: 'block', marginBottom: '0.5rem' }}>Topics</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {topicOptions.map(topic => (
                      <button
                        key={topic} type="button"
                        onClick={() => setEditedTopics(prev =>
                          prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
                        )}
                        className={editedTopics.includes(topic) ? 'btn-tab btn-sm btn-tab--active' : 'btn-tab btn-sm'}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSave} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <Save size={15} /> Save Changes
                </button>
              </div>
            )}

            {/* ── Author Notes (view mode) ─────────────────── */}
            {!isEditing && problem.notes && (
              <div className={card} style={{ padding: '1.25rem 1.5rem' }}>
                <p className={hdr} style={{ marginBottom: '0.75rem' }}>Author Notes</p>
                <div className="prose-math" style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>
                  <KatexRenderer latex={problem.notes} />
                </div>
              </div>
            )}

            {/* ── Reviews section ──────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>
                Reviews
                <span style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 600, padding: '0.15em 0.55em', border: '1px solid var(--color-border)' }}>
                  {feedbacks.length}
                </span>
              </h2>

              {feedbacks.length === 0 ? (
                <div className={card} style={{ padding: '3.5rem', textAlign: 'center', border: '1.5px dashed var(--color-border)' }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>No reviews yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {feedbacks.map(fb => {
                    const fbUserId = fb.user?.id || fb.userId;
                    const isMyFeedback =
                      (myId         && fbUserId && String(myId)         === String(fbUserId)) ||
                      (serverUserId && fbUserId && String(serverUserId) === String(fbUserId));
                    const canEditThisFeedback = !fb.resolved && (isMyFeedback || isAdmin);
                    const isEditingThis  = editingFeedbackId === fb.id;
                    const isReplyingThis = replyingId        === fb.id;

                    const { body: fbBody, resolveComment: fbResolveNote } = parseResolutionNote(fb.feedback);

                    /* avatar colour */
                    const avatarStyle = fb.isEndorsement
                      ? { border: '1px solid var(--badge-endorsed-border)', background: 'var(--badge-endorsed-bg)', color: 'var(--badge-endorsed-text)' }
                      : fb.resolved
                      ? { border: '1px solid var(--badge-resolved-border)', background: 'var(--badge-resolved-bg)', color: 'var(--badge-resolved-text)' }
                      : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' };

                    return (
                      <div key={fb.id} className={card} style={{ padding: '1.25rem 1.5rem' }}>
                        {/* Review header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div style={{ ...avatarStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0 }}>
                              {fb.user.firstName[0]}{fb.user.lastName[0]}
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.2, marginBottom: '0.2rem' }}>
                                {fb.user.firstName} {fb.user.lastName}
                              </p>
                              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                                {new Date(fb.createdAt).toLocaleDateString()} &bull;{' '}
                                <span style={{ color: fb.isEndorsement ? 'var(--badge-endorsed-text)' : fb.resolved ? 'var(--badge-resolved-text)' : 'var(--color-text-muted)' }}>
                                  {fb.isEndorsement ? 'Endorsement' : fb.resolved ? 'Resolved' : 'Review'}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {canEditThisFeedback && (
                              <button
                                onClick={() => {
                                  if (isEditingThis) { setEditingFeedbackId(null); setEditedFeedbackAnswer(''); }
                                  else { setEditingFeedbackId(fb.id); setEditedFeedbackComment(fbBody); setEditedFeedbackAnswer(fb.answer || ''); setEditedFeedbackIsEndorsement(fb.isEndorsement); setReplyingId(null); }
                                }}
                                style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                {isEditingThis ? 'Cancel' : 'Edit'}
                              </button>
                            )}
                            {(isMyFeedback || isAdmin) && (
                              <button onClick={e => handleDeleteFeedback(e, fb.id)} className="btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }} title="Delete feedback">
                                <Trash2 size={12} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => {
                                  if (isReplyingThis) { setReplyingId(null); setReplyText(''); }
                                  else { setReplyingId(fb.id); setReplyText(fb.authorReply || ''); setResolvingId(null); setEditingFeedbackId(null); }
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <MessageSquare size={11} />
                                {isReplyingThis ? 'Cancel' : fb.authorReply ? 'Edit Reply' : 'Reply'}
                              </button>
                            )}
                            {!fb.resolved && !fb.isEndorsement && canEdit && (
                              <button
                                onClick={() => { setResolvingId(fb.id === resolvingId ? null : fb.id); setReplyingId(null); }}
                                style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                {resolvingId === fb.id ? 'Cancel' : 'Resolve'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Their answer chip */}
                        {(canEdit || isMyFeedback) && fb.answer && !isEditingThis && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span className={hdr}>Their answer:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', padding: '0.2em 0.6em' }}>
                              <KatexRenderer latex={fb.answer} />
                            </span>
                          </div>
                        )}

                        {/* Edit feedback form */}
                        {isEditingThis ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {isMyFeedback && (
                              <div>
                                <label className={hdr} style={{ display: 'block', marginBottom: '0.25rem' }}>Your Answer</label>
                                <input type="text" value={editedFeedbackAnswer} onChange={e => setEditedFeedbackAnswer(e.target.value)} placeholder="Update your answer…" className={inpMono} />
                              </div>
                            )}
                            <div>
                              <label className={hdr} style={{ display: 'block', marginBottom: '0.25rem' }}>Feedback / Comment</label>
                              <textarea value={editedFeedbackComment} onChange={e => setEditedFeedbackComment(e.target.value)} className={inp + ' resize-y'} rows={3} />
                            </div>
                            {isMyFeedback && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={hdr}>Type:</span>
                                <button type="button" onClick={() => setEditedFeedbackIsEndorsement(false)} className={!editedFeedbackIsEndorsement ? 'btn-tab btn-sm btn-tab--active' : 'btn-tab btn-sm'}>Review</button>
                                <button type="button" onClick={() => setEditedFeedbackIsEndorsement(true)}  className={ editedFeedbackIsEndorsement ? 'btn-tab btn-sm btn-tab--active' : 'btn-tab btn-sm'}>Endorsement</button>
                              </div>
                            )}
                            <button onClick={() => handleEditFeedback(fb.id)} className="btn-primary btn-sm">Save</button>
                          </div>
                        ) : (
                          <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>{fbBody}</p>
                        )}

                        {/* Author reply (view) */}
                        {!isReplyingThis && fb.authorReply && (
                          <div style={{ marginTop: '0.75rem', marginLeft: '1rem', borderLeft: '2px solid var(--color-border)', paddingLeft: '0.75rem' }}>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '0.25rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                              <MessageSquare size={10} /> Author Reply
                            </p>
                            <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>{fb.authorReply}</p>
                          </div>
                        )}

                        {/* Reply editor */}
                        {isReplyingThis && (
                          <div style={{ marginTop: '0.75rem', marginLeft: '1rem', borderLeft: '2px solid var(--color-accent)', paddingLeft: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                              <MessageSquare size={10} /> {fb.authorReply ? 'Edit Reply' : 'Reply'}
                            </p>
                            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply…" className={inp + ' resize-y'} rows={3} autoFocus />
                            <button onClick={() => handleSaveReply(fb.id)} disabled={savingReply} className="btn-primary btn-sm" style={{ alignSelf: 'flex-start', opacity: savingReply ? 0.5 : 1 }}>
                              {savingReply ? 'Saving…' : 'Save Reply'}
                            </button>
                          </div>
                        )}

                        {/* Resolution note */}
                        {fb.resolved && fbResolveNote && (
                          <div style={{ marginTop: '0.75rem', border: '1px solid var(--badge-resolved-border)', background: 'var(--badge-resolved-bg)', padding: '0.75rem 1rem' }}>
                            <p className={hdr} style={{ color: 'var(--badge-resolved-text)', marginBottom: '0.25rem' }}>Resolution Note</p>
                            <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--badge-resolved-text)' }}>{fbResolveNote}</p>
                          </div>
                        )}

                        {/* Resolve form */}
                        {resolvingId === fb.id && (
                          <div style={{ marginTop: '1rem', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <textarea value={resolveComment} onChange={e => setResolveComment(e.target.value)} placeholder="How did you address this?" className={inp + ' resize-y'} rows={2} />
                            <button onClick={() => handleResolveFeedback(fb.id)} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
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

      {/* ── Archive modal ──────────────────────────────────────── */}
      {showArchiveModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowArchiveModal(false); }}>
          <div className="surface-card" style={{ width: '100%', maxWidth: '28rem', padding: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Archive size={18} style={{ color: '#d97706' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>Archive Problem {problem.id}?</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>You can restore it later from the Archive page.</p>
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className={hdr} style={{ display: 'block', marginBottom: '0.5rem' }}>
                Reason <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-text-faint)' }}>(optional — saved to notes)</span>
              </label>
              <textarea
                value={archiveReason}
                onChange={e => setArchiveReason(e.target.value)}
                rows={3}
                placeholder="e.g. Duplicate of MS0042, answer unclear, needs rework…"
                autoFocus
                className={inp + ' resize-none'}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowArchiveModal(false)} className="btn-outline btn-sm" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={() => { setShowArchiveModal(false); handleArchive(); }}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: '#d97706', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-sm)', letterSpacing: '0.10em', textTransform: 'uppercase', padding: '0.5rem 1rem' }}
              >
                <Archive size={14} /> Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ───────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
          <div className="surface-card" style={{ width: '100%', maxWidth: '28rem', padding: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', background: 'rgba(220, 38, 38, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={18} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>Delete Problem {problem.id}?</h3>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#dc2626', marginTop: '0.2rem' }}>
                  This permanently deletes the problem and all its reviews. This cannot be undone.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="btn-outline btn-sm" style={{ flex: 1, opacity: deleting ? 0.5 : 1 }}>Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: '#dc2626', color: '#fff', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 'var(--text-sm)', letterSpacing: '0.10em', textTransform: 'uppercase', padding: '0.5rem 1rem', opacity: deleting ? 0.6 : 1 }}
              >
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview modal ──────────────────────────────────────── */}
      {showPreview && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPreview(false); }}>
          <div className="surface-card" style={{ width: '100%', maxWidth: '42rem', maxHeight: '90dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            {/* Preview header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '1rem 1.5rem', flexShrink: 0 }}>
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>Problem {problem.id}</span>
                  <span className={getStageBadgeClass(problem._displayStatus)}>
                    {(problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review') && <AlertCircle size={10} />}
                    {(problem._displayStatus === 'endorsed'     || problem._displayStatus === 'Endorsed')     && <Star size={10} style={{ fill: 'currentColor' }} />}
                    {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                      ? 'Needs Review'
                      : problem._displayStatus === 'endorsed' || problem._displayStatus === 'Endorsed'
                      ? 'Endorsed'
                      : problem.stage}
                  </span>
                </div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                  <User size={11} /> {problem.author.firstName} {problem.author.lastName}
                  {problem.examType && <><span>·</span> {problem.examType}</>}
                </p>
              </div>
              <button onClick={() => setShowPreview(false)} className="btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {/* Preview body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p className={hdr} style={{ marginBottom: '0.625rem' }}>Problem Statement</p>
                <div className="prose-math" style={{ lineHeight: 1.75, color: 'var(--color-text)' }}>
                  <KatexRenderer latex={problem.latex} />
                </div>
              </div>

              {problem.answer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span className={hdr}>Answer</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', padding: '0.25em 0.75em' }}>
                    <KatexRenderer latex={problem.answer} />
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={hdr}>Difficulty</span>
                  <DiffBar value={parseInt(problem.quality) || 5} />
                </div>
                {problem.topics?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {problem.topics.map(t => (
                      <span key={t} className="status-badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {problem.solution && (
                <div>
                  <button
                    onClick={() => setShowPreview(prev => prev)}
                    className="btn-ghost btn-sm"
                    style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => setShowPreview(s => { /* toggle solution inline */ return s; })}
                  >
                    <CheckCircle size={14} /> Solution
                  </button>
                  <div className="prose-math" style={{ lineHeight: 1.75, color: 'var(--color-text-muted)' }}>
                    <KatexRenderer latex={problem.solution} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProblemDetail;
