import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Star, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, problemsRes, feedbackRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/problems/my'),
        api.get('/feedback/my-feedback')
      ]);
      setStats(statsRes.data);
      setProblems(problemsRes.data);
      setMyFeedback(feedbackRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
    } finally {
      setLoading(false);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Problems Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 flex gap-2 flex-wrap border-b border-gray-100">
              {['all', 'needs_review', 'Idea', 'Review', 'Live/Ready for Review', 'Published'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === s ? 'bg-ucla-blue text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'needs_review' ? 'Needs Review' : s}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-ucla-blue text-white">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Topics</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Endorsed</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProblems.length === 0 ? (
                      <tr><td colSpan="5" className="px-4 py-12 text-center text-gray-500 italic">No problems found in this category</td></tr>
                    ) : filteredProblems.map((problem) => (
                      <tr 
                        key={problem.id} 
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/problem/${problem.id}`)}
                      >
                        <td className="px-4 py-4 font-bold text-ucla-blue">{problem.id}</td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {problem.topics.map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{t}</span>)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border shadow-sm ${
                            problem._displayStatus === 'needs_review' ? 'bg-red-500 text-white border-red-600' :
                            problem._displayStatus === 'endorsed' ? 'bg-yellow-400 text-yellow-900 border-yellow-500' :
                            'bg-blue-50 text-ucla-blue border-blue-100'
                          }`}>
                            {problem._displayStatus === 'needs_review' ? 'Needs Review' :
                             problem._displayStatus === 'endorsed' ? 'Endorsed' : problem.stage}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {problem.endorsements > 0 ? (
                            <div className="flex items-center gap-1 font-bold text-yellow-600">
                              <Star size={14} fill="#FFD100" /> {problem.endorsements}
                            </div>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500">{new Date(problem.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Reviewer Sidebar Dashboard */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-ucla-blue">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare size={20} className="text-ucla-blue" />
                <h2 className="text-xl font-bold">Your Reviews</h2>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {myFeedback.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg italic">You haven't submitted any reviews yet.</p>
                ) : myFeedback.map((fb) => (
                  <div 
                    key={fb.id} 
                    className="p-4 border border-gray-100 rounded-lg hover:border-ucla-blue hover:bg-blue-50/30 transition-all cursor-pointer shadow-sm bg-white"
                    onClick={() => navigate(`/problem/${fb.problemId}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-ucla-blue">{fb.problemId}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        fb.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {fb.resolved ? 'Resolved' : 'Unresolved'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 italic mb-3">"{fb.comment}"</p>
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{new Date(fb.updatedAt).toLocaleDateString()}</span>
                      {fb.isEndorsement && <span className="text-yellow-600 font-bold flex items-center gap-0.5"><Star size={10} fill="currentColor" /> Endorsed</span>}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate('/feedback')}
                className="w-full mt-6 py-2 bg-ucla-blue text-white rounded-lg font-bold hover:bg-ucla-dark-blue transition-colors shadow-md"
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
