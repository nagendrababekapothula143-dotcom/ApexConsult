import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

const AdminTeam = () => {
  const { teamMembers } = useOutletContext();

  useEffect(() => {
    document.title = 'Team Management | Kryntel Console';
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Team Management</h2>
        <p className="text-sm text-slate-500">Mentors and admins active on the program management team.</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role Scope</th>
              <th className="p-4">Joined On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-400">No admin members loaded.</td>
              </tr>
            ) : (
              teamMembers.map((tm) => (
                <tr key={tm._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{tm.name}</td>
                  <td className="p-4 text-slate-600">{tm.email}</td>
                  <td className="p-4 font-medium text-slate-700 capitalize">{tm.role} Access</td>
                  <td className="p-4 text-slate-500">
                    {tm.createdAt ? new Date(tm.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTeam;
