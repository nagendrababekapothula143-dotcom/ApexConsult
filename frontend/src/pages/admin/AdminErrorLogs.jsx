import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const SkeletonRow = () => (
  <tr className="animate-pulse bg-slate-50 border-b border-slate-100">
    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-1/3 mb-1"></div></td>
    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
    <td className="p-4"><div className="h-6 bg-slate-200 rounded w-full"></div></td>
    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-2/3 mb-1"></div></td>
  </tr>
);

const AdminErrorLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    document.title = 'Error Logs | Kryntel Console';
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/system/errors');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch error logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (log.message || '').toLowerCase().includes(searchLower) ||
      (log.url || '').toLowerCase().includes(searchLower) ||
      (log.source || '').toLowerCase().includes(searchLower) ||
      (log.ipAddress || '').toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [expandedRow, setExpandedRow] = useState(null);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Error Logs</h1>
          <p className="text-slate-500 font-medium mt-2 max-w-2xl">
            Monitor API failures, unhandled exceptions, and runtime errors across the stack.
          </p>
        </div>
        <button onClick={fetchLogs} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh Logs
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-100 bg-slate-50 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all font-medium text-slate-900"
            placeholder="Search by message, endpoint, or IP..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 w-[20%]">Timestamp</th>
              <th className="p-4 w-[15%]">Endpoint</th>
              <th className="p-4 w-[50%]">Message</th>
              <th className="p-4 w-[15%]">Source / IP</th>
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
                      {searchQuery ? 'No error logs matched your search.' : 'Hooray! No errors recorded in database.'}
                    </td>
                  </tr>
                );
              }

              return (
                <>
                  {paginatedLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr 
                        className="hover:bg-rose-50/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        <td className="p-4 text-slate-500">
                          <div className="font-bold text-slate-700">{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                        </td>
                        
                        <td className="p-4">
                          <div className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block truncate max-w-full">
                            <span className="font-bold text-rose-600 mr-1">{log.method}</span>
                            {log.url}
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="font-semibold text-rose-700 truncate">{log.message}</div>
                        </td>

                        <td className="p-4 max-w-0">
                          <div className="w-full truncate font-bold text-slate-700">
                            {log.source || 'Backend'}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider">
                            {log.ipAddress ? `IP: ${log.ipAddress}` : 'UNKNOWN IP'}
                          </div>
                        </td>
                      </tr>
                      {expandedRow === log.id && (
                        <tr className="bg-slate-50 border-t border-slate-100">
                          <td colSpan="4" className="p-4">
                            <div className="flex flex-col gap-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">User Information</div>
                                  <div className="text-sm font-medium text-slate-700">ID: {log.userId}</div>
                                  <div className="text-xs text-slate-500">Role: {log.userRole}</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Request Body</div>
                                  <div className="text-xs font-mono text-slate-600 truncate">{log.body || 'Empty'}</div>
                                </div>
                              </div>
                              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stack Trace</div>
                                <pre className="text-xs font-mono text-rose-400 leading-relaxed">
                                  {log.stack || 'No stack trace available.'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                              className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                            >
                              Prev
                            </button>
                            <button 
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(prev => prev + 1)}
                              className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
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

export default AdminErrorLogs;
