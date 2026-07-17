import React, { useEffect, useContext, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ApplicationTracker from '../../components/ApplicationTracker';

const StudentOverview = () => {
  const { user } = useContext(AuthContext);
  const { applications, jobs, loading, fetchData, getStatusBadgeClass } = useOutletContext();

  useEffect(() => {
    document.title = 'Dashboard Overview | Student Console';
    if (jobs.length === 0 || applications.length === 0) {
      fetchData(['jobs', 'applications']);
    }
  }, []);

  // Compute stats
  const activeApplications = applications.filter(app => !['rejected', 'offer'].includes(app.status)).length;
  const interviews = applications.filter(app => app.status === 'interview').length;
  const offers = applications.filter(app => app.status === 'offer').length;

  // Profile completion calculation
  const calculateProfileStrength = () => {
    if (!user) return 0;
    const fields = ['phone', 'university', 'major', 'location', 'linkedinUrl', 'avatarUrl'];
    const filled = fields.filter(f => user[f]).length;
    let score = (filled / fields.length) * 40; // Basic info is 40%
    
    if (user.education?.length > 0) score += 20;
    if (user.experience?.length > 0) score += 20;
    if (user.technicalSkills?.length > 0) score += 20;
    
    return Math.min(Math.round(score), 100);
  };
  
  const profileStrength = calculateProfileStrength();

  // Recommend jobs based on skills/major (simple mock logic for phase 1)
  const recommendedJobs = useMemo(() => {
    if (!jobs.length) return [];
    return [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  }, [jobs]);

  const recentActivity = useMemo(() => {
    if (!applications.length) return [];
    return [...applications].sort((a, b) => new Date(b.updatedAt || b.appliedAt) - new Date(a.updatedAt || a.appliedAt)).slice(0, 4);
  }, [applications]);

  if (loading && jobs.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse p-4">
        <div className="h-40 bg-white rounded-3xl col-span-1 md:col-span-2"></div>
        <div className="h-40 bg-white rounded-3xl"></div>
        <div className="h-96 bg-white rounded-3xl col-span-1 md:col-span-2"></div>
        <div className="h-96 bg-white rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">{user?.name?.split(' ')[0] || 'Student'}</span>! 👋
          </h1>
          <p className="text-slate-500 font-medium mt-1">Here is what is happening with your consulting applications today.</p>
        </div>
        <Link to="/student/jobs" className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-indigo-500/25 flex items-center gap-2 no-underline">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          Browse New Roles
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-16 h-16 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
          </div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Active Applications</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-black text-slate-900">{activeApplications}</h3>
            <span className="text-emerald-500 text-sm font-bold mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
              In Progress
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-violet-100 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-16 h-16 text-violet-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Upcoming Interviews</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-black text-slate-900">{interviews}</h3>
            {interviews > 0 ? (
              <span className="text-amber-500 text-sm font-bold mb-1 flex items-center gap-1 animate-pulse">
                Needs Prep!
              </span>
            ) : null}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-emerald-100 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-16 h-16 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Offers Received</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-black text-slate-900">{offers}</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl shadow-lg border border-indigo-500/20 text-white relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
          <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-3">Profile Strength</p>
          <div className="flex items-center gap-4">
            {/* Circular Progress */}
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className="text-indigo-400 drop-shadow-md" strokeDasharray={`${profileStrength}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black">{profileStrength}%</span>
              </div>
            </div>
            <div>
              {profileStrength < 100 ? (
                <Link to="/student/profile" className="text-sm text-indigo-300 hover:text-white font-medium transition-colors no-underline">
                  Complete your profile to unlock priority review &rarr;
                </Link>
              ) : (
                <span className="text-sm text-emerald-400 font-bold flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  All-Star Profile!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recommended Jobs */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Recommended For You
            </h2>
            <Link to="/student/jobs" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 no-underline">View All</Link>
          </div>

          <div className="space-y-4 relative z-10">
            {recommendedJobs.length > 0 ? recommendedJobs.map(job => (
              <div key={job._id} className="group p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all flex justify-between items-center cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 shadow-sm group-hover:scale-110 transition-transform">
                    {job.logoUrl ? (
                      <img src={job.logoUrl} alt={job.company} className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-black text-indigo-900 text-lg">{job.company.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{job.title}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{job.company} • {job.location}</p>
                  </div>
                </div>
                <Link to={`/student/jobs/${job._id}`} className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold rounded-lg transition-all no-underline">
                  View Role
                </Link>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm font-medium">No recommended jobs found. Try completing your profile!</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Recent Activity
          </h2>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:to-transparent">
            {recentActivity.length > 0 ? recentActivity.map((app, i) => (
              <div key={app._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border-[3px] border-white bg-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:border-indigo-200 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-600">{new Date(app.updatedAt || app.appliedAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{app.job?.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Status updated to <span className={`inline-block px-2 py-0.5 rounded uppercase tracking-wider font-bold text-[9px] ${getStatusBadgeClass(app.status)}`}>{app.status}</span>
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-6">
                <p className="text-slate-500 text-xs font-medium">No recent activity. Apply for some roles to get started!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentOverview;
