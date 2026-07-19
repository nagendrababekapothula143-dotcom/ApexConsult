import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const MaintenanceModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(null);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  
  const { user } = useContext(AuthContext);

  useEffect(() => {
    let intervalId;

    const checkMaintenance = async () => {
      try {
        const res = await api.get('/system/settings');
        const { maintenanceMode, scheduledMaintenanceTime } = res.data;
        
        // Do not block admins from accessing the site
        if (user?.role === 'admin') {
          setIsOpen(false);
          setScheduledTime(null);
          return;
        }

        let shouldLock = maintenanceMode;
        
        if (scheduledMaintenanceTime) {
          const scheduledDate = new Date(scheduledMaintenanceTime);
          if (new Date() >= scheduledDate) {
            shouldLock = true;
          } else {
            setScheduledTime(scheduledDate);
          }
        } else {
          setScheduledTime(null);
        }

        setIsOpen(shouldLock);
      } catch (err) {
        // Silently fail if api is down
      }
    };

    checkMaintenance();
    intervalId = setInterval(checkMaintenance, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [user]);

  // Second effect to update countdown timer every second
  useEffect(() => {
    if (!scheduledTime || isOpen) return;
    
    const tick = () => {
      const diff = scheduledTime - new Date();
      if (diff <= 0) {
        setIsOpen(true);
        setScheduledTime(null);
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      if (minutes > 60) {
        setTimeLeftStr(scheduledTime.toLocaleString());
      } else {
        setTimeLeftStr(`${minutes}m ${seconds}s`);
      }
    };
    
    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [scheduledTime, isOpen]);

  if (!isOpen && !scheduledTime) return null;

  if (isOpen) {
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4" style={{ zIndex: 999999 }}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center relative overflow-hidden">
          
          {/* Animated background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-200 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-200 rounded-full blur-3xl opacity-50"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-amber-200/50">
              <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">
              Website is Under Maintenance
            </h2>
            
            <p className="text-slate-500 text-lg mb-8 leading-relaxed">
              We are currently performing scheduled upgrades to improve your experience. 
              The Website will be back online shortly. Please do not refresh the page.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button 
                disabled 
                className="w-full bg-slate-100 text-slate-400 font-bold py-3 px-6 rounded-xl cursor-not-allowed"
              >
                Please wait...
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Warning Banner Render - Rendered in normal flow so it pushes content down
  // If user is logged in, restrict it to the right of the 270px sidebar
  const bannerLayoutClass = user ? "w-full lg:w-[calc(100%-270px)] lg:ml-[270px]" : "w-full";

  return (
    <div className={`relative ${bannerLayoutClass} bg-amber-400 text-amber-900 font-bold text-center py-2 px-4 shadow-md flex flex-wrap items-center justify-center gap-2 animate-fade-in-down z-[9999]`}>
      <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>
        Maintenance scheduled. System will go offline in: <span className="font-black bg-amber-900 text-amber-100 px-2 py-0.5 rounded">{timeLeftStr}</span>. Please save your work.
      </span>
    </div>
  );
};

export default MaintenanceModal;
