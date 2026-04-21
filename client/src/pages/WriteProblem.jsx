import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon, X, ArrowRightLeft, Send,
  FlaskConical, CheckCircle, AlertCircle,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const TOPIC_OPTIONS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-slate-200 dark:border-white/10 ' +
  'bg-white dark:bg-white/5 text-slate-900 dark:text-slate-100 text-sm ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--ucla-blue)]/25 dark:focus:ring-[var(--ucla-gold)]/20 transition';

const labelCls =
  'block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5';

// ─── Preview panel section ────────────────────────────────────────────────────
const PreviewSection = ({ label, content, placeholder, minH = 'min-h-[80px]' }) => (
  <div>
    <p className={labelCls}>{label}</p>
    <div
      className={`${minH} rounded-[var(--radius-md)] border border-slate-100 dark:border-white/8 bg-slate-50 dark:bg-white/3 p-4 text-sm text-slate-800 dark:text-slate-200 leading-relaxed`}
    >
      {content
        ? <KatexRenderer latex={content} />
        : <span className="text-slate-300 dark:text-slate-600 italic">{placeholder}</span>
      }
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const WriteProblem = () => {
  const [latex, setLatex]       = useState('');
  const [solution, setSolution] = useState('');
  const [answer, setAnswer]     = useState('');
  const [notes, setNotes]       = useState('');
  const [topics, setTopics]     = useState([]);
  const [difficulty, setDifficulty] = useState(5);
  const [images, setImages]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState({ text: '', type: '' }); // type: 'success' | 'error'
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = !submitted && !!(latex || solution || answer || notes || topics.length || images.length);
  });
  useEffect(() => {
    const handler = (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handleTopicToggle = (topic) =>
    setTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);

  const handleImageUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setImages(prev => [...prev, { dataUrl: reader.result, destination: 'problem' }]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const toggleImageDestination = (idx) =>
    setImages(prev => prev.map((img, i) =>
      i === idx
        ? { ...img, destination: img.destination === 'problem' ? 'solution' : 'problem' }
        : img
    ));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (topics.length === 0) {
      setMessage({ text: 'Please select at least one topic.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      let finalLatex = latex;
      let finalSolution = solution;
      const problemImgs = images.filter(img => img.destination === 'problem');
      const solutionImgs = images.filter(img => img.destination === 'solution');
      if (problemImgs.length)
        finalLatex += '\n\n' + problemImgs.map((img, i) => `![Problem Image ${i + 1}](${img.dataUrl})`).join('\n');
      if (solutionImgs.length)
        finalSolution += '\n\n' + solutionImgs.map((img, i) => `![Solution Image ${i + 1}](${img.dataUrl})`).join('\n');

      const response = await api.post('/problems', {
        latex: finalLatex,
        solution: finalSolution,
        answer,
        notes,
        topics,
        quality: String(difficulty),
        examType: 'Numerical Answer',
      });
      setSubmitted(true);
      isDirtyRef.current = false;
      setMessage({ text: `Problem ${response.data.id} submitted successfully.`, type: 'success' });
      setTimeout(() => navigate('/inventory'), 1800);
    } catch (error) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || 'Connection failed.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Difficulty label helper
  const diffLabel = (d) => {
    if (d <= 2) return 'Very Easy';
    if (d <= 4) return 'Easy';
    if (d <= 6) return 'Medium';
    if (d <= 8) return 'Hard';
    return 'Very Hard';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-5 flex items-center gap-2">
          <FlaskConical size={17} className="text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] flex-shrink-0" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">Write Problem</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── Left: form ──────────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Problem Statement */}
              <div>
                <label className={labelCls}>Problem Statement</label>
                <textarea
                  value={latex}
                  onChange={(e) => setLatex(e.target.value)}
                  rows={8}
                  className={`${inputCls} font-mono resize-y`}
                  placeholder="Enter problem text. Use $...$ for inline math."
                  required
                />
              </div>

              {/* Attachments */}
              <div>
                <label className={labelCls}>Attachments</label>
                <div className="flex flex-wrap gap-2.5">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-24 h-28 rounded-[var(--radius-md)] overflow-hidden border border-slate-200 dark:border-white/10 group bg-slate-50 dark:bg-white/4"
                    >
                      <img src={img.dataUrl} alt="upload" className="w-full h-16 object-cover" />
                      {/* Destination toggle */}
                      <button
                        type="button"
                        onClick={() => toggleImageDestination(idx)}
                        className={[
                          'w-full h-12 flex items-center justify-center gap-1 text-[9px] font-bold uppercase transition-colors',
                          img.destination === 'problem'
                            ? 'bg-[var(--ucla-blue)] text-white'
                            : 'bg-[var(--ucla-gold)] text-slate-900',
                        ].join(' ')}
                        title={`Currently: ${img.destination} — click to switch`}
                      >
                        {img.destination} <ArrowRightLeft size={9} />
                      </button>
                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {/* Upload button */}
                  <label className="w-24 h-28 flex flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-slate-200 dark:border-white/10 cursor-pointer hover:border-[var(--ucla-blue)] dark:hover:border-[var(--ucla-gold)] hover:bg-[var(--ucla-blue)]/3 dark:hover:bg-[var(--ucla-gold)]/3 transition-all group">
                    <ImageIcon size={16} className="text-slate-400 group-hover:text-[var(--ucla-blue)] dark:group-hover:text-[var(--ucla-gold)] transition-colors" />
                    <span className="text-[10px] text-slate-400 mt-1.5 font-semibold uppercase">Add File</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              {/* Solution */}
              <div>
                <label className={labelCls}>Solution</label>
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  rows={6}
                  className={`${inputCls} font-mono resize-y`}
                  placeholder="Explain the solution step by step..."
                  required
                />
              </div>

              {/* Answer */}
              <div>
                <label className={labelCls}>Answer</label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. 42 or 1/2"
                  className={`${inputCls} font-mono`}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>
                  Author Notes{' '}
                  <span className="normal-case font-normal text-slate-400">— optional</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={`${inputCls} font-mono resize-y`}
                  placeholder="Notes for reviewers — inspiration, difficulty rationale, known issues..."
                />
              </div>

              {/* Difficulty + Topics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Difficulty */}
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <div className="rounded-[var(--radius-md)] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold tabular-nums text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)]">{difficulty}/10</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{diffLabel(difficulty)}</span>
                    </div>
                    <input
                      type="range" min="1" max="10" step="1"
                      value={difficulty}
                      onChange={(e) => setDifficulty(Number(e.target.value))}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer accent-[#2774AE] dark:accent-[#FFD100]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-300 dark:text-slate-700 font-medium">
                      <span>1</span><span>5</span><span>10</span>
                    </div>
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <label className={labelCls}>Topics</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TOPIC_OPTIONS.map(topic => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleTopicToggle(topic)}
                        className={[
                          'px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold border transition-all',
                          topics.includes(topic)
                            ? 'bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] border-[var(--ucla-blue)] dark:border-[var(--ucla-gold)] text-white dark:text-slate-900'
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-[var(--ucla-blue)] dark:hover:border-[var(--ucla-gold)]',
                        ].join(' ')}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                  {topics.length === 0 && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Select at least one topic.</p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/8 space-y-3">
                {message.text && (
                  <div className={[
                    'flex items-start gap-2.5 px-4 py-3 rounded-[var(--radius-md)] text-sm',
                    message.type === 'success'
                      ? 'bg-[var(--badge-endorsed-bg)] border border-[var(--badge-endorsed-border)] text-[var(--badge-endorsed-text)]'
                      : 'bg-[var(--badge-needs-review-bg)] border border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)]',
                  ].join(' ')}>
                    {message.type === 'success'
                      ? <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                      : <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    }
                    <span>{message.text}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] text-white dark:text-slate-900 py-2.5 rounded-[var(--radius-md)] font-semibold text-sm hover:bg-[var(--ucla-blue-hover)] dark:hover:bg-[var(--ucla-gold-hover)] disabled:opacity-50 transition"
                >
                  {loading ? 'Submitting…' : (<><Send size={13} /> Submit Problem</>)}
                </button>
              </div>

            </form>
          </div>

          {/* ── Right: live preview ──────────────────────────────────────── */}
          <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-6">

            {/* Preview card */}
            <div className="rounded-[var(--radius-lg)] border border-slate-200 dark:border-white/8 bg-white dark:bg-[var(--app-surface)] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-white/8 flex items-center justify-between">
                <span className={labelCls} style={{ marginBottom: 0 }}>Live Preview</span>
                {answer && (
                  <span className="text-xs font-mono font-bold text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] tabular-nums">
                    ans: {answer}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>

                <PreviewSection
                  label="Problem"
                  content={latex}
                  placeholder="Waiting for input…"
                  minH="min-h-[100px]"
                />

                {/* Problem images preview */}
                {images.filter(img => img.destination === 'problem').length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {images.filter(img => img.destination === 'problem').map((img, i) => (
                      <img key={i} src={img.dataUrl} className="rounded-[var(--radius-md)] border border-slate-200 dark:border-white/10" alt="preview" />
                    ))}
                  </div>
                )}

                <PreviewSection
                  label="Solution"
                  content={solution}
                  placeholder="No solution yet…"
                />

                {/* Difficulty + topics summary */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--ucla-blue)]/8 dark:bg-[var(--ucla-gold)]/8 text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] border border-[var(--ucla-blue)]/15 dark:border-[var(--ucla-gold)]/15">
                    Difficulty {difficulty}/10
                  </span>
                  {topics.map(t => (
                    <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WriteProblem;
