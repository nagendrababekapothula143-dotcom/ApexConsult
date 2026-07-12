import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Loader from '../../components/Loader';

const AdminPlacements = () => {
  const {
    jobs,
    selectedJob,
    handleJobSelect,
    loadingApps,
    applications,
    handleStatusChange,
    setShowJobModal,
    getStatusBadgeClass,
    getResumeDownloadUrl,
  } = useOutletContext();

  useEffect(() => {
    document.title = 'Post Jobs | Apex Console';
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Job Placements Listings</h2>
          <p className="text-sm text-slate-500 font-medium">Publish consulting positions, track applicant submissions and resume packets.</p>
        </div>
        <button onClick={() => setShowJobModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer border-none">
          + Create Job Listing
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Jobs list */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-900">Job Board Listings ({jobs.length})</h3>
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {jobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
                <p className="text-slate-500 text-sm">No consulting jobs posted yet.</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job._id}
                  className={`bg-white border rounded-xl p-5 cursor-pointer transition-all ${
                    selectedJob?._id === job._id
                      ? 'border-indigo-500 ring-2 ring-indigo-50'
                      : 'border-slate-200 hover:border-indigo-200'
                  }`}
                  onClick={() => handleJobSelect(job)}
                >
                  <h4 className="font-bold text-slate-900 text-sm mb-0.5">{job.title}</h4>
                  <p className="text-xs text-slate-500">
                    {job.company} • <span className="text-slate-400">{job.location}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Applications for selected job */}
        <div className="lg:col-span-7">
          {selectedJob ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-0.5">Applications for "{selectedJob.title}"</h3>
                <p className="text-xs text-slate-400">{selectedJob.company} • {selectedJob.location}</p>
              </div>

              <hr className="border-t border-slate-100" />

              {loadingApps ? (
                <div className="py-12">
                  <Loader text="Loading submissions..." />
                </div>
              ) : applications.length === 0 ? (
                <p className="text-slate-400 text-center py-6 text-sm">No submissions recorded for this post.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {applications.map((app) => (
                    <div key={app._id} className="border border-slate-200 rounded-lg p-4 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm mb-0.5">{app.student?.name}</h4>
                          <span className="text-xs text-slate-400">{app.student?.email}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Applied: {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                        {app.externallyApplied && (
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Confirmed External Apply
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3 flex-wrap gap-2">
                        <a
                          href={getResumeDownloadUrl(app.resumeUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors no-underline"
                        >
                          Download Resume
                        </a>
                        <select
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 transition-all w-auto"
                          value={app.status}
                          onChange={(e) => handleStatusChange(app._id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="accepted">Accept</option>
                          <option value="rejected">Reject</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <p className="text-slate-500 text-sm">Select a job on the left to see applicant packets.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminPlacements;
