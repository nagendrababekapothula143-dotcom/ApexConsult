import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import TableSkeleton from '../../components/TableSkeleton';

const AdminPayments = () => {
  const { students = [], payments = [], fetchData, loading } = useOutletContext() || {};
  const toast = useToast();

  const [amount, setAmount] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    document.title = 'Payments | Kryntel Console';
    if (fetchData) fetchData(['students', 'payments']);
  }, []);

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !amount) {
      toast.error('Please select a student and enter an amount');
      return;
    }

    setGenerating(true);
    try {
      await api.post('/payments/create-order', {
        studentId: selectedStudent,
        amount: Number(amount)
      });
      toast.success('Payment request generated successfully');
      setAmount('');
      setSelectedStudent('');
      fetchData(['payments']);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate payment request');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!payments || payments.length === 0) {
      toast.error('No payments available to export');
      return;
    }
    
    const headers = ['Order ID', 'Student Name', 'Student Email', 'Student ID', 'Amount (INR)', 'Status', 'Date Generated'];
    const csvRows = [
      headers.join(','),
      ...payments.map(p => [
        p.razorpayOrderId || '',
        `"${p.student?.name || 'Unknown'}"`,
        `"${p.student?.email || ''}"`,
        p.student?.apexId || p.student?._id || '',
        p.amount || 0,
        p.status || '',
        new Date(p.createdAt).toLocaleDateString()
      ].join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kryntel_payments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payments exported successfully');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Payment Requests</h2>
          <p className="text-sm text-slate-500">Generate and track payment links for students.</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={loading || payments.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Generate New Request</h3>
          <form onSubmit={handleGenerateLink} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
                required
              >
                <option value="">Select a student...</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.apexId || s._id.substring(0,8)})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-full sm:w-48">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                placeholder="e.g. 50000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={generating}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm shadow-indigo-500/30 flex items-center justify-center disabled:opacity-50 h-[46px]"
            >
              {generating ? 'Generating...' : 'Create Request'}
            </button>
          </form>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="p-4">Student</th>
                <th className="p-4">Order ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-0">
                    <TableSkeleton columns={5} rows={3} />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">
                    No payment requests found. Generate one above.
                  </td>
                </tr>
              ) : (
                payments.map(payment => (
                  <tr key={payment._id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">
                      {payment.student?.name || 'Unknown'}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {payment.razorpayOrderId}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      ₹{payment.amount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      {payment.status === 'completed' ? (
                        <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100">Paid</span>
                      ) : payment.status === 'failed' ? (
                        <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-rose-100">Failed</span>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-100">Pending</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;
