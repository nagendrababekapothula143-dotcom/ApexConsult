import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

const AdminCreateTicket = () => {
  const { tickets, setTickets, setSuccess } = useOutletContext();
  const [mockStudentName, setMockStudentName] = useState('');
  const [mockTicketSubject, setMockTicketSubject] = useState('');
  const [mockTicketPriority, setMockTicketPriority] = useState('Medium');
  const [mockTicketCategory, setMockTicketCategory] = useState('Resume Prep');

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!mockTicketSubject || !mockStudentName) return;
    const newTck = {
      id: `TCK-${200 + tickets.length + 1}`,
      student: mockStudentName,
      subject: mockTicketSubject,
      category: mockTicketCategory,
      priority: mockTicketPriority,
      status: 'Open',
    };
    setTickets([newTck, ...tickets]);
    setMockTicketSubject('');
    setMockStudentName('');
    setSuccess('Support ticket created successfully.');

    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Support Tickets Panel</h2>
        <p className="text-sm text-slate-500">Raise support or guidance issues and assign tasks to active mentors.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Create Ticket</h3>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Student Name</label>
              <input
                type="text"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="e.g. Jane Student"
                value={mockStudentName}
                onChange={(e) => setMockStudentName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Ticket Subject</label>
              <input
                type="text"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="e.g. Case prep notes request"
                value={mockTicketSubject}
                onChange={(e) => setMockTicketSubject(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Category</label>
                <select
                  className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={mockTicketCategory}
                  onChange={(e) => setMockTicketCategory(e.target.value)}
                >
                  <option value="Resume Prep">Resume Prep</option>
                  <option value="Scheduling">Scheduling</option>
                  <option value="Case Study">Case Study</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Priority</label>
                <select
                  className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={mockTicketPriority}
                  onChange={(e) => setMockTicketPriority(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer border-none">
              Post Ticket
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-900">Active Queue</h3>
          {tickets.map((tck) => (
            <div key={tck.id} className="border border-slate-200 rounded-lg p-4 flex justify-between items-center gap-4">
              <div>
                <span className="bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-2 inline-block">{tck.category}</span>
                <h4 className="font-bold text-slate-900 text-sm mb-0.5">{tck.subject}</h4>
                <p className="text-xs text-slate-400 font-medium leading-none">Student: {tck.student}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider block mb-2 ${
                  tck.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                }`}>{tck.priority} Priority</span>
                <span className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">{tck.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCreateTicket;
