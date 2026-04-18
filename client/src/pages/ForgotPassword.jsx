import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters!');
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { email, resetCode, newPassword });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 text-base bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30 dark:focus:ring-[#FFD100]/20 transition';
  const labelCls = 'block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF4FB] dark:bg-[#020c16] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">LAMT · PROSE</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Reset password</h1>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1.5">Contact an admin for your reset code, then set a new password below.</p>
        </div>

        <div className="bg-white/70 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl p-7 shadow-sm">
          {message ? (
            <div className="px-4 py-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-base text-green-700 dark:text-green-300">
              <p className="font-medium">{message}</p>
              <p className="text-sm mt-1 opacity-80">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-base text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label className={labelCls}>UCLA Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputCls} placeholder="you@ucla.edu" required />
              </div>
              <div>
                <label className={labelCls}>Reset Code</label>
                <input type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value)}
                  className={inputCls} placeholder="Ask an admin for this code" required />
              </div>
              <div>
                <label className={labelCls}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls} placeholder="At least 8 characters" required />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls} placeholder="Re-enter new password" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 text-base font-semibold bg-[#2774AE] text-white rounded-xl hover:bg-[#005587] disabled:opacity-40 transition-colors">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-base text-center text-gray-500 dark:text-gray-400">
          <Link to="/login" className="text-[#2774AE] dark:text-[#FFD100] hover:underline font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
