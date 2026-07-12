import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

const AdminPaymentLinks = () => {
  const { generatedLinks, setGeneratedLinks, setSuccess } = useOutletContext();
  const [mockStudentName, setMockStudentName] = useState('');
  const [mockAmount, setMockAmount] = useState('');

  const handleGeneratePaymentLink = (e) => {
    e.preventDefault();
    if (!mockStudentName || !mockAmount) return;
    const newLnk = {
      id: `LNK-${900 + generatedLinks.length + 1}`,
      student: mockStudentName,
      amount: `$${mockAmount}`,
      url: `https://apex.consulting/pay/lnk_${Math.random().toString(36).substring(7)}`,
      status: 'Active',
    };
    setGeneratedLinks([newLnk, ...generatedLinks]);
    setMockStudentName('');
    setMockAmount('');
    setSuccess('Payment link generated successfully.');
    
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Payment Invoicing Links</h2>
        <p className="text-sm text-slate-500">Create unique links for students to process registration fees.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Link Generator</h3>
          <form onSubmit={handleGeneratePaymentLink} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Student Name</label>
              <input
                type="text"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="e.g. David Kim"
                value={mockStudentName}
                onChange={(e) => setMockStudentName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Amount (USD)</label>
              <input
                type="number"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="e.g. 1500"
                value={mockAmount}
                onChange={(e) => setMockAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer border-none">
              Generate Link
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-900">Active Links</h3>
          {generatedLinks.map((lnk) => (
            <div key={lnk.id} className="border border-slate-200 rounded-lg p-4 flex justify-between items-center gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-0.5">{lnk.student}</h4>
                <p className="text-xs text-slate-400 font-mono leading-none">{lnk.url}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-slate-950 block">{lnk.amount}</span>
                <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  lnk.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>{lnk.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentLinks;
