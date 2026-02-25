
import React, { useMemo, useState, useEffect } from 'react';
import { User, SessionHistory } from '../types';
import { TrendingUp, Clock, Zap, Target, BarChart2, Calendar, BrainCircuit, ShieldAlert, Loader2 } from 'lucide-react';
import { Database } from '../services/database';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface AnalyticsProps {
  user: User;
  history: SessionHistory[];
}

const Analytics: React.FC<AnalyticsProps> = ({ user, history }) => {
  const [stats, setStats] = useState<any>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsStatsLoading(true);
      const data = await Database.getStats(user.email);
      setStats(data);
      setIsStatsLoading(false);
    };
    fetchStats();
  }, [history, user.email]);

  const statsDisplay = useMemo(() => {
    if (!stats) return { avgScore: 0, totalTime: 0, avgFillers: "0", sessions: 0 };
    return {
      avgScore: stats.avgScore,
      totalTime: Math.round(stats.totalDuration / 60),
      avgFillers: history.length > 0 ? (history.reduce((a, b) => a + (b.metrics?.fillerWords ?? 0), 0) / history.length).toFixed(1) : "0",
      sessions: history.length
    };
  }, [stats, history]);

  const isCalibrated = history.length >= 3;
  const calibrationProgress = Math.min((history.length / 3) * 100, 100);

  const formatDate = (dateStr: string, includeTime = false) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!includeTime) return datePart;
      
      const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${datePart} ${timePart}`;
    } catch (e) {
      return dateStr;
    }
  };

  const chartData = useMemo(() => {
    return history.slice(0, 10).reverse().map(session => ({
      date: formatDate(session.date),
      time: new Date(session.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      score: session.score,
      duration: `${Math.floor(session.duration / 60)}m ${session.duration % 60}s`,
      mode: session.mode.replace('_', ' '),
      fullDate: formatDate(session.date, true)
    }));
  }, [history]);

  if (isStatsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-wellness-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 lg:p-14 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24 lg:pb-14">
      <header className="mb-12 sm:mb-16 relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-wellness-orange/5 blur-[80px] rounded-full -z-10" />
        <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tighter text-wellness-text-primary">
            Performance <span className="gradient-text">Growth</span>
        </h1>
        <p className="text-wellness-text-secondary text-lg sm:text-xl font-medium max-w-2xl leading-relaxed">
            Comprehensive analysis of your communication evolution.
        </p>
      </header>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[3rem] border border-dashed border-black/[0.05]">
          <BarChart2 size={64} className="text-black/[0.05] mb-6" />
          <h2 className="text-2xl font-bold mb-2 text-wellness-text-primary">No Performance Data</h2>
          <p className="text-wellness-text-secondary max-w-sm">Complete at least one practice session to unlock your behavioral analytics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Adaptive Calibration Status */}
            <div className={`p-8 rounded-[2.5rem] border ${isCalibrated ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-wellness-orange/5 border-wellness-orange/10 shadow-[0_20px_60px_rgba(0,0,0,0.05)]'}`}>
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCalibrated ? 'bg-emerald-500/10 text-emerald-500' : 'bg-wellness-orange/10 text-wellness-orange'}`}>
                        <BrainCircuit size={24} />
                     </div>
                     <div>
                        <h3 className="font-black text-lg text-wellness-text-primary">Adaptive Calibration</h3>
                        <p className="text-[10px] text-wellness-text-secondary uppercase font-black tracking-widest">{isCalibrated ? 'Fully Calibrated' : 'Learning Phase'}</p>
                     </div>
                  </div>
                  {!isCalibrated && <span className="px-3 py-1 bg-wellness-orange/10 text-wellness-orange text-[10px] font-black uppercase rounded-full tracking-widest">3 Sessions Required</span>}
               </div>
               
               <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                     <span className="text-wellness-text-secondary">System Accuracy</span>
                     <span className={isCalibrated ? 'text-emerald-500' : 'text-wellness-orange'}>{calibrationProgress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-black/[0.03] rounded-full overflow-hidden">
                     <div 
                        className={`h-full transition-all duration-1000 ${isCalibrated ? 'bg-emerald-500' : 'accent-gradient'}`} 
                        style={{ width: `${calibrationProgress}%` }} 
                     />
                  </div>
               </div>
               
               {!isCalibrated && (
                 <p className="mt-6 text-sm text-wellness-text-secondary leading-relaxed font-medium">
                    <ShieldAlert size={16} className="inline-block mr-2 text-wellness-orange" />
                    SpeakMate requires 3 sessions to understand your base vocal style, filler habits, and posture patterns. Insights currently use standard benchmarks.
                 </p>
               )}
            </div>

            {/* Main Growth Graph */}
            <div className="bg-white rounded-[2.5rem] border border-black/[0.03] p-8 overflow-hidden h-[450px] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
              <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-wellness-text-primary tracking-tight">
                <TrendingUp size={24} className="text-wellness-orange" /> Performance Trend
              </h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF7A18" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF6A88" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }}
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-black/[0.03] p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                              <p className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mb-2">{data.fullDate}</p>
                              <div className="flex items-center justify-between gap-8 mb-1">
                                <span className="text-wellness-text-secondary text-xs font-bold">Score</span>
                                <span className="gradient-text font-black text-lg">{data.score}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-8 mb-1">
                                <span className="text-wellness-text-secondary text-[10px] font-bold uppercase">Duration</span>
                                <span className="text-wellness-text-primary text-[10px] font-black">{data.duration}</span>
                              </div>
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-wellness-text-secondary text-[10px] font-bold uppercase">Mode</span>
                                <span className="text-wellness-text-primary text-[10px] font-black">{data.mode}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#E11D48" 
                      strokeWidth={6}
                      fillOpacity={0.6} 
                      fill="url(#colorScore)" 
                      animationDuration={1500}
                      activeDot={{ r: 10, strokeWidth: 0, fill: '#E11D48' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-[2.5rem] border border-black/[0.03] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
              <div className="p-8 border-b border-black/[0.03] flex justify-between items-center bg-black/[0.01]">
                <h3 className="text-xl font-black tracking-tight text-wellness-text-primary">Session Breakdown</h3>
                <span className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest">Total {history.length} Session{history.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {history.map(session => (
                  <div key={session.id} className="p-6 sm:p-8 flex items-center justify-between hover:bg-black/[0.01] transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-wellness-bg flex items-center justify-center text-wellness-text-secondary group-hover:scale-105 transition-transform border border-black/[0.03]">
                        {session.mode === 'INTERVIEW' ? <Zap size={20} /> : <Target size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-lg text-wellness-text-primary group-hover:gradient-text transition-all">{session.title}</p>
                        <p className="text-[10px] text-wellness-text-secondary font-black uppercase tracking-widest mt-1">{formatDate(session.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black gradient-text">{session.score}%</p>
                      <p className="text-[10px] text-wellness-text-secondary uppercase font-black tracking-widest">{Math.floor(session.duration/60)}m {session.duration%60}s</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-black/[0.03] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)] space-y-4">
              <h3 className="font-black text-xs uppercase tracking-widest text-wellness-text-secondary mb-4 flex items-center gap-3">
                  Metrics Summary
              </h3>
              <MetricItem icon={<TrendingUp size={20} className="text-emerald-500" />} label="Average Accuracy" value={`${statsDisplay.avgScore}%`} />
              <MetricItem icon={<Clock size={20} className="text-wellness-orange" />} label="Total Practice" value={`${statsDisplay.totalTime}m`} />
              <MetricItem icon={<Zap size={20} className="text-orange-400" />} label="Fillers / Session" value={statsDisplay.avgFillers} />
              <MetricItem icon={<Target size={20} className="text-wellness-coral" />} label="Total Sessions" value={statsDisplay.sessions.toString()} />
            </div>

            <div className={`rounded-[2.5rem] p-8 relative overflow-hidden group transition-all shadow-[0_20px_60px_rgba(0,0,0,0.05)] ${isCalibrated ? 'bg-wellness-orange text-white' : 'bg-white border border-black/[0.03]'}`}>
               {isCalibrated && <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />}
               <h4 className={`text-2xl font-black mb-4 tracking-tight ${isCalibrated ? 'text-white' : 'text-wellness-text-primary'}`}>AI Insights</h4>
               <p className={`${isCalibrated ? 'text-white/90' : 'text-wellness-text-secondary'} text-sm font-medium leading-relaxed`}>
                 {isCalibrated 
                    ? `Based on your last ${history.length} sessions, you show strong narrative structure but tend to accelerate your pace in the final 2 minutes. Focus on controlled breathing.`
                    : "Complete 3 practice sessions to unlock personalized adaptive insights. Currently analyzing against global executive benchmarks."}
               </p>
            </div>
            
            {!isCalibrated && (
                <div className="p-8 rounded-[2.5rem] bg-wellness-orange/5 border border-wellness-orange/10">
                    <h5 className="text-wellness-orange text-[10px] font-black uppercase tracking-widest mb-2">Next Milestone</h5>
                    <p className="text-wellness-text-primary text-sm font-medium leading-relaxed">
                        Complete {3 - history.length} more sessions to unlock <b>Personalized Vocal Profile</b> and deeper behavioral tracking.
                    </p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MetricItem = ({ icon, label, value }: any) => (
  <div className="flex items-center justify-between p-6 rounded-2xl bg-black/[0.02] border border-black/[0.03] group hover:border-wellness-orange/20 transition-all">
    <div className="flex items-center gap-4">
      <div className="p-2 rounded-xl bg-white shadow-sm group-hover:accent-gradient group-hover:text-white transition-all">
        {icon}
      </div>
      <span className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-xl font-black text-wellness-text-primary tracking-tighter group-hover:gradient-text transition-all">{value}</span>
  </div>
);

export default Analytics;
