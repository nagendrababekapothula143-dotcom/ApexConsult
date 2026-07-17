import React from 'react';
import { useOutletContext } from 'react-router-dom';

const AdminPayments = () => {
  const { payments } = useOutletContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Payments Ledger</h2>
        <p className="text-sm text-slate-500">Track consultancy program fees and subscription invoice logs.</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Transaction ID</th>
              <th className="p-4">Student</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Date</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {payments.map((pay) => (
              <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-indigo-600">{pay.id}</td>
                <td className="p-4 font-semibold text-slate-900">{pay.student}</td>
                <td className="p-4 font-extrabold text-slate-950">{pay.amount}</td>
                <td className="p-4 text-slate-500">{pay.date}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    pay.status === 'Completed'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                      : 'bg-amber-50 border border-amber-200 text-amber-600'
                  }`}>
                    {pay.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPayments;
