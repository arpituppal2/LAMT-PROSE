import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X, ArrowRightLeft, Send, Sparkles, Beaker } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const DIFFICULTY_LABELS = {
    1: 'Concept Check (1/10)',
  2: 'Standard Fair (2/10)',
  3: 'Intermediate (3/10)',
  4: 'Competition Prep (4/10)',
  5: 'Standard (5/10)',
  6: 'Challenging (6/10)',
  7: 'Advanced Tier (7/10)',
  8: 'Elite (8/10)',
  9: 'Tournament Finalist (9/10)',
  10: 'Legendary (10/10)',
};

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
      setMessage('Please select at least one topic to categorize this masterpiece.');
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
        finalLatex += '\n\n' + problemImages.map((img, i) => `![Problem Image ${i+1}](${img.dataUrl})`).join('\n');
      }
      
      if (solutionImages.length > 0) {
        finalSolution += '\n\n' + solutionImages.map((img, i) => `![Solution Image ${i+1}](${img.dataUrl})`).join('\n');
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

      setMessage(`Problem ${response.data.id} published to the pack!`);
      setTimeout(() => navigate('/inventory'), 1500);
    } catch (error) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || 'Connection failed.';
      setMessage(`Draft error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="mb-10 flex items-center gap-4">
          <div className="p-3 bg-ucla-blue rounded-2xl shadow-lg shadow-ucla-blue/20">
            <Beaker className="text-ucla-gold" size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
              Bruin <span className="text-ucla-blue dark:text-ucla-gold not-italic">Blueprint</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Drafting the next generation of math excellence.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT: FORM SIDE */}
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-8 space-y-8">
              
              {/* Problem Text */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ucla-blue dark:text-ucla-gold">
                  <Sparkles size={14} /> Problem Statement
                </label>
                <textarea
                  value={latex}
                  onChange={(e) => setLatex(e.target.value)}
                  rows={8}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl font-mono text-sm focus:ring-4 focus:ring-ucla-blue/10 focus:border-ucla-blue outline-none transition-all dark:text-slate-100"
                  placeholder="Enter problem text. Use $...$ for inline math."
                  required
                />
              </div>

              {/* Image Gallery */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visual Attachments</label>
                <div className="flex flex-wrap gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-28 h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden group border border-slate-200 dark:border-slate-700">
                      <img src={img.dataUrl} alt="upload" className="w-full h-20 object-cover" />
                      <button
                        type="button"
                        onClick={() => toggleImageDestination(idx)}
                        className={`w-full h-12 flex items-center justify-center text-[9px] font-black uppercase transition-colors ${
                          img.destination === 'problem' ? 'bg-ucla-blue text-white' : 'bg-ucla-gold text-ucla-blue'
                        }`}
                      >
                        {img.destination} <ArrowRightLeft size={10} className="ml-1" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="w-28 h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-ucla-blue/5 hover:border-ucla-blue transition-all group">
                    <ImageIcon size={24} className="text-slate-400 group-hover:text-ucla-blue" />
                    <span className="text-[10px] text-slate-400 mt-2 font-black uppercase">Add File</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              {/* Writer Solution */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-ucla-blue dark:text-ucla-gold">Official Solution</label>
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  rows={6}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl font-mono text-sm focus:ring-4 focus:ring-ucla-blue/10 outline-none transition-all dark:text-slate-100"
                  placeholder="Explain the logic..."
                  required
                />
              </div>

              {/* Difficulty & Type Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Difficulty Calibration</label>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-ucla-gold"
                  />
                  <div className="px-4 py-3 bg-ucla-blue/5 dark:bg-ucla-blue/20 rounded-2xl border border-ucla-blue/10">
                    <p className="text-ucla-blue dark:text-ucla-gold font-black text-xs uppercase italic">{DIFFICULTY_LABELS[difficulty]}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Topic Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map(topic => (
                      <button
                        key={topic} type="button"
                        onClick={() => handleTopicToggle(topic)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                          topics.includes(topic)
                            ? 'bg-ucla-blue border-ucla-blue text-white shadow-md shadow-ucla-blue/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-ucla-blue'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Section */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                {message && (
                  <div className={`mb-6 p-4 rounded-2xl text-xs font-bold ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                  </div>
                )}
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-ucla-blue hover:bg-[#1a5a8a] text-white py-4 rounded-2xl transition-all disabled:opacity-50 font-black uppercase tracking-[0.2em] shadow-xl shadow-ucla-blue/20 flex items-center justify-center gap-3"
                >
                  {loading ? 'Processing...' : (
                    <>Submit Problem <Send size={18} /></>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: LIVE PREVIEW SIDE (Sticky) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-1 shadow-2xl overflow-hidden border border-slate-800">
               <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ucla-gold">Live Rendering</span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-ucla-gold/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                  </div>
               </div>
               
               <div className="p-8 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                  <div className="space-y-4">
                    <h3 className="text-ucla-blue font-black text-[10px] uppercase tracking-widest">Problem Statement</h3>
                    <div className="text-slate-200 leading-relaxed text-sm bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 min-h-[120px]">
                      {latex ? <KatexRenderer latex={latex} /> : <span className="text-slate-600 italic">Waiting for input...</span>}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {images.filter(img => img.destination === 'problem').map((img, i) => (
                          <img key={i} src={img.dataUrl} className="rounded-xl border border-slate-700" alt="preview" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-ucla-gold font-black text-[10px] uppercase tracking-widest">Solution Flow</h3>
                    <div className="text-slate-300 leading-relaxed text-sm bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 min-h-[120px]">
                      {solution ? <KatexRenderer latex={solution} /> : <span className="text-slate-600 italic">No solution yet...</span>}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {images.filter(img => img.destination === 'solution').map((img, i) => (
                          <img key={i} src={img.dataUrl} className="rounded-xl border border-slate-700" alt="preview" />
                        ))}
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Final Answer Quick Card */}
            {answer && (
              <div className="bg-gradient-to-r from-ucla-blue to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-ucla-blue/20">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Final Answer Key</p>
                <p className="text-2xl font-black">{answer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WriteProblem;
