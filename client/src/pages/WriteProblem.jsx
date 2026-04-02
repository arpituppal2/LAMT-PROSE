import { useState } from 'react';
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
  const navigate = useNavigate();

  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

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

      setMessage(`Problem ${response.data.id} submitted.`);
      setTimeout(() => navigate('/inventory'), 1500);
    } catch (error) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || 'Connection failed.';
      setMessage(`Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <FlaskConical size={22} className="text-ucla-blue dark:text-ucla-gold" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Write Problem
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT: FORM */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Problem Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Problem Statement
                </label>
                <textarea
                  value={latex}
                  onChange={(e) => setLatex(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all text-slate-900 dark:text-slate-100 shadow-sm"
                  placeholder="Enter problem text. Use $...$ for inline math."
                  required
                />
              </div>

              {/* Image Gallery */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Attachments</label>
                <div className="flex flex-wrap gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-28 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden group border border-slate-200 dark:border-slate-700">
                      <img src={img.dataUrl} alt="upload" className="w-full h-16 object-cover" />
                      <button
                        type="button"
                        onClick={() => toggleImageDestination(idx)}
                        className={`w-full h-12 flex items-center justify-center text-[9px] font-semibold uppercase transition-colors gap-1 ${
                          img.destination === 'problem' ? 'bg-ucla-blue text-white' : 'bg-ucla-gold text-slate-900'
                        }`}
                      >
                        {img.destination} <ArrowRightLeft size={9} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-ucla-blue/5 hover:border-ucla-blue transition-all group">
                    <ImageIcon size={20} className="text-slate-400 group-hover:text-ucla-blue" />
                    <span className="text-[10px] text-slate-400 mt-1.5 font-semibold uppercase">Add File</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              {/* Solution */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Solution</label>
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none transition-all text-slate-900 dark:text-slate-100 shadow-sm"
                  placeholder="Explain the solution..."
                  required
                />
              </div>

              {/* Answer */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Answer</label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. 42 or 1/2"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-ucla-blue/20 focus:border-ucla-blue outline-none text-slate-900 dark:text-white shadow-sm"
                  required
                />
              </div>

              {/* Difficulty & Topics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Difficulty</label>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-ucla-blue"
                  />
                  <div className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Level</span>
                    <span className="text-sm font-bold text-ucla-blue dark:text-ucla-gold tabular-nums">{difficulty}/10</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map(topic => (
                      <button
                        key={topic} type="button"
                        onClick={() => handleTopicToggle(topic)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          topics.includes(topic)
                            ? 'bg-ucla-blue border-ucla-blue text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-ucla-blue'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                {message && (
                  <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    message.includes('submitted') || message.includes('Problem')
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {message}
                  </div>
                )}
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-ucla-blue hover:bg-[#1a5a8a] text-white py-3 rounded-xl transition-all disabled:opacity-50 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {loading ? 'Submitting...' : (<>Submit Problem <Send size={15} /></>)}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: LIVE PREVIEW */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Preview</span>
              </div>
              <div className="p-6 space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto">

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Problem</h3>
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[100px]">
                    {latex
                      ? <KatexRenderer latex={latex} />
                      : <span className="text-slate-400 dark:text-slate-600 italic text-sm">Waiting for input...</span>}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {images.filter(img => img.destination === 'problem').map((img, i) => (
                        <img key={i} src={img.dataUrl} className="rounded-lg border border-slate-200 dark:border-slate-700" alt="preview" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Solution</h3>
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[80px]">
                    {solution
                      ? <KatexRenderer latex={solution} />
                      : <span className="text-slate-400 dark:text-slate-600 italic text-sm">No solution yet...</span>}
                  </div>
                </div>

              </div>
            </div>

            {answer && (
              <div className="bg-ucla-blue rounded-xl p-4 text-white">
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
