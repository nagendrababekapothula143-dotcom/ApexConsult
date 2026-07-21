import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const FeedbackModal = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState('Suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      await api.post('/feedback', { category, message });
      toast.success('Thank you! Your feedback has been sent to the team.');
      setMessage('');
      setCategory('Suggestion');
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Send Feedback</h2>
              <p className="text-sm text-slate-500 mt-1">Help us improve your experience!</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-colors"
              >
                <option value="Suggestion">💡 Suggestion</option>
                <option value="Bug">🐛 Bug Report</option>
                <option value="Question">❓ Question</option>
                <option value="Other">💬 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Message</label>
              <textarea
                required
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-colors resize-none"
              ></textarea>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
