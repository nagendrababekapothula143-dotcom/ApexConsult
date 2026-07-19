import React, { useEffect, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { Trash2 } from 'lucide-react';
import TableSkeleton from '../../components/TableSkeleton';

const AdminTeam = () => {
  const { teamMembers = [], recruiters = [], fetchData, loading } = useOutletContext() || {};
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [updatingId, setUpdatingId] = useState(null);
  
  // New state for recruiter creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRecruiter, setNewRecruiter] = useState({ name: '', email: '', password: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalData, setDeleteModalData] = useState({ isOpen: false, memberId: null, name: '' });
  const [localLoading, setLocalLoading] = useState(true);
  
  // Combine admins and recruiters into a single list, sorting admins first, then by date
  const allTeamMembers = [...(teamMembers || []), ...(recruiters || [])].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  useEffect(() => {
    document.title = 'Team Management | Kryntel Console';
    if (fetchData) {
      fetchData(['admins', 'recruiters']).finally(() => setLocalLoading(false));
    } else {
      setLocalLoading(false);
    }
  }, []);

  const handleRoleChange = async (memberId, newRole) => {
    try {
      setUpdatingId(memberId);
      await api.patch(`/auth/profile/${memberId}/role`, { role: newRole });
      toast.success(`Role successfully updated to ${newRole}`);
      if (fetchData) await fetchData(['jobs', 'students', 'applications', 'admins', 'recruiters']);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update role. Ensure you have permission.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateRecruiter = async (e) => {
    e.preventDefault();
    if (!newRecruiter.name || !newRecruiter.email || !newRecruiter.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsCreating(true);
    try {
      await api.post('/auth/recruiters', newRecruiter);
      toast.success('Recruiter account created successfully');
      setShowCreateModal(false);
      setNewRecruiter({ name: '', email: '', password: '' });
      if (fetchData) await fetchData(['jobs', 'students', 'applications', 'admins', 'recruiters']);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create recruiter');
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setDeletingId(deleteModalData.memberId);
      await api.delete(`/auth/recruiters/${deleteModalData.memberId}`);
      toast.success('Recruiter successfully deleted.');
      setDeleteModalData({ isOpen: false, memberId: null, name: '' });
      if (fetchData) await fetchData(['jobs', 'students', 'applications', 'admins', 'recruiters']);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete recruiter.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-0.5">Team Management</h1>
          <p className="text-sm text-slate-500">Mentors and admins active on the program management team.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          + Add Recruiter
        </button>
      </div>
      
      <div className="bg-white border border-slate-200/70 rounded-3xl overflow-x-auto shadow-sm relative">
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead className="bg-white/90 backdrop-blur-md">
            <tr className="border-b border-slate-200/60 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <th className="p-5">Name</th>
              <th className="p-5">Email</th>
              <th className="p-5">Role Scope</th>
              <th className="p-5">Joined On</th>
              <th className="p-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 text-sm">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-0">
                  <TableSkeleton columns={5} rows={3} />
                </td>
              </tr>
            ) : allTeamMembers.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">No team members loaded.</td>
              </tr>
            ) : (
              allTeamMembers.map((tm) => (
                <tr key={tm._id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-5 font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{tm.name}</td>
                  <td className="p-5 text-slate-500 font-medium">{tm.email}</td>
                  <td className="p-5">
                    {user?.role === 'admin' && user?._id !== tm._id && tm.role !== 'admin' ? (
                      <select 
                        value={tm.role}
                        onChange={(e) => handleRoleChange(tm._id, e.target.value)}
                        disabled={updatingId === tm._id}
                        className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md border outline-none cursor-pointer bg-emerald-50 text-emerald-700 border-emerald-100/50 shadow-xs focus:border-emerald-400 ${updatingId === tm._id ? 'opacity-50' : ''}`}
                      >
                        <option value="admin">Admin Access</option>
                        <option value="recruiter">Recruiter Access</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xs ${
                        tm.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'
                      }`}>
                        {tm.role} Access
                      </span>
                    )}
                  </td>
                  <td className="p-5 text-slate-400 font-medium">
                    {tm.createdAt ? new Date(tm.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-5 text-right">
                    {user?.role === 'admin' && tm.role !== 'admin' && (
                      <button
                        onClick={() => setDeleteModalData({ isOpen: true, memberId: tm._id, name: tm.name })}
                        disabled={deletingId === tm._id}
                        className={`p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center ${deletingId === tm._id ? 'opacity-50' : ''}`}
                        title="Delete Recruiter"
                      >
                        {deletingId === tm._id ? <span className="text-xs font-bold">...</span> : <Trash2 size={18} strokeWidth={2.5} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Recruiter Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-8 border border-slate-200/60 custom-scrollbar animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Create Recruiter Account</h2>
            <p className="text-sm text-slate-500 mb-8 font-medium">Create a secure login for a new recruiter to access the portal.</p>
            
            <form onSubmit={handleCreateRecruiter} className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  required
                  value={newRecruiter.name}
                  onChange={(e) => setNewRecruiter({ ...newRecruiter, name: e.target.value })}
                  className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
                  placeholder="Jane Doe"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  required
                  value={newRecruiter.email}
                  onChange={(e) => setNewRecruiter({ ...newRecruiter, email: e.target.value })}
                  className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
                  placeholder="jane@example.com"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newRecruiter.password}
                  onChange={(e) => setNewRecruiter({ ...newRecruiter, password: e.target.value })}
                  className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder-slate-400 shadow-sm"
                  placeholder="At least 6 characters"
                  minLength={6}
                />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 rounded-xl transition-all cursor-pointer border-none disabled:opacity-50 active:scale-[0.98]"
                >
                  {isCreating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}



      {/* Delete Confirmation Modal */}
      {deleteModalData.isOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Delete Recruiter?</h2>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
              Are you sure you want to permanently delete the recruiter account for <span className="font-bold text-slate-700">{deleteModalData.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalData({ isOpen: false, memberId: null, name: '' })}
                disabled={deletingId !== null}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-200 hover:shadow-red-300 rounded-xl transition-all cursor-pointer border-none disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
              >
                {deletingId !== null ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminTeam;
