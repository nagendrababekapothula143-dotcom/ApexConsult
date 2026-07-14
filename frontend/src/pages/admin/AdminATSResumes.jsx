import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { getBaseUrl } from '../../services/api';

const AdminATSResumes = () => {
  const { globalApplications, fetchData, setError, setSuccess } = useOutletContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudentPhone, setSelectedStudentPhone] = useState(null);
  const [roleFilter, setRoleFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, applicationId: null });
  const [processingId, setProcessingId] = useState(null);
  const [recruiters, setRecruiters] = useState([]);

  useEffect(() => {
    document.title = 'ATS Resumes | Kryntel Console';
    const fetchRecruiters = async () => {
      try {
        const res = await api.get('/auth/recruiters');
        if (res.data.success) {
          setRecruiters(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch recruiters');
      }
    };
    fetchRecruiters();
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


  const handleAssignRecruiter = async (appId, recruiterId) => {
    setProcessingId(appId);
    try {
      await api.patch(`/applications/${appId}/assign-recruiter`, { recruiterId });
      setSuccess && setSuccess('Recruiter assigned successfully to this application');
      if (fetchData) await fetchData(true);
    } catch (error) {
      console.error(error);
      setError && setError('Failed to assign recruiter');
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
        
        <div className="relative z-20 flex gap-3 items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search student, role, company or phone..."
              value={searchQuery}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedStudentPhone(null);
                setShowDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs placeholder-slate-400"
            />
            <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            {showDropdown && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                {Array.from(
                  new Map(
                    globalApplications
                      .filter(app => app.student && app.student._id)
                      .map(app => [app.student._id, app.student])
                  ).values()
                )
                .filter(s => 
                  (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (s.phone || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(student => (
                  <div
                    key={student._id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery(student.name || '');
                      setSelectedStudentPhone(student.phone || 'N/A');
                      setShowDropdown(false);
                    }}
                    className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <span className="text-sm font-bold text-slate-800">{student.name}</span>
                    {student.phone && <span className="text-xs text-indigo-600 font-medium mt-0.5">{student.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedStudentPhone && (
            <input
              type="text"
              readOnly
              value={selectedStudentPhone}
              className="w-full sm:w-40 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 font-medium focus:outline-none cursor-not-allowed shadow-inner"
              title="Student Phone Number"
            />
          )}
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
              <th className="p-4 w-[20%]">Student Name</th>
              <th className="p-4 w-[20%]">Role Applied For</th>
              <th className="p-4 w-[15%]">Company Name</th>
              <th className="p-4 w-[15%]">Applied On</th>
              <th className="p-4 w-[15%]">Status / Assignment</th>
              <th className="p-4 w-[15%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {(() => {
              const filteredApps = globalApplications.filter(app => {
                const searchLower = searchQuery.toLowerCase();
                const studentNameMatch = (app.student?.name || '').toLowerCase().includes(searchLower);
                const studentPhoneMatch = (app.student?.phone || '').toLowerCase().includes(searchLower);
                const roleSearchMatch = (app.job?.title || '').toLowerCase().includes(searchLower);
                const companySearchMatch = (app.job?.company || '').toLowerCase().includes(searchLower);
                const matchesSearch = studentNameMatch || studentPhoneMatch || roleSearchMatch || companySearchMatch;
                
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
                    <div className="flex flex-col gap-1.5">
                      {app.status === 'recruiter_requested' ? (
                        <>
                          <span className="bg-amber-50 border border-amber-200 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider self-start inline-block">Needs Recruiter</span>
                          <select 
                            disabled={processingId === app._id}
                            value={app.recruiterId || ''} 
                            onChange={(e) => handleAssignRecruiter(app._id, e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded p-1 outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Assign --</option>
                            {recruiters.map(r => (
                              <option key={r._id} value={r._id}>{r.name}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider self-start inline-block ${
                            app.status === 'application sent' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                            app.status === 'pending' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                            app.status === 'interview' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                            app.status === 'offer' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            app.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {app.status}
                          </span>
                          {app.recruiterId && (
                            <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                              {recruiters.find(r => r._id === app.recruiterId)?.name || 'Recruiter'}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex justify-end gap-2 items-center">
                      
                      {/* Download Action */}
                      <div className="relative group flex justify-center">
                        <a 
                          href={app.resumeUrl ? getResumeDownloadUrl(app.resumeUrl) : '#'} 
                          download={app.resumeUrl ? `${app.student?.name || 'Applicant'}_Resume.pdf` : undefined}
                          onClick={(e) => {
                            if (!app.resumeUrl) {
                              e.preventDefault();
                              alert('No resume uploaded for this request yet.');
                            }
                          }}
                          className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                            app.resumeUrl 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 cursor-pointer' 
                              : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </a>
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                          {app.resumeUrl ? 'Download Resume' : 'No Resume Yet'}
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
