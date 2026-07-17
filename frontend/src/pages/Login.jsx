import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  
  // 2FA State
  const [require2FA, setRequire2FA] = useState(false);
  const [otp, setOtp] = useState('');
  
  // Reset Password State
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const { login, user, verify2FA } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Sign In | Kryntel';
  }, []);

  useEffect(() => {
    // If already logged in, redirect
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'recruiter') {
        navigate('/recruiter');
      } else {
        navigate('/student');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      if (res.require2FA) {
        setRequire2FA(true);
      }
      // Redirect handled by useEffect if fully logged in
    } else {
      setError(res.message);
    }
  };



  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setSubmitting(true);
    const res = await verify2FA(otp);
    setSubmitting(false);
    
    if (res.success) {
      // Redirect handled by useEffect
    } else {
      setError(res.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('Password reset is currently disabled. Please contact an administrator.');
  };

  if (require2FA) {
    return (
      <div className="bg-slate-50 min-h-[90vh] flex items-center justify-center px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm w-full max-w-[440px]">
          <div className="w-16 h-16 bg-indigo-50 border-2 border-indigo-100 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
            🔒
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-1">Two-Factor Auth</h2>
          <p className="text-sm text-slate-500 text-center mb-8">
            Please enter the 6-digit code sent to your email.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="otp" className="text-xs font-semibold text-slate-600">6-Digit Code</label>
              <input
                type="text"
                id="otp"
                maxLength={6}
                className="bg-white border border-slate-200 rounded-lg px-3.5 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer mt-2"
              disabled={submitting}
            >
              {submitting ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <button
              type="button"
              onClick={() => { setRequire2FA(false); setOtp(''); }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-3 rounded-lg transition-all cursor-pointer mt-2 border-none"
              disabled={submitting}
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (resetMode) {
    return (
      <div className="bg-slate-50 min-h-[90vh] flex items-center justify-center px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm w-full max-w-[440px]">
          <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-1">Reset Password</h2>
          <p className="text-sm text-slate-500 text-center mb-8">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {resetSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 border-2 border-green-100 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
                ✉️
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Check your email</h3>
              <p className="text-sm text-slate-500 mb-6">
                We've sent a password reset link to <span className="font-semibold text-slate-700">{resetEmail}</span>
              </p>
              <button
                onClick={() => {
                  setResetMode(false);
                  setResetSent(false);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="resetEmail" className="text-xs font-semibold text-slate-600">Email Address</label>
                <input
                  type="email"
                  id="resetEmail"
                  className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer mt-2"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm py-3 rounded-lg shadow-sm transition-all cursor-pointer"
                disabled={submitting}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm w-full max-w-[440px]">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-1">Welcome Back</h2>
        <p className="text-sm text-slate-500 text-center mb-8">
          Sign in to access your placement dashboard.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-600">Email Address</label>
            <input
              type="email"
              id="email"
              className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-semibold text-slate-600">Password</label>
              <button 
                type="button" 
                onClick={() => {
                  setResetMode(true);
                  setError('');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              id="password"
              className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer mt-2"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 transition-colors font-bold no-underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
