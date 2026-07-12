import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import Loader from "../../components/Loader";
import { SocketContext } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const AdminSupportInbox = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { setHasUnreadSupport } = useOutletContext() || {};
  const socket = React.useContext(SocketContext);
  const { user } = React.useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [studentTypingStatuses, setStudentTypingStatuses] = useState({});
  const [replyText, setReplyText] = useState('');
  const selectedTicketId = chatId || null;
  const [loading, setLoading] = useState(true);
  
  // New layout states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Unresolved');

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const msgRes = await api.get('/messages/admin');
      setMessages(msgRes.data.data);
      if (msgRes.data.studentTypingStatuses) {
        setStudentTypingStatuses(msgRes.data.studentTypingStatuses);
      }
      const ticketRes = await api.get('/tickets');
      setTickets(ticketRes.data.data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (studentId) => {
    if (!studentId) return;
    try {
      await api.patch('/messages/mark-read', { targetStudentId: studentId });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setMessages(prev => {
        // Prevent duplicate appending
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleTyping = ({ senderRole }) => {
      // Hard to map typing without ticketId, but we know it's student typing
    };

    const handleStopTyping = ({ senderRole }) => {
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, selectedStudentId]);

  useEffect(() => {
    if (selectedTicketId) {
      const chat = tickets.find(t => t.id === selectedTicketId);
      if (chat && chat.studentId) {
        markAsRead(chat.studentId);
      }
      if (setHasUnreadSupport) {
        setHasUnreadSupport(false);
      }
    }
  }, [selectedTicketId, messages.length, tickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedTicketId]);

  // Group messages by ticketId
  const chatsByTicket = tickets.reduce((acc, ticket) => {
    acc[ticket.id] = {
      ...ticket,
      studentId: ticket.studentId,
      studentName: ticket.studentName,
      messages: [],
      isTyping: studentTypingStatuses[ticket.studentId] || false
    };
    return acc;
  }, {});

  messages.forEach(msg => {
    if (msg.ticketId && chatsByTicket[msg.ticketId]) {
      chatsByTicket[msg.ticketId].messages.push(msg);
    } else {
      // Legacy message fallback
      const legacyId = `legacy-${msg.studentId}`;
      if (!chatsByTicket[legacyId]) {
        chatsByTicket[legacyId] = {
          id: legacyId,
          studentId: msg.studentId,
          studentName: msg.senderRole === 'student' ? msg.senderName : 'Student',
          subject: 'Legacy Conversation',
          status: 'Resolved', // Treat legacy as resolved
          messages: [],
          isTyping: false
        };
      }
      chatsByTicket[legacyId].messages.push(msg);
      if (msg.senderRole === 'student') {
        chatsByTicket[legacyId].studentName = msg.senderName;
      }
    }
  });

  const chatList = Object.values(chatsByTicket).filter(chat => chat.messages.length > 0 || chat.status !== 'Resolved');
  
  // Filter by search and tab
  const filteredChatList = chatList.filter(chat => {
    const matchesSearch = chat.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const isResolved = chat.status === 'Resolved';
    const matchesTab = activeTab === 'Resolved' ? isResolved : !isResolved;
    return matchesSearch && matchesTab;
  });

  const activeChat = selectedTicketId ? chatsByTicket[selectedTicketId] : null;

  const handleTyping = (e) => {
    setReplyText(e.target.value);
    
    if (socket && activeChat) {
      if (e.target.value.trim().length > 0) {
        socket.emit('typing', { targetUserId: activeChat.studentId, senderRole: 'admin' });
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('stopTyping', { targetUserId: activeChat.studentId, senderRole: 'admin' });
        }, 3000);
      } else {
        socket.emit('stopTyping', { targetUserId: activeChat.studentId, senderRole: 'admin' });
      }
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChat || !activeChat.studentId) return;

    try {
      const res = await api.post('/messages', {
        text: replyText,
        targetStudentId: activeChat.studentId
      });
      setMessages([...messages, res.data.data]);
      setReplyText('');
      if (socket) {
        socket.emit('stopTyping', { targetUserId: activeChat.studentId, senderRole: 'admin' });
      }
    } catch (err) {
      console.error('Failed to send reply', err);
    }
  };

  const toggleResolved = async () => {
    if (!activeChat) return;
    if (activeChat.status !== 'Resolved') {
      try {
        await api.patch(`/tickets/${activeChat.id}/resolve`);
        setTickets(prev => prev.map(t => t.id === activeChat.id ? { ...t, status: 'Resolved' } : t));
      } catch (err) {
        console.error('Failed to resolve ticket', err);
      }
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] lg:h-screen -m-4 md:-m-8 flex bg-white font-sans border-t lg:border-t-0 border-slate-200">
      
      {/* Sidebar - Chat List */}
      <div className="w-full lg:w-[280px] lg:min-w-[280px] border-r border-slate-200 flex flex-col bg-white">
        
        {/* Header & Search */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Messages</h2>
            <button className="text-slate-400 hover:text-slate-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
          </div>
          
          <div className="relative mb-4">
            <svg className="absolute left-3 top-2.5 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Search for messages" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-full">
            <button 
              onClick={() => setActiveTab('Resolved')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${activeTab === 'Resolved' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Resolved
            </button>
            <button 
              onClick={() => setActiveTab('Unresolved')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${activeTab === 'Unresolved' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Unresolved
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-white relative">
          {loading && messages.length === 0 ? (
            <div className="absolute inset-0 bg-white z-10 flex items-center justify-center">
              <Loader text="Loading messages..." />
            </div>
          ) : filteredChatList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No messages found</div>
          ) : (
            filteredChatList.map(chat => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              const msgDate = new Date(lastMsg.createdAt).toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
              
              return (
                <button
                  key={chat.id}
                  onClick={() => navigate(`/admin/support/${chat.id}`)}
                  className={`w-full text-left p-4 rounded-xl mb-3 border transition-all ${
                    selectedTicketId === chat.id 
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-bold text-slate-800">Support ticket</div>
                    <div className="text-[10px] font-semibold text-slate-400">{msgDate}</div>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                    {lastMsg.text}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-[9px] uppercase">
                      {chat.studentName.substring(0, 2)}
                    </div>
                    <div className="text-xs font-bold text-slate-700">{chat.studentName}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm uppercase shadow-sm">
                  {activeChat.studentName.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    @{activeChat.studentName.replace(/\s+/g, '')}
                  </h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm"></span> Active
                    </p>
                    {activeChat.isTyping && (
                      <p className="text-xs font-semibold text-slate-400 italic flex items-center gap-1">
                        Typing
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={toggleResolved}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
                  disabled={activeChat.status === 'Resolved'}
                >
                  {activeChat.status === 'Resolved' ? 'Resolved' : 'Resolve'}
                </button>
                <button className="px-4 py-1.5 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-full hover:bg-indigo-50 transition-colors shadow-sm">
                  View profile
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-[#fafafa]">
              {activeChat.messages.map((msg, index) => {
                const isAdmin = msg.senderRole === 'admin';
                const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                
                if (isAdmin) {
                  return (
                    <div key={msg.id || index} className="flex justify-end gap-3 max-w-[85%] ml-auto">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-[10px] font-medium text-slate-400">{time}</span>
                          <span className="text-xs font-bold text-slate-700">You</span>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-[13px] px-4 py-3 rounded-2xl rounded-tr-sm shadow-md leading-relaxed">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={msg.id || index} className="flex justify-start gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase shadow-inner">
                        {activeChat.studentName.substring(0, 2)}
                      </div>
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs font-bold text-slate-700">{activeChat.studentName}</span>
                          <span className="text-[10px] font-medium text-slate-400">{time}</span>
                        </div>
                        <div className="bg-white border border-slate-200 text-slate-800 text-[13px] px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendReply} className="relative max-w-5xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={replyText}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  Send
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p className="text-sm font-semibold">Select a conversation to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportInbox;
