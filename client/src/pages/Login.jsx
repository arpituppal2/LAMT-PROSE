import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const from = location.state?.from?.pathname || '/inventory';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 text-base bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF4FB] dark:bg-[#020c16] p-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">LAMT</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">PROSE</h1>
          <p className="text-base text-gray-400 dark:text-gray-500 mt-1">Problem Review & Online Submission Engine</p>
        </div>

        <div className="bg-white/70 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputCls} placeholder="you@ucla.edu" required />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm text-gray-500 dark:text-gray-400">Password</label>
                <Link to="/forgot-password" className="text-sm text-[#2774AE] dark:text-[#FFD100] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputCls} placeholder="••••••••" required />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 text-base font-semibold bg-[#2774AE] text-white rounded-xl hover:bg-[#005587] disabled:opacity-40 transition-colors mt-1">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-base text-gray-400 dark:text-gray-500">
          New member?{' '}
          <Link to="/register" className="text-[#2774AE] dark:text-[#FFD100] hover:underline">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
