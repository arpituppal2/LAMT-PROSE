import { useState, useEffect, useRef } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, X, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
import { useAuth } from '../utils/AuthContext';

/* ── helpers ─────────────────────────────────────────────────── */
const statusColor = (s) => ({
  'Endorsed':     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Needs Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Idea':         'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
}[s] || 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400');

/* ── Feedback Modal ───────────────────────────────────────────── */
function FeedbackModal({ problem, onClose, onSuccess }) {
  const [tag, setTag]         = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages]   = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef();

  const needsComment = tag === 'Needs Review' && !comment.trim();

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      const tmpId = Date.now() + Math.random();
      setImages(prev => [...prev, { tmpId, file, previewUrl, uploadedUrl: null }]);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setImages(prev => prev.map(img =>
          img.tmpId === tmpId ? { ...img, uploadedUrl: res.data.url } : img
        ));
      } catch {
        setImages(prev => prev.filter(img => img.tmpId !== tmpId));
        setError('Image upload failed.');
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = (tmpId) => setImages(prev => prev.filter(img => img.tmpId !== tmpId));

  const handleSubmit = async () => {
    if (!tag) { setError('Please select Endorsed or Needs Review.'); return; }
    if (needsComment) { setError('Comment is required for Needs Review.'); return; }
    if (uploading) { setError('Please wait for images to finish uploading.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/problems/${problem.id}/feedback`, {
        tag,
        comment,
        images: images.map(img => img.uploadedUrl).filter(Boolean),
      });
      onSuccess(problem.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#111827] w-full sm:max-w-lg max-h-[92dvh] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Give Feedback</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="bg-gray-50 dark:bg-white/4 rounded-xl p-4">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(problem.topics || []).map(t => (
                <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full font-medium">{t}</span>
              ))}
              {problem.quality && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 text-xs rounded-full font-medium">{parseInt(problem.quality)}/10</span>
              )}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              <KatexRenderer latex={problem.latex} />
            </div>
            {(problem.images || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {problem.images.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-white/10" loading="lazy" />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Your verdict</p>
            <div className="flex gap-2">
              {['Endorsed', 'Needs Review'].map(t => (
                <button
                  key={t}
                  onClick={() => setTag(prev => prev === t ? '' : t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    tag === t
                      ? t === 'Endorsed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[#2774AE]/40'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Comment {tag === 'Needs Review' && <span className="text-red-500 normal-case font-normal ml-1">(required)</span>}
            </p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Share your thoughts…"
              className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white placeholder:text-gray-400 resize-none"
            />
            {tag === 'Needs Review' && !comment.trim() && (
              <div className="flex items-center gap-1.5 mt-1.5 text-amber-600 dark:text-amber-400">
                <AlertCircle size={12} />
                <p className="text-xs">Comment is required for Needs Review</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {images.map(img => (
                <div key={img.tmpId} className="relative group">
                  <img src={img.previewUrl} alt="" className={`w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-white/10 ${!img.uploadedUrl ? 'opacity-50' : ''}`} />
                  {!img.uploadedUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(img.tmpId)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={8} className="text-white" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg cursor-pointer hover:border-[#2774AE] transition-colors">
                <ImageIcon size={16} className="text-gray-400" />
                <span className="text-[9px] text-gray-400 mt-1">Add</span>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/8 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading || !tag || needsComment}
            className="w-full py-2.5 bg-[#2774AE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a5f8e] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Problem Card (Assigned Queue) ───────────────────────────── */
function ProblemCard({ problem, onReviewed }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-4 cursor-pointer hover:border-[#2774AE]/40 hover:shadow-sm transition-all"
      >
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(problem.topics || []).map(t => (
            <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full font-medium">{t}</span>
          ))}
          {problem.quality && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 text-xs rounded-full font-medium">{parseInt(problem.quality)}/10</span>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {(problem.solveCount ?? 0)} review{problem.solveCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3">
          <KatexRenderer latex={problem.latex} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">
            {problem.author ? `${problem.author.firstName} ${problem.author.lastName}` : '—'}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(problem.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      {modalOpen && (
        <FeedbackModal
          problem={problem}
          onClose={() => setModalOpen(false)}
          onSuccess={onReviewed}
        />
      )}
    </>
  );
}

/* ── Browse All Row ────────────────────────────────────────────── */
function BrowseRow({ problem, onReviewed }) {
  const [modalOpen, setModalOpen] = useState(false);
  const displayStatus = problem._displayStatus || problem.stage || 'Idea';

  return (
    <>
      <tr
        onClick={() => setModalOpen(true)}
        className="hover:bg-gray-50 dark:hover:bg-white/3 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(displayStatus)}`}>
            {displayStatus}
          </span>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <div className="flex flex-wrap gap-1">
            {(problem.topics || []).map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">{t}</span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-sm tabular-nums font-semibold text-[#2774AE] dark:text-[#FFD100]">
            {problem.quality ? `${parseInt(problem.quality)}/10` : '—'}
          </span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600 dark:text-gray-400">
          {problem.author ? `${problem.author.firstName} ${problem.author.lastName}` : '—'}
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">
          {new Date(problem.createdAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 max-w-xs">
            <KatexRenderer latex={problem.latex} />
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          {problem.myFeedback ? (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 justify-end">
              <CheckCircle size={11} /> Reviewed
            </span>
          ) : (
            <span className="text-xs text-[#2774AE] dark:text-[#FFD100] font-medium">Review</span>
          )}
        </td>
      </tr>
      {modalOpen && (
        <FeedbackModal
          problem={problem}
          onClose={() => setModalOpen(false)}
          onSuccess={onReviewed}
        />
      )}
    </>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function GiveFeedback() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [search, setSearch]           = useState('');
  const [topicFilter, setTopicFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [diffFilter, setDiffFilter]   = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey]         = useState('createdAt');
  const [sortDir, setSortDir]         = useState('desc');

  useEffect(() => {
    api.get('/problems')
      .then(r => setProblems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleReviewed = (problemId) => {
    setProblems(prev => prev.map(p =>
      p.id === problemId ? { ...p, myFeedback: true } : p
    ));
  };

  const assignedQueue = problems
    .filter(p =>
      p.author?.userId !== user?.id &&
      !p.myFeedback
    )
    .sort((a, b) => {
      const sc = (a.solveCount ?? 0) - (b.solveCount ?? 0);
      if (sc !== 0) return sc;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  const allTopics = ['All', ...Array.from(new Set(problems.flatMap(p => p.topics || []).filter(Boolean))).sort()];

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const browsed = problems
    .filter(p => {
      const status = p._displayStatus || p.stage || 'Idea';
      const matchSearch = !search ||
        p.latex?.toLowerCase().includes(search.toLowerCase()) ||
        (p.topics || []).some(t => t.toLowerCase().includes(search.toLowerCase())) ||
        `${p.author?.firstName} ${p.author?.lastName}`.toLowerCase().includes(search.toLowerCase());
      const matchTopic  = topicFilter === 'All' || (p.topics || []).includes(topicFilter);
      const matchStatus = statusFilter === 'All' || status === statusFilter;
      const matchDiff   = diffFilter === 'All' || p.quality === diffFilter;
      return matchSearch && matchTopic && matchStatus && matchDiff;
    })
    .sort((a, b) => {
      let av, bv;
      if (sortKey === 'status')     { av = (a._displayStatus||a.stage||'Idea'); bv = (b._displayStatus||b.stage||'Idea'); }
      else if (sortKey === 'topic') { av = (a.topics||[])[0]||''; bv = (b.topics||[])[0]||''; }
      else if (sortKey === 'quality') { av = parseInt(a.quality)||0; bv = parseInt(b.quality)||0; }
      else if (sortKey === 'author') { av = `${a.author?.firstName} ${a.author?.lastName}`; bv = `${b.author?.firstName} ${b.author?.lastName}`; }
      else { av = new Date(a.createdAt); bv = new Date(b.createdAt); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <Layout>
      <div className="w-full px-[5%]">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">Give Feedback</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Loading…' : `${assignedQueue.length} problem${assignedQueue.length !== 1 ? 's' : ''} in your queue`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assigned to You</h2>
              {assignedQueue.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl">
                  <CheckCircle size={28} className="mx-auto text-green-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-1">No unreviewed problems in your queue.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignedQueue.map(p => (
                    <ProblemCard key={p.id} problem={p} onReviewed={handleReviewed} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Browse All Problems</h2>

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search problems, topics, authors…"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:text-white placeholder:text-gray-400"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 hover:border-[#2774AE]/40 transition-colors"
                >
                  <Filter size={14} />
                  Filters
                  {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-4 mb-3 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Topic</label>
                    <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 dark:text-white">
                      {allTopics.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Status</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 dark:text-white">
                      {['All', 'Idea', 'Endorsed', 'Needs Review'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Difficulty</label>
                    <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} className="text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 dark:text-white">
                      {['All','1','2','3','4','5','6','7','8','9','10'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/8">
                      {[
                        { key: 'status',    label: 'Status' },
                        { key: 'topic',     label: 'Topic',  hidden: 'hidden sm:table-cell' },
                        { key: 'quality',   label: 'Diff',   hidden: 'hidden sm:table-cell' },
                        { key: 'author',    label: 'Author', hidden: 'hidden md:table-cell' },
                        { key: 'createdAt', label: 'Date',   hidden: 'hidden md:table-cell' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => toggleSort(col.key)}
                          className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 select-none ${col.hidden || ''}`}
                        >
                          {col.label}<SortIcon k={col.key} />
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Problem</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {browsed.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No problems match your filters.</td></tr>
                    ) : browsed.map(p => (
                      <BrowseRow key={p.id} problem={p} onReviewed={handleReviewed} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
