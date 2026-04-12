import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, LayoutDashboard, MessageSquare, Trash2, User } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, checkAuth } = useAuth();

  const activeTab = searchParams.get('view') || 'overview';
  const filter = searchParams.get('filter') || 'all';

  const setActiveTab = (tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'overview') next.delete('view');
      else next.set('view', tab);
      return next;
    }, { replace: false });
  };

  const setFilter = (value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all') next.delete('filter');
      else next.set('filter', value);
      return next;
    }, { replace: false });
  };

  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [formData, setFormData] = useState({ firstName: '', lastName: '', mathExp: '' });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        mathExp: user.mathExp || ''
      });
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const [statsRes, problemsRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/problems/my'),
      ]);
      setStats(statsRes.data);
      setProblems(problemsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setDashboardLoading(false);
    }
    try {
      const feedbackRes = await api.get('/feedback/my-feedback');
      setMyFeedback(feedbackRes.data);
    } catch (error) {
      console.error('Failed to fetch my feedback', error);
    }
  };

  const handleDeleteFeedback = async (e, feedbackId) => {
    e.stopPropagation();
    if (!window.confirm('Remove this review?')) return;
    try {
      await api.delete(`/feedback/${feedbackId}`);
      setMyFeedback(prev => prev.filter(fb => fb.id !== feedbackId));
      const statsRes = await api.get('/stats/dashboard');
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to delete feedback', error);
      alert('Failed to remove review.');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileMessage('');
    try {
      await api.put('/user/profile', formData);
      await checkAuth();
      setProfileMessage('Saved.');
    } catch (error) {
      setProfileMessage('Failed to save changes.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const filteredProblems = problems.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return p._displayStatus === 'needs_review' || p._displayStatus === 'Needs Review';
    if (filter === 'Endorsed') return p._displayStatus === 'Endorsed' || p._displayStatus === 'endorsed';
    return p._displayStatus === filter || p.stage === filter;
  });

  const topics = ['Algebra', 'Geometry', 'Combinatorics', 'Number Theory'];

  if (dashboardLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
          Loading...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{user?.email}</p>
          </div>

          <div className="flex border border-gray-200 dark:border-white/10 rounded overflow-hidden text-sm">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard size={14} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-200 dark:border-white/10 transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <User size={14} />
              Settings
            </button>
          </div>
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.totalProblems || 0}</p>
              </div>
              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Endorsed</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.totalEndorsements || 0}</p>
                  <Star size={12} className="text-[#FFD100] fill-[#FFD100] mb-0.5" />
                </div>
              </div>
              {topics.map((topic) => (
                <div key={topic} className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{topic}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{stats?.topicCounts?.[topic] || 0}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Problems table */}
              <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded overflow-hidden">
                  {/* Filter bar */}
                  <div className="flex gap-1 p-3 border-b border-gray-100 dark:border-white/8">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'needs_review', label: 'Needs Review' },
                      { value: 'Idea', label: 'Idea' },
                      { value: 'Published', label: 'Published' },
                      { value: 'Endorsed', label: 'Endorsed' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          filter === value
                            ? 'bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628]'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/8 dark:hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-white/8">
                          <th className="px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500">ID</th>
                          <th className="px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500">Topics</th>
                          <th className="px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500">Status</th>
                          <th className="px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500">Stars</th>
                          <th className="px-4 py-2.5 text-xs font-medium text-gray-400 dark:text-gray-500">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {filteredProblems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                              No problems in this category.
                            </td>
                          </tr>
                        ) : filteredProblems.map((problem) => (
                          <tr
                            key={problem.id}
                            onClick={() => navigate(`/problem/${problem.id}`)}
                            className="hover:bg-gray-50 dark:hover:bg-white/4 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-white">{problem.id}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {problem.topics.map(t => (
                                  <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-xs rounded">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                                  ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                  : problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed'
                                  ? 'bg-yellow-50 text-yellow-700 dark:bg-[#FFD100]/10 dark:text-[#FFD100]'
                                  : 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-300'
                              }`}>
                                {problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                                  ? 'Needs Review'
                                  : problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed'
                                  ? 'Endorsed'
                                  : problem.stage}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {problem.endorsements > 0 ? (
                                <span className="flex items-center gap-1 text-[#FFD100] text-sm">
                                  <Star size={12} fill="currentColor" /> {problem.endorsements}
                                </span>
                              ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                              {new Date(problem.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Reviews sidebar */}
              <div className="w-full lg:w-72 flex-shrink-0">
                <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-4">
                  <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <MessageSquare size={14} className="text-gray-400" />
                    Your reviews
                  </h2>
                  {myFeedback.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">No reviews submitted yet.</p>
                  ) : myFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      onClick={() => navigate(`/problem/${fb.problemId}`)}
                      className="cursor-pointer border-l-2 border-gray-100 dark:border-white/10 pl-3 py-1.5 mb-2.5 hover:border-[#2774AE] dark:hover:border-[#FFD100] transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-gray-800 dark:text-white">{fb.problemId}</span>
                          {!fb.isEndorsement && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              fb.resolved
                                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {fb.resolved ? 'Resolved' : 'Open'}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleDeleteFeedback(e, fb.id)}
                          className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {fb.answer && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="text-gray-700 dark:text-gray-300">Ans:</span> {fb.answer}
                        </p>
                      )}
                      {fb.comment && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{fb.comment}</p>
                      )}
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                        {fb.isEndorsement && <span className="ml-2 text-[#FFD100]">Endorsed</span>}
                      </p>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/feedback')}
                    className="w-full mt-3 py-1.5 text-xs font-medium bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded hover:opacity-90 transition-opacity"
                  >
                    Go to Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-xl">
            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 rounded p-6">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-5">Account settings</h2>

              {profileMessage && (
                <p className={`mb-4 text-sm ${
                  profileMessage === 'Saved.'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {profileMessage}
                </p>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Initials</label>
                    <input
                      type="text"
                      value={user?.initials || ''}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-gray-50 dark:bg-white/3 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">First name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Last name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Math background</label>
                  <textarea
                    value={formData.mathExp}
                    onChange={(e) => setFormData({ ...formData, mathExp: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] transition resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-[#2774AE] text-white dark:bg-[#FFD100] dark:text-[#001628] rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {profileSubmitting ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Dashboard;
