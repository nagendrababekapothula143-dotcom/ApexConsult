import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  

  
  // Reset Password State
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const { login, user } = useContext(AuthContext);
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
      // Redirect handled by useEffect if fully logged in
    } else {
      setError(res.message);
    }
  };



  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('Password reset is currently disabled. Please contact an administrator.');
  };



  if (resetMode) {
    return (
      <div className="bg-slate-50 min-h-[90vh] flex items-center justify-center px-4 pt-32 pb-12 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 sm:p-10 shadow-xl w-full max-w-[440px] relative z-10">
          <h2 className="text-3xl font-black text-slate-900 text-center mb-2 tracking-tight">Reset Password</h2>
          <p className="text-sm text-slate-500 font-medium text-center mb-8">
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
    <div className="bg-slate-50 min-h-[90vh] flex items-center justify-center px-4 pt-32 pb-12 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 sm:p-10 shadow-xl w-full max-w-[440px] relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center p-3">
             <img src="/Untitled%20design%20(1).png" alt="Logo" className="w-full h-full object-contain filter brightness-0 invert" />
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 text-center mb-2 tracking-tight">Welcome Back</h2>
        <p className="text-sm text-slate-500 font-medium text-center mb-8">
          Sign in to access your placement dashboard.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-widest">Email Address</label>
            <input
              type="email"
              id="email"
              className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase tracking-widest">Password</label>
              <button 
                type="button" 
                onClick={() => {
                  setResetMode(true);
                  setError('');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              id="password"
              className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all cursor-pointer mt-4 active:scale-[0.98]"
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
