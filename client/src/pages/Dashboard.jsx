import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, LayoutDashboard, MessageSquare, Trash2, User, Info } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, checkAuth } = useAuth();
  
  // --- UI State (synced to URL) ---
  // ?view=profile  → profile tab; default = overview
  // ?filter=Needs+Review etc. → filter state
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

  // --- Dashboard States ---
  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // --- Profile States ---
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mathExp: ''
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // --- Effects ---
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        mathExp: user.mathExp || ''
      });
    }
  }, [user]);

  // --- Handlers ---
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
    if (!window.confirm("Are you sure you want to remove this feedback/endorsement?")) return;

    try {
      await api.delete(`/feedback/${feedbackId}`);
      setMyFeedback(prev => prev.filter(fb => fb.id !== feedbackId));
      
      const statsRes = await api.get('/stats/dashboard');
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to delete feedback', error);
      alert("Failed to delete feedback. Please try again.");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileMessage('');
    try {
      await api.put('/user/profile', formData);
      await checkAuth();
      setProfileMessage('Profile updated successfully!');
    } catch (error) {
      setProfileMessage('Failed to update profile');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // --- Derived Data ---
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
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400 animate-pulse font-medium">
          Loading Dashboard...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-ucla-blue dark:text-[#FFD100] mb-2 transition-colors">
              Welcome, {user?.firstName}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 transition-colors">
              {activeTab === 'overview' ? 'Here is an overview of your activity.' : 'Manage your profile and account settings.'}
            </p>
          </div>
          
          <div className="flex bg-white dark:bg-slate-800 rounded-lg shadow-sm p-1 border border-gray-200 dark:border-slate-700 transition-colors">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-ucla-blue text-white dark:bg-[#FFD100] dark:text-slate-900' 
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700'
              }`}
            >
              <LayoutDashboard size={18} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'profile' 
                  ? 'bg-ucla-blue text-white dark:bg-[#FFD100] dark:text-slate-900' 
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700'
              }`}
            >
              <User size={18} />
              Profile Settings
            </button>
          </div>
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in duration-300">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-slate-700/50 transition-colors">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Problems</h3>
                <p className="text-3xl font-bold text-ucla-blue dark:text-[#FFD100]">{stats?.totalProblems || 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-slate-700/50 border-l-4 border-l-yellow-400 dark:border-l-[#FFD100] transition-colors">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Endorsements</h3>
                <div className="flex items-center gap-2">
                  <Star size={24} className="text-yellow-500 dark:text-[#FFD100] fill-yellow-400 dark:fill-[#FFD100]" />
                  <p className="text-3xl font-bold text-ucla-blue dark:text-[#FFD100]">{stats?.totalEndorsements || 0}</p>
                </div>
              </div>
              {topics.map((topic) => (
                <div key={topic} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-slate-700/50 transition-colors">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{topic}</h3>
                  <p className="text-3xl font-bold text-ucla-blue dark:text-[#FFD100]">{stats?.topicCounts?.[topic] || 0}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Problems Table */}
              <div className="flex-1">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-gray-100 dark:border-slate-700/50 transition-colors">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex gap-2 flex-wrap">
                    {[
                      { value: 'all',          label: 'All' },
                      { value: 'needs_review', label: 'Needs Review' },
                      { value: 'Idea',         label: 'Idea' },
                      { value: 'Published',    label: 'Published' },
                      { value: 'Endorsed',     label: 'Endorsed' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === value
                            ? 'bg-ucla-blue text-white shadow-sm dark:bg-[#FFD100] dark:text-slate-900'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Topics</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Endorsed</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                        {filteredProblems.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">No problems found in this category</td></tr>
                        ) : filteredProblems.map((problem) => (
                          <tr
                            key={problem.id}
                            onClick={() => navigate(`/problem/${problem.id}`)}
                            className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-sm font-bold dark:text-white">{problem.id}</td>
                            <td className="px-4 py-3">
                              {problem.topics.map(t => (
                                <span key={t} className="mr-1 mb-1 inline-block px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs rounded font-medium">
                                  {t}
                                </span>
                              ))}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded font-medium ${
                                problem._displayStatus === 'needs_review' || problem._displayStatus === 'Needs Review'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : problem._displayStatus === 'Endorsed' || problem._displayStatus === 'endorsed'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-[#FFD100]/20 dark:text-[#FFD100]'
                                  : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
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
                                <span className="flex items-center gap-1 text-yellow-600 dark:text-[#FFD100] text-sm font-medium">
                                  <Star size={14} fill="currentColor" /> {problem.endorsements}
                                </span>
                              ) : <span className="text-gray-400 dark:text-gray-600">-</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(problem.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Reviewer Sidebar */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-slate-700/50 transition-colors">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                    <MessageSquare size={20} className="text-ucla-blue dark:text-[#FFD100]" />
                    Your Reviews
                  </h2>
                  {myFeedback.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">You haven't submitted any reviews yet.</p>
                  ) : myFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      onClick={() => navigate(`/problem/${fb.problemId}`)}
                      className="cursor-pointer border-l-4 border-gray-200 dark:border-slate-600 pl-3 py-2 mb-3 hover:border-ucla-blue dark:hover:border-[#FFD100] transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold dark:text-white">{fb.problemId}</span>
                          {!fb.isEndorsement && (
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              fb.resolved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {fb.resolved ? 'Resolved' : 'Unresolved'}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => handleDeleteFeedback(e, fb.id)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                          title="Remove Feedback"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {fb.answer && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1"><span className="font-semibold text-gray-800 dark:text-gray-200">Your answer:</span> {fb.answer}</p>}
                      {fb.comment && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate italic">"{fb.comment}"</p>}
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-400 dark:text-gray-500">{fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}</p>
                        {fb.isEndorsement && <span className="text-xs text-yellow-600 dark:text-[#FFD100] font-medium">Endorsed</span>}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/feedback')}
                    className="w-full mt-4 py-2 bg-ucla-blue text-white dark:bg-[#FFD100] dark:text-slate-900 rounded-lg font-bold hover:bg-blue-800 dark:hover:bg-yellow-500 transition-colors shadow-sm"
                  >
                    Review More Problems
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
            {/* Profile Settings Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-slate-700/50 transition-colors">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 text-center">Profile Settings</h2>

              {profileMessage && (
                <div className={`mb-4 px-4 py-3 rounded text-center text-sm font-medium ${
                  profileMessage.includes('success')
                    ? 'bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                    : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                }`}>
                  {profileMessage}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {/* Row 1: Email + Initials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center sm:text-left">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-center sm:text-left cursor-not-allowed transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center sm:text-left">
                      Initials
                    </label>
                    <input
                      type="text"
                      value={user?.initials || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-center sm:text-left cursor-not-allowed transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2: First Name + Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center sm:text-left">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 bg-transparent dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-ucla-blue dark:focus:ring-[#FFD100] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center sm:text-left">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 bg-transparent dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-ucla-blue dark:focus:ring-[#FFD100] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Row 3: Math Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center sm:text-left">
                    Math Experience
                  </label>
                  <textarea
                    value={formData.mathExp}
                    onChange={(e) => setFormData({ ...formData, mathExp: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-transparent dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-ucla-blue dark:focus:ring-[#FFD100] focus:border-transparent outline-none transition-all resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="w-full bg-ucla-blue text-white dark:bg-[#FFD100] dark:text-slate-900 py-3 rounded-lg transition-colors hover:bg-blue-800 dark:hover:bg-yellow-500 disabled:opacity-50 font-bold mt-4 shadow-sm"
                >
                  {profileSubmitting ? 'Saving...' : 'Save Profile'}
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
