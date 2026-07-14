import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';

const FloatingChat = () => {
  const socket = React.useContext(SocketContext);
  const { user } = React.useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [adminTyping, setAdminTyping] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const fetchActiveTicketAndMessages = async () => {
    try {
      const ticketRes = await api.get('/tickets/student/active');
      const ticket = ticketRes.data.data;
      setActiveTicket(ticket);
      
      if (ticket) {
        const ticketId = ticket._id || ticket.id;
        const msgRes = await api.get(`/messages?ticketId=${ticketId}`);
        setMessages(msgRes.data.data);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to fetch ticket or messages', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActiveTicketAndMessages();
      api.patch('/messages/mark-read').then(() => setHasUnread(false)).catch(console.error);
    } else {
      const checkUnread = async () => {
        try {
          const res = await api.get('/messages/unread');
          setHasUnread(res.data.hasUnread);
        } catch (err) {
          console.error('Failed to check unread messages', err);
        }
      };
      checkUnread();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (!isOpen && msg.senderRole === 'admin') {
        setHasUnread(true);
      }
    };

    const handleTyping = ({ senderRole }) => {
      if (senderRole === 'admin') setAdminTyping(true);
    };

    const handleStopTyping = ({ senderRole }) => {
      if (senderRole === 'admin') setAdminTyping(false);
    };

    const handleTicketResolved = ({ ticketId }) => {
      setActiveTicket(prev => {
        if (prev && (prev._id === ticketId || prev.id === ticketId)) {
          setMessages([]);
          return null; // Clear active ticket
        }
        return prev;
      });
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('ticketResolved', handleTicketResolved);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('ticketResolved', handleTicketResolved);
    };
  }, [socket, isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, adminTyping]);

  const handleTyping = (e) => {
    setText(e.target.value);
    
    if (socket && user) {
      const userId = user._id || user.id;
      if (e.target.value.trim().length > 0) {
        // user._id is the studentId, admins are target
        socket.emit('typing', { targetUserId: userId, senderRole: 'student' });
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('stopTyping', { targetUserId: userId, senderRole: 'student' });
        }, 3000);
      } else {
        socket.emit('stopTyping', { targetUserId: userId, senderRole: 'student' });
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      let currentTicketId = activeTicket?._id || activeTicket?.id;
      
      if (!currentTicketId) {
        const ticketRes = await api.post('/tickets/student', { subject: 'Support Request', category: 'General Support' });
        const newTicket = ticketRes.data.data;
        setActiveTicket(newTicket);
        currentTicketId = newTicket._id || newTicket.id;
      }

      const res = await api.post('/messages', { text, ticketId: currentTicketId });
      setMessages([...messages, res.data.data]);
      setText('');
      if (socket && user) {
        const userId = user._id || user.id;
        socket.emit('stopTyping', { targetUserId: userId, senderRole: 'student' });
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 z-50 focus:outline-none"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-indigo-600 shadow-sm animate-pulse"></span>
            )}
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] max-h-[70vh] bg-white rounded-2xl shadow-xl flex flex-col z-50 border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-200">
          
          {/* Header */}
          <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                Kryntel Support
                <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block"></span>
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                {activeTicket ? 'Connected to an agent.' : 'We typically reply in a few minutes.'}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-2 bg-[#fafafa]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3 opacity-50">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"></path>
                  <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path>
                </svg>
                <p className="text-xs text-slate-500 font-medium">Have a question? Send us a message and we'll help you out!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isStudent = msg.senderRole === 'student';
                const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                return (
                  <div key={msg.id || idx} className={`flex ${isStudent ? 'justify-end' : 'justify-start'} gap-2.5`}>
                    {!isStudent && (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 shrink-0 flex items-center justify-center text-[9px] font-bold text-indigo-700 uppercase shadow-sm">
                        {msg.senderName ? msg.senderName.substring(0, 2) : 'AD'}
                      </div>
                    )}
                    <div className={`flex flex-col gap-1 max-w-[80%] ${isStudent ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        {isStudent ? (
                          <>
                            <span className="text-[9px] font-medium text-slate-400">{time}</span>
                            <span className="text-[11px] font-bold text-slate-700">You</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] font-bold text-slate-700">{msg.senderName || 'Admin'}</span>
                            <span className="text-[9px] font-medium text-slate-400">{time}</span>
                          </>
                        )}
                      </div>
                      <div className={`px-3 py-1.5 text-[13px] leading-snug shadow-sm ${
                        isStudent 
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Typing Indicator */}
            {adminTyping && (
              <div className="flex justify-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 shrink-0 flex items-center justify-center text-[9px] font-bold text-indigo-700 uppercase shadow-sm">
                  AD
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-slate-700">Admin</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-slate-200 shadow-sm flex items-center gap-1 w-[60px] h-[36px]">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={handleSend} className="flex gap-2 relative">
              <input
                type="text"
                value={text}
                onChange={handleTyping}
                placeholder="Type your message..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!text.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors focus:outline-none"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChat;
