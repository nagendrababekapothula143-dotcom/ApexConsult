import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Hide top navigation header in the Admin console to allow full-height sidebar layouts
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path
      ? 'text-sm text-indigo-600 font-semibold'
      : 'text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium';
  };

  const isStudent = location.pathname.startsWith('/student');

  return (
    <nav className={`sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200 py-3 sm:py-4 ${isStudent ? 'lg:pl-[280px]' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
        {!isStudent ? (
          <Link to="/" className="text-lg sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-1 sm:gap-1.5 no-underline">
            Kryntel <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full inline-block"></span>
          </Link>
        ) : (
          <div /> // Spacer to preserve alignment
        )}
        
        {/* Desktop Navigation */}
        <ul className="hidden sm:flex items-center gap-6 list-none m-0 p-0 text-sm">
          {!isStudent && (
            <li>
              <Link to="/" className={isActive('/')}>
                Home
              </Link>
            </li>
          )}
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
                <span className="font-medium text-slate-700">
                  {user.name ? user.name.split(' ')[0] : 'Hi'}
                </span>
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors no-underline">
                  Get Started
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Mobile Hamburger Icon */}
        <div className="sm:hidden flex items-center">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-600 hover:text-slate-900 focus:outline-none p-1"
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
        <div className="sm:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg py-4 px-4 flex flex-col gap-4">
          {!isStudent && (
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={isActive('/')}>
              Home
            </Link>
          )}
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
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <span className="font-medium text-slate-700">
                  {user.name || 'Hi'}
                </span>
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg text-left"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3 pt-2">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className={isActive('/login')}>
                Login
              </Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="bg-indigo-600 text-center text-white font-semibold text-xs px-4 py-2 rounded-lg">
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
