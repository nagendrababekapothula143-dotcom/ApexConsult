import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import ApplicationTracker from '../../components/ApplicationTracker';

const StudentApplications = () => {
  const { applications, getStatusBadgeClass, getResumeDownloadUrl } = useOutletContext();

  useEffect(() => {
    document.title = 'My Applications | Student Console';
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-0.5">My Applications</h1>
        <p className="text-sm text-slate-500 font-medium">Inspect review status and download submitted resume packets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {applications.length === 0 ? (
          <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-slate-500 text-sm">You haven't submitted any job applications yet.</p>
          </div>
        ) : (
          applications.map((app) => (
            <div key={app._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex justify-between items-start gap-4 hover:border-slate-300 transition-all">
              <div className="flex flex-col w-full h-full justify-between">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base mb-1">{app.job?.title || 'Unknown Job'}</h2>
                    <p className="text-xs text-slate-500 font-medium mb-4">
                      {app.job?.company} • <span className="text-slate-400 font-normal">Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
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
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1.5 no-underline mt-5"
                    aria-label={`View Uploaded Resume for ${app.job?.title || 'Unknown Job'}`}
                  >
                    🗎 View Uploaded Resume
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
