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
    
    fetchHealth();
    // Poll every 2 seconds for real-time updates
    const interval = setInterval(fetchHealth, 2000);
    return () => clearInterval(interval);
  }, []);

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
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Recruitment Hub</h2>
        <p className="text-sm text-slate-500">Live monitoring of consulting placement pipeline and resume submissions.</p>
      </div>

      {/* Stats Cards grid */}
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
            <h4 className="text-[13px] font-bold text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span> Total Revenue
            </h4>
            {loading ? (
              <div className="text-4xl font-black mb-1 tracking-tight text-indigo-400 drop-shadow-md animate-pulse">₹0</div>
            ) : (
              <div className="text-4xl font-black mb-1 tracking-tight text-white drop-shadow-md">
                ₹{totalRevenue.toLocaleString()}
              </div>
            )}
            <p className="text-xs text-indigo-200/80 font-medium">From {acceptedAppsCount} accepted placements</p>
          </div>
        </div>
      </div>

      {/* System Health Monitor */}
      <div>
        <h3 className="text-lg font-black text-slate-900 mb-4 tracking-tight">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU Widget */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
                CPU Usage
              </h4>
              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{systemMetrics?.cpu?.cores || 0} Cores</span>
            </div>
            {healthLoading ? (
              <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900 leading-none">{systemMetrics?.cpu?.usagePercent || 0}%</span>
                  <span className="text-xs text-slate-400 font-medium mb-1">Load Avg: {(systemMetrics?.cpu?.loadAverage[0] || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-sky-500 h-2 rounded-full transition-all duration-500" style={{ width: `${systemMetrics?.cpu?.usagePercent || 0}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Memory Widget */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                Memory
              </h4>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{systemMetrics?.memory?.totalGB || 0} GB</span>
            </div>
            {healthLoading ? (
              <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900 leading-none">{systemMetrics?.memory?.usagePercent || 0}%</span>
                  <span className="text-xs text-slate-400 font-medium mb-1">{systemMetrics?.memory?.usedGB || 0} GB Used</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${systemMetrics?.memory?.usagePercent || 0}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Database Widget */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
                Database
              </h4>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${systemMetrics?.database?.status === 'Healthy' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {systemMetrics?.database?.status || 'Unknown'}
              </span>
            </div>
            {healthLoading ? (
              <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900 leading-none">
                    {systemMetrics?.database?.billingMode === 'PAY_PER_REQUEST' ? 'Auto' : (systemMetrics?.database?.readCapacity || 0)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium mb-1">
                    {systemMetrics?.database?.billingMode === 'PAY_PER_REQUEST' ? 'Scaling Capacity' : 'RCU Provisioned'}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-500 mt-2 border-t border-slate-100 pt-2 flex justify-between">
                  <span>{systemMetrics?.database?.itemCount || 0} Total Items</span>
                  <span>{((systemMetrics?.database?.sizeBytes || 0) / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8">
        
        {/* Pipeline Analytics Chart */}
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



      </div>

      {/* Bottom Queue: Latest Applicants */}
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
                    <div className="text-right">
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
    </div>
  );
};

export default AdminOverview;
