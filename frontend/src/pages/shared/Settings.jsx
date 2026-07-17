import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../config/firebase';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Google Linking State
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    document.title = 'Settings | Kryntel';
    // Check if user is already linked with Google
    if (auth.currentUser) {
      const isLinked = auth.currentUser.providerData.some(
        (provider) => provider.providerId === 'google.com'
      );
      setIsGoogleLinked(isLinked);
    }
  }, []);

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
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No active Firebase session found.");

      // Re-authenticate first to ensure security
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Now update the password
      await updatePassword(currentUser, newPassword);
      
      toast.success("Password successfully updated!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
        toast.error("Incorrect current password.");
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error("Please log out and log back in to change your password.");
      } else {
        toast.error(error.message || "Failed to update password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setLinkLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      setIsGoogleLinked(true);
      toast.success("Google Account successfully linked!");
    } catch (error) {
      console.error("Link error:", error);
      if (error.code === 'auth/credential-already-in-use') {
        toast.error("This Google account is already linked to another user.");
      } else {
        toast.error("Failed to link Google account.");
      }
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-6">
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

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-xl">🌐</span> Social Accounts
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Link your Google account to enable quick sign-in without a password.
        </p>

        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Google Account</h3>
              <p className="text-xs text-slate-500">
                {isGoogleLinked ? 'Connected to your profile' : 'Not connected'}
              </p>
            </div>
          </div>
          
          {isGoogleLinked ? (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200">
              Linked
            </span>
          ) : (
            <button
              onClick={handleLinkGoogle}
              disabled={linkLoading}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {linkLoading ? 'Linking...' : 'Link Account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
