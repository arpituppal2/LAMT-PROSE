import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Edit, User, Archive, Star, ChevronDown, ChevronUp, 
  CheckCircle, Image as ImageIcon, X,
  AlertCircle, Save, ArrowLeft, MessageSquare, Trash2,
  Eye, ExternalLink
} from 'lucide-react';
import api from '../utils/api';
import { getProblemStatus, STATUS_BADGE_CLASS } from '../utils/problemStatus';
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
  const currentTopics = isEditing ? editedTopics : (problem.topics || []);

  // Derive canonical status from feedbacks (not from server stage field)
  const problemStatus = getProblemStatus(problem, feedbacks);
  const stageBadgeClass = (s) => STATUS_BADGE_CLASS[s] || STATUS_BADGE_CLASS['Idea'];

  return (
    <>
      <Layout>
        <div className="max-w-5xl mx-auto px-6 pb-20">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-3 pt-2">

          {/* Left: title row + author/difficulty row */}
          <div className="min-w-0">
            {/* Row 1: Problem ID · Stage badge · Topic pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                Problem {problem.id}
              </h1>

              {/* Stage badge */}
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${stageBadgeClass(problemStatus)}`}>
                {problemStatus === 'Needs Review' && <AlertCircle size={11} />}
                {problemStatus === 'Endorsed' && <Star size={11} className="fill-current" />}
                {problemStatus}
              </span>

              {/* Topic pills */}
              {currentTopics.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {currentTopics.map(t => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700"
                    >
                      {TOPIC_ABBREV[t] ?? t}
                    </span>
                  ))}
                </div>
              )}
            </div>
