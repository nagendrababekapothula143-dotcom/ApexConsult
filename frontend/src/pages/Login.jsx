import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Sign In | Apex Consulting';
  }, []);

  useEffect(() => {
    // If already logged in, redirect
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
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
      // Redirect handled by useEffect
    } else {
      setError(res.message);
    }
  };

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
