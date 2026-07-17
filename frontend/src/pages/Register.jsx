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
  
  const { register, user } = useContext(AuthContext);
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
    <div className="bg-slate-50 min-h-[90vh] flex items-center justify-center px-4 pt-32 pb-12 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 sm:p-10 shadow-xl w-full max-w-[460px] relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center p-3">
             <img src="/Untitled%20design%20(1).png" alt="Logo" className="w-full h-full object-contain filter brightness-0 invert" />
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 text-center mb-2 tracking-tight">Create Account</h2>
        <p className="text-sm text-slate-500 font-medium text-center mb-8">
          Sign up to apply for consulting placements.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-300/60 flex items-center justify-center bg-white/50 shadow-sm overflow-hidden relative transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/50 group-hover:shadow-md">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl opacity-80">📸</span>
                )}
                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                  <span className="text-white text-xs font-bold tracking-widest uppercase">Upload</span>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Profile Picture (Optional)</span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase tracking-widest">Full Name</label>
            <input
              type="text"
              id="name"
              className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
            <label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase tracking-widest">Password</label>
            <input
              type="password"
              id="password"
              className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>


          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all cursor-pointer mt-6 active:scale-[0.98]"
            disabled={submitting}
          >
            {submitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>

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
