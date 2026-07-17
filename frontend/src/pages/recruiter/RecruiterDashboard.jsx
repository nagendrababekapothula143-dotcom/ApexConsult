import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import api, { getAvatarSource } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import GlobalProfileModal from '../../components/GlobalProfileModal';

const SkeletonCard = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="h-5 bg-slate-200 rounded w-40 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-24"></div>
      </div>
      <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
    </div>
    <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
    <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
    <div className="h-10 bg-slate-200 rounded-xl w-full"></div>
  </div>
);

const RecruiterDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const toast = useToast();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  
  const [uploadingId, setUploadingId] = useState(null);
  const [resumeFiles, setResumeFiles] = useState({});

  useEffect(() => {
    document.title = 'Recruiter Dashboard | Kryntel Console';
    if (!user || user.role !== 'recruiter') {
      navigate('/');
    } else {
      fetchApplications();
    }
  }, [user, navigate]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/applications/recruiter');
      setApplications(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch assigned applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (socket) {
      const handleAppUpdate = () => fetchApplications();
      socket.on('application_updated', handleAppUpdate);
      return () => {
        socket.off('application_updated', handleAppUpdate);
      };
    }
  }, [socket]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleFileChange = (appId, e) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFiles(prev => ({ ...prev, [appId]: e.target.files[0] }));
    }
  };

  const handleUploadResume = async (appId) => {
    const file = resumeFiles[appId];
    if (!file) {
      toast.error('Please select a resume file first');
      return;
    }

    setUploadingId(appId);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      await api.post(`/applications/${appId}/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Resume uploaded successfully.');
      
      // Clear file selection
      setResumeFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[appId];
        return newFiles;
      });

      // Refresh list
      fetchApplications();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploadingId(null);
    }
  };

  const Icons = {
    Students: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
      
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
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 uppercase overflow-hidden shrink-0">
          <img src={`https://placehold.co/100x100?text=${(user?.name || "Recruiter").charAt(0).toUpperCase()}`} alt="Avatar" className="w-full h-full object-cover" />
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
              <img src="/Untitled%20design%20(1).png" alt="Kryntel Logo" className="w-8 h-8 object-contain shrink-0 -ml-1" />
              Kryntel <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
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

          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-4">Navigation</span>

          <ul className="flex flex-col gap-1 list-none m-0 p-0">
            <li>{renderNavLink('/recruiter', <Icons.Students />, 'Assigned Students', true)}</li>
          </ul>

        </div>

        {/* PROFILE CARD AT BOTTOM */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-800 overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <img src={getAvatarSource(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <img src={`https://placehold.co/100x100?text=${(user?.name || "Recruiter").charAt(0).toUpperCase()}`} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-none mb-1">{user?.name || "Recruiter"}</h4>
              <p className="text-[10px] text-slate-400 font-medium">Recruiter Team</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setIsProfileModalOpen(true)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Profile Settings" aria-label="Profile Settings">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Open Chat" aria-label="Open Chat">
              <Icons.Chat />
            </button>
            <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent" title="Sign Out" aria-label="Sign Out">
              <Icons.Logout />
            </button>
          </div>
        </div>

      </aside>

      <GlobalProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* Main Content Area */}
      <main className="lg:pl-[280px] min-h-screen pt-[64px] lg:pt-0">
        <div className="p-4 md:p-8">
        
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Your Assigned Students</h1>
              <p className="text-slate-500 text-sm mt-1">Assist students with their applications and upload finalized resumes.</p>
            </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pending Assistance
            </button>
            <button 
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Completed
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (() => {
          const displayedApps = applications.filter(app => 
            activeTab === 'pending' 
              ? app.status === 'recruiter_requested' 
              : app.status !== 'recruiter_requested'
          );

          if (displayedApps.length === 0) {
            return (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {activeTab === 'pending' ? 'No Pending Applications' : 'No Completed Applications'}
                </h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  {activeTab === 'pending' 
                    ? 'You currently have no students assigned to you for assistance.' 
                    : 'You have not completed any application assistance yet.'}
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedApps.map((app) => (
              <div key={app._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      app.status === 'recruiter_requested' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      app.status === 'application sent' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                      app.status === 'pending' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                      app.status === 'interview' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                      app.status === 'offer' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      app.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {app.status === 'recruiter_requested' ? 'Needs Assistance' : app.status}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-slate-900 text-lg mb-1 truncate" title={app.job?.title}>
                    {app.job?.title || 'Unknown Role'}
                  </h3>
                  <div className="text-sm font-semibold text-indigo-600 truncate mb-4">
                    {app.job?.company || 'Unknown Company'}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Student Details</div>
                    <div className="font-bold text-slate-800">{app.student?.name}</div>
                    <div className="text-sm text-slate-500 truncate">{app.student?.email}</div>
                    {app.student?.phone && <div className="text-sm text-slate-500">{app.student?.phone}</div>}
                  </div>
                </div>

                <div className="p-5 bg-slate-50 flex-1 flex flex-col justify-end">
                  {app.status === 'recruiter_requested' ? (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-slate-600">
                        1. Assist the student with their application externally.<br/>
                        2. Upload their finalized resume here to submit it to ATS.
                      </div>
                      
                      <div className="relative">
                        <input 
                          type="file" 
                          id={`resume-${app._id}`}
                          className="sr-only" 
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleFileChange(app._id, e)}
                        />
                        <label 
                          htmlFor={`resume-${app._id}`}
                          className={`flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                            resumeFiles[app._id] 
                              ? 'border-indigo-400 bg-indigo-50 text-indigo-700' 
                              : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
                          }`}
                        >
                          {resumeFiles[app._id] ? resumeFiles[app._id].name : 'Select Final Resume'}
                        </label>
                      </div>

                      <button
                        onClick={() => handleUploadResume(app._id)}
                        disabled={!resumeFiles[app._id] || uploadingId === app._id}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
                      >
                        {uploadingId === app._id ? 'Uploading...' : 'Submit to ATS'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <div className="text-sm font-bold text-slate-800 mb-3">Assistance Complete</div>
                      
                      {app.resumeUrl ? (
                        <a
                          href={app.resumeUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${app.resumeUrl}` : app.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-full bg-white border border-slate-200 text-indigo-600 hover:text-indigo-700 hover:border-indigo-300 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm no-underline"
                        >
                          🗎 View Uploaded Resume
                        </a>
                      ) : (
                        <div className="text-xs text-slate-500 mt-1">Resume has been uploaded to ATS.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
        </div>
      </main>
    </div>
  );
};

export default RecruiterDashboard;
