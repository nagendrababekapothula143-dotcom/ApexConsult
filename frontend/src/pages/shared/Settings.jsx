import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Session Management State
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  useEffect(() => {
    document.title = 'Settings | Kryntel';
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await api.get('/auth/sessions');
      if (res.data.success) {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      setRevokingId(sessionId);
      await api.delete(`/auth/sessions/${sessionId}`);
      toast.success('Session revoked successfully');
      setSessions(sessions.filter(s => s.sessionId !== sessionId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/update-password', {
        currentPassword,
        newPassword
      });
      
      toast.success("Password successfully updated!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-6 px-4 sm:px-6 md:px-8 w-full box-border">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Account Settings</h1>
        <p className="text-sm text-slate-500">Manage your security and login credentials.</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-xl">🔐</span> Change Password
        </h2>
        
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              placeholder="Enter current password"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-colors"
                placeholder="At least 6 characters"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-colors"
                placeholder="Retype new password"
              />
            </div>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Feature 87: Active Sessions UI */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <span className="text-xl">💻</span> Active Sessions
        </h2>
        <p className="text-xs text-slate-500 mb-5">Manage and revoke active logins across your devices.</p>

        <div className="overflow-x-auto border border-slate-200/60 rounded-xl">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="p-4">Device & Browser</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Last Active</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessionsLoading ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-400">Loading sessions...</td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-400">No active sessions found.</td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.sessionId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-700 max-w-[200px] truncate" title={session.userAgent}>
                      {session.userAgent.substring(0, 40)}{session.userAgent.length > 40 ? '...' : ''}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">{session.ip}</td>
                    <td className="p-4 text-slate-500 font-medium">{new Date(session.lastActive).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRevokeSession(session.sessionId)}
                        disabled={revokingId === session.sessionId}
                        className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {revokingId === session.sessionId ? 'Revoking...' : 'Revoke'}
                      </button>
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

export default Settings;
