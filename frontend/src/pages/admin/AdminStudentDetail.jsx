import React, { useEffect, useMemo } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { getAvatarSource } from '../../services/api';

const AdminStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { students = [], globalApplications = [], loading, fetchData } = useOutletContext() || {};

  useEffect(() => {
    // If we land on this page directly (e.g. refresh), data won't be loaded yet
    if (students.length === 0 && fetchData) {
      fetchData(['students', 'applications']);
    }
  }, [students.length, fetchData]);

  const student = useMemo(() => {
    return students.find(s => s._id === id);
  }, [students, id]);

  const studentApps = useMemo(() => {
    return globalApplications.filter(app => {
      const appId = typeof app.student === 'object' ? app.student?._id : app.student;
      return appId === id || app.studentId === id;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [globalApplications, id]);

  useEffect(() => {
    if (student) {
      document.title = `${student.name} | Kryntel Console`;
    } else {
      document.title = 'Student Detail | Kryntel Console';
    }
  }, [student]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/70 p-12 text-center shadow-sm max-w-2xl mx-auto mt-10">
        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Student Not Found</h3>
        <p className="text-slate-500 text-sm font-medium max-w-sm mx-auto mb-6">
          The student profile you are looking for does not exist or has been deleted.
        </p>
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm cursor-pointer border-none">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/students')} 
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Back to Students"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center font-black text-xl overflow-hidden shrink-0 shadow-lg border border-white">
            {student.avatarUrl ? (
              <img src={getAvatarSource(student.avatarUrl)} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              (student.name || 'S').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{student.name}</h1>
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${
                student.status === 'inactive' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {student.status || 'ACTIVE'}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                ID: {student.apexId || student._id.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Contact & Profile info */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
            
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-5">Contact Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Email Address</p>
                  <a href={`mailto:${student.email}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors no-underline">{student.email}</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Phone Number</p>
                  {student.phone ? (
                    <a href={`tel:${student.phone}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors no-underline">{student.phone}</a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-400 italic m-0">Not provided</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">LinkedIn Profile</p>
                  {student.linkedinUrl ? (
                    <a href={student.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors no-underline break-all">{student.linkedinUrl}</a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-400 italic m-0">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-5">Education</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">University</p>
                <p className="text-sm font-bold text-slate-900">{student.university || <span className="text-slate-400 italic font-medium">Not provided</span>}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Major / Degree</p>
                  <p className="text-sm font-bold text-slate-900">{student.major || student.degree || <span className="text-slate-400 italic font-medium">Not provided</span>}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Graduation Year</p>
                  <p className="text-sm font-bold text-slate-900">{student.graduationYear || <span className="text-slate-400 italic font-medium">Not provided</span>}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Application History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest m-0">Application History</h3>
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md">
                {studentApps.length} Total
              </span>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              {studentApps.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium text-sm">This student hasn't submitted any applications yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentApps.map((app) => (
                    <div key={app._id} className="group border border-slate-100 rounded-2xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{app.job?.title || 'Unknown Position'}</h4>
                          <p className="text-indigo-600 font-semibold text-xs uppercase tracking-wider">{app.job?.company || 'Unknown Company'}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit shrink-0 ${
                          app.status === 'recruiter_requested' ? 'bg-amber-100 text-amber-700' :
                          app.status === 'application sent' ? 'bg-blue-100 text-blue-700' :
                          app.status === 'pending' ? 'bg-slate-100 text-slate-700' :
                          app.status === 'interview' ? 'bg-indigo-100 text-indigo-700' :
                          app.status === 'offer' ? 'bg-emerald-100 text-emerald-700' :
                          app.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {app.status === 'recruiter_requested' ? 'Assistance Req' : app.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          Applied: {new Date(app.appliedAt).toLocaleDateString()}
                        </div>
                        
                        {app.assignedRecruiter && (
                          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            Recruiter: <span className="font-bold text-slate-700">{app.assignedRecruiter.name}</span>
                          </div>
                        )}
                        
                        {app.resumeUrl && (
                          <div className="sm:ml-auto">
                            <a 
                              href={app.resumeUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${app.resumeUrl}` : app.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline decoration-2 underline-offset-2 no-underline"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                              View ATS Resume
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStudentDetail;
