import { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import Layout from '../components/Layout';

const Home = () => {
  const { user, checkAuth } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mathExp: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        mathExp: user.mathExp
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.put('/user/profile', formData);
      await checkAuth();
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-full py-8">
        <div className="w-full max-w-4xl">

          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#2774AE' }}>
              Welcome, {user?.firstName}!
            </h1>
            <p className="text-gray-500">Manage your profile information</p>
          </div>

          {/* Profile Settings Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Profile Settings</h2>

            {message && (
              <div className={`mb-4 px-4 py-3 rounded text-center ${
                message.includes('success')
                  ? 'bg-blue-50 border border-blue-200 text-blue-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Email + Initials */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                    Initials
                  </label>
                  <input
                    type="text"
                    value={user?.initials || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center"
                  />
                </div>
              </div>

              {/* Row 2: First Name + Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#2774AE' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Row 3: Math Experience (full width) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                  Math Experience
                </label>
                <textarea
                  value={formData.mathExp}
                  onChange={(e) => setFormData({ ...formData, mathExp: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 rounded-lg transition-colors disabled:opacity-50 font-semibold"
                style={{ backgroundColor: '#2774AE' }}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* PROSE Explanation */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">About PROSE</h2>
            <p className="text-gray-600 mb-6">
              <strong>PROSE</strong> (Problem Repository and Organization System for Exams) is the platform your team uses to write, review, and organize math competition problems from start to finish.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✍️</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Write Problems</h3>
                    <p className="text-sm text-gray-500">Submit new problems via the Write tab. Include the problem statement, answer, solution, and difficulty.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Give Feedback</h3>
                    <p className="text-sm text-gray-500">Review others' problems and leave detailed feedback to help improve quality before they're finalized.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Endorse Problems</h3>
                    <p className="text-sm text-gray-500">Senior members can endorse problems that meet the quality bar, marking them ready for test assembly.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Problem Inventory</h3>
                    <p className="text-sm text-gray-500">Browse the full bank of submitted problems. Filter by subject, difficulty, or status to find what you need.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">View Tests</h3>
                    <p className="text-sm text-gray-500">See how endorsed problems have been assembled into tests and review the final exam sets.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Leaderboard</h3>
                    <p className="text-sm text-gray-500">Track contribution stats across the team. Click any member's row to view their full problem list.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default Home;
