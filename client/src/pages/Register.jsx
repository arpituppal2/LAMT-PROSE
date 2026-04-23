import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--ucla-blue)]/25 dark:focus:ring-[var(--ucla-gold)]/20 transition';
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF4FB] dark:bg-[#020c16] p-4">
      <div className="w-full max-w-[480px]">

        {/* Wordmark */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-[0.18em] mb-2">
            LAMT · PROSE
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Create account
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Requires a valid address and invite code.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-white/[0.04] backdrop-blur-md border border-white/70 dark:border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First name</label>
                <input type="text" name="firstName" value={formData.firstName}
                  onChange={handleChange} className={inputCls} autoFocus required />
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <input type="text" name="lastName" value={formData.lastName}
                  onChange={handleChange} className={inputCls} required />
              </div>
            </div>

            {/* Email + Initials row */}
            <div className="grid grid-cols-[1fr_88px] gap-3">
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" name="email" value={formData.email}
                  onChange={handleChange} className={inputCls} placeholder="Your PROSE Email Here" required />
              </div>
              <div>
                <label className={labelCls}>Initials</label>
                <input type="text" name="initials" value={formData.initials}
                  onChange={handleChange} maxLength={3}
                  className={`${inputCls} uppercase text-center font-mono tracking-widest`}
                  placeholder="AU" required />
              </div>
            </div>

            {/* Math background */}
            <div>
              <label className={labelCls}>Math background</label>
              <textarea
                name="mathExp" value={formData.mathExp} onChange={handleChange} rows={3}
                className={`${inputCls} resize-y leading-relaxed`}
                placeholder="Competition experience, relevant coursework…"
                required
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-white/[0.06]" />

            {/* Password row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" name="password" value={formData.password}
                  onChange={handleChange} className={inputCls} placeholder="Min. 6 characters" required />
              </div>
              <div>
                <label className={labelCls}>Confirm password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword}
                  onChange={handleChange} className={inputCls} placeholder="Re-enter" required />
              </div>
            </div>

            {/* Invite code */}
            <div>
              <label className={labelCls}>Invite code</label>
              <input type="text" name="inviteCode" value={formData.inviteCode}
                onChange={handleChange} className={`${inputCls} font-mono tracking-widest`}
                placeholder="Ask a current member" required />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--ucla-blue)] hover:bg-[var(--ucla-blue-dark)] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Creating account…</>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] font-medium hover:underline underline-offset-2"
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
