import React from 'react';

const AdminSalaries = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Internship Compensations</h2>
        <p className="text-sm text-slate-500">Corporate stipend guidelines for active placement tracks.</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col gap-3">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center text-sm font-medium">
          <span className="text-slate-600">Analyst level (Internship)</span>
          <strong className="text-emerald-600 font-bold">$28 - $35 / hour</strong>
        </div>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center text-sm font-medium">
          <span className="text-slate-600">Associate level (Full Time)</span>
          <strong className="text-emerald-600 font-bold">$85,000 - $110,000 / year</strong>
        </div>
        <div className="p-4 flex justify-between items-center text-sm font-medium">
          <span className="text-slate-600">Senior Strategy Consultant</span>
          <strong className="text-emerald-600 font-bold">$130,000 - $160,000 / year</strong>
        </div>
      </div>
    </div>
  );
};

export default AdminSalaries;
