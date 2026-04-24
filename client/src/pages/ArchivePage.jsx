import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

/* ══════════════════════════════════════════════════════════════
   ARCHIVE PAGE  —  lamt.net treatment
══════════════════════════════════════════════════════════════ */
const ArchivePage = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [unarchiving, setUnarchiving] = useState(null);
  const [message, setMessage]   = useState({ text: '', type: '' });
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { fetchArchived(); }, []);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const res = await api.get('/problems?stage=Archived');
      setProblems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch archived problems:', err);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (id) => {
    setUnarchiving(id);
    setConfirmId(null);
    try {
      await api.put(`/problems/${id}/unarchive`);
      setMessage({ text: `Problem ${id} restored to Idea.`, type: 'success' });
      setProblems((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setMessage({ text: 'Failed to unarchive problem.', type: 'error' });
    } finally {
      setUnarchiving(null);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const filtered = problems.filter(
    (p) =>
      search === '' ||
      (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.latex || '').toLowerCase().includes(search.toLowerCase()),
  );

  const confirmProblem = confirmId ? problems.find((p) => p.id === confirmId) : null;

  if (loading) {
    return (
      <Layout pageKey="archive">
        <div className="h-64 flex items-center justify-center gap-3 text-[var(--color-text-muted)]">
          <Loader2 size={18} className="animate-spin text-[var(--color-accent)]" />
          <span className="text-base">Loading archive…</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageKey="archive">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Page header ── */}
        <header>
          <span className="gold-rule mb-3" />
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Archive
          </h1>
        </header>

        {/* ── Toast ── */}
        {message.text && (
          <div
            className={[
              'px-4 py-3 rounded-sm text-sm font-medium border',
              message.type === 'error'
                ? 'bg-[var(--badge-needs-review-bg)] border-[var(--badge-needs-review-border)] text-[var(--badge-needs-review-text)]'
                : 'bg-[var(--badge-endorsed-bg)] border-[var(--badge-endorsed-border)] text-[var(--badge-endorsed-text)]',
            ].join(' ')}
          >
            {message.text}
          </div>
        )}

        {/* ── Search ── */}
        <div className="surface-card p-3">
          <label className="relative block">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
            />
            <input
              type="text"
              placeholder="Search archived problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base w-full pl-9"
            />
          </label>
        </div>

        {/* ── Table ── */}
        <div className="surface-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                {search ? 'No matching archived problems.' : 'Nothing in the archive yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="px-5 py-3.5 section-label">Problem</th>
                  <th className="px-5 py-3.5 section-label text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filtered.map((problem) => (
                  <tr
                    key={problem.id}
                    onClick={() => navigate(`/problem/${problem.id}`)}
                    className="cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[var(--color-accent)] font-mono font-semibold text-sm">
                          {problem.id}
                        </span>
                        <div
                          className="text-sm text-[var(--color-text-muted)] max-w-xl overflow-hidden"
                          style={{ maxHeight: '2.8em' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <KatexRenderer
                            latex={(problem.latex || 'Click to view…').slice(0, 160)}
                          />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-[13px] font-semibold px-2 py-0.5 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
                            {problem.quality ? `${problem.quality}/10` : '?'}
                          </span>
                          {(problem.topics || []).map((t) => (
                            <span
                              key={t}
                              className="text-[13px] font-medium px-1.5 py-0.5 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmId(problem.id);
                        }}
                        disabled={unarchiving === problem.id}
                        className="btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        {unarchiving === problem.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Confirm modal ── */}
      {confirmId && (
        <div className="modal-overlay" onClick={() => setConfirmId(null)}>
          <div
            className="surface-card shadow-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-semibold mb-1"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Restore this problem?
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-3">
              <span className="font-mono font-semibold text-[var(--color-accent)]">{confirmId}</span>{' '}
              will be moved back to <strong>Idea</strong> stage and become visible in the inventory.
            </p>
            {confirmProblem?.latex && (
              <div
                className="mb-4 p-3 rounded-sm bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)] overflow-hidden"
                style={{ maxHeight: '4em' }}
              >
                <KatexRenderer latex={confirmProblem.latex.slice(0, 200)} />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmId(null)} className="btn-outline px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={() => handleUnarchive(confirmId)}
                className="btn-filled px-4 py-2 text-sm"
              >
                Restore to Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ArchivePage;
