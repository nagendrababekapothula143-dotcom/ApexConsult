import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    document.title = 'Kryntel | Elite Placements Consulting';
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col justify-center">
      <section className="relative max-w-7xl mx-auto px-6 text-center w-full pb-20">
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
    </div>
  );
};

export default Home;
