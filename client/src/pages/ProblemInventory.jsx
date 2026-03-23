import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { Check, X, Star } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const ProblemInventory = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [problemsRes, progressRes] = await Promise.all([
        api.get('/problems'),
        api.get('/stats/tournament-progress')
      ]);
      setProblems(problemsRes.data);
      setChartData(progressRes.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalProblems = problems.length;
  const progressPercent = Math.min((totalProblems / 200) * 100, 100);

  const filtered = problems.filter(p => {
    const matchesSearch =
      search === '' ||
      (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.latex || '').toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === 'all' || p.stage === stageFilter;
    const matchesTopic = topicFilter === 'all' || (p.topics || []).includes(topicFilter);
    return matchesSearch && matchesStage && matchesTopic;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-ucla-blue mb-2">Tournament Progress</h1>
        <p className="text-gray-600 mb-6">Tracking progress toward 200 problems</p>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-semibold text-gray-700">Total Problems</span>
            <span className="font-bold text-ucla-blue text-xl">{totalProblems} / 200</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6">
            <div
              className="bg-ucla-blue h-6 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cumulative Progress Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <ReferenceLine y={100} stroke="#FFD100" strokeDasharray="3 3" label="Target" />
              <Line type="monotone" dataKey="idea" stroke="#8BB8E8" strokeWidth={2} name="Ideas" />
              <Line type="monotone" dataKey="endorsed" stroke="#FFD100" strokeWidth={2} name="Endorsed" />
              <Line type="monotone" dataKey="onTest" stroke="#2774AE" strokeWidth={2} name="On Test" />
              <Line type="monotone" dataKey="published" stroke="#005587" strokeWidth={2} name="Published" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search problems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
            >
              <option value="all">All Stages</option>
              <option value="Idea">Idea</option>
              <option value="Review">Review</option>
              <option value="Endorsed">Endorsed</option>
              <option value="Live/Ready for Review">Live/Ready for Review</option>
              <option value="On Test">On Test</option>
              <option value="Published">Published</option>
              <option value="Needs Review">Needs Review</option>
            </select>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
            >
              <option value="all">All Topics</option>
              <option value="Algebra">Algebra</option>
              <option value="Geometry">Geometry</option>
              <option value="Combinatorics">Combinatorics</option>
              <option value="Number Theory">Number Theory</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ucla-blue text-white">
              <tr>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-left">Topics</th>
                <th className="px-4 py-3 text-left">Stage</th>
                <th className="px-4 py-3 text-left">Endorsed</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(problem => (
                <tr
                  key={problem.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/problem/${problem.id}`)}
                >
                  <td className="px-4 py-3">
                    {problem.stage === 'Published' || problem.endorsements >= 3 ? (
                      <div className="bg-green-100 text-green-700 p-1 rounded-full w-fit">
                        <Check size={16} />
                      </div>
                    ) : (
                      <div className="bg-gray-100 text-gray-400 p-1 rounded-full w-fit">
                        <X size={16} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-ucla-blue">{problem.id}</td>
                  <td className="px-4 py-3">{problem.author?.initials}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(problem.topics || []).map(t => (
                        <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[10px] rounded ${
                      problem.stage === 'On Test' ? 'bg-blue-100 text-blue-800' :
                      problem.stage === 'Live/Ready for Review' ? 'bg-green-100 text-green-800' :
                      problem.stage === 'Published' ? 'bg-green-600 text-white' :
                      problem.stage === 'Review' ? 'bg-yellow-100 text-yellow-800' :
                      problem.stage === 'Endorsed' ? 'bg-purple-100 text-purple-800' :
                      problem.stage === 'Needs Review' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {problem.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {problem.endorsements > 0 ? (
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Star size={14} fill="#FFD100" />
                        {problem.endorsements}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{new Date(problem.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default ProblemInventory;
