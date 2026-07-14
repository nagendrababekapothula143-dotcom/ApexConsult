import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import api from '../../services/api';

const RecruiterDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
      setError('Failed to fetch assigned applications');
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
      setError('Please select a resume file first');
      return;
    }

    setUploadingId(appId);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      await api.post(`/applications/${appId}/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Resume uploaded successfully. The application status is now Application Sent.');
      
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
      setError(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-white font-black text-sm tracking-tighter">KC</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Recruiter Dashboard
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-700 hidden sm:block">
              Welcome, <span className="text-indigo-600 font-bold">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold border border-red-100 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-700">&times;</button>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-sm font-semibold border border-emerald-100 flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-700">&times;</button>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900">Your Assigned Students</h2>
          <p className="text-slate-500 text-sm mt-1">Assist students with their applications and upload finalized resumes.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Assigned Applications</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              You currently have no students assigned to you for assistance. When an admin assigns a student, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
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
                      <div className="text-sm font-bold text-slate-800">Assistance Complete</div>
                      <div className="text-xs text-slate-500 mt-1">Resume has been uploaded to ATS.</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RecruiterDashboard;
