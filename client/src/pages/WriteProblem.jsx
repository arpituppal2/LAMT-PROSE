import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X, ArrowRightLeft, Send, FlaskConical } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const WriteProblem = () => {
  const [latex, setLatex] = useState('');
  const [solution, setSolution] = useState('');
  const [answer, setAnswer] = useState('');
  const [notes, setNotes] = useState('');
  const [topics, setTopics] = useState([]);
  const [difficulty, setDifficulty] = useState(5);
  const [examType, setExamType] = useState('Numerical Answer');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

  // Track dirty state via ref to avoid re-render loops; use beforeunload for tab close
  const isDirtyRef = useRef(false);
  useEffect(() => {
    const hasContent = !submitted && !!(latex || solution || answer || notes || topics.length > 0 || images.length > 0);
    isDirtyRef.current = hasContent;
  });

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleTopicToggle = (topic) => {
    setTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, { dataUrl: reader.result, destination: 'problem' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleImageDestination = (index) => {
    setImages(prev => prev.map((img, i) =>
      i === index
        ? { ...img, destination: img.destination === 'problem' ? 'solution' : 'problem' }
        : img
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (topics.length === 0) {
      setMessage('Please select at least one topic.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      let finalLatex = latex;
      let finalSolution = solution;
      const problemImages = images.filter(img => img.destination === 'problem');
      const solutionImages = images.filter(img => img.destination === 'solution');
      if (problemImages.length > 0) {
        finalLatex += '\n\n' + problemImages.map((img, i) => `![Problem Image ${i + 1}](${img.dataUrl})`).join('\n');
      }
      if (solutionImages.length > 0) {
        finalSolution += '\n\n' + solutionImages.map((img, i) => `![Solution Image ${i + 1}](${img.dataUrl})`).join('\n');
      }
      const response = await api.post('/problems', {
        latex: finalLatex,
        solution: finalSolution,
        answer,
        notes,
        topics,
        quality: String(difficulty),
        examType,
      });
      setSubmitted(true);
      isDirtyRef.current = false;
      setMessage(`Problem ${response.data.id} submitted.`);
      setTimeout(() => navigate('/inventory'), 1500);
    } catch (error) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || 'Connection failed.';
      setMessage(`Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition';
  const labelCls = 'block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        <div className="mb-6 flex items-center gap-2.5">
          <FlaskConical size={18} className="text-[#2774AE] dark:text-[#FFD100]" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Write Problem</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: FORM */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className={labelCls}>Problem Statement</label>
                <textarea value={latex} onChange={(e) => setLatex(e.target.value)} rows={8}
                  className={`${inputCls} font-mono resize-none`}
                  placeholder="Enter problem text. Use $...$ for inline math." required />
              </div>

              <div>
                <label className={labelCls}>Attachments</label>
                <div className="flex flex-wrap gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-28 bg-gray-50 dark:bg-white/5 rounded-lg overflow-hidden group border border-gray-200 dark:border-white/10">
                      <img src={img.dataUrl} alt="upload" className="w-full h-16 object-cover" />
                      <button type="button" onClick={() => toggleImageDestination(idx)}
                        className={`w-full h-12 flex items-center justify-center text-[9px] font-semibold uppercase transition-colors gap-1 ${
                          img.destination === 'problem' ? 'bg-[#2774AE] text-white' : 'bg-[#FFD100] text-gray-900'
                        }`}>
                        {img.destination} <ArrowRightLeft size={9} />
                      </button>
                      <button type="button" onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-28 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-[#2774AE]/5 hover:border-[#2774AE] transition-all group">
                    <ImageIcon size={18} className="text-gray-400 group-hover:text-[#2774AE]" />
                    <span className="text-[10px] text-gray-400 mt-1.5 font-semibold uppercase">Add File</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <div>
                <label className={labelCls}>Solution</label>
                <textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={6}
                  className={`${inputCls} font-mono resize-none`}
                  placeholder="Explain the solution step by step..." required />
              </div>

              <div>
                <label className={labelCls}>Answer</label>
                <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. 42 or 1/2" className={`${inputCls} font-mono`} required />
              </div>

              <div>
                <label className={labelCls}>Author Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className={`${inputCls} font-mono resize-none`}
                  placeholder="Notes for reviewers — inspiration, difficulty rationale, known issues..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <input type="range" min="1" max="10" step="1" value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-[#2774AE] mb-2" />
                  <div className="px-3 py-2 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Level</span>
                    <span className="text-sm font-bold text-[#2774AE] dark:text-[#FFD100] tabular-nums">{difficulty}/10</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map(topic => (
                      <button key={topic} type="button" onClick={() => handleTopicToggle(topic)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          topics.includes(topic)
                            ? 'bg-[#2774AE] border-[#2774AE] text-white'
                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#2774AE]'
                        }`}>
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Exam Type</label>
                <select value={examType} onChange={(e) => setExamType(e.target.value)} className={inputCls}>
                  <option>Numerical Answer</option>
                  <option>Multiple Choice</option>
                  <option>Free Response</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-white/8">
                {message && (
                  <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    message.startsWith('Problem')
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>{message}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-[#2774AE] hover:bg-[#005587] text-white py-2.5 rounded-lg transition-all disabled:opacity-50 font-semibold text-sm flex items-center justify-center gap-2">
                  {loading ? 'Submitting...' : (<>Submit Problem <Send size={14} /></>)}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: LIVE PREVIEW */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8">
            <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-white/8">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Live Preview</span>
              </div>
              <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Problem</p>
                  <div className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-gray-100 dark:border-white/8 min-h-[100px]">
                    {latex
                      ? <KatexRenderer latex={latex} />
                      : <span className="text-gray-400 dark:text-gray-600 italic text-sm">Waiting for input...</span>}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {images.filter(img => img.destination === 'problem').map((img, i) => (
                        <img key={i} src={img.dataUrl} className="rounded-lg border border-gray-200 dark:border-white/10" alt="preview" />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Solution</p>
                  <div className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-gray-100 dark:border-white/8 min-h-[80px]">
                    {solution
                      ? <KatexRenderer latex={solution} />
                      : <span className="text-gray-400 dark:text-gray-600 italic text-sm">No solution yet...</span>}
                  </div>
                </div>
              </div>
            </div>
            {answer && (
              <div className="bg-[#2774AE] dark:bg-[#001628] rounded-xl p-4 text-white border border-[#2774AE]/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">Answer</p>
                <p className="text-xl font-bold font-mono">{answer}</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default WriteProblem;
