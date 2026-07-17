import React, { useState, useEffect, useContext } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import api, { getBaseUrl, getAvatarSource } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import Loader from '../components/Loader';

import ThemeToggle from '../components/ThemeToggle';
import GlobalProfileModal from '../components/GlobalProfileModal';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const currentLocation = useLocation();
  
  // Shared Dynamic States
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [globalApplications, setGlobalApplications] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [hasUnreadSupport, setHasUnreadSupport] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Status Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals & Form states
  const [showJobModal, setShowJobModal] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [salary, setSalary] = useState('');
  const [placementFee, setPlacementFee] = useState('');
  const [link, setLink] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [submittingJob, setSubmittingJob] = useState(false);

  // Mock structures
  const [payments, setPayments] = useState([
    { id: 'TXN-1082', student: 'Jane Student', amount: '$1,500', status: 'Completed', date: '2026-07-08' },
    { id: 'TXN-1083', student: 'Mark Spencer', amount: '$1,200', status: 'Pending', date: '2026-07-09' },
    { id: 'TXN-1084', student: 'Elena Rostova', amount: '$1,500', status: 'Completed', date: '2026-07-10' },
  ]);
  const [generatedLinks, setGeneratedLinks] = useState([
    { id: 'LNK-901', student: 'Mark Spencer', amount: '$1,200', url: 'https://apex.consulting/pay/lnk_901x82', status: 'Active' },
    { id: 'LNK-902', student: 'David Kim', amount: '$1,500', url: 'https://apex.consulting/pay/lnk_902a77', status: 'Expired' },
  ]);
  const [tickets, setTickets] = useState([]);
  const [interviews, setInterviews] = useState([
    { id: 'INT-301', student: 'Jane Student', job: 'Strategy Analyst at McKinsey', date: '2026-07-15', time: '14:00 GMT', interviewer: 'Alex Mercer (Partner)', status: 'Scheduled' },
    { id: 'INT-302', student: 'Elena Rostova', job: 'Management Consultant at Bain', date: '2026-07-18', time: '10:30 GMT', interviewer: 'Sarah Connor (Director)', status: 'Scheduled' },
  ]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [recruiters, setRecruiters] = useState([]);

  // Sidebar Icons
  const Icons = {
    Dashboard: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
    Students: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    Payments: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    ),
    PaymentLinks: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    ),
    Salaries: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ),
    ATSResumes: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    CreateTicket: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    ),
    Interviews: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    ),
    JobPlacements: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    ),
    UserAccess: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
      </svg>
    ),
    TeamManagement: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    AuditLogs: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
    ),
    Recruiters: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 8v4l3 3"></path>
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
    ),
    Settings: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    )
  };

  const fetchData = async (resources = []) => {
    try {
      setLoading(true);
      const t = `?t=${Date.now()}`;
      
      const promises = [];
      
      if (resources.includes('jobs')) {
        promises.push(api.get(`/jobs?includeExpired=true&t=${Date.now()}`).then(res => setJobs(res.data.data)));
      }
      if (resources.includes('students')) {
        promises.push(api.get(`/auth/students${t}`).then(res => setStudents(res.data.data)));
      }
      if (resources.includes('admins')) {
        promises.push(api.get(`/auth/admins${t}`).then(res => setTeamMembers(res.data.data)));
      }
      if (resources.includes('applications')) {
        promises.push(api.get(`/applications${t}`).then(res => setGlobalApplications(res.data.data)));
      }
      if (resources.includes('recruiters')) {
        promises.push(api.get(`/auth/recruiters${t}`).then(res => setRecruiters(res.data.data)));
      }

      await Promise.all(promises);
      
      if (resources.includes('jobs') && jobs.length === 0) {
        // Will auto-select first job if needed in children
      }
    } catch (err) {
      console.error('Error fetching admin dashboard details:', err);
      setError('Could not retrieve requested information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Unread status polling removed because messages API was deleted
  }, [user]);

  // Set default document title if not set by children
  useEffect(() => {
    if (document.title === 'Kryntel') {
      document.title = 'Admin Dashboard | Kryntel';
    }
  }, []);

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (msg) => {
        if (msg.senderRole === 'student') {
          setHasUnreadSupport(true);
        }
      };

      const handleNewApp = (data) => {
        const text = data.recruiterId 
          ? `New application from ${data.studentName} for ${data.jobTitle} (Assisted by Recruiter)`
          : `New application from ${data.studentName} for ${data.jobTitle}`;
        setNotification(text);
        setTimeout(() => setNotification(null), 8000);
        fetchDashboardData(true);
      };

      const handleAppUpdate = (data) => {
        fetchDashboardData(true);
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('new_application', handleNewApp);
      socket.on('application_updated', handleAppUpdate);
      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('new_application', handleNewApp);
        socket.off('application_updated', handleAppUpdate);
      };
    }
  }, [socket]);

  const handleJobSelect = async (job) => {
    setSelectedJob(job);
    setLoadingApps(true);
    setError('');
    try {
      const res = await api.get(`/applications/job/${job._id}`);
      setApplications(res.data.data);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Could not retrieve candidate applications.');
    } finally {
      setLoadingApps(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !company || !location || !description) {
      setError('Job Title, Company, Location, and Description are required.');
      return;
    }

    setSubmittingJob(true);
    try {
      const res = await api.post('/jobs', {
        title,
        company,
        location,
        description,
        requirements,
        salary,
        placementFee: Number(placementFee) || 0,
        link,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      setSuccess('Job posting published successfully!');
      setTitle('');
      setRequirements('');
      setSalary('');
      setPlacementFee('');
      setLink('');
      setExpiresAt('');
      setShowJobModal(false);

      // Refresh list
      const updatedJobsRes = await api.get('/jobs?includeExpired=true');
      setJobs(updatedJobsRes.data.data);
      if (res.data.data) {
        handleJobSelect(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish job listing');
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    setError('');
    try {
      const res = await api.patch(`/applications/${appId}`, { status: newStatus });
      if (res.data.success) {
        setApplications((prev) =>
          prev.map((app) => (app._id === appId ? { ...app, status: newStatus } : app))
        );
        setGlobalApplications((prev) =>
          prev.map((app) => (app._id === appId ? { ...app, status: newStatus } : app))
        );
        setSuccess(`Application status changed to ${newStatus}.`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to alter candidate status.');
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

  const renderNavLink = (to, icon, label, end = false) => {
    return (
      <NavLink
        to={to}
        end={end}
        onClick={() => setIsSidebarOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-4 px-4 py-2.5 text-[14px] font-medium rounded-full w-full text-left transition-all cursor-pointer no-underline ${
            isActive
              ? 'bg-slate-100 text-slate-900 font-semibold'
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
    return <Loader text="Loading Kryntel..." fullScreen={true} />;
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40">
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
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 uppercase overflow-hidden shrink-0">
            <img src={`https://placehold.co/100x100?text=${(user?.name || "Admin").charAt(0).toUpperCase()}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
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
      <aside className={`w-[260px] bg-white border-r border-slate-100 flex flex-col justify-between h-screen fixed left-0 top-0 z-50 p-4 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          
          <div className="flex justify-between items-center pl-2">
            <Link to="/" className="text-[22px] font-medium tracking-tight text-slate-800 flex items-center gap-2.5 no-underline hover:opacity-80 transition-opacity">
              <img src="/Untitled%20design%20(1).png" alt="Kryntel Logo" className="w-7 h-7 object-contain shrink-0" />
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

          <ul className="flex flex-col gap-1 list-none m-0 p-0">
            <li>{renderNavLink('/admin/overview', <Icons.Dashboard />, 'Dashboard')}</li>
            <li>{renderNavLink('/admin/students', <Icons.Students />, 'All Students')}</li>
            <li>{renderNavLink('/admin/ats-resumes', <Icons.ATSResumes />, 'ATS Resumes')}</li>
            <li>{renderNavLink('/admin/post-jobs', <Icons.JobPlacements />, 'Post Jobs')}</li>
            <li>{renderNavLink('/admin/team', <Icons.TeamManagement />, 'Team Management')}</li>
            <li>{renderNavLink('/admin/audit-logs', <Icons.AuditLogs />, 'Audit Logs')}</li>
            <li>{renderNavLink('/admin/settings', <Icons.Settings />, 'Settings')}</li>
          </ul>

          </div>
        </div>

        {/* PROFILE CARD AT BOTTOM */}
        <div className="flex items-center justify-between pt-4 mt-auto">
          <div className="flex items-center gap-3 pl-2">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-medium text-sm overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <img src={getAvatarSource(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <img src={`https://placehold.co/100x100?text=${(user?.name || "Sowmyarupa").charAt(0).toUpperCase()}`} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-800 leading-none mb-1">{user?.name || "Sowmyarupa"}</h4>
              <p className="text-[12px] text-slate-500 font-normal">{user?.role === 'admin' ? "Mentor Team" : "Admin Staff"}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setIsProfileModalOpen(true)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Profile Settings" aria-label="Profile Settings">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>

            <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Sign Out" aria-label="Sign Out">
              <Icons.Logout />
            </button>
          </div>
        </div>

      </aside>

      <GlobalProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* DYNAMIC CHILD WORKSPACE CONTENT */}
      <main className="lg:pl-[260px] min-h-screen pt-[64px] lg:pt-0 bg-slate-50 flex flex-col">
        {/* Desktop Top Navbar / Header area */}
        <div className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 z-30 sticky top-0">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 border border-slate-200 min-w-[220px] tabular-nums">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {currentTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase cursor-default border border-indigo-200 overflow-hidden" title={user?.email}>
              <img src={`https://placehold.co/100x100?text=${(user?.name || "A").charAt(0).toUpperCase()}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col">
              <Outlet context={{
              jobs,
              selectedJob,
              handleJobSelect,
              loadingApps,
              applications,
              handleStatusChange,
              setShowJobModal,
              getStatusBadgeClass,
              getResumeDownloadUrl,
              students,
              payments,
              generatedLinks,
              setGeneratedLinks,
              tickets,
              setTickets,
              interviews,
              teamMembers,
              recruiters,
              globalApplications,
              setGlobalApplications,
              fetchData,
              error,
              setError,
              success,
              setSuccess,
              setHasUnreadSupport,
              setApplications: setGlobalApplications
            }} />
            </div>
        </div>
      </main>

      {/* CREATE JOB MODAL OVERLAY */}
      {showJobModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            
            {/* Modal Premium Header */}
            <div className="bg-slate-900 text-white p-6 sm:px-8 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowJobModal(false);
                }} 
                className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border-none z-50"
                aria-label="Close create job modal"
              >
                <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 text-indigo-300 shadow-inner">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black mb-1">Create Job Listing</h2>
                  <p className="text-sm text-slate-400 font-medium">Publish a new consulting position to the student portal.</p>
                </div>
              </div>
            </div>
            
            {/* Modal Body / Form */}
            <form id="create-job-form" onSubmit={handleCreateJob} className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <div className="space-y-6">
                
                {/* Row 1: Title & Company */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Job Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400"
                      placeholder="e.g. Associate Consultant"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Company Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400"
                      placeholder="e.g. McKinsey, Bain"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Location & Salary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Location <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400"
                      placeholder="e.g. London, Hybrid"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Salary <span className="text-slate-400 normal-case tracking-normal">(Optional)</span></label>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400"
                      placeholder="e.g. $90k - $110k"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 3: Link & Requirements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Posting Link <span className="text-slate-400 normal-case tracking-normal">(Optional)</span></label>
                    <input
                      type="url"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400"
                      placeholder="https://careers.company.com/..."
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Expiration Date <span className="text-slate-400 normal-case tracking-normal">(Optional)</span></label>
                    <input
                      type="date"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Requirements</label>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400"
                      placeholder="e.g. Analysis, Communication (comma separated)"
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                    />
                  </div>

                {/* Row 4: Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Job Description <span className="text-red-500">*</span></label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 min-h-[140px] resize-y custom-scrollbar"
                    placeholder="Provide a detailed description of the role, responsibilities, and expected impact..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

              </div>
            </form>

            {/* Sticky Footer */}
            <div className="bg-slate-50 p-6 sm:px-8 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fields marked with <span className="text-red-500">*</span> are required.
              </span>
              
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  className="bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 font-bold text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm" 
                  onClick={() => setShowJobModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  form="create-job-form"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-8 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm shadow-indigo-500/30 hover:shadow flex items-center gap-2" 
                  disabled={submittingJob}
                >
                  {submittingJob ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Publishing...
                    </>
                  ) : (
                    'Publish Listing'
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Real-time Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <svg className="w-5 h-5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm font-semibold">{notification}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-indigo-200 hover:text-white bg-transparent border-none cursor-pointer p-0 text-lg leading-none" aria-label="Dismiss notification">
            &times;
          </button>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
