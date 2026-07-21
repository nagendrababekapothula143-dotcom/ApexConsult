import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(true);

  useEffect(() => {
    document.title = 'Student Feedback | Kryntel Console';
    fetchFeedbacks();
    const interval = setInterval(() => {
      fetchFeedbacks();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const res = await api.get('/feedback');
      if (res.data.success) {
        setFeedbacks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch feedbacks', err);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-0.5">Student Feedback & Suggestions</h1>
          <p className="text-sm text-slate-500 font-medium">Review direct feedback submitted by users from the platform</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-8 shadow-xs">
        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="p-4">Student Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 w-1/2">Message</th>
                <th className="p-4 text-right">Date Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feedbacksLoading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400">Loading feedback...</td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">No feedback submitted yet.</td>
                </tr>
              ) : (
                feedbacks.map((fb) => (
                  <tr key={fb.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 truncate max-w-[150px]">{fb.studentName || 'Anonymous'}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        fb.category === 'Bug' ? 'bg-rose-50 text-rose-600' :
                        fb.category === 'Suggestion' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {fb.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-sm whitespace-pre-wrap">{fb.message}</td>
                    <td className="p-4 text-right text-slate-500 font-medium whitespace-nowrap">
                      {new Date(fb.createdAt).toLocaleDateString()}
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

export default AdminFeedback;
