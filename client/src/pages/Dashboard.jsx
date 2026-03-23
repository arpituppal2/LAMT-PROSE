import { useState, useEffect } from 'react';
import { Star, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch problems and stats independently so one failure doesn't wipe everything
      const [statsRes, problemsRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/problems/my'),
      ]);
      setStats(statsRes.data);
      setProblems(problemsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
    // Fetch feedback separately — won't block dashboard if it fails
    try {
      const feedbackRes = await api.get('/feedback/my-feedback');
      setMyFeedback(feedbackRes.data);
    } catch (error) {
      console.error('Failed to fetch my feedback', error);
    }
  };

  const filteredProblems = filter === 'all'
    ? problems
    : problems.filter((p) => p._displayStatus === filter || p.stage === filter);

  const topics = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-ucla-blue mb-8">Dashboard</h1>

        {/* Stats Grid */}
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
          {topics.map((topic) => (
            <div key={topic} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">{topic}</h3>
              <p className="text-3xl font-bold text-ucla-blue">{stats?.topicCounts?.[topic] || 0}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-8">
          {/* Main Problems Table */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b flex gap-2 flex-wrap">
                {['all', 'needs_review', 'Idea', 'Review', 'Live/Ready for Review', 'Published'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === s
                        ? 'bg-ucla-blue text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {s === 'all' ? 'All' : s === 'needs_review' ? 'Needs Review' : s}
                  </button>
                ))}
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topics</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endorsed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProblems.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No problems found in this category</td></tr>
                  ) : filteredProblems.map((problem) => (
                    <tr
                      key={problem.id}
                      onClick={() => navigate(`/problem/${problem.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-bold">{problem.id}</td>
                      <td className="px-4 py-3">{problem.topics.map(t => <span key={t} className="mr-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{t}</span>)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                          problem._displayStatus === 'needs_review' ? 'bg-red-100 text-red-800' :
                          problem._displayStatus === 'endorsed' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {problem._displayStatus === 'needs_review' ? 'Needs Review' :
                           problem._displayStatus === 'endorsed' ? 'Endorsed' :
                           problem.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {problem.endorsements > 0 ? (
                          <span className="flex items-center gap-1 text-yellow-600 text-sm">
                            <Star size={14} fill="currentColor" /> {problem.endorsements}
                          </span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(problem.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reviewer Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare size={20} />
                Your Reviews
              </h2>
              {myFeedback.length === 0 ? (
                <p className="text-gray-500 text-sm">You haven't submitted any reviews yet.</p>
              ) : myFeedback.map((fb) => (
                <div
                  key={fb.id}
                  onClick={() => navigate(`/problem/${fb.problemId}`)}
                  className="cursor-pointer border-l-4 border-gray-200 pl-3 py-2 mb-3 hover:border-ucla-blue transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm font-bold">{fb.problemId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      fb.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {fb.resolved ? 'Resolved' : 'Unresolved'}
                    </span>
                  </div>
                  {fb.comment && <p className="text-xs text-gray-500 mt-1 truncate">"{fb.comment}"</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(fb.createdAt).toLocaleDateString()}</p>
                  {fb.isEndorsement && <span className="text-xs text-yellow-600 font-medium">Endorsed</span>}
                </div>
              ))}
              <button
                onClick={() => navigate('/feedback')}
                className="w-full mt-4 py-2 bg-ucla-blue text-white rounded-lg font-bold hover:bg-ucla-dark-blue transition-colors"
              >
                Review More Problems
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
