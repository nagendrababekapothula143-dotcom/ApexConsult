import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const SkeletonRow = () => (
  <tr className="animate-pulse bg-slate-50 border-b border-slate-100">
    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-1/3 mb-1"></div></td>
    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
    <td className="p-4"><div className="h-6 bg-slate-200 rounded-full w-24"></div></td>
    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-2/3 mb-1"></div><div className="h-3 bg-slate-200 rounded w-1/2"></div></td>
  </tr>
);

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [actorFilter, setActorFilter] = useState('All');
  const toast = useToast();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    document.title = 'Audit Logs | Kryntel Console';
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/audit-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchQuery.toLowerCase();
    const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');
    const matchesSearch = (log.action || '').toLowerCase().includes(searchLower) ||
      (log.actorName || '').toLowerCase().includes(searchLower) ||
      (log.targetName || '').toLowerCase().includes(searchLower) ||
      detailsStr.toLowerCase().includes(searchLower);

    const matchesAction = actionFilter === 'All' || log.action === actionFilter;
    const matchesActor = actorFilter === 'All' || (log.actorName || 'System') === actorFilter;

    return matchesSearch && matchesAction && matchesActor;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatActionBadge = (action) => {
    const baseClasses = "inline-block whitespace-nowrap px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider";
    switch (action) {
      case 'ASSIGN_RECRUITER':
        return <span className={`${baseClasses} bg-indigo-50 text-indigo-700 border border-indigo-200`}>Assign Recruiter</span>;
      case 'UPLOAD_RESUME':
        return <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border border-emerald-200`}>Upload Resume</span>;
      case 'STUDENT_REQUESTED_ASSISTANCE':
        return <span className={`${baseClasses} bg-amber-50 text-amber-700 border border-amber-200`}>Requested Assistance</span>;
      case 'RECRUITER_SUBMITTED_APPLICATION':
        return <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border border-emerald-200`}>Recruiter Submitted</span>;
      case 'SUBMIT_APPLICATION':
        return <span className={`${baseClasses} bg-blue-50 text-blue-700 border border-blue-200`}>App Submitted</span>;
      case 'REGISTER_ACCOUNT':
        return <span className={`${baseClasses} bg-purple-50 text-purple-700 border border-purple-200`}>New Registration</span>;
      case 'CREATE_TICKET':
        return <span className={`${baseClasses} bg-rose-50 text-rose-700 border border-rose-200`}>Create Ticket</span>;
      default:
        return <span className={`${baseClasses} bg-slate-100 text-slate-600 border border-slate-200`}>{action}</span>;
    }
  };

  const formatDetails = (log) => {
    if (typeof log.details !== 'object' || !log.details) return String(log.details || 'No details provided');
    
    switch (log.action) {
      case 'ASSIGN_RECRUITER':
        return `Assigned to Recruiter: ${log.details.recruiterName || log.details.recruiterId}`;
      case 'UPLOAD_RESUME':
      case 'RECRUITER_SUBMITTED_APPLICATION':
        return `Marked application as sent for student: ${log.details.originalStudent || 'Unknown'}`;
      case 'STUDENT_REQUESTED_ASSISTANCE':
      case 'SUBMIT_APPLICATION':
        return `Applied for role: ${log.details.jobTitle || 'Unknown Job'}`;
      case 'REGISTER_ACCOUNT':
        return `Registered with role: ${log.details.role}, Email: ${log.details.email}`;
      case 'CREATE_TICKET':
        return `Support Category: ${log.details.category} - Subject: "${log.details.subject}"`;
      default:
        const parts = Object.entries(log.details).map(([k, v]) => `${k}: ${v}`);
        return parts.join(' | ');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Audit Logs</h1>
          <p className="text-slate-500 font-medium mt-2 max-w-2xl">
            A chronological, immutable record of all major system actions. Used for compliance, debugging, and tracing history.
          </p>
        </div>
        <button onClick={fetchLogs} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh Logs
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-100 bg-slate-50 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-slate-900"
            placeholder="Search by action, name, or details..."
            aria-label="Search audit logs"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-48 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Actions</option>
            {Array.from(new Set(logs.map(log => log.action).filter(Boolean))).map(action => (
              <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={actorFilter}
            onChange={(e) => { setActorFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-48 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Actors</option>
            {Array.from(new Set(logs.map(log => log.actorName || 'System').filter(Boolean))).map(actor => (
              <option key={actor} value={actor}>{actor}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 w-[20%]">Actor</th>
              <th className="p-4 w-[25%]">Action</th>
              <th className="p-4 w-[40%]">Details</th>
              <th className="p-4 w-[15%]">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {(() => {
              if (isLoading) {
                return Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />);
              }

              if (filteredLogs.length === 0) {
                return (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400">
                      {searchQuery ? 'No audit logs matched your search.' : 'No audit logs recorded in database yet.'}
                    </td>
                  </tr>
                );
              }

              return (
                <>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 max-w-0">
                        <div className="w-full truncate font-bold text-slate-900" title={log.actorName}>
                          {log.actorName || 'System'}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider">{log.actorRole}</div>
                      </td>
                      
                      <td className="p-4">
                        {formatActionBadge(log.action)}
                      </td>
                      
                      <td className="p-4">
                        <div className="text-slate-700 font-medium text-sm">
                          {formatDetails(log)}
                        </div>
                      </td>
                      
                      <td className="p-4 text-slate-500">
                        <div className="font-medium text-slate-700">{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                      </td>
                    </tr>
                  ))}
                  
                  {totalPages > 1 && (
                    <tr>
                      <td colSpan="4" className="p-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
                          </span>
                          <div className="flex gap-2">
                            <button 
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(prev => prev - 1)}
                              className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer hover:bg-slate-50"
                              aria-label="Previous Page"
                            >
                              Prev
                            </button>
                            <button 
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(prev => prev + 1)}
                              className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer hover:bg-slate-50"
                              aria-label="Next Page"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
