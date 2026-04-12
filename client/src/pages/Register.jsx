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

  const inputClass = "w-full px-3 py-2 text-sm bg-transparent border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2774AE] dark:focus:ring-[#FFD100] transition";
  const labelClass = "block text-xs text-gray-400 dark:text-gray-500 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB] dark:bg-[#030d17] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">LAMT</p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Requires an @ucla.edu address and invite code.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
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
              name="mathExp" value={formData.mathExp} onChange={handleChange} rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Competition experience, relevant coursework..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            className="w-full py-2 px-4 text-sm font-medium bg-[#2774AE] text-white rounded hover:bg-[#1a5f96] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-[#2774AE] dark:text-[#FFD100] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
