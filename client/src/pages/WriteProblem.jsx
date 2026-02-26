import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';
const DIFFICULTY_LABELS = {
  1: 'Level 1 — Simple / Beginner',
  2: 'Level 2 — Simple / Beginner',
  3: 'Level 3 — AMC 8 / Easy AMC 10',
  4: 'Level 4 — AMC 10 (Problems 1–10)',
  5: 'Level 5 — AMC 10 (Problems 11–20)',
  6: 'Level 6 — AMC 10 (Problems 21–25) / AMC 12 (Problems 1–10)',
  7: 'Level 7 — AMC 12 (Problems 11–18)',
  8: 'Level 8 — AMC 12 (Problems 19–22)',
  9: 'Level 9 — AMC 12 (Problems 23–25)',
  10: 'Level 10 — AIME Level',
};
const WriteProblem = () => {
  const [latex, setLatex] = useState('');
  const [solution, setSolution] = useState('');
  const [answer, setAnswer] = useState('');
  const [notes, setNotes] = useState('');
  const [topics, setTopics] = useState([]);
  const [difficulty, setDifficulty] = useState(5);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const topicOptions = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];
  const handleTopicToggle = (topic) => {
    setTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (topics.length === 0) {
      setMessage('Please select at least one topic');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      let finalLatex = latex;
      if (images.length > 0) {
        finalLatex += '

' + images.map((img, i) => `![Image ${i+1}](${img})`).join('
');
      }
      const response = await api.post('/problems', {
        latex: finalLatex,
        solution,
        answer,
        notes,
        topics,
        quality: String(difficulty),
      });
      setMessage(`Problem ${response.data.id} created successfully!`);
      setTimeout(() => {
        navigate('/inventory');
      }, 1500);
    } catch (error) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || error.message || 'Unknown error';
      setMessage(`Failed to create problem: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#2774AE' }}>Write New Problem</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Problem Editor</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Problem Statement (LaTeX)
                </label>
                <textarea
                  value={latex}
                  onChange={(e) => setLatex(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Enter LaTeX code for the problem..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachments / Images
                </label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 border rounded-lg overflow-hidden group">
                      <img src={img} alt="upload preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                    <ImageIcon size={24} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Writer's Solution (LaTeX) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Enter your full solution in LaTeX..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Answer
                </label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Numerical answer or simple string..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes / Comments (Private)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Add any notes, source info, or comments (visible only to you and admins)..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topics
                </label>
                <div className="flex flex-wrap gap-2">
                  {topicOptions.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleTopicToggle(topic)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        topics.includes(topic)
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={topics.includes(topic) ? { backgroundColor: '#2774AE' } : {}}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty: <span className="font-bold" style={{ color: '#2774AE' }}>{difficulty}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
                </div>
                <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  {DIFFICULTY_LABELS[difficulty]}
                </div>
              </div>
              {message && (
                <div className={`px-4 py-3 rounded text-sm ${
                  message.includes('successfully')
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-2 rounded-lg transition-colors disabled:opacity-50 font-bold"
                style={{ backgroundColor: '#2774AE' }}
              >
                {loading ? 'Creating...' : 'Submit Problem'}
              </button>
            </form>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Problem Preview</h2>
              <div className="border border-gray-200 rounded-lg p-4 min-h-[200px]">
                {latex ? (
                  <KatexRenderer latex={latex} displayMode />
                ) : (
                  <p className="text-gray-400 text-center">Problem preview will appear here...</p>
                )}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {images.map((img, i) => (
                      <img key={i} src={img} alt="attachment" className="rounded border w-full h-auto" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Solution Preview</h2>
              <div className="border border-gray-200 rounded-lg p-4 min-h-[200px]">
                {solution ? (
                  <KatexRenderer latex={solution} displayMode />
                ) : (
                  <p className="text-gray-400 text-center">Solution preview will appear here...</p>
                )}
              </div>
            </div>
            {answer && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Answer Preview</h2>
                <div className="text-2xl font-mono text-ucla-blue bg-blue-50 p-4 rounded-lg text-center">
                  {answer}
                </div>
              </div>
            )}
            {notes && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Notes Preview</h2>
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 min-h-[80px] text-sm text-gray-700 whitespace-pre-wrap">
                  {notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default WriteProblem;
