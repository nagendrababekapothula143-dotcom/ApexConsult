import React, { useEffect, useState, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { exportToCSV } from '../../utils/csvExport';
import EmptyState from '../../components/EmptyState';
import TableSkeleton from '../../components/TableSkeleton';
import useDebounce from '../../hooks/useDebounce';

const AdminStudents = () => {
  const { students = [], globalApplications = [], fetchData, loading } = useOutletContext() || {};
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [processingId, setProcessingId] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', studentId: null, currentStatus: '' });
  const [editModalConfig, setEditModalConfig] = useState({ isOpen: false, student: null, formData: { name: '', email: '', phone: '', linkedinUrl: '' } });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [savingEdit, setSavingEdit] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    document.title = 'All Students | Kryntel Console';
    if (fetchData) {
      fetchData(['students', 'applications']).finally(() => setLocalLoading(false));
    } else {
      setLocalLoading(false);
    }
  }, []);

  const handleStatusToggle = async () => {
    const { studentId, currentStatus } = modalConfig;
    setModalConfig({ isOpen: false, type: '', studentId: null, currentStatus: '' });
    setProcessingId(studentId);
    try {
      const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
      await api.patch(`/auth/students/${studentId}/status`, { status: newStatus });
      toast.success(`Student marked as ${newStatus}`);
      if (fetchData) await fetchData(['jobs', 'students', 'applications', 'admins', 'recruiters']);
    } catch (err) {
      toast.error('Failed to update student status');
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
      toast.success('Student deleted successfully');
      if (fetchData) await fetchData(['jobs', 'students', 'applications', 'admins', 'recruiters']);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setProcessingId(null);
    }
  };

  const openEditModal = (student) => {
    setEditModalConfig({
      isOpen: true,
      student,
      formData: {
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        linkedinUrl: student.linkedinUrl || ''
      }
    });
  };

  const handleEditChange = (e) => {
    setEditModalConfig({
      ...editModalConfig,
      formData: { ...editModalConfig.formData, [e.target.name]: e.target.value }
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.patch(`/auth/profile/${editModalConfig.student._id}`, {
        name: editModalConfig.formData.name,
        email: editModalConfig.formData.email,
        phone: editModalConfig.formData.phone,
        linkedinUrl: editModalConfig.formData.linkedinUrl
      });

      toast.success('Student profile updated successfully!');
      setEditModalConfig({ isOpen: false, student: null, formData: { name: '', email: '', phone: '', linkedinUrl: '' } });
      if (fetchData) await fetchData(['jobs', 'students', 'applications', 'admins', 'recruiters']);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update student profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportCSV = () => {
    // Format data for CSV
    const csvData = students.map(s => ({
      'Database ID': s._id,
      'Student ID': s.apexId || 'N/A',
      Name: s.name,
      Email: s.email,
      Phone: s.phone || 'N/A',
      University: s.university || 'N/A',
      Degree: s.degree || 'N/A',
      GraduationYear: s.graduationYear || 'N/A',
      Status: s.status || 'Active',
      TotalApplications: s.applications?.length || 0,
      RegisteredAt: new Date(s.createdAt).toLocaleString(),
    }));
    exportToCSV(csvData, `Kryntel_Students_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV Export downloaded successfully');
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const searchLower = debouncedSearchQuery.toLowerCase();
      const nameMatch = (s.name || '').toLowerCase().includes(searchLower);
      const emailMatch = (s.email || '').toLowerCase().includes(searchLower);
      const idMatch = (s.apexId || '').toLowerCase().includes(searchLower);
      return nameMatch || emailMatch || idMatch;
    });
  }, [students, debouncedSearchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-0.5">Registered Students</h1>
          <p className="text-sm text-slate-500">View registered student profiles and track resume submissions.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, or APX ID..."
              aria-label="Search students"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs placeholder-slate-400"
            />
            <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-3xl shadow-sm overflow-x-auto custom-scrollbar relative">
        <table className="w-full table-fixed border-collapse text-left relative min-w-[800px]">
          <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-xs">
            <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <th className="p-5 w-[12%]">Student ID</th>
              <th className="p-5 w-[20%]">Full Name</th>
              <th className="p-5 w-[20%]">Email Address</th>
              <th className="p-5 w-[10%]">Status</th>
              <th className="p-5 w-[15%]">Registered On</th>
              <th className="p-5 w-[23%] text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 text-sm">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-0">
                  <TableSkeleton columns={6} rows={5} />
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8">
                  <EmptyState
                    title="No students found"
                    description={searchQuery ? 'No students matched your search criteria.' : 'No student profiles found in the database.'}
                    icon="search"
                  />
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                return (
                  <tr key={student._id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5">
                      <Link to={`/admin/students/${student.apexId || student._id}`} className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/50 whitespace-nowrap shadow-xs hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer no-underline block w-fit">
                        {student.apexId || 'N/A'}
                      </Link>
                    </td>
                    <td className="p-5 max-w-0">
                      <div className="w-full truncate font-bold text-slate-900 group-hover:text-indigo-700 transition-colors" title={student.name}>
                        {student.name}
                      </div>
                    </td>
                    <td className="p-5 max-w-0">
                      <div className="w-full truncate text-slate-500 font-medium" title={student.email}>
                        {student.email}
                      </div>
                    </td>
                    <td className="p-5">
                      {student.status === 'inactive' ? (
                        <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-rose-100/50 shadow-xs">
                          Inactive
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100/50 shadow-xs">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="p-5 text-slate-400 font-medium whitespace-nowrap">
                      {new Date(student.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2 items-center flex-nowrap whitespace-nowrap">
                        <div className="relative flex justify-center">
                          <button
                            disabled={processingId === student._id}
                            onClick={() => setModalConfig({ isOpen: true, type: 'status', studentId: student._id, currentStatus: student.status || 'active' })}
                            className={`peer p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${student.status === 'inactive' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                            aria-label={student.status === 'inactive' ? 'Activate Student' : 'Deactivate Student'}
                          >
                            {student.status === 'inactive' ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            )}
                          </button>
                          <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 opacity-0 peer-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                            {student.status === 'inactive' ? 'Activate Student' : 'Deactivate Student'}
                          </div>
                        </div>
                        <div className="relative flex justify-center">
                          <button
                            disabled={processingId === student._id}
                            onClick={() => openEditModal(student)}
                            className="peer p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center"
                            aria-label="Edit Student"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 opacity-0 peer-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                            Edit Student
                          </div>
                        </div>
                        {user?.role === 'admin' && (
                          <div className="relative flex justify-center">
                            <button
                              disabled={processingId === student._id}
                              onClick={() => setModalConfig({ isOpen: true, type: 'delete', studentId: student._id })}
                              className="peer p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center"
                              aria-label="Delete Student"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 opacity-0 peer-hover:opacity-100 transition-opacity bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                              Delete Student
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CUSTOM CONFIRMATION MODAL */}
      {modalConfig.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
              {modalConfig.type === 'delete' ? 'Delete Student' : 'Change Status'}
            </h3>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
              {modalConfig.type === 'delete'
                ? 'Are you sure you want to permanently delete this student? This action cannot be undone.'
                : `Are you sure you want to mark this student as ${modalConfig.currentStatus === 'inactive' ? 'Active' : 'Inactive'}?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalConfig({ isOpen: false, type: '', studentId: null, currentStatus: '' })}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={modalConfig.type === 'delete' ? handleDelete : handleStatusToggle}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer ${modalConfig.type === 'delete' ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-200' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT STUDENT MODAL */}
      {editModalConfig.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header - Fixed */}
            <div className="flex justify-between items-center p-6 sm:p-8 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Edit Student Profile</h3>
              <button onClick={() => setEditModalConfig({ isOpen: false, student: null, formData: { name: '', email: '', phone: '', linkedinUrl: '' } })} className="text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-full p-2 transition-colors cursor-pointer border-none" aria-label="Close modal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col overflow-hidden max-h-full">
              {/* Form Body - Scrollable without visible scrollbar */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editModalConfig.formData.name}
                    onChange={handleEditChange}
                    className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={editModalConfig.formData.email}
                    onChange={handleEditChange}
                    className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={editModalConfig.formData.phone}
                    onChange={handleEditChange}
                    placeholder="+1 (555) 000-0000"
                    className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">LinkedIn URL</label>
                  <input
                    type="url"
                    name="linkedinUrl"
                    value={editModalConfig.formData.linkedinUrl}
                    onChange={handleEditChange}
                    placeholder="https://linkedin.com/in/username"
                    className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
                  />
                </div>
              </div>

              {/* Footer Buttons - Fixed */}
              <div className="p-6 sm:p-8 pt-4 flex justify-end gap-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setEditModalConfig({ isOpen: false, student: null, formData: { name: '', email: '', phone: '', linkedinUrl: '' } })}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 rounded-xl transition-all cursor-pointer border-none disabled:opacity-50 active:scale-[0.98]"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminStudents;
