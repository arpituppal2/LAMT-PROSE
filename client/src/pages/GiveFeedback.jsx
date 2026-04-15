import { useState, useEffect } from 'react';
import { Clock, Search, CheckCircle, ChevronDown, ChevronUp, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const FEEDBACK_TAGS = [
  'Well-posed', 'Clear statement', 'Elegant solution',
  'Ambiguous', 'Needs diagram', 'Too easy', 'Too hard',
  'Interesting approach', 'Computation-heavy', 'Duplicate',
];

function FeedbackCard({ problem, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (t) => setTags(prev =>
    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
  );

  const handleImage = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setImages(prev => [...prev, { file, url: ev.target.result }]);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('rating', rating);
      fd.append('comment', comment);
      fd.append('tags', JSON.stringify(tags));
      images.forEach(img => fd.append('images', img.file));
      await api.post(`/problems/${problem.id}/feedback`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDone(true);
      onSubmit(problem.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-5 py-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Feedback submitted.</p>
      </div>
    );
  }

  // Use actual field names from the server: problem.latex, problem.topics
  const displayTopics = (problem.topics || []).join(', ');

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
      {/* Problem header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {displayTopics && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {displayTopics}
              </span>
            )}
            {problem.quality && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
                {parseInt(problem.quality)}/10
              </span>
            )}
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {new Date(problem.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
            <KatexRenderer latex={problem.latex} />
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {open
            ? <ChevronUp size={16} className="text-gray-400" />
            : <ChevronDown size={16} className="text-gray-400" />
          }
        </div>
      </button>

      {/* Expanded form */}
      {open && (
        <div className="border-t border-gray-100 dark:border-white/8 px-5 py-4 space-y-4">
          {/* Full problem */}
          <div className="bg-gray-50 dark:bg-white/4 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Problem</p>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              <KatexRenderer latex={problem.latex} />
            </div>
            {problem.images?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {problem.images.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-white/10" loading="lazy" />
                ))}
              </div>
            )}
          </div>

          {/* Rating */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Rating</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                    rating === n
                      ? 'bg-[#2774AE] text-white'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_TAGS.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    tags.includes(t)
                      ? 'bg-[#2774AE] text-white'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Comment</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Share your thoughts on this problem…"
              className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Images */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Attachments</p>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 dark:bg-white/5 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-gray-600 dark:text-gray-300">
              <ImageIcon size={12} />
              Add image
              <input type="file" accept="image/*" multiple onChange={handleImage} className="hidden" />
            </label>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-white/10" />
                    <button
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={8} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 bg-[#2774AE] text-white text-sm font-semibold rounded-lg hover:bg-[#1a5f8e] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function GiveFeedback() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // When fetching a specific problem by ID, hit /:id directly.
    // Otherwise, fetch all reviewable problems (not authored by current user, not archived).
    const fetcher = id
      ? api.get(`/problems/${id}`).then(r => [r.data])
      : api.get('/problems', { params: { reviewable: 'true' } }).then(r => r.data);

    fetcher
      .then(setProblems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmitted = (problemId) => {
    setProblems(prev => prev.filter(p => p.id !== problemId));
  };

  // Filter using actual field names from the API response
  const filtered = problems.filter(p =>
    !search ||
    p.latex?.toLowerCase().includes(search.toLowerCase()) ||
    (p.topics || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="w-full px-[5%]">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">Give Feedback</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Loading…' : `${problems.length} problem${problems.length !== 1 ? 's' : ''} awaiting review`}
          </p>
        </div>

        {!id && (
          <div className="relative mb-5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search problems…"
              className="w-full max-w-sm pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white placeholder:text-gray-400"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle size={32} className="mx-auto text-green-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">All caught up!</h3>
            <p className="text-sm text-gray-400">No problems currently need review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <FeedbackCard key={p.id} problem={p} onSubmit={handleSubmitted} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
