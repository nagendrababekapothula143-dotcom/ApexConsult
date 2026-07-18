import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getAvatarSource } from '../services/api';

const GlobalProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatarBase64: null
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        avatarBase64: null
      });
      if (user.avatarUrl) {
        setAvatarPreview(getAvatarSource(user.avatarUrl));
      } else {
        setAvatarPreview(null);
      }
      setAlert(null);
    }
  }, [isOpen, user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setAlert({ type: 'error', text: 'Image size must be less than 2MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setFormData(prev => ({ ...prev, avatarBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone
      };
      if (formData.avatarBase64) {
        payload.avatarBase64 = formData.avatarBase64;
      }

      const res = await api.patch(`/auth/profile/${user._id || user.id}`, payload);
      if (res.data.success) {
        setAlert({ type: 'success', text: 'Profile updated successfully!' });
        setUser({ ...user, ...res.data.data });
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile.';
      setAlert({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <h2 className="text-xl font-bold text-slate-900">Profile Settings</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border-none bg-transparent">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {alert && (
            <div className={`p-4 rounded-xl mb-6 text-sm flex items-start gap-3 ${alert.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              <div className="mt-0.5">
                {alert.type === 'success' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                )}
              </div>
              <p className="font-medium">{alert.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative transition-colors group-hover:border-indigo-400 group-hover:bg-indigo-50">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://placehold.co/100x100?text=${(user?.name || 'U').charAt(0).toUpperCase()}`} alt="Avatar" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-xs font-semibold">Upload</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">Profile Picture</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors border-none cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed border-none cursor-pointer shadow-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GlobalProfileModal;
