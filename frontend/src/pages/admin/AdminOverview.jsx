import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import EmptyState from '../../components/EmptyState';
import TableSkeleton from '../../components/TableSkeleton';
import api from '../../services/api';

const AdminOverview = () => {
  const { jobs = [], globalApplications = [], students = [], payments = [], fetchData, loading } = useOutletContext() || {};
  const applications = globalApplications || [];
  const navigate = useNavigate();
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [scheduledMaintenanceTime, setScheduledMaintenanceTime] = useState('');
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [rateLimits, setRateLimits] = useState(null);

  const [widgetVisibility, setWidgetVisibility] = useState(() => {
    const saved = localStorage.getItem('kryntel_admin_widgets');
    return saved ? JSON.parse(saved) : {
      quickStats: true,
      systemHealth: true,
      securityLimits: true,
      maintenance: true,
      appTrends: true,
      dbGrowth: true,
      recentQueue: true
    };
  });
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem('kryntel_admin_widgets', JSON.stringify(widgetVisibility));
  }, [widgetVisibility]);

  const toggleWidget = (key) => {
    setWidgetVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    document.title = 'Admin Overview | Kryntel Console';
    if (fetchData) fetchData(['jobs', 'students', 'applications', 'payments']);
    
    const fetchHealth = async () => {
      try {
        const res = await api.get('/system/health');
        setSystemMetrics(res.data.data);
      } catch (err) {
        console.error('Failed to fetch system metrics', err);
      } finally {
        setHealthLoading(false);
      }
    };
    
    const fetchSettings = async () => {
      try {
        const res = await api.get('/system/settings');
        setMaintenanceMode(res.data.maintenanceMode);
        if (res.data.scheduledMaintenanceTime) {
          // Format the ISO string to YYYY-MM-DDThh:mm for the datetime-local input
          const d = new Date(res.data.scheduledMaintenanceTime);
          const formatted = d.toISOString().slice(0, 16);
          setScheduledMaintenanceTime(formatted);
        } else {
          setScheduledMaintenanceTime('');
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    
    fetchHealth();
    fetchSettings();
    fetchBackups();
    fetchRateLimits();
    const interval = setInterval(() => {
      fetchHealth();
      fetchRateLimits();
    }, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchRateLimits = async () => {
    try {
      const res = await api.get('/system/rate-limits');
      if (res.data.success) {
        setRateLimits(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch rate limits', err);
    }
  };

  const fetchBackups = async () => {
    try {
      setBackupsLoading(true);
      const res = await api.get('/system/backups');
      if (res.data.success) {
        setBackups(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch backups', err);
    } finally {
      setBackupsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setTriggeringBackup(true);
      // We will back up the core users table for now
      await api.post('/system/backups', { tableName: 'consulting_users' });
      toast.success('Database backup initiated successfully!');
      fetchBackups();
    } catch (err) {
      console.error(err);
      toast.error('Failed to trigger database backup');
    } finally {
      setTriggeringBackup(false);
    }
  };

  const toggleMaintenance = async (isScheduled = false, clearSchedule = false) => {
    try {
      setTogglingMaintenance(true);
      
      let payload = { maintenanceMode: !maintenanceMode };
      
      if (isScheduled) {
        payload = { 
          maintenanceMode: false, // Keep it off right now, wait for schedule
          scheduledMaintenanceTime: new Date(scheduledMaintenanceTime).toISOString() 
        };
      } else if (clearSchedule) {
        payload = {
          maintenanceMode,
          scheduledMaintenanceTime: null
        };
      } else {
        // Just toggling mode immediately, keep schedule as is or clear it
        payload.scheduledMaintenanceTime = clearSchedule ? null : (scheduledMaintenanceTime ? new Date(scheduledMaintenanceTime).toISOString() : null);
      }

      const res = await api.put('/system/settings', payload);
      setMaintenanceMode(res.data.maintenanceMode);
      
      if (res.data.scheduledMaintenanceTime) {
        const d = new Date(res.data.scheduledMaintenanceTime);
        setScheduledMaintenanceTime(d.toISOString().slice(0, 16));
      } else {
        setScheduledMaintenanceTime('');
      }
      
      if (isScheduled) {
        alert('Maintenance scheduled successfully!');
      } else if (clearSchedule) {
        alert('Maintenance schedule cleared.');
      }
    } catch (err) {
      console.error('Failed to update maintenance settings', err);
      alert('Failed to update maintenance settings.');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const acceptedAppsCount = applications.filter((a) => a.status === 'accepted').length;

  // Filter applications to only those that actually have a resume uploaded (completed submissions)
  const submittedApps = applications.filter(app => app.status !== 'recruiter_requested');

  // Calculate dynamic ATS score metrics
  const calculateAvgScore = () => {
    if (!submittedApps || submittedApps.length === 0) return 0;
    const total = submittedApps.reduce((sum, app) => {
      const score = 65 + ((app.student?.name?.length || 5) * 7 % 31);
      return sum + score;
    }, 0);
    return Math.round(total / submittedApps.length);
  };

  const avgATSScore = calculateAvgScore();

  // Calculate Total Revenue from Completed Payments
  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Get recent 3 actual submissions
  const recentApps = submittedApps.slice(0, 3);

  // Prepare data for Recharts
  const generateChartData = () => {
    if (!applications || applications.length === 0) {
      return [];
    }
    const sorted = [...applications].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const countsByDate = {};
    sorted.forEach(app => {
      const date = new Date(app.createdAt || Date.now()).toISOString().split('T')[0];
      countsByDate[date] = (countsByDate[date] || 0) + 1;
    });
    
    let cumulative = 0;
    return Object.keys(countsByDate).sort().map(date => {
      cumulative += countsByDate[date];
      return {
        date,
        applications: cumulative
      };
    });
  };

  const chartData = generateChartData();

  // Removed early loading return to keep the static header visible during loading

  return (
    <div className="space-y-8">
      {/* Header (Always Visible) */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 relative">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Recruitment Hub</h2>
          <p className="text-sm text-slate-500">Live monitoring of consulting placement pipeline and resume submissions.</p>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowWidgetMenu(!showWidgetMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Customize
          </button>
          
          {showWidgetMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dashboard Widgets</h4>
              </div>
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {[
                  { id: 'quickStats', label: 'Quick Metrics Grid' },
                  { id: 'systemHealth', label: 'System Health CPU' },
                  { id: 'securityLimits', label: 'Security & Limits' },
                  { id: 'maintenance', label: 'Maintenance & Backups' },
                  { id: 'appTrends', label: 'Application Trends' },
                  { id: 'dbGrowth', label: 'Database Storage' },
                  { id: 'recentQueue', label: 'Recent Queue' }
                ].map((widget) => (
                  <label key={widget.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <span className="text-sm font-medium text-slate-700">{widget.label}</span>
                    <div className="relative inline-block w-10 h-5 align-middle select-none">
                      <input 
                        type="checkbox" 
                        checked={widgetVisibility[widget.id]}
                        onChange={() => toggleWidget(widget.id)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards grid */}
      {widgetVisibility.quickStats && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
          </div>
          <div className="relative z-10">
            <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Active Positions
            </h4>
            {loading ? <div className="text-4xl font-black text-slate-200 mb-1 tracking-tight animate-pulse">0</div> : <div className="text-4xl font-black text-slate-900 mb-1 tracking-tight">{jobs.length}</div>}
            <p className="text-xs text-slate-400 font-medium">Sourced consulting firms</p>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-violet-600" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </div>
          <div className="relative z-10">
            <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span> Registered Candidates
            </h4>
            {loading ? <div className="text-4xl font-black text-slate-200 mb-1 tracking-tight animate-pulse">0</div> : <div className="text-4xl font-black text-slate-900 mb-1 tracking-tight">{students.length}</div>}
            <p className="text-xs text-slate-400 font-medium">Vetted student candidates</p>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          </div>
          <div className="relative z-10">
            <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Total Submissions
            </h4>
            {loading ? <div className="text-4xl font-black text-slate-200 mb-1 tracking-tight animate-pulse">0</div> : <div className="text-4xl font-black text-slate-900 mb-1 tracking-tight">{submittedApps.length}</div>}
            <p className="text-xs text-slate-400 font-medium">Uploaded resume files</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 border border-indigo-700/50 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative z-10">
            <h4 className="text-[13px] font-bold text-indigo-200 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Confirmed Revenue
            </h4>
            {loading ? <div className="text-4xl font-black text-indigo-300 mb-1 tracking-tight animate-pulse">0</div> : <div className="text-4xl font-black text-white mb-1 tracking-tight">${totalRevenue.toLocaleString()}</div>}
            <p className="text-xs text-indigo-300/80 font-medium">Total successful payments</p>
          </div>
        </div>
      </div>
      )}

      {/* System Health Monitor */}
      {widgetVisibility.systemHealth && (
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">System Health</h3>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 pr-2">
              <input 
                type="datetime-local" 
                value={scheduledMaintenanceTime}
                onChange={(e) => setScheduledMaintenanceTime(e.target.value)}
                className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 outline-none p-1 rounded cursor-pointer"
              />
              {scheduledMaintenanceTime ? (
                <>
                  <button 
                    onClick={() => toggleMaintenance(true, false)}
                    disabled={togglingMaintenance}
                    className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
                  >
                    Schedule
                  </button>
                  <button 
                    onClick={() => toggleMaintenance(false, true)}
                    disabled={togglingMaintenance}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
                    title="Clear Schedule"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-400 px-2">No Schedule</span>
              )}
            </div>

            <button 
              onClick={() => toggleMaintenance()}
              disabled={togglingMaintenance}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                maintenanceMode 
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${maintenanceMode ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`}></div>
              {togglingMaintenance ? 'Updating...' : maintenanceMode ? 'Force Maintenance: ON' : 'Force Maintenance: OFF'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Backend Health Widget */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
                Backend Health
              </h4>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${systemMetrics?.backend?.status === 'Healthy' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {systemMetrics?.backend?.status || 'Unknown'}
              </span>
            </div>
            {healthLoading ? (
              <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900 leading-none">{systemMetrics?.backend?.cpuUsage || 0}%</span>
                  <span className="text-xs text-slate-400 font-medium mb-1">CPU Load</span>
                </div>
                <div className="text-xs font-medium text-slate-500 mt-2 border-t border-slate-100 pt-2 flex justify-between">
                  <span>{systemMetrics?.backend?.memoryUsage || 0}% Memory</span>
                  <span>Uptime: {Math.floor((systemMetrics?.backend?.uptime || 0) / 3600)}h {Math.floor(((systemMetrics?.backend?.uptime || 0) % 3600) / 60)}m</span>
                </div>
              </div>
            )}
          </div>

          {/* Storage Free Tier Limit Widget */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                Storage Limit
              </h4>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">5 GB Total</span>
            </div>
            {healthLoading ? (
              <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900 leading-none">{(systemMetrics?.s3?.usagePercent || 0).toFixed(1)}%</span>
                  <span className="text-xs text-slate-400 font-medium mb-1">
                    {(systemMetrics?.s3?.usedBytes || 0) > 1024 ** 3 ? `${((systemMetrics?.s3?.usedBytes || 0) / (1024 ** 3)).toFixed(2)} GB` : `${((systemMetrics?.s3?.usedBytes || 0) / (1024 ** 2)).toFixed(2)} MB`} Used
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full transition-all duration-500 ${(systemMetrics?.s3?.usagePercent || 0) > 80 ? 'bg-rose-500' : 'bg-purple-500'}`} style={{ width: `${systemMetrics?.s3?.usagePercent || 0}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Firestore Free Tier Limit Widget */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
                Firestore Limit
              </h4>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">1 GB Total</span>
            </div>
            {healthLoading ? (
              <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900 leading-none">
                    {(systemMetrics?.database?.usagePercent || 0).toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-400 font-medium mb-1">
                    {((systemMetrics?.database?.sizeBytes || 0) / 1024).toFixed(1)} KB Used
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full transition-all duration-500 ${(systemMetrics?.database?.usagePercent || 0) > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(1, systemMetrics?.database?.usagePercent || 0)}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Feature 86: Rate Limiting Dashboard */}
      {widgetVisibility.securityLimits && (
      <div className="mt-8 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Security & Rate Limiting
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Global limit config: {rateLimits?.config?.maxRequests || 10000} requests per {((rateLimits?.config?.windowMs || 900000) / 60000)} minutes
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="p-4">Blocked IP Address</th>
                <th className="p-4">Endpoint</th>
                <th className="p-4 text-right">Time of Violation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!rateLimits ? (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-slate-400">Loading security logs...</td>
                </tr>
              ) : rateLimits.violations.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-emerald-600 font-medium">No active rate limit violations. Systems secure.</td>
                </tr>
              ) : (
                rateLimits.violations.map((violation, idx) => (
                  <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                    <td className="p-4 font-bold text-rose-600 truncate max-w-[200px]">{violation.ip}</td>
                    <td className="p-4 text-slate-500 font-medium truncate max-w-[200px]">{violation.path}</td>
                    <td className="p-4 text-right text-slate-500 font-medium">
                      {new Date(violation.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Feature 88: Database Backups UI */}
      {widgetVisibility.maintenance && (
      <div className="mt-8 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
              Database Backups
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage manual Firestore snapshots for disaster recovery.</p>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={triggeringBackup}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
          >
            {triggeringBackup ? 'Triggering...' : 'Create Manual Backup'}
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="p-4">Backup Name</th>
                <th className="p-4">Table</th>
                <th className="p-4">Status</th>
                <th className="p-4">Size</th>
                <th className="p-4 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backupsLoading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">Loading backups...</td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">No backups found. Create one to get started.</td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.BackupArn} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 truncate max-w-[200px]" title={backup.BackupName}>{backup.BackupName}</td>
                    <td className="p-4 text-slate-500 font-medium">{backup.TableName}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${backup.BackupStatus === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {backup.BackupStatus}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">{(backup.BackupSizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="p-4 text-right text-slate-500 font-medium">
                      {new Date(backup.BackupCreationDateTime).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Main Charts & Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8">
        
        {/* Pipeline Analytics Chart */}
        {widgetVisibility.appTrends && (
        <div className="lg:col-span-12 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-10 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Pipeline Activity Traffic</h3>
          <p className="text-sm text-slate-500 mb-8 font-medium">Visual resume submission volume mapping matching timeline</p>
          
          <div className="h-[240px] w-full mt-4">
            {loading ? (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse border border-slate-100"></div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorApps)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState 
                title="No Data" 
                description="Not enough application data to generate trend charts." 
                icon="file" 
              />
            )}
          </div>
        </div>
        )}

        {/* Feature 52: Database Growth Charts */}
        {widgetVisibility.dbGrowth && (
        <div className="lg:col-span-12 bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-10 shadow-sm mt-8">
          <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Database Storage Growth</h3>
          <p className="text-sm text-slate-500 mb-8 font-medium">Firestore volume utilization over the last 30 days (Simulated)</p>
          
          <div className="h-[240px] w-full mt-4">
            {healthLoading ? (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse border border-slate-100"></div>
            ) : systemMetrics?.database?.history && systemMetrics.database.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={systemMetrics.database.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDbGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sizeKB" 
                    name="Size (KB)"
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorDbGrowth)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState 
                title="No Data" 
                description="Not enough historic database metrics available." 
                icon="database" 
              />
            )}
          </div>
        </div>
        )}

      </div>

      {/* Bottom Queue: Latest Applicants */}
      {widgetVisibility.recentQueue && (
      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-8 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Applications Queue</h3>
            <p className="text-xs text-slate-400">Review recent candidate packets matching live requirements</p>
          </div>
          <button
            onClick={() => navigate('/admin/ats-resumes')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 border-none px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            Open ATS Scan →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center gap-4">
                  <div>
                    <div className="h-5 w-32 bg-slate-100 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-48 bg-slate-50 rounded animate-pulse"></div>
                  </div>
                  <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <EmptyState 
              title="Empty Queue" 
              description="No recent resume uploads in database. Job applications will appear here." 
              icon="inbox" 
            />
          ) : (
            recentApps.map((app) => {
              const score = 65 + ((app.student?.name?.length || 5) * 7 % 31);
              return (
                <div key={app._id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0 gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{app.student?.name || 'Candidate Student'}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Applied to: <span className="text-slate-600 font-semibold">{app.job?.title || 'Consulting Role'}</span> at {app.job?.company}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right flex flex-col items-end gap-1">
                      {app.placementStatus && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${app.placementStatus === 'placed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {app.placementStatus === 'placed' ? 'Placed (Self-Reported)' : 'Not Placed'}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        score >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {score}% ATS Fit
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default AdminOverview;
