import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

const AdminAccess = () => {
  const { students, teamMembers } = useOutletContext();

  useEffect(() => {
    document.title = 'Access Control | Apex Console';
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">User Access Control</h2>
        <p className="text-sm text-slate-500">Live registry permissions and role scopes queried directly from MongoDB.</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-3">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center text-sm font-medium">
          <div>
            <span className="text-slate-600 font-bold block mb-1">Consulting Administrator</span>
            <span className="text-xs text-slate-400 font-medium">Full administrative dashboard scopes, posting jobs, and reviewing ATS resumes.</span>
          </div>
          <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-extrabold">
            {teamMembers ? teamMembers.length : 0} Active Admins
          </span>
        </div>
        <div className="p-4 flex justify-between items-center text-sm font-medium">
          <div>
            <span className="text-slate-600 font-bold block mb-1">Candidate Student</span>
            <span className="text-xs text-slate-400 font-medium">Search consulting placements, optimize documents using AI tool, and apply to positions.</span>
          </div>
          <span className="bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-extrabold">
            {students ? students.length : 0} Active Students
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminAccess;
