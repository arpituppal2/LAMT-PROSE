import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, FileText } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

const Spinner = ({ size = 16 }) => <Loader2 size={size} className="animate-spin" />;

const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchExam(); }, [id]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tests/${id}`);
      setExam(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load exam.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Spinner size={24} />
        </div>
      </Layout>
    );
  }

  if (error || !exam) {
    return (
      <Layout>
        <div style={{ maxWidth: '640px', margin: '2rem auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-error)' }}>
            <AlertCircle size={16} />
            <span>{error || 'Exam not found.'}</span>
          </div>
        </div>
      </Layout>
    );
  }

  const problems = exam.problems ?? [];

  return (
    <Layout>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigate('/exams')}
            className="btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        {/* Exam meta */}
        <div className="surface-card" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.25rem' }}>
            {exam.name || 'Untitled Exam'}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>
            {exam.competition && <span>{exam.competition}</span>}
            {exam.version    && <span>{exam.version}</span>}
            {exam.templateType && (
              <span style={{ background: 'var(--color-surface-2)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}>
                {exam.templateType}
              </span>
            )}
            <span>{problems.length} problem{problems.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Problems list */}
        {problems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>No problems in this exam yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {problems.map((p, idx) => (
              <div
                key={p.id ?? idx}
                className="surface-card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/problem/${p.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-faint)', minWidth: '1.5rem' }}>
                    #{idx + 1}
                  </span>
                  <div style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    <KatexRenderer latex={p.problem ?? p.latex ?? ''} />
                  </div>
                </div>
                {p.answer && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', paddingLeft: '2.25rem' }}>
                    Answer: <span style={{ fontFamily: 'monospace' }}>{p.answer}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ExamDetail;
