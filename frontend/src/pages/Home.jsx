import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    document.title = 'Kryntel | Elite Placements Consulting';
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <span className="inline-flex bg-violet-50 border border-violet-200 text-violet-600 px-4.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
          Direct Career Pathing
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 leading-tight mb-6">
          Empowering Ambitions,<br />
          Securing <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Elite Careers</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Connect with top-tier consultancies, upload your resume seamlessly, and fast-track your applications. Built for students, approved by leaders.
        </p>
        <div className="flex justify-center gap-4">
          {user ? (
            user.role === 'admin' ? (
              <Link to="/admin" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow no-underline">
                Go to Admin Dashboard
              </Link>
            ) : (
              <Link to="/student" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow no-underline">
                Browse Job Board
              </Link>
            )
          ) : (
            <>
              <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow no-underline">
                Create Account
              </Link>
              <Link to="/login" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-base px-6 py-3 rounded-xl transition-colors no-underline">
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 text-left">
            <div className="text-3xl">⚡</div>
            <h3 className="text-xl font-bold text-slate-900">98% Hire Success</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Our direct alignment tool matches top students with leading global consultancy roles within weeks.
            </p>
          </div>
          <div className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 text-left">
            <div className="text-3xl">☁️</div>
            <h3 className="text-xl font-bold text-slate-900">Secure Cloud Storage</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your resumes are processed dynamically and archived safely using secure cloud infrastructure.
            </p>
          </div>
          <div className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 text-left">
            <div className="text-3xl">💼</div>
            <h3 className="text-xl font-bold text-slate-900">Admin Console</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Admins can post jobs, inspect candidate profiles, download resumes, and issue decisions instantly.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-slate-200/60 py-16 text-center">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-5">
          <h2 className="text-3xl font-bold text-slate-900">Ready to Begin Your Placement Journey?</h2>
          <p className="text-slate-500 max-w-lg leading-relaxed text-sm">
            Join hundreds of candidate students already hired at top organizations across finance, technology, and management consulting.
          </p>
          {!user && (
            <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow mt-2 no-underline">
              Get Started Now
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
