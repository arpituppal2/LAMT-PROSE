import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X, ArrowRightLeft, Send, FlaskConical } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const TOPICS = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Very Hard'];
const SUBTOPICS = {
  Algebra: ['Polynomials', 'Sequences & Series', 'Inequalities', 'Functions', 'Complex Numbers', 'Other'],
  Geometry: ['Euclidean', 'Coordinate', 'Trigonometry', 'Transformations', 'Other'],
  Combinatorics: ['Counting', 'Graph Theory', 'Probability', 'Games', 'Other'],
  'Number Theory': ['Divisibility', 'Modular Arithmetic', 'Primes', 'Diophantine Equations', 'Other'],
};

export default function WriteProblem() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    statement: '',
    answer: '',
    solution: '',
    topic: 'Algebra',
    subtopic: '',
    difficulty: 'Medium',
    notes: '',
  });
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImage = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, { file, url: ev.target.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.statement.trim()) { setError('Statement is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach(img => fd.append('images', img.file));
      await api.post('/problems', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit problem.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <Send size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Problem submitted!</h2>
          <p className="text-sm text-gray-500">Redirecting to dashboard…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full px-[5%] py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Write a Problem</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Problems start as Ideas and enter the review queue.</p>
          </div>
          <button
            type="button"
            onClick={() => setPreview(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 hover:border-[#2774AE]/40 transition-colors"
          >
            <ArrowRightLeft size={14} />
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-5">
              {/* Statement */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Problem Statement <span className="text-red-400">*</span>
                </label>
                {preview ? (
                  <div className="min-h-[120px] text-sm text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none">
                    <KatexRenderer content={form.statement || '_No statement yet_'} />
                  </div>
                ) : (
                  <textarea
                    value={form.statement}
                    onChange={e => set('statement', e.target.value)}
                    rows={6}
                    placeholder="Write the problem statement. Supports LaTeX: $x^2 + y^2 = r^2$"
                    className="w-full text-sm bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder:text-gray-400"
                  />
                )}
              </div>

              {/* Answer */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Answer</label>
                {preview ? (
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <KatexRenderer content={form.answer || '_No answer yet_'} />
                  </div>
                ) : (
                  <input
                    value={form.answer}
                    onChange={e => set('answer', e.target.value)}
                    placeholder="Final answer (supports LaTeX)"
                    className="w-full text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                  />
                )}
              </div>

              {/* Solution */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Solution</label>
                {preview ? (
                  <div className="min-h-[80px] text-sm text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none">
                    <KatexRenderer content={form.solution || '_No solution yet_'} />
                  </div>
                ) : (
                  <textarea
                    value={form.solution}
                    onChange={e => set('solution', e.target.value)}
                    rows={5}
                    placeholder="Full solution (supports LaTeX)"
                    className="w-full text-sm bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder:text-gray-400"
                  />
                )}
              </div>

              {/* Notes */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Notes for reviewers (not shown publicly)"
                  className="w-full text-sm bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Meta */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Classification</h2>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Topic</label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { set('topic', t); set('subtopic', ''); }}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          form.topic === t
                            ? 'bg-[#2774AE] text-white'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {form.topic && SUBTOPICS[form.topic] && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Subtopic</label>
                    <select
                      value={form.subtopic}
                      onChange={e => set('subtopic', e.target.value)}
                      className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 dark:text-white"
                    >
                      <option value="">Select subtopic…</option>
                      {SUBTOPICS[form.topic].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Difficulty</label>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => set('difficulty', d)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          form.difficulty === d
                            ? 'bg-[#2774AE] text-white'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Attachments</h2>
                <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10 rounded-lg cursor-pointer hover:border-[#2774AE]/40 transition-colors">
                  <ImageIcon size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Attach images</span>
                  <input type="file" accept="image/*" multiple onChange={handleImage} className="hidden" />
                </label>
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.url} alt={img.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-white/10" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Test / Submit */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Submit</h2>
                {error && (
                  <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreview(v => !v)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <FlaskConical size={14} />
                    {preview ? 'Back to Edit' : 'Preview'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#2774AE] text-white text-sm font-semibold rounded-lg hover:bg-[#1a5f8e] transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Send size={14} /> Submit</>  
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
