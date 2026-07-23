import React, { useState, useEffect, useContext } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import api, { getBaseUrl, getAvatarSource } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

import Loader from '../components/Loader';
import FeedbackModal from '../components/FeedbackModal';
import OnboardingTour from '../components/OnboardingTour';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const currentLocation = useLocation();
  const toast = useToast();

  // Dynamic States
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const fetchData = async (resources = [], isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const t = `?t=${Date.now()}`;
      const promises = [];
      
      if (resources.includes('jobs')) {
        promises.push(api.get(`/jobs${t}`).then(res => {
          setJobs(res.data.data);
          if (!selectedJob && res.data.data.length > 0) {
            setSelectedJob(res.data.data[0]);
          }
        }));
      }
      
      if (resources.includes('applications')) {
        promises.push(api.get(`/applications/student${t}`).then(res => setApplications(res.data.data)));
      }
      if (resources.includes('payments')) {
        promises.push(api.get(`/payments/student${t}`).then(res => setPayments(res.data.data)));
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!isSilent) setActionError('Failed to fetch data from server.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (document.title === 'Kryntel') {
      document.title = 'Student Dashboard | Kryntel';
    }
  }, []);

  useEffect(() => {
    fetchData(['jobs', 'applications', 'payments']);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleAppUpdate = () => fetchData(['applications'], true);
      socket.on('application_updated', handleAppUpdate);
      return () => {
        socket.off('application_updated', handleAppUpdate);
      };
    }
  }, [socket]);

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
      const msg = error.response?.data?.message || 'Error uploading resume';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };



  const handleRequestAssistance = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!selectedJob) return;

    const formData = new FormData();
    formData.append('jobId', selectedJob._id);
    formData.append('requestAssistance', 'true');

    try {
      setUploading(true);
      await api.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setActionSuccess('Recruiter assistance requested successfully!');
      
      const appsRes = await api.get('/applications/student');
      setApplications(appsRes.data.data);
    } catch (error) {
      console.error('Error requesting assistance:', error);
      const msg = error.response?.data?.message || 'Error requesting assistance';
      setActionError(msg);
      toast.error(msg);
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
    if (!url) return '#';
    if (url.startsWith('/uploads')) {
      const baseUrl = getBaseUrl().replace('/api', '');
      return `${baseUrl}${url}`;
    }
    return url;
  };

  // SVG Icons
  const Icons = {
    Overview: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
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
    Bell: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
    ),
    Logout: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    ),
    Settings: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    ),
    Billing: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
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
          `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-[15px] transition-all duration-200 border-none no-underline ${
            isActive 
              ? 'bg-indigo-600/10 text-indigo-400 font-semibold shadow-inner border border-indigo-500/20' 
              : 'text-slate-400 hover:text-slate-50 hover:bg-slate-800 hover:shadow-sm'
          }`
        }
      >
        {icon}
        {label}
      </NavLink>
    );
  };

  // Removed global loading block so Outlet can render and fetch data
  
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30">
      <OnboardingTour />
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[64px] bg-white/70 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-40">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="bg-transparent border-none text-slate-600 hover:text-slate-900 cursor-pointer p-1.5 focus:outline-none"
          title="Open Menu"
          aria-label="Open Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-1.5">
          <img src="/Untitled%20design%20(1).png" alt="Kryntel Logo" className="w-8 h-8 object-contain shrink-0 -ml-1" />
          Kryntel
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 uppercase overflow-hidden shrink-0">
          <img src={`https://placehold.co/100x100?text=${(user?.name || "Student").charAt(0).toUpperCase()}`} alt="Avatar" className="w-full h-full object-cover" />
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
      <aside className={`w-[270px] bg-slate-950 border-r border-slate-900/50 flex flex-col justify-between h-screen fixed left-0 top-0 z-50 p-5 transition-transform duration-300 lg:translate-x-0 shadow-2xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar-dark">
          
          <div className="flex justify-between items-center pl-1">
            <Link to="/" className="text-2xl font-black tracking-tight flex items-center gap-3 no-underline hover:opacity-80 transition-opacity bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              <img src="/Untitled%20design%20(1).png" alt="Kryntel Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow-md" />
              Kryntel
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden bg-transparent border-none text-slate-400 hover:text-slate-800 text-xl font-semibold cursor-pointer p-1"
              title="Close Menu"
              aria-label="Close Menu"
            >
              &times;
            </button>
          </div>

          <div className="mt-2">
            <ul className="flex flex-col gap-1.5 list-none m-0 p-0">
            <li>{renderNavLink('/student', <Icons.Overview />, 'Overview', true)}</li>
            <li className="tour-jobs-feed">{renderNavLink('/student/jobs', <Icons.JobBoard />, 'Job Board')}</li>
            <li>{renderNavLink('/student/applications', <Icons.Applications />, 'My Applications')}</li>
            <li>{renderNavLink('/student/payments', <Icons.Billing />, 'Payments')}</li>
            <li className="tour-sidebar-profile">{renderNavLink('/student/profile', <Icons.Profile />, 'My Profile')}</li>
            <li className="tour-theme-toggle">{renderNavLink('/student/settings', <Icons.Settings />, 'Settings')}</li>
            </ul>
          </div>
        </div>

        {/* PROFILE CARD AT BOTTOM */}
        <div className="flex items-center justify-between pt-5 mt-auto border-t border-slate-800/50">
          <div className="flex items-center gap-3 pl-1">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 shadow-lg border border-indigo-500/30">
              {user?.avatarUrl && !user.avatarUrl.includes('ui-avatars') ? (
                <img src={getAvatarSource(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold tracking-wider">
                  {(() => {
                    const parts = (user?.name || 'S').trim().split(' ').filter(Boolean);
                    if (parts.length === 0) return 'S';
                    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                  })()}
                </span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200 leading-none mb-1">{user?.name || "Student Candidate"}</h4>
              <p className="text-xs text-indigo-400/80 font-medium">Student</p>
            </div>
          </div>
          <div className="flex gap-1.5 pr-1">
            <button className="relative p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Notifications" aria-label="Notifications">
              <Icons.Bell />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-950"></span>
            </button>
            <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Open Chat" aria-label="Open Chat">
              <Icons.Chat />
            </button>
            <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Sign Out" aria-label="Sign Out">
              <Icons.Logout />
            </button>
          </div>
        </div>

      </aside>

      {/* DYNAMIC CHILD WORKSPACE CONTENT */}
      <main className="lg:pl-[270px] min-h-screen pt-[64px] lg:pt-0 flex flex-col relative overflow-hidden">
        {payments.some(p => p.status === 'pending') && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between z-30 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <p className="text-sm font-bold text-amber-800 m-0">You have a pending placement fee invoice.</p>
            </div>
            <Link to="/student/payments" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg no-underline transition-colors shadow-sm whitespace-nowrap">Pay Now</Link>
          </div>
        )}
        <div key={currentLocation.pathname} className={`animate-fade-in p-4 md:p-8 flex-1 flex flex-col ${payments.some(p => p.status === 'pending') ? 'pt-4' : ''}`}>
          <Outlet context={{
            jobs,
            applications,
            payments,
            selectedJob,
            setSelectedJob,
            resumeFile,
            setResumeFile,
            uploading,
            handleApply,
            handleRequestAssistance,
            actionError,
            actionSuccess,
            setActionError,
            setActionSuccess,
            getStatusBadgeClass,
            getResumeDownloadUrl,
            fetchData,
            setApplications,
            loading
          }} />
        </div>
      </main>

      {/* Persistent Chat Widget */}

      {/* Floating Feedback Button */}
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white shadow-lg px-4 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105 z-40 cursor-pointer border-none"
      >
        <span className="text-xl leading-none">💬</span>
        <span className="text-sm">Feedback</span>
      </button>

      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </div>
  );
};

export default StudentDashboard;
