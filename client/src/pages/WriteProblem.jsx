import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X, ArrowRightLeft, Send, CheckCircle, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const TOPIC_OPTIONS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

/* ── Preview block ──────────────────────────────────────────── */
const PreviewSection = ({ label, content, placeholder, minH = 'min-h-[80px]' }) => (
  <div>
    <p className="section-label">{label}</p>
    <div className={`${minH} rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm leading-relaxed mt-2`}>
      {content
        ? <KatexRenderer latex={content} />
        : <span className="italic text-[var(--color-text-faint)]">{placeholder}</span>}
    </div>
  </div>
);

/* ── Full preview card ──────────────────────────────────────── */
const FullPreview = ({ latex, solution, answer, notes, difficulty, topics, images }) => (
  <div className="surface-card overflow-hidden">
    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
      <span className="section-label" style={{ marginBottom: 0 }}>Live Preview</span>
    </div>
    <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      <PreviewSection label="Problem" content={latex} placeholder="Waiting for input…" minH="min-h-[100px]" />
      {images.filter(img => img.destination === 'problem').length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.filter(img => img.destination === 'problem').map((img, i) => (
            <img key={i} src={img.dataUrl} className="rounded-sm border border-[var(--color-border)]" alt="preview" />
          ))}
        </div>
      )}
      <PreviewSection label="Solution" content={solution} placeholder="No solution yet…" />
      {answer && (
        <div>
          <p className="section-label">Answer</p>
          <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm mt-2">
            <KatexRenderer latex={answer} />
          </div>
        </div>
      )}
      {notes && (
        <div>
          <p className="section-label">Author Notes</p>
          <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm mt-2 italic text-[var(--color-text-muted)]">
            <KatexRenderer latex={notes} />
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30">
          Difficulty {difficulty}/10
        </span>
        {topics.map(t => (
          <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
            {t}
          </span>
        ))}
      </div>
    </div>
  </div>
);

/* ── Difficulty Slider ──────────────────────────────────────── */
const DifficultySlider = ({ value, onChange }) => {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div className="surface-card p-4 space-y-3 mt-2">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums text-[var(--color-accent)]">{value}</span>
        <span className="text-sm text-[var(--color-text-faint)]">/10</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-[6px] rounded-full bg-[var(--color-border)]" />
        <div
          className="absolute left-0 h-[6px] rounded-full bg-[var(--color-accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min="1" max="10" step="1"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ margin: 0 }}
        />
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-[var(--color-accent)] bg-[var(--color-bg)] shadow transition-all pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-[10px] font-semibold w-5 text-center transition-colors ${
              n === value
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Main component ─────────────────────────────────────────── */
const WriteProblem = () => {
  const [step, setStep]             = useState(1);
  const [latex, setLatex]           = useState('');
  const [solution, setSolution]     = useState('');
  const [answer, setAnswer]         = useState('');
  const [notes, setNotes]           = useState('');
  const [topics, setTopics]         = useState([]);
  const [difficulty, setDifficulty] = useState(5);
  const [images, setImages]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState({ text: '', type: '' });
  const [submitted, setSubmitted]   = useState(false);
  const navigate = useNavigate();

  const isDirty = !submitted && !!(latex || solution || answer || notes || topics.length || images.length);

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

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

  const removeImage     = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));
  const toggleImageDest = (idx) =>
    setImages(prev =>
      prev.map((img, i) =>
        i === idx ? { ...img, destination: img.destination === 'problem' ? 'solution' : 'problem' } : img,
      ),
    );

  const safeNavigate = (to) => {
    if (!isDirty || window.confirm('You have unsaved changes. Leave anyway?')) {
      navigate(to);
    }
  };

  const goToStep2 = (e) => {
    e.preventDefault();
    if (!latex.trim() || !solution.trim() || !answer.trim()) {
      setMessage({ text: 'Please fill in Problem, Solution, and Answer before continuing.', type: 'error' });
      return;
    }
    setMessage({ text: '', type: '' });
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep1 = () => {
    setMessage({ text: '', type: '' });
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (topics.length === 0) {
      setMessage({ text: 'Please select at least one topic.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      let finalLatex    = latex;
      let finalSolution = solution;
      const problemImgs  = images.filter(img => img.destination === 'problem');
      const solutionImgs = images.filter(img => img.destination === 'solution');
      if (problemImgs.length)
        finalLatex += '\\n\\n' + problemImgs.map((img, i) => `![Problem Image ${i + 1}](${img.dataUrl})`).join('\\n');
      if (solutionImgs.length)
        finalSolution += '\\n\\n' + solutionImgs.map((img, i) => `![Solution Image ${i + 1}](${img.dataUrl})`).join('\\n');

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
      setMessage({ text: `Problem ${response.data.id} submitted successfully.`, type: 'success' });
      setTimeout(() => navigate('/inventory'), 1800);
    } catch (error) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || 'Connection failed.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  /* ── Step indicator ─────────────────────────────────────── */
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-5">
      {[1, 2].map(n => (
        <div key={n} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => n < step && goToStep1()}
            className={[
              'w-6 h-6 rounded-sm text-xs font-bold flex items-center justify-center border transition-all',
              n === step
                ? 'bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] border-[var(--ucla-blue)] dark:border-[var(--ucla-gold)] text-white dark:text-black'
                : n < step
                  ? 'border-[var(--color-border)] text-[var(--color-text-muted)] cursor-pointer hover:border-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-faint)] cursor-default opacity-50',
            ].join(' ')}
          >
            {n}
          </button>
          <span className={`text-xs font-medium ${n === step ? 'text-[var(--color-text)]' : 'text-[var(--color-text-faint)]'}`}>
            {n === 1 ? 'Write' : 'Review & Submit'}
          </span>
          {n < 2 && <span className="text-[var(--color-text-faint)] text-xs mx-1">→</span>}
        </div>
      ))}
    </div>
  );

  /* ── Message banner ─────────────────────────────────────── */
  const MessageBanner = () => message.text ? (
    <div className={[
      'flex items-start gap-2.5 px-4 py-3 rounded-sm text-sm border',
      message.type === 'success'
        ? 'bg-[var(--badge-endorsed-bg)] border-[var(--badge-endorsed-border)] text-[var(--badge-endorsed-text)]'
        : 'bg-[var(--badge-needs-review-bg)] border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)]',
    ].join(' ')}>
      {message.type === 'success'
        ? <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
        : <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />}
      <span>{message.text}</span>
    </div>
  ) : null;

  /* ════════════════════════════════════════════════════════════
     STEP 1 — Write
  ════════════════════════════════════════════════════════════ */
  if (step === 1) return (
    <Layout>
      <div className="mx-auto max-w-7xl">
        <header className="mb-5">
          <span className="gold-rule mb-3" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Write Problem
          </h1>
        </header>

        <StepIndicator />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left: inputs */}
          <div className="lg:col-span-7">
            <form onSubmit={goToStep2} className="space-y-4">
              <div>
                <label className="section-label">Problem Statement</label>
                <textarea
                  value={latex}
                  onChange={e => setLatex(e.target.value)}
                  rows={8}
                  className="input-base w-full font-mono resize-y mt-2"
                  placeholder="Enter problem text. Use $...$ for inline math."
                  required
                />
              </div>
              <div>
                <label className="section-label">Solution</label>
                <textarea
                  value={solution}
                  onChange={e => setSolution(e.target.value)}
                  rows={6}
                  className="input-base w-full font-mono resize-y mt-2"
                  placeholder="Explain the solution step by step…"
                  required
                />
              </div>
              <div>
                <label className="section-label">Answer</label>
                <input
                  type="text"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="e.g. 42 or \frac{1}{2}"
                  className="input-base w-full font-mono mt-2"
                  required
                />
              </div>
              <MessageBanner />
              <div className="pt-3 border-t border-[var(--color-border)]">
                <button type="submit" className="btn-filled w-full flex items-center justify-center gap-2 py-2.5 text-sm">
                  Go to Next Step <ArrowRight size={13} />
                </button>
              </div>
            </form>
          </div>

          {/* Right: live preview + attachments */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
            <FullPreview latex={latex} solution={solution} answer={answer} notes={notes} difficulty={difficulty} topics={topics} images={images} />
            <div className="surface-card p-4 space-y-3">
              <p className="section-label" style={{ marginBottom: 0 }}>Attachments</p>
              <div className="flex flex-wrap gap-2.5">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-28 rounded-sm overflow-hidden border border-[var(--color-border)] group bg-[var(--color-surface)]">
                    <img src={img.dataUrl} alt="upload" className="w-full h-16 object-cover" />
                    <button
                      type="button"
                      onClick={() => toggleImageDest(idx)}
                      className={[
                        'w-full h-12 flex items-center justify-center gap-1 text-[9px] font-bold uppercase transition-colors',
                        img.destination === 'problem' ? 'bg-[var(--ucla-blue)] text-white' : 'bg-[var(--ucla-gold)] text-black',
                      ].join(' ')}
                    >
                      {img.destination} <ArrowRightLeft size={9} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="w-24 h-28 flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-[var(--color-border)] cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-all group">
                  <ImageIcon size={16} className="text-[var(--color-text-faint)] group-hover:text-[var(--color-accent)] transition-colors" />
                  <span className="text-[10px] text-[var(--color-text-faint)] mt-1.5 font-semibold uppercase">Add File</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );

  /* ════════════════════════════════════════════════════════════
     STEP 2 — Review & Submit
  ════════════════════════════════════════════════════════════ */
  return (
    <Layout>
      <div className="mx-auto max-w-7xl">
        <header className="mb-5">
          <span className="gold-rule mb-3" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Write Problem
          </h1>
        </header>

        <StepIndicator />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left: metadata form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Author Notes */}
              <div>
                <label className="section-label">
                  Author Notes{' '}
                  <span className="normal-case font-normal text-[var(--color-text-faint)]">— optional</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="input-base w-full font-mono resize-y mt-2"
                  placeholder="Notes for reviewers — inspiration, difficulty rationale, known issues… supports $math$"
                />
              </div>

              {/* Difficulty slider */}
              <div>
                <label className="section-label">Difficulty</label>
                <DifficultySlider value={difficulty} onChange={setDifficulty} />
              </div>

              {/* Topics */}
              <div>
                <label className="section-label">Topics</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TOPIC_OPTIONS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleTopicToggle(topic)}
                      className={[
                        'px-3 py-1.5 text-xs font-semibold transition-all rounded-none',
                        topics.includes(topic)
                          ? 'border-2 border-[var(--ucla-blue)] dark:border-[var(--ucla-gold)] bg-[var(--ucla-blue)] dark:bg-[var(--ucla-gold)] text-white dark:text-black'
                          : 'border-2 border-[var(--ucla-blue)] dark:border-[var(--ucla-gold)] bg-transparent text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] hover:bg-[var(--ucla-blue)]/10 dark:hover:bg-[var(--ucla-gold)]/10',
                      ].join(' ')}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                {topics.length === 0 && (
                  <p className="text-[11px] text-[var(--color-text-faint)] mt-2">Select at least one topic.</p>
                )}
              </div>

              {/* Back + Submit */}
              <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
                <MessageBanner />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={goToStep1}
                    className="btn-ghost flex items-center justify-center gap-2 py-2.5 text-sm px-4"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-filled flex-1 flex items-center justify-center gap-2 py-2.5 text-sm"
                  >
                    {loading ? 'Submitting…' : <><Send size={13} /> Submit Problem</>}
                  </button>
                </div>
              </div>

            </form>
          </div>

          {/* Right: full live preview */}
          <div className="lg:col-span-5 lg:sticky lg:top-6">
            <FullPreview latex={latex} solution={solution} answer={answer} notes={notes} difficulty={difficulty} topics={topics} images={images} />
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default WriteProblem;
