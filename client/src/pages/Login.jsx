import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { Lock } from 'lucide-react'; // Adding an icon for extra polish

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
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0F4FF] to-[#E0E9FF] p-4">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ucla-blue/10 rounded-full mb-4">
            <Lock className="text-ucla-blue" size={32} />
          </div>
          <h1 className="text-2xl font-black text-ucla-blue leading-tight uppercase tracking-tight">
            PROSE <span className="text-ucla-gold text-lg block font-bold mt-1">System</span>
          </h1>
          <p className="text-gray-500 text-sm mt-3 font-medium">
            Problem Review & Online Submission Engine
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md text-sm font-semibold animate-pulse">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
              UCLA Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ucla-blue focus:bg-white outline-none transition-all placeholder:text-gray-300"
              placeholder="bruin@ucla.edu"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                Password
              </label>
              <Link to="/forgot-password" size="sm" className="text-xs text-ucla-blue hover:text-ucla-dark-blue font-bold">
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ucla-blue focus:bg-white outline-none transition-all placeholder:text-gray-300"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 px-4 rounded-xl shadow-lg text-sm font-black text-white bg-ucla-blue hover:bg-ucla-dark-blue hover:shadow-ucla-blue/30 transform active:scale-95 transition-all ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">
            New to the team?{' '}
            <Link to="/register" className="text-ucla-blue hover:underline font-black">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
