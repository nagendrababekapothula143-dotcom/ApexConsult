import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import ApplicationTracker from '../../components/ApplicationTracker';

const StudentApplications = () => {
  const { applications, getStatusBadgeClass, getResumeDownloadUrl, loading, fetchData } = useOutletContext();

  useEffect(() => {
    document.title = 'My Applications | Student Console';
    if (applications.length === 0) {
      fetchData(['applications']);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-0.5">My Applications</h1>
        <p className="text-sm text-slate-500 font-medium">Inspect review status and download submitted resume packets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 h-48 animate-pulse shadow-sm"></div>
          ))
        ) : applications.length === 0 ? (
          <div className="col-span-2 bg-white border border-slate-200/70 rounded-3xl p-12 text-center shadow-sm">
            <p className="text-slate-500 text-sm font-medium">You haven't submitted any job applications yet.</p>
          </div>
        ) : (
          applications.map((app) => (
            <div key={app._id} className="bg-white border border-slate-200/70 rounded-3xl p-6 shadow-sm flex justify-between items-start gap-4 hover:border-indigo-200 hover:shadow-md transition-all group">
              <div className="flex flex-col w-full h-full justify-between">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-base mb-1 group-hover:text-indigo-700 transition-colors">{app.job?.title || 'Unknown Job'}</h2>
                    <p className="text-xs text-slate-500 font-medium mb-4">
                      {app.job?.company} • <span className="text-slate-400 font-medium">Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                    {app.status}
                  </span>
                </div>
                
                <ApplicationTracker status={app.status} />

                {app.resumeUrl ? (
                  <a
                    href={getResumeDownloadUrl(app.resumeUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold inline-flex items-center gap-1.5 no-underline mt-5 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit transition-colors"
                    aria-label={`View Uploaded Resume for ${app.job?.title || 'Unknown Job'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    View Uploaded Resume
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 font-medium inline-flex items-center gap-1.5 mt-5">
                    No resume uploaded
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentApplications;
