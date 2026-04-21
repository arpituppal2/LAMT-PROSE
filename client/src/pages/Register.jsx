import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { Loader2 } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', initials: '',
    mathExp: '', inviteCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.email.endsWith('@ucla.edu')) { setError('Must use a @ucla.edu email address.'); return; }
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

  const inputCls = 'w-full px-4 py-2.5 text-base bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ucla-blue)]/30 dark:focus:ring-[var(--ucla-gold)]/20 transition';
  const labelCls = 'block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF4FB] dark:bg-[#020c16] p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">LAMT · PROSE</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1.5">Requires a @ucla.edu address and invite code.</p>
        </div>

        <div className="bg-white/70 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl p-7 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="status-badge status-needs-review border border-[var(--badge-needs-review-border)] px-3 py-2.5 rounded-lg text-base">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                  className={inputCls} autoFocus required />
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                  className={inputCls} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>UCLA email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className={inputCls} placeholder="you@ucla.edu" required />
              </div>
              <div>
                <label className={labelCls}>Initials</label>
                <input type="text" name="initials" value={formData.initials} onChange={handleChange}
                  maxLength={3} className={`${inputCls} uppercase`} placeholder="AU" required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Math background</label>
              <textarea name="mathExp" value={formData.mathExp} onChange={handleChange} rows={3}
                className={`${inputCls} resize-y`}
                placeholder="Competition experience, relevant coursework..."
                required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Confirm password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                  className={inputCls} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Invite code</label>
              <input type="text" name="inviteCode" value={formData.inviteCode} onChange={handleChange}
                className={inputCls} required />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 text-base font-semibold bg-[var(--ucla-blue)] text-white rounded-xl hover:bg-[var(--ucla-blue-dark)] disabled:opacity-40 transition-colors mt-1 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-base text-center text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
