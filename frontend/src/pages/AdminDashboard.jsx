import React, { useState, useEffect, useContext } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import api, { getBaseUrl } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import Loader from '../components/Loader';

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
  const [loading, setLoading] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [hasUnreadSupport, setHasUnreadSupport] = useState(false);

  // Status Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Form states
  const [showJobModal, setShowJobModal] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [salary, setSalary] = useState('');
  const [link, setLink] = useState('');
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
    )
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [jobsRes, studentsRes, ticketsRes, adminsRes, globalAppsRes] = await Promise.all([
        api.get('/jobs'),
        api.get('/auth/students'),
        api.get('/tickets'),
        api.get('/auth/admins'),
        api.get('/applications')
      ]);

      setJobs(jobsRes.data.data);
      setStudents(studentsRes.data.data);
      setTickets(ticketsRes.data.data);
      setTeamMembers(adminsRes.data.data);
      setGlobalApplications(globalAppsRes.data.data);
      
      if (jobsRes.data.data.length > 0) {
        handleJobSelect(jobsRes.data.data[0]);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard details:', err);
      setError('Could not retrieve workspace information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
      fetchUnreadStatus();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (msg) => {
        if (msg.senderRole === 'student') {
          setHasUnreadSupport(true);
        }
      };

      socket.on('newMessage', handleNewMessage);
      return () => {
        socket.off('newMessage', handleNewMessage);
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

  const fetchUnreadStatus = async () => {
    try {
      const res = await api.get('/messages/admin/unread');
      setHasUnreadSupport(res.data.hasUnread);
    } catch (err) {
      console.error('Failed to fetch unread status', err);
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
        link,
      });

      setSuccess('Job posting published successfully!');
      setTitle('');
      setRequirements('');
      setSalary('');
      setLink('');
      setShowJobModal(false);

      // Refresh list
      const updatedJobsRes = await api.get('/jobs');
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
        <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
          ApexConsulting
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 uppercase">
          {(user?.name || "Admin").charAt(0).toUpperCase()}
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
              ApexConsulting <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
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
            <li>{renderNavLink('/admin/overview', <Icons.Dashboard />, 'Dashboard')}</li>
            <li>{renderNavLink('/admin/students', <Icons.Students />, 'All Students')}</li>
            <li>{renderNavLink('/admin/ats-resumes', <Icons.ATSResumes />, 'ATS Resumes')}</li>
            <li>{renderNavLink('/admin/post-jobs', <Icons.JobPlacements />, 'Post Jobs')}</li>
            <li className="relative">
              {renderNavLink('/admin/support', <Icons.Chat />, 'Support Inbox')}
              {hasUnreadSupport && (
                <span className="absolute top-2 right-4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
              )}
            </li>
            <li>{renderNavLink('/admin/access', <Icons.UserAccess />, 'User Access')}</li>
            <li>{renderNavLink('/admin/team', <Icons.TeamManagement />, 'Team Management')}</li>
          </ul>

        </div>

        {/* PROFILE CARD AT BOTTOM */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-800">
              {(user?.name || "Sowmyarupa").charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-none mb-1">{user?.name || "Sowmyarupa"}</h4>
              <p className="text-[10px] text-slate-400 font-medium">{user?.role === 'admin' ? "Mentor Team" : "Admin Staff"}</p>
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
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-10 h-10 border-4 border-indigo-100 rounded-full"></div>
                <div className="w-10 h-10 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading dashboard data...</p>
            </div>
          ) : (
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
              globalApplications,
              setGlobalApplications,
              fetchDashboardData,
              error,
              setError,
              success,
              setSuccess,
              setHasUnreadSupport,
            }} />
          )}
        </div>
      </main>

      {/* CREATE JOB MODAL OVERLAY */}
      {showJobModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-xl relative">
            <button onClick={() => setShowJobModal(false)} className="absolute top-4 right-4 bg-transparent border-none text-slate-400 hover:text-slate-900 text-2xl font-semibold cursor-pointer">
              &times;
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create Job Listing</h2>
            
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Job Title *</label>
                <input
                  type="text"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. Associate Consultant"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Company Name *</label>
                <input
                  type="text"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. McKinsey, Bain"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Location *</label>
                  <input
                    type="text"
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="e.g. London, Hybrid"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Salary (Optional)</label>
                  <input
                    type="text"
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="e.g. $90k - $110k"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Job Posting Link (Optional)</label>
                <input
                  type="url"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. https://careers.mckinsey.com/jobs/102"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Requirements (comma-separated)</label>
                <input
                  type="text"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. Analysis, Case Prep, Communication"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Job Description *</label>
                <textarea
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all min-h-[120px]"
                  placeholder="Provide detailed description of role..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors border-none" onClick={() => setShowJobModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow" disabled={submittingJob}>
                  {submittingJob ? 'Publishing...' : 'Publish Job'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
