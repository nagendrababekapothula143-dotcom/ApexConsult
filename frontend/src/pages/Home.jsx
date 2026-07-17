import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    document.title = 'Kryntel | Elite Placements Consulting';
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-73px)] flex flex-col justify-center relative overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
      
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-indigo-200/50 dark:bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none transition-colors"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-200/50 dark:bg-violet-600/10 blur-[100px] rounded-full pointer-events-none transition-colors"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <section className="relative max-w-7xl mx-auto px-6 text-center w-full pb-20 z-10 pt-10">
        
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-inner shadow-indigo-500/5 dark:shadow-indigo-500/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Direct Career Pathing
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-tight mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Empowering Ambitions,<br />
          Securing <span className="bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Elite Careers</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          Connect with top-tier consultancies, upload your resume seamlessly, and fast-track your applications. Built for students, approved by leaders.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          {user ? (
            user.role === 'admin' ? (
              <Link to="/admin" className="group relative bg-indigo-600 dark:bg-white text-white dark:text-slate-950 font-bold text-base px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-md hover:shadow-lg dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] dark:hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] no-underline flex items-center justify-center gap-2">
                Enter Admin Dashboard
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            ) : user.role === 'recruiter' ? (
              <Link to="/recruiter" className="group relative bg-indigo-600 dark:bg-white text-white dark:text-slate-950 font-bold text-base px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-md hover:shadow-lg dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] dark:hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] no-underline flex items-center justify-center gap-2">
                Enter Recruiter Portal
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            ) : (
              <Link to="/student" className="group relative bg-indigo-600 dark:bg-white text-white dark:text-slate-950 font-bold text-base px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-md hover:shadow-lg dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] dark:hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] no-underline flex items-center justify-center gap-2">
                Browse Job Board
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            )
          ) : (
            <>
              <Link to="/register" className="group relative bg-indigo-600 dark:bg-white text-white dark:text-slate-950 font-bold text-base px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-md hover:shadow-lg dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] dark:hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] no-underline flex items-center justify-center gap-2">
                Create Account
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
              <Link to="/login" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-white font-bold text-base px-8 py-4 rounded-2xl transition-all shadow-sm hover:shadow-md dark:hover:shadow-lg no-underline flex items-center justify-center">
                Sign In to Portal
              </Link>
            </>
          )}
        </div>
        
        {/* Decorative UI Elements */}
        <div className="mt-20 max-w-4xl mx-auto relative hidden md:block animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-transparent to-transparent z-10 transition-colors"></div>
          <div className="w-full h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-xl dark:shadow-2xl relative overflow-hidden flex flex-col transition-colors">
            <div className="h-10 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50 flex items-center px-4 gap-2 transition-colors">
              <div className="w-3 h-3 rounded-full bg-rose-400 dark:bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400 dark:bg-emerald-500/80"></div>
            </div>
            <div className="flex-1 p-6 flex gap-4 opacity-70 dark:opacity-50">
               <div className="w-1/3 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"></div>
               <div className="w-2/3 flex flex-col gap-4">
                 <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"></div>
                 <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"></div>
               </div>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
};

export default Home;
