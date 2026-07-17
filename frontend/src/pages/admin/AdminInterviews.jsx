import React from 'react';
import { useOutletContext } from 'react-router-dom';

const AdminInterviews = () => {
  const { interviews } = useOutletContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Recruiting Interviews</h2>
        <p className="text-sm text-slate-500">Track and schedule active partner consulting interviews.</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">ID</th>
              <th className="p-4">Student</th>
              <th className="p-4">Interview Track</th>
              <th className="p-4">Schedule</th>
              <th className="p-4">Interviewer</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {interviews.map((int) => (
              <tr key={int.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-900">{int.id}</td>
                <td className="p-4 font-semibold text-slate-900">{int.student}</td>
                <td className="p-4 text-slate-600 font-medium">{int.job}</td>
                <td className="p-4 text-slate-500">{int.date} ({int.time})</td>
                <td className="p-4 text-slate-600">{int.interviewer}</td>
                <td className="p-4">
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{int.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminInterviews;
