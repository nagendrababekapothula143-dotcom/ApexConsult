import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';

const AdminStudents = () => {
  const { students, globalApplications, fetchData, setError, setSuccess } = useOutletContext();
  const [processingId, setProcessingId] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', studentId: null, currentStatus: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'All Students | Apex Console';
  }, []);

  const handleStatusToggle = async () => {
    const { studentId, currentStatus } = modalConfig;
    setModalConfig({ isOpen: false, type: '', studentId: null, currentStatus: '' });
    setProcessingId(studentId);
    try {
      const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
      await api.patch(`/auth/students/${studentId}/status`, { status: newStatus });
      setSuccess && setSuccess(`Student marked as ${newStatus}`);
      if (fetchData) await fetchData();
    } catch (err) {
      setError && setError('Failed to update student status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    const { studentId } = modalConfig;
    setModalConfig({ isOpen: false, type: '', studentId: null, currentStatus: '' });
    setProcessingId(studentId);
    try {
      await api.delete(`/auth/students/${studentId}`);
      setSuccess && setSuccess('Student deleted successfully');
      if (fetchData) await fetchData();
    } catch (err) {
      setError && setError('Failed to delete student');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Registered Students</h2>
          <p className="text-sm text-slate-500">View registered student profiles and track S3 resume submissions.</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email, or APX ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs placeholder-slate-400"
          />
          <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 w-[12%]">Student ID</th>
              <th className="p-4 w-[18%]">Full Name</th>
              <th className="p-4 w-[22%]">Email Address</th>
              <th className="p-4 w-[10%]">Status</th>
              <th className="p-4 w-[16%]">Submission Track</th>
              <th className="p-4 w-[12%]">Registered On</th>
              <th className="p-4 w-[10%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {(() => {
              const filteredStudents = students.filter(s => {
                const searchLower = searchQuery.toLowerCase();
                const nameMatch = (s.name || '').toLowerCase().includes(searchLower);
                const emailMatch = (s.email || '').toLowerCase().includes(searchLower);
                const idMatch = (s.apexId || '').toLowerCase().includes(searchLower);
                return nameMatch || emailMatch || idMatch;
              });

              if (filteredStudents.length === 0) {
                return (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      {searchQuery ? 'No students matched your search.' : 'No student profiles found.'}
                    </td>
                  </tr>
                );
              }

              return filteredStudents.map((student) => {
                // Check if student has applied to any jobs globally
                const hasApplied = globalApplications && globalApplications.some(
                  (app) => {
                    const studentId = app.student?._id || app.student;
                    return studentId === student._id;
                  }
                );

                return (
                  <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {student.apexId || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 max-w-0">
                      <div className="w-full truncate font-bold text-slate-900" title={student.name}>
                        {student.name}
                      </div>
                    </td>
                    <td className="p-4 max-w-0">
                      <div className="w-full truncate text-slate-600" title={student.email}>
                        {student.email}
                      </div>
                    </td>
                    <td className="p-4">
                      {student.status === 'inactive' ? (
                        <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Inactive
                        </span>
                      ) : (
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {hasApplied ? (
                        <span className="whitespace-nowrap bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0"></span> Applied
                        </span>
                      ) : (
                        <span className="whitespace-nowrap bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0"></span> Not Applied
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2 items-center">
                        <div className="relative group flex justify-center">
                          <button 
                            disabled={processingId === student._id}
                            onClick={() => setModalConfig({ isOpen: true, type: 'status', studentId: student._id, currentStatus: student.status || 'active' })}
                            className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${student.status === 'inactive' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                          >
                            {student.status === 'inactive' ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            )}
                          </button>
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                            {student.status === 'inactive' ? 'Activate Student' : 'Deactivate Student'}
                          </div>
                        </div>
                        <div className="relative group flex justify-center">
                          <button 
                            disabled={processingId === student._id}
                            onClick={() => setModalConfig({ isOpen: true, type: 'delete', studentId: student._id })}
                            className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                            Delete Student
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* CUSTOM CONFIRMATION MODAL */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {modalConfig.type === 'delete' ? 'Delete Student' : 'Change Status'}
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {modalConfig.type === 'delete' 
                ? 'Are you sure you want to permanently delete this student? This action cannot be undone.'
                : `Are you sure you want to mark this student as ${modalConfig.currentStatus === 'inactive' ? 'Active' : 'Inactive'}?`}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setModalConfig({ isOpen: false, type: '', studentId: null, currentStatus: '' })}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={modalConfig.type === 'delete' ? handleDelete : handleStatusToggle}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer ${modalConfig.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
