import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', initials: '',
    mathExp: '', inviteCode: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate      = useNavigate();
  const { register }  = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label, name, type = 'text', extra = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <label className="section-label">{label}</label>
      <input
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        className="input-base"
        {...extra}
      />
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: 'var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Wordmark */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <span className="gold-rule" style={{ marginBottom: 'var(--space-3)' }} />
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 800,
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            }}
          >
            Create account
          </h1>
          <p
            style={{
              marginTop: 'var(--space-2)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint)',
            }}
          >
            Requires a valid address and invite code.
          </p>
        </div>

        {/* Card */}
        <div className="surface-card" style={{ overflow: 'hidden' }}>
          <form
            onSubmit={handleSubmit}
            style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--badge-needs-review-bg)',
                  border: '1px solid var(--badge-needs-review-border)',
                  color: 'var(--badge-needs-review-text)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {field('First name', 'firstName', 'text', { autoFocus: true, required: true })}
              {field('Last name',  'lastName',  'text', { required: true })}
            </div>

            {/* Email + Initials row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px', gap: 'var(--space-3)' }}>
              {field('Email', 'email', 'email', { placeholder: 'your@email.com', required: true })}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label className="section-label">Initials</label>
                <input
                  type="text"
                  name="initials"
                  value={formData.initials}
                  onChange={handleChange}
                  maxLength={3}
                  className="input-base"
                  style={{ textTransform: 'uppercase', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.2em' }}
                  placeholder="AU"
                  required
                />
              </div>
            </div>

            {/* Math background */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label className="section-label">Math background</label>
              <textarea
                name="mathExp"
                value={formData.mathExp}
                onChange={handleChange}
                rows={3}
                className="input-base"
                style={{ resize: 'vertical', lineHeight: 1.65 }}
                placeholder="Competition experience, relevant coursework…"
                required
              />
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--color-border)' }} />

            {/* Password row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {field('Password',         'password',        'password', { placeholder: 'Min. 6 characters', required: true })}
              {field('Confirm password', 'confirmPassword', 'password', { placeholder: 'Re-enter',          required: true })}
            </div>

            {/* Invite code */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label className="section-label">Invite code</label>
              <input
                type="text"
                name="inviteCode"
                value={formData.inviteCode}
                onChange={handleChange}
                className="input-base"
                style={{ fontFamily: 'monospace', letterSpacing: '0.2em' }}
                placeholder="Ask a current member"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-1)', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Creating account…</>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div
            style={{
              padding: 'var(--space-4) var(--space-6)',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
            }}
          >
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
