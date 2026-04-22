import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Loader2, CheckCircle2 } from 'lucide-react';

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
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
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

  const inputCls = 'w-full px-4 py-2.5 text-base bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ucla-blue)]/30 dark:focus:ring-[var(--ucla-gold)]/20 transition';
  const labelCls = 'block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF4FB] dark:bg-[#020c16] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">LAMT · PROSE</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Reset password</h1>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1.5">
            Contact an admin for your reset code, then set a new password below.
          </p>
        </div>

        <div className="bg-white/70 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl p-7 shadow-sm">
          {message ? (
            <div className="status-badge status-endorsed border border-[var(--badge-endorsed-border)] px-4 py-4 rounded-xl flex flex-col gap-1">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} />
                {message}
              </div>
              <p className="text-sm opacity-70">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="status-badge status-needs-review border border-[var(--badge-needs-review-border)] px-3 py-2.5 rounded-lg text-base">
                  {error}
                </div>
              )}
              <div>
                <label className={labelCls}>UCLA Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputCls} placeholder="you@ucla.edu" autoFocus required />
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
                className="w-full py-2.5 px-4 text-base font-semibold bg-[var(--ucla-blue)] text-white rounded-xl hover:bg-[var(--ucla-blue-dark)] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Resetting...</> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-base text-center text-gray-500 dark:text-gray-400">
          <Link to="/login" className="text-[var(--ucla-blue)] dark:text-[var(--ucla-gold)] hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
