import React, { useEffect } from 'react';

const AdminRecruiters = () => {
  useEffect(() => {
    document.title = 'Partner Recruiters | Kryntel Console';
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-0.5">Partner Recruiters</h1>
        <p className="text-sm text-slate-500">Corporate connections pulling talent databases directly from this portal.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-900">Partner Consultancies</h2>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">These corporate partners are dynamically linked to applicant resume files:</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-200 rounded-xl p-5 text-center shadow-xs flex flex-col gap-1">
            <h3 className="font-bold text-slate-900 text-sm">McKinsey & Company</h3>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider self-center mt-2">Active Recruiter</span>
          </div>
          <div className="border border-slate-200 rounded-xl p-5 text-center shadow-xs flex flex-col gap-1">
            <h3 className="font-bold text-slate-900 text-sm">Bain & Company</h3>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider self-center mt-2">Active Recruiter</span>
          </div>
          <div className="border border-slate-200 rounded-xl p-5 text-center shadow-xs flex flex-col gap-1">
            <h3 className="font-bold text-slate-900 text-sm">Boston Consulting Group</h3>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider self-center mt-2">Active Recruiter</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRecruiters;
