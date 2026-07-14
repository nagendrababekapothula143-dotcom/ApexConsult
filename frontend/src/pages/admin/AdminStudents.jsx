import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';

const AdminStudents = () => {
  const { students, globalApplications, fetchData, setError, setSuccess } = useOutletContext();
  const [processingId, setProcessingId] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', studentId: null, currentStatus: '' });
  const [editModalConfig, setEditModalConfig] = useState({ isOpen: false, student: null, formData: { name: '', phone: '', university: '', major: '' } });
  const [searchQuery, setSearchQuery] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    document.title = 'All Students | Kryntel Console';
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

  const openEditModal = (student) => {
    setEditModalConfig({
      isOpen: true,
      student,
      formData: {
        name: student.name || '',
        phone: student.phone || '',
        university: student.university || '',
        major: student.major || ''
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
        phone: editModalConfig.formData.phone,
        university: editModalConfig.formData.university,
        major: editModalConfig.formData.major
      });

      setSuccess && setSuccess('Student profile updated successfully!');
      setEditModalConfig({ isOpen: false, student: null, formData: { name: '', phone: '', university: '', major: '' } });
      if (fetchData) await fetchData();
    } catch (err) {
      console.error(err);
      setError && setError('Failed to update student profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-0.5">Registered Students</h1>
          <p className="text-sm text-slate-500">View registered student profiles and track resume submissions.</p>
        </div>
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 w-[12%]">Student ID</th>
              <th className="p-4 w-[20%]">Full Name</th>
              <th className="p-4 w-[20%]">Email Address</th>
              <th className="p-4 w-[10%]">Status</th>
              <th className="p-4 w-[15%]">Registered On</th>
              <th className="p-4 w-[23%] text-center">Actions</th>
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
                    <td colSpan="6" className="p-8 text-center text-slate-400">
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
                      <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 whitespace-nowrap">
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

                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2 items-center flex-nowrap whitespace-nowrap">
                        <div className="relative group flex justify-center">
                          <button 
                            disabled={processingId === student._id}
                            onClick={() => setModalConfig({ isOpen: true, type: 'status', studentId: student._id, currentStatus: student.status || 'active' })}
                            className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${student.status === 'inactive' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                            aria-label={student.status === 'inactive' ? 'Activate Student' : 'Deactivate Student'}
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
                            onClick={() => openEditModal(student)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center"
                            aria-label="Edit Student"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                            Edit Student
                          </div>
                        </div>
                        <div className="relative group flex justify-center">
                          <button 
                            disabled={processingId === student._id}
                            onClick={() => setModalConfig({ isOpen: true, type: 'delete', studentId: student._id })}
                            className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center"
                            aria-label="Delete Student"
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

      {/* EDIT STUDENT MODAL */}
      {editModalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Edit Student Profile</h3>
              <button onClick={() => setEditModalConfig({ isOpen: false, student: null, formData: { name: '', phone: '', university: '', major: '' } })} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-1" aria-label="Close modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={editModalConfig.formData.name}
                  onChange={handleEditChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={editModalConfig.formData.phone}
                  onChange={handleEditChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">University</label>
                <input
                  type="text"
                  name="university"
                  value={editModalConfig.formData.university}
                  onChange={handleEditChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Major</label>
                <input
                  type="text"
                  name="major"
                  value={editModalConfig.formData.major}
                  onChange={handleEditChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditModalConfig({ isOpen: false, student: null, formData: { name: '', phone: '', university: '', major: '' } })}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer border-none disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
