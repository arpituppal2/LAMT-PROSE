import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X, ArrowRightLeft } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const DIFFICULTY_LABELS = {
  1: 'Problem 1',
  2: 'Problem 2',
  3: 'Problem 3',
  4: 'Problem 4',
  5: 'Problem 5',
  6: 'Problem 6',
  7: 'Problem 7',
  8: 'Problem 8',
  9: 'Problem 9',
  10: 'Problem 10',
};

const WriteProblem = () => {
  const [latex, setLatex] = useState('');
  const [solution, setSolution] = useState('');
  const [answer, setAnswer] = useState('');
  const [notes, setNotes] = useState('');
  const [topics, setTopics] = useState([]);
  const [difficulty, setDifficulty] = useState(5);
  const [examType, setExamType] = useState('Numerical Answer');
  // Images are now objects: { dataUrl: string, destination: 'problem' | 'solution' }
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
        // Default new images to the problem statement
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
      setMessage('Please select at least one topic');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      let finalLatex = latex;
      let finalSolution = solution;

      // Separate images by destination
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Write New Problem</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Problem Editor</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Problem Statement <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={latex}
                  onChange={(e) => setLatex(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Enter problem text. Use $...$ for inline math, $$...$$ for display math."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachments / Images
                </label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-28 border border-gray-200 rounded-lg overflow-hidden group flex flex-col shadow-sm">
                      <div className="h-20 w-full overflow-hidden bg-gray-50">
                        <img src={img.dataUrl} alt="upload preview" className="w-full h-full object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleImageDestination(idx)}
                        className={`flex-1 flex items-center justify-center text-[10px] font-bold uppercase tracking-wide transition-colors ${
                          img.destination === 'problem' 
                            ? 'bg-blue-100 text-ucla-blue hover:bg-blue-200' 
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                        title="Click to move image"
                      >
                        {img.destination} <ArrowRightLeft size={10} className="ml-1 opacity-50" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-28 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                    <ImageIcon size={24} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wide">Upload</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Writer's Solution <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Enter solution text. Use $...$ for inline math, $$...$$ for display math."
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
                  Difficulty: <span className="font-bold" style={{ color: '#2774AE' }}>Where would you place this round on a 10 question exam?/10</span>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Numerical Answer', 'Proof Based', 'Puzzle/Other'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setExamType(type)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        examType === type
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={examType === type ? { backgroundColor: '#2774AE' } : {}}
                    >
                      {type}
                    </button>
                  ))}
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
                  <KatexRenderer latex={latex} />
                ) : (
                  <p className="text-gray-400 text-center">Problem preview will appear here...</p>
                )}
                {images.filter(img => img.destination === 'problem').length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                    {images.filter(img => img.destination === 'problem').map((img, i) => (
                      <img key={i} src={img.dataUrl} alt="problem attachment" className="rounded border w-full h-auto" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Solution Preview</h2>
              <div className="border border-gray-200 rounded-lg p-4 min-h-[200px]">
                {solution ? (
                  <KatexRenderer latex={solution} />
                ) : (
                  <p className="text-gray-400 text-center">Solution preview will appear here...</p>
                )}
                {images.filter(img => img.destination === 'solution').length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                    {images.filter(img => img.destination === 'solution').map((img, i) => (
                      <img key={i} src={img.dataUrl} alt="solution attachment" className="rounded border w-full h-auto" />
                    ))}
                  </div>
                )}
              </div>
            </div>

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
