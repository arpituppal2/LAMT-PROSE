import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, problemsRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/problems/my')
      ]);
      setStats(statsRes.data);
      setProblems(problemsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard ', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = filter === 'all'
    ? problems
    : problems.filter(p => p.stage === filter);

  const topics = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

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
        <h1 className="text-3xl font-bold text-ucla-blue mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Problems</h3>
            <p className="text-3xl font-bold text-ucla-blue">{stats?.totalProblems || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Endorsements</h3>
            <div className="flex items-center gap-2">
              <Star size={24} className="text-yellow-500 fill-yellow-400" />
              <p className="text-3xl font-bold text-ucla-blue">{stats?.totalEndorsements || 0}</p>
            </div>
          </div>
          
          {topics.map(topic => (
            <div key={topic} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">{topic}</h3>
              <p className="text-3xl font-bold text-ucla-blue">
                {stats?.topicCounts?.[topic] || 0}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'Idea', 'Review', 'Live/Ready for Review', 'On Test', 'Published', 'Needs Review'].map(stage => (
              <button
                key={stage}
                onClick={() => setFilter(stage)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === stage
                    ? 'bg-ucla-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {stage === 'all' ? 'All' : stage}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-ucla-blue text-white">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Topics</th>
                <th className="px-4 py-3 text-left">Quality</th>
                <th className="px-4 py-3 text-left">Stage</th>
                <th className="px-4 py-3 text-left">Endorsed</th>
                <th className="px-4 py-3 text-left">Tests</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No problems found
                  </td>
                </tr>
              ) : (
                filteredProblems.map(problem => (
                  <>
                    <tr 
                      key={problem.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === problem.id ? null : problem.id)}
                    >
                      <td className="px-4 py-3 font-medium text-ucla-blue">{problem.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {problem.topics.map(topic => (
                            <span 
                              key={topic}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">{problem.quality}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          problem.stage === 'On Test' ? 'bg-blue-100 text-blue-800' :
                          problem.stage === 'Endorsed' ? 'bg-yellow-100 text-yellow-800' :
                          problem.stage === 'Published' ? 'bg-green-100 text-green-800' :
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
                      <td className="px-4 py-3">{problem.tests?.length || 0}</td>
                      <td className="px-4 py-3">
                        {new Date(problem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {expandedId === problem.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </td>
                    </tr>
                    {expandedId === problem.id && (
                      <tr key={`${problem.id}-expanded`}>
                        <td colSpan={8} className="px-4 py-4 bg-gray-50">
                          <div className="prose max-w-none">
                            <KatexRenderer latex={problem.latex} displayMode />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
