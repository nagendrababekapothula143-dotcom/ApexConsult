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
  
  const { login, loginWithGoogle, user, verify2FA } = useContext(AuthContext);
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

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleSubmitting(true);
    const res = await loginWithGoogle('student');
    setGoogleSubmitting(false);
    
    if (res.success) {
      if (res.require2FA) {
        setRequire2FA(true);
      }
      // Redirect handled by useEffect
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
            <label htmlFor="password" className="text-xs font-semibold text-slate-600">Password</label>
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
            disabled={submitting || googleSubmitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Or</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={submitting || googleSubmitting}
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm py-3 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {googleSubmitting ? 'Connecting...' : 'Sign in with Google'}
        </button>

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
