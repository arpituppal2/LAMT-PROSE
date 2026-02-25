import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const ViewTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTest, setNewTest] = useState({
    competition: '',
    name: '',
    description: '',
    version: '',
    problemIds: []
  });

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await api.get('/tests');
      setTests(response.data);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();

    try {
      await api.post('/tests', newTest);
      setShowModal(false);
      setNewTest({
        competition: '',
        name: '',
        description: '',
        version: '',
        problemIds: []
      });
      fetchTests();
    } catch (error) {
      console.error('Failed to create test:', error);
    }
  };

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-ucla-blue">View Tests</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-ucla-blue text-white px-4 py-2 rounded-lg hover:bg-ucla-dark-blue transition-colors"
          >
            <Plus size={20} />
            Create Test
          </button>
        </div>

        {tests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No tests created yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-ucla-blue text-white px-6 py-2 rounded-lg hover:bg-ucla-dark-blue transition-colors"
            >
              Create Your First Test
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tests.map(test => (
              <div key={test.id} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-ucla-blue mb-2">{test.name}</h2>
                <p className="text-sm text-gray-600 mb-2">
                  {test.competition} - Version {test.version}
                </p>
                {test.description && <p className="text-gray-700 mb-4">{test.description}</p>}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">{test.problems.length} problems</span>
                  <span>•</span>
                  <span>Created {new Date(test.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Create Test</h2>

              <form onSubmit={handleCreateTest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Competition
                  </label>
                  <input
                    type="text"
                    value={newTest.competition}
                    onChange={(e) => setNewTest({ ...newTest, competition: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Name
                  </label>
                  <input
                    type="text"
                    value={newTest.name}
                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTest.description}
                    onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={newTest.version}
                    onChange={(e) => setNewTest({ ...newTest, version: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ucla-blue focus:border-transparent"
                    required
                  />
                </div>

                {/* NOTE: Selecting problems is the next step:
                    you can fetch /api/problems and add a multi-select UI that fills newTest.problemIds. */}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-ucla-blue text-white py-2 rounded-lg hover:bg-ucla-dark-blue transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ViewTests;
