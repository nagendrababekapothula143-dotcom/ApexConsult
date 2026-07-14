import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { getBaseUrl } from '../../services/api';

const AdminATSResumes = () => {
  const { globalApplications, fetchData, setError, setSuccess } = useOutletContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, applicationId: null });
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    document.title = 'ATS Resumes | Apex Console';
  }, []);

  const getResumeDownloadUrl = (url) => {
    if (url.startsWith('/uploads')) {
      const baseUrl = getBaseUrl().replace('/api', '');
      return `${baseUrl}${url}`;
    }
    return url;
  };

  const handleDelete = async () => {
    const { applicationId } = modalConfig;
    setModalConfig({ isOpen: false, applicationId: null });
    setProcessingId(applicationId);
    
    try {
      const res = await api.delete(`/applications/${applicationId}`);
      if (res.data.success) {
        setSuccess && setSuccess('Application deleted successfully');
        if (fetchData) await fetchData(true);
      }
    } catch (err) {
      console.error(err);
      setError && setError('Failed to delete application.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Submitted Resumes</h2>
          <p className="text-sm text-slate-500">View student applications, download resumes, and manage submissions.</p>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search student, role, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs placeholder-slate-400"
          />
          <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* FILTERS ROW */}
      <div className="flex flex-col sm:flex-row justify-start gap-3 mb-6">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs text-slate-700 font-medium cursor-pointer"
        >
          <option value="All">All Roles</option>
          {Array.from(new Set(globalApplications.map(app => app.job?.title).filter(Boolean))).map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs text-slate-700 font-medium cursor-pointer"
        >
          <option value="All">All Companies</option>
          {Array.from(new Set(globalApplications.map(app => app.job?.company).filter(Boolean))).map(company => (
            <option key={company} value={company}>{company}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 w-[25%]">Student Name</th>
              <th className="p-4 w-[25%]">Role Applied For</th>
              <th className="p-4 w-[20%]">Company Name</th>
              <th className="p-4 w-[15%]">Applied On</th>
              <th className="p-4 w-[15%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {(() => {
              const filteredApps = globalApplications.filter(app => {
                const searchLower = searchQuery.toLowerCase();
                const studentNameMatch = (app.student?.name || '').toLowerCase().includes(searchLower);
                const roleSearchMatch = (app.job?.title || '').toLowerCase().includes(searchLower);
                const companySearchMatch = (app.job?.company || '').toLowerCase().includes(searchLower);
                const matchesSearch = studentNameMatch || roleSearchMatch || companySearchMatch;
                
                const matchesRole = roleFilter === 'All' || app.job?.title === roleFilter;
                const matchesCompany = companyFilter === 'All' || app.job?.company === companyFilter;

                return matchesSearch && matchesRole && matchesCompany;
              });

              if (filteredApps.length === 0) {
                return (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      {searchQuery ? 'No applications matched your search.' : 'No resume submissions recorded in database.'}
                    </td>
                  </tr>
                );
              }

              return filteredApps.map((app) => (
                <tr key={app._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 max-w-0">
                    <div className="w-full truncate font-bold text-slate-900" title={app.student?.name}>
                      {app.student?.name || 'Unknown Student'}
                    </div>
                    <div className="w-full truncate text-xs text-slate-500" title={app.student?.email}>
                      {app.student?.email}
                    </div>
                  </td>
                  
                  <td className="p-4 max-w-0">
                    <div className="w-full truncate font-semibold text-slate-800" title={app.job?.title}>
                      {app.job?.title || 'Unknown Role'}
                    </div>
                  </td>
                  
                  <td className="p-4 max-w-0">
                    <div className="w-full truncate text-slate-600 font-medium" title={app.job?.company}>
                      {app.job?.company || 'Unknown Company'}
                    </div>
                  </td>
                  
                  <td className="p-4 text-slate-500">
                    <div className="font-medium text-slate-700">{new Date(app.appliedAt).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{new Date(app.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex justify-end gap-2 items-center">
                      
                      {/* Download Action */}
                      <div className="relative group flex justify-center">
                        <a 
                          href={getResumeDownloadUrl(app.resumeUrl)} 
                          download={`${app.student?.name || 'Applicant'}_Resume.pdf`}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center justify-center"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </a>
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                          Download Resume
                        </div>
                      </div>

                      {/* Delete Action */}
                      <div className="relative group flex justify-center">
                        <button 
                          disabled={processingId === app._id}
                          onClick={() => setModalConfig({ isOpen: true, applicationId: app._id })}
                          className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                          Delete Submission
                        </div>
                      </div>

                    </div>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* CONFIRMATION MODAL */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Submission</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this application submission? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setModalConfig({ isOpen: false, applicationId: null })}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
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

export default AdminATSResumes;
