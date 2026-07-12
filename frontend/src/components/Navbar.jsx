import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Hide top navigation header in the Admin console to allow full-height sidebar layouts
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleLogout = () => {
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
            ApexConsulting <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full inline-block"></span>
          </Link>
        ) : (
          <div /> // Spacer to preserve alignment
        )}
        
        <ul className="flex items-center gap-2 sm:gap-6 list-none m-0 p-0 text-xs sm:text-sm">
          {!isStudent && (
            <li className="hidden sm:block">
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
              <li className="flex items-center gap-1 sm:gap-2">
                <span className="font-medium text-slate-700 truncate max-w-[70px] sm:max-w-none">
                  {user.name ? user.name.split(' ')[0] : 'Hi'}
                </span>
                <span className="hidden sm:inline-block bg-indigo-50 border border-indigo-200 text-indigo-600 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors cursor-pointer"
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
                <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors no-underline">
                  Get Started
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
