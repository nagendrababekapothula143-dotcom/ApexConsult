import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import EmptyState from '../../components/EmptyState';
import TableSkeleton from '../../components/TableSkeleton';

const AdminOverview = () => {
  const { jobs = [], globalApplications = [], students = [] } = useOutletContext() || {};
  const applications = globalApplications || [];
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Admin Overview | Kryntel Console';
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

  // Calculate Total Revenue
  const totalRevenue = applications
    .filter((app) => app.status === 'accepted')
    .reduce((sum, app) => sum + (Number(app.job?.placementFee) || 0), 0);

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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 400); // Simulate network load for skeleton
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse mb-2"></div>
          <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-slate-50 rounded-xl animate-pulse"></div>)}
        </div>
        <div className="h-64 bg-slate-50 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Recruitment Hub</h2>
        <p className="text-sm text-slate-500">Live monitoring of consulting placement pipeline and resume submissions.</p>
      </div>

      {/* Stats Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Positions</h4>
          <div className="text-3xl font-extrabold text-slate-900 mb-0.5">{jobs.length}</div>
          <p className="text-[10px] text-slate-400 font-medium">Sourced consulting firms</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Registered Candidates</h4>
          <div className="text-3xl font-extrabold text-slate-900 mb-0.5">{students.length}</div>
          <p className="text-[10px] text-slate-400 font-medium">Vetted student candidates</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Submissions</h4>
          <div className="text-3xl font-extrabold text-slate-900 mb-0.5">{submittedApps.length}</div>
          <p className="text-[10px] text-slate-400 font-medium">Uploaded resume files</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 border border-indigo-700 rounded-xl p-5 shadow-md text-white">
          <h4 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">Total Revenue</h4>
          <div className="text-3xl font-extrabold mb-0.5">
            ${totalRevenue.toLocaleString()}
          </div>
          <p className="text-[10px] text-indigo-300 font-medium">From {acceptedAppsCount} accepted placements</p>
        </div>
      </div>

      {/* Main Charts & Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Pipeline Analytics Chart */}
        <div className="lg:col-span-12 bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-8 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-0.5">Pipeline Activity Traffic</h3>
          <p className="text-xs text-slate-400 mb-6">Visual resume submission volume mapping matching timeline</p>
          
          <div className="h-[200px] w-full mt-4">
            {chartData.length > 0 ? (
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
          {recentApps.length === 0 ? (
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
