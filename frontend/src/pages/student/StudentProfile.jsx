import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';

const StudentProfile = () => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    document.title = 'My Profile | Student Console';
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">My Profile</h2>
        <p className="text-sm text-slate-500 font-medium">View your basic account information.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs max-w-2xl">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
          <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-600 uppercase">
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900">{user.name}</h3>
            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2 inline-block">
              {user.role}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold">
                {user.name}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-semibold">
                {user.email}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
