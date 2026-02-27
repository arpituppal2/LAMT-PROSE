import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const QuestionsToEndorse = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [code, setCode] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  const ADMIN_CODE = 'LAMTADMIN839fhy38fynx389hm09h';
  const ADMIN_EMAILS = ['arpituppal@ucla.edu'];

  useEffect(() => {
    // Fetch current user email
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUserEmail(res.data.email);
      } catch (err) {
        console.error('Failed to fetch user');
      }
    };
    fetchUser();
  }, []);

  const handleVerify = () => {
    if (code === ADMIN_CODE && ADMIN_EMAILS.includes(userEmail)) {
      setAuthorized(true);
      fetchProblems();
    } else {
      alert('Unauthorized: Incorrect code or email');
    }
  };

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/problems');
      // Filter problems with exactly 3 endorsements
      const toEndorse = res.data.filter(p => p.endorsements === 3);
      setProblems(toEndorse);
    } catch (err) {
      console.error('Failed to fetch problems');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async (id, newStage) => {
    try {
      await api.put(`/problems/${id}`, { stage: newStage, adminCode: ADMIN_CODE });
      fetchProblems();
      alert('Stage updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update stage');
    }
  };

  if (!authorized) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg shadow-sm m-6 p-8 border border-dashed border-gray-300">
          <h2 className="text-xl font-bold mb-4 text-ucla-blue">Admin Access Required</h2>
          <p className="mb-6 text-gray-600 text-center">
            This tab contains questions pending final endorsement. <br/>
            Please enter the admin code to proceed.
          </p>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <input
              type="password"
              className="border p-2 rounded w-64 focus:ring-2 focus:ring-ucla-blue outline-none"
              placeholder="Enter Admin Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
            />
            <button
              onClick={handleVerify}
              className="bg-ucla-blue text-white px-6 py-2 rounded font-medium hover:bg-ucla-dark-blue transition-colors"
            >
              Verify Access
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 underline decoration-ucla-blue">Questions to Approve</h1>
          <button 
            onClick={fetchProblems}
            className="text-sm text-ucla-blue hover:text-ucla-dark-blue flex items-center"
          >
            <span className="mr-1">↻</span> Refresh
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-10 text-gray-500 italic">Fetching problems...</div>
        ) : problems.length === 0 ? (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <p className="text-blue-700">No questions currently pending approval (requires 3 endorsements).</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change Stage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {problems.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => navigate(`/problem/${p.id}`)}
                        className="text-ucla-blue hover:text-ucla-dark-blue hover:underline"
                      >
                        {p.id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {p.author?.firstName} {p.author?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        {p.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        className="border border-gray-300 rounded-md p-1.5 text-sm focus:ring-ucla-blue focus:border-ucla-blue"
                        value={p.stage}
                        onChange={(e) => handleUpdateStage(p.id, e.target.value)}
                      >
                        <option value="Idea">Idea</option>
                        <option value="Review">Review</option>
                        <option value="Live/Ready for Review">Live/Ready for Review</option>
                        <option value="On Test">On Test</option>
                        <option value="Published">Published</option>
                        <option value="Needs Review">Needs Review</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default QuestionsToEndorse;
