import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Define custom labels for specific paths if needed
  const getLabel = (path) => {
    const labels = {
      admin: 'Admin',
      overview: 'Overview',
      students: 'All Students',
      'ats-resumes': 'ATS Resumes',
      'post-jobs': 'Job Postings',
      team: 'Team Management',
      'audit-logs': 'Audit Logs'
    };
    return labels[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  if (pathnames.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center">
      <ol className="flex items-center space-x-2 text-sm text-slate-500">
        <li>
          <Link to="/" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
            <Home className="w-4 h-4" />
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;

          return (
            <li key={to} className="flex items-center space-x-2">
              <ChevronRight className="w-4 h-4 text-slate-300" strokeWidth={2} />
              {isLast ? (
                <span className="font-medium text-slate-900" aria-current="page">
                  {getLabel(value)}
                </span>
              ) : (
                <Link to={to} className="hover:text-slate-900 transition-colors">
                  {getLabel(value)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
