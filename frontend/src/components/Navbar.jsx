import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Hide top navigation header in the Admin and Recruiter consoles to allow full-height layouts
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/recruiter')) {
    return null;
  }

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path
      ? 'text-sm text-indigo-600 dark:text-indigo-400 font-semibold'
      : 'text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors font-medium';
  };

  const isStudent = location.pathname.startsWith('/student');

  return (
    <nav className={`sticky top-0 z-40 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 py-3 sm:py-4 ${isStudent ? 'lg:pl-[280px]' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
        {!isStudent ? (
          <Link to="/" className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2 no-underline">
            <img src="/Untitled%20design%20(1).png" alt="Kryntel Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0 drop-shadow-md" />
            Kryntel <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-indigo-500 rounded-full inline-block shadow-none dark:shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
          </Link>
        ) : (
          <div /> // Spacer to preserve alignment
        )}
        
        {/* Desktop Navigation */}
        <ul className="hidden sm:flex items-center gap-6 list-none m-0 p-0 text-sm">
          {user ? (
            <>
              {user.role === 'admin' ? (
                <li>
                  <Link to="/admin" className={isActive('/admin')}>
                    Console
                  </Link>
                </li>
              ) : (
                <li>
                  <Link to="/student" className={isActive('/student')}>
                    Find Jobs
                  </Link>
                </li>
              )}
              <li className="flex items-center gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {user.name ? user.name.split(' ')[0] : 'Hi'}
                </span>
                <span className="bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 border dark:border-slate-700 dark:text-slate-300 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login" className={isActive('/login')}>
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors no-underline shadow-none dark:shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)]">
                  Get Started
                </Link>
              </li>
            </>
          )}
          <li className="pl-2 border-l border-slate-200 dark:border-slate-800 flex items-center">
            <ThemeToggle />
          </li>
        </ul>

        {/* Mobile Hamburger Icon */}
        <div className="sm:hidden flex items-center">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white focus:outline-none p-1"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-xl dark:shadow-slate-900/50 py-4 px-4 flex flex-col gap-4">
          {user ? (
            <>
              {user.role === 'admin' ? (
                <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className={isActive('/admin')}>
                  Console
                </Link>
              ) : (
                <Link to="/student" onClick={() => setIsMobileMenuOpen(false)} className={isActive('/student')}>
                  Find Jobs
                </Link>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {user.name || 'Hi'}
                </span>
                <span className="bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300 border font-semibold text-xs px-3 py-2 rounded-lg text-left transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3 pt-2">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className={isActive('/login')}>
                Login
              </Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="bg-indigo-600 text-center text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-none dark:shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)]">
                Get Started
              </Link>
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
