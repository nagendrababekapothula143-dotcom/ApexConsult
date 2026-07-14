import React, { useState, useEffect, useContext } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import api, { getBaseUrl } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import FloatingChat from '../components/FloatingChat';
import Loader from '../components/Loader';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Dynamic States
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const t = isSilent ? `?t=${Date.now()}` : '';
      const [jobsRes, appsRes] = await Promise.all([
        api.get(`/jobs${t}`),
        api.get(`/applications/student${t}`)
      ]);
      setJobs(jobsRes.data.data);
      setApplications(appsRes.data.data);
      
      if (!isSilent && jobsRes.data.data.length > 0) {
        setSelectedJob(prev => prev || jobsRes.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!isSilent) setActionError('Failed to fetch data from server.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Real-time background polling every 5 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!resumeFile) {
      setActionError('Please select a resume file first');
      return;
    }

    if (!selectedJob) return;

    const formData = new FormData();
    formData.append('jobId', selectedJob._id);
    formData.append('resume', resumeFile);

    try {
      setUploading(true);
      await api.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setActionSuccess('Application submitted successfully!');
      setResumeFile(null);
      
      // Reset file input element
      const fileInput = document.getElementById('resume-file');
      if (fileInput) fileInput.value = '';

      // Refresh applications list
      const appsRes = await api.get('/applications/student');
      setApplications(appsRes.data.data);
    } catch (error) {
      console.error('Error submitting application:', error);
      setActionError(error.response?.data?.message || 'Error uploading resume');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 border border-amber-200 text-amber-600';
      case 'reviewed': return 'bg-cyan-50 border border-cyan-200 text-cyan-600';
      case 'accepted': return 'bg-emerald-50 border border-emerald-200 text-emerald-600';
      case 'rejected': return 'bg-rose-50 border border-rose-200 text-rose-600';
      default: return 'bg-slate-50 border border-slate-200 text-slate-600';
    }
  };

  const getResumeDownloadUrl = (url) => {
    if (url.startsWith('/uploads')) {
      const baseUrl = getBaseUrl().replace('/api', '');
      return `${baseUrl}${url}`;
    }
    return url;
  };

  // SVG Icons
  const Icons = {
    JobBoard: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    ),
    Profile: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
    Applications: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    ),
    Chat: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
    Logout: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    )
  };

  const renderNavLink = (to, icon, label, end = false) => {
    return (
      <NavLink
        to={to}
        end={end}
        onClick={() => setIsSidebarOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl w-full text-left transition-all cursor-pointer no-underline ${
            isActive
              ? 'bg-slate-100 text-indigo-600'
              : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`
        }
      >
        {icon}
        {label}
      </NavLink>
    );
  };

  if (loading) {
    return <Loader text="Loading student dashboard..." fullScreen={true} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="bg-transparent border-none text-slate-600 hover:text-slate-900 cursor-pointer p-1.5 focus:outline-none"
          title="Open Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-1.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0 -ml-1" />
          Kryntel
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 uppercase">
          {(user?.name || "Student").charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Backdrop Scrim for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-45"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR SECTION */}
      <aside className={`w-[280px] bg-white border-r border-slate-200 flex flex-col justify-between h-screen fixed left-0 top-0 z-50 p-6 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          
          <div className="flex justify-between items-center">
            <Link to="/" className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-1.5 no-underline hover:opacity-90 transition-opacity">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0 -ml-1" />
              Kryntel <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden bg-transparent border-none text-slate-400 hover:text-slate-800 text-xl font-semibold cursor-pointer p-1"
              title="Close Menu"
            >
              &times;
            </button>
          </div>

          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-4">Navigation</span>

          <ul className="flex flex-col gap-1 list-none m-0 p-0">
            <li>{renderNavLink('/student/jobs', <Icons.JobBoard />, 'Job Board')}</li>
            <li>{renderNavLink('/student/applications', <Icons.Applications />, 'My Applications')}</li>
            <li>{renderNavLink('/student/profile', <Icons.Profile />, 'My Profile')}</li>
          </ul>

        </div>

        {/* PROFILE CARD AT BOTTOM */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-800">
              {(user?.name || "Student").charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-none mb-1">{user?.name || "Student Candidate"}</h4>
              <p className="text-[10px] text-slate-400 font-medium">Student</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Open Chat">
              <Icons.Chat />
            </button>
            <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Sign Out">
              <Icons.Logout />
            </button>
          </div>
        </div>

      </aside>

      {/* DYNAMIC CHILD WORKSPACE CONTENT */}
      <main className="lg:pl-[280px] min-h-screen pt-[64px] lg:pt-0">
        <div className="p-4 md:p-8">
          <Outlet context={{
            jobs,
            applications,
            selectedJob,
            setSelectedJob,
            resumeFile,
            setResumeFile,
            uploading,
            handleApply,
            actionError,
            actionSuccess,
            setActionError,
            setActionSuccess,
            getStatusBadgeClass,
            getResumeDownloadUrl,
            fetchData,
            setApplications,
          }} />
        </div>
      </main>

      {/* Persistent Chat Widget */}
      <FloatingChat />
    </div>
  );
};

export default StudentDashboard;
