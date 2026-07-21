import React, { useEffect, useState, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { exportToCSV } from '../../utils/csvExport';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import api from '../../services/api';

const AdminPlacements = () => {
  const {
    jobs = [],
    selectedJob,
    handleJobSelect,
    loadingApps,
    applications = [],
    handleStatusChange,
    setShowJobModal,
    getStatusBadgeClass,
    getResumeDownloadUrl,
    fetchData,
    loading
  } = useOutletContext() || {};
  const { user } = useContext(AuthContext);
  const toast = useToast();

  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, jobId: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteJob = async () => {
    const { jobId } = deleteModalConfig;
    setIsDeleting(true);
    
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success('Job listing successfully deleted.');
      setDeleteModalConfig({ isOpen: false, jobId: null });
      if (selectedJob?._id === jobId) {
          handleJobSelect(null);
      }
      if (fetchData) await fetchData(['jobs', 'students', 'applications', 'admins', 'recruiters']);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete job listing.');
    } finally {
      setIsDeleting(false);
    }
  };

  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    document.title = 'Placements | Kryntel Console';
    if (fetchData) {
      fetchData(['jobs']).finally(() => setLocalLoading(false));
    } else {
      setLocalLoading(false);
    }
  }, []);

  const handleExportCSV = () => {
    const csvData = jobs.map(j => ({
      ID: j._id,
      Title: j.title,
      Company: j.company,
      Location: j.location,
      Salary: j.salary || 'N/A',
      Status: j.status || 'Active',
      TotalApplications: applications.filter(a => a.job?._id === j._id).length || 0,
      PostedAt: new Date(j.createdAt).toLocaleString(),
    }));
    exportToCSV(csvData, `Kryntel_Jobs_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV Export downloaded successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-0.5">Job Placements Listings</h1>
          <p className="text-sm text-slate-500 font-medium">Publish consulting positions, track applicant submissions and resume packets.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </button>
          {user?.role === 'admin' && (
            <button onClick={() => setShowJobModal(true)} aria-label="Create new job listing" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer border-none">
              + Create Job Listing
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold text-slate-900">Active Listings ({jobs.length})</h2>
          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">Expand a job to view submissions</span>
        </div>
        
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState 
            title="No Active Listings" 
            description="No consulting jobs posted yet. Create your first job listing to get started." 
            icon="folder" 
          />
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map((job) => {
              const isExpanded = selectedJob?._id === job._id;
              
              return (
                <div
                  key={job._id}
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 group ${
                    isExpanded 
                      ? 'border-indigo-300 ring-4 ring-indigo-500/10 shadow-lg bg-white relative z-10' 
                      : 'border-slate-200 hover:border-indigo-200 bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <div 
                    className={`p-6 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                    onClick={() => handleJobSelect(isExpanded ? null : job)}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${isExpanded ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                        <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg tracking-tight mb-0.5 group-hover:text-indigo-700 transition-colors">{job.title}</h3>
                        <div className="flex items-center text-sm text-slate-500 font-medium gap-2">
                          <span>{job.company}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span>{job.location}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-slate-900">{job.salary}</span>
                      <span className="text-xs text-slate-500">Compensation</span>
                    </div>

                    {user?.role === 'admin' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalConfig({ isOpen: true, jobId: job._id });
                        }}
                        className={`p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent ${isExpanded ? 'text-red-500 hover:bg-red-50' : 'text-slate-300 hover:text-red-600 hover:bg-red-50'}`}
                        title="Delete Job"
                        aria-label="Delete Job"
                        disabled={isDeleting}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Accordion Body (Expanded Submissions) */}
                  {isExpanded && (
                    <div className="border-t border-indigo-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between items-center mb-5">
                        <h4 className="font-bold text-slate-800 text-sm">Applicant Submissions</h4>
                        <span className="text-xs font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-500">
                          Total: {applications.length}
                        </span>
                      </div>

                      {loadingApps ? (
                        <div className="py-12">
                          <Loader text="Loading submissions..." />
                        </div>
                      ) : applications.length === 0 ? (
                        <div className="py-6">
                          <EmptyState 
                            title="No Submissions" 
                            description="No applications recorded for this post yet." 
                            icon="inbox" 
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                          {applications.map((app) => (
                            <div key={app._id} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3 shadow-sm hover:border-indigo-200 transition-colors">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-bold text-slate-900 text-sm mb-0.5">{app.student?.name}</h4>
                                  <span className="text-xs text-slate-500 block truncate max-w-[150px]">{app.student?.email}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                                  {app.status.replace('_', ' ')}
                                </span>
                              </div>
                              
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 font-medium">
                                  Applied: {new Date(app.appliedAt).toLocaleDateString()}
                                </span>
                                {app.externallyApplied && (
                                  <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                    Confirmed External Apply
                                  </span>
                                )}
                              </div>
                              
                              <div className="pt-3 border-t border-slate-100 mt-2">
                                <a
                                  href={getResumeDownloadUrl(app.resumeUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-white hover:border-indigo-300 text-slate-700 hover:text-indigo-600 text-xs px-3 py-2 rounded-md font-bold transition-colors no-underline"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  View Resume
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalConfig.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Delete Job Listing</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
              Are you sure you want to permanently delete this job post? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteModalConfig({ isOpen: false, jobId: null })}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteJob}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-200 hover:shadow-red-300 rounded-xl transition-all cursor-pointer border-none active:scale-[0.98]"
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
