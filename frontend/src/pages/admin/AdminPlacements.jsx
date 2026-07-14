import React, { useEffect, useState } from 'react';
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
    fetchData,
    setError,
    setSuccess,
  } = useOutletContext();

  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, jobId: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteJob = async () => {
    const { jobId } = deleteModalConfig;
    setDeleteModalConfig({ isOpen: false, jobId: null });
    setIsDeleting(true);
    
    try {
      const { default: api } = await import('../../services/api');
      const res = await api.delete(`/jobs/${jobId}`);
      if (res.data.success) {
        setSuccess && setSuccess('Job deleted successfully');
        if (selectedJob?._id === jobId) {
           handleJobSelect(null);
        }
        if (fetchData) await fetchData(true);
      }
    } catch (err) {
      console.error(err);
      setError && setError('Failed to delete job listing.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    document.title = 'Post Jobs | Kryntel Console';
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
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-0.5">{job.title}</h4>
                      <p className="text-xs text-slate-500">
                        {job.company} • <span className="text-slate-400">{job.location}</span>
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModalConfig({ isOpen: true, jobId: job._id });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                      title="Delete Job"
                      disabled={isDeleting}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Job Listing</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this job post? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteModalConfig({ isOpen: false, jobId: null })}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteJob}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer border-none"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlacements;
