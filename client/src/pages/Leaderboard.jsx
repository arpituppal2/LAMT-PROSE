import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../utils/AuthContext';
import API from '../utils/api';

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    API.get('/leaderboard')
      .then(r => setEntries(r.data))
      .catch(() => setError('Failed to load leaderboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout pageKey="leaderboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageKey="leaderboard">
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Leaderboard</h1>
            <p className="page-subtitle">Top contributors ranked by problem quality score.</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-6">{error}</div>
        )}

        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Problems</th>
                <th>Avg Quality</th>
                <th>Total Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[var(--color-text-muted)]">
                    No data yet.
                  </td>
                </tr>
              ) : (
                entries.map((e, i) => (
                  <tr
                    key={e.userId}
                    className={`cursor-pointer hover:bg-[var(--color-surface-offset)] transition-colors${
                      e.userId === user?._id ? ' bg-[var(--color-primary-highlight)]' : ''
                    }`}
                    onClick={() => navigate(`/profile/${e.userId}`)}
                  >
                    <td className="font-bold text-[var(--color-text-muted)]">{i + 1}</td>
                    <td>
                      <span className="font-medium">{e.displayName || e.username}</span>
                      {e.userId === user?._id && (
                        <span className="ml-2 badge badge-primary text-xs">You</span>
                      )}
                    </td>
                    <td>{e.problemCount}</td>
                    <td>{(e.avgQuality ?? 0).toFixed(2)}</td>
                    <td className="font-semibold">{(e.totalScore ?? 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
