import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  
  const { register, loginWithGoogle, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Create Account | Kryntel';
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

    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    const res = await register(name, email, password, role, avatarBase64);
    setSubmitting(false);

    if (res.success) {
      // Redirect handled by useEffect
    } else {
      setError(res.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleSubmitting(true);
    const customName = name.trim() !== '' ? name : null;
    const res = await loginWithGoogle(role, customName);
    setGoogleSubmitting(false);
    
    if (res.success) {
      // Redirect handled by useEffect
    } else {
      setError(res.message);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarBase64(reader.result);
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarBase64(null);
      setAvatarPreview(null);
    }
  };

  return (
    <div className="bg-slate-50 min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm w-full max-w-[460px]">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-1">Create Account</h2>
        <p className="text-sm text-slate-500 text-center mb-8">
          Sign up to apply for consulting placements.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="relative group cursor-pointer">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative transition-colors group-hover:border-indigo-400 group-hover:bg-indigo-50">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📸</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-xs font-semibold">Upload</span>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">Profile Picture (Optional)</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-slate-600">Full Name</label>
            <input
              type="text"
              id="name"
              className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="role" className="text-xs font-semibold text-slate-600">Account Type</label>
            <select
              id="role"
              className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">Student (Apply for Placements)</option>
              <option value="recruiter">Recruiter (Assist Students)</option>
              <option value="admin">Consulting Administrator (Manage Listings)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer mt-2"
            disabled={submitting || googleSubmitting}
          >
            {submitting ? 'Registering...' : 'Create Account'}
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
          {googleSubmitting ? 'Connecting...' : 'Sign up with Google'}
        </button>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 transition-colors font-bold no-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
