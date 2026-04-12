import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

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

  const inputClass = "w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition";
  const labelClass = "block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB] dark:bg-[#030d17] p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">LAMT · PROSE</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Requires a @ucla.edu address and invite code.</p>
        </div>

        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>UCLA email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="you@ucla.edu" required />
              </div>
              <div>
                <label className={labelClass}>Initials</label>
                <input type="text" name="initials" value={formData.initials} onChange={handleChange} maxLength={3} className={`${inputClass} uppercase`} placeholder="AU" required />
              </div>
            </div>

            <div>
              <label className={labelClass}>Math background</label>
              <textarea
                name="mathExp" value={formData.mathExp} onChange={handleChange} rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Competition experience, relevant coursework..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Confirm password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={inputClass} required />
              </div>
            </div>

            <div>
              <label className={labelClass}>Invite code</label>
              <input type="text" name="inviteCode" value={formData.inviteCode} onChange={handleChange} className={inputClass} required />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-medium bg-[#2774AE] text-white rounded hover:bg-[#1a5f96] disabled:opacity-40 transition-colors mt-1"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-sm text-center text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-[#2774AE] dark:text-[#FFD100] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
