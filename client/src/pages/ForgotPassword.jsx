import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--ucla-blue)]/25 dark:focus:ring-[var(--ucla-gold)]/20 transition';
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF4FB] dark:bg-[#020c16] p-4">
      <div className="w-full max-w-[400px]">

        {/* Wordmark */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-[0.18em] mb-2">
            LAMT · PROSE
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Reset password
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Contact an admin for your reset code, then set a new password below.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-white/[0.04] backdrop-blur-md border border-white/70 dark:border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">

          {message ? (
            /* Success state */
            <div className="p-6">
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{message}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Redirecting to login…</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {error && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className={labelCls}>UCLA Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputCls} placeholder="you@ucla.edu" autoFocus required
                />
              </div>

              <div>
                <label className={labelCls}>Reset Code</label>
                <input
                  type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value)}
                  className={`${inputCls} font-mono tracking-widest`}
                  placeholder="Ask an admin" required
                />
              </div>

              <div className="border-t border-gray-100 dark:border-white/[0.06]" />

              <div>
                <label className={labelCls}>New Password</label>
                <input
                  type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls} placeholder="At least 8 characters" required
                />
              </div>

              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input
                  type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls} placeholder="Re-enter new password" required
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--ucla-blue)] hover:bg-[var(--ucla-blue-dark)] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Resetting…</>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>
          )}

          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-[var(--ucla-blue)] dark:hover:text-[var(--ucla-gold)] transition-colors"
            >
              <ArrowLeft size={13} /> Back to login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
