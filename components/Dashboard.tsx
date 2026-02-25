
import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Activity, 
  Zap, 
  Play, 
  Video, 
  Calendar,
  ChevronRight,
  Sparkles,
  Briefcase,
  Presentation,
  CheckCircle,
  Layout,
  X,
  MessageSquare,
  Eye,
  BrainCircuit,
  Loader2
} from 'lucide-react';
import { SessionHistory, PracticeMode, User } from '../types';
import FeedbackList from './FeedbackList';
import TranscriptionPanel from './TranscriptionPanel';
import { Database } from '../services/database';
import Markdown from 'react-markdown';

interface DashboardProps {
  user: User;
  onStartLive: (mode: PracticeMode) => void;
  onStartUpload: () => void;
  history: SessionHistory[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, onStartLive, onStartUpload, history }) => {
  const [selectedSession, setSelectedSession] = useState<SessionHistory | null>(null);
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

  // Derived metrics for the progress UI
  const { clarity, vocalPace, engagement, sentiment } = useMemo(() => {
    if (!stats) return { clarity: 0, vocalPace: 0, engagement: 0, sentiment: 0 };
    return stats.performanceIndex;
  }, [stats]);

  if (isStatsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-wellness-bg">
        <Loader2 className="w-12 h-12 text-wellness-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 lg:p-14 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24 lg:pb-14">
      <header className="mb-12 sm:mb-16 relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-wellness-orange/5 blur-[80px] rounded-full -z-10" />
        <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tighter text-wellness-text-primary">
            SpeakMate <span className="gradient-text">Home</span>
        </h1>
        <p className="text-wellness-text-secondary text-lg sm:text-xl font-medium max-w-2xl leading-relaxed">
            Welcome back, {user.name.split(' ')[0]}. You've logged {history.length} sessions. Ready to refine your presence today?
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
        <StatCard label="Overall Score" value={`${stats.avgScore}%`} icon={<TrendingUp size={22} className="text-emerald-500" />} change={history.length > 1 ? "+4%" : undefined} />
        <StatCard label="Practice Time" value={`${Math.floor(stats.totalDuration / 60)}m`} icon={<Clock size={22} className="text-wellness-orange" />} />
        <StatCard label="Active Streak" value={`${stats.streak} Days`} icon={<Zap size={22} className="text-orange-400" />} />
        <StatCard label="Feedback" value="Real-time" icon={<Layout size={22} className="text-wellness-coral" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-wellness-text-secondary mb-8 flex items-center gap-3">
                Select Practice Mode
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PracticeCard 
                    icon={<Activity size={28} className="text-wellness-orange" />}
                    title="Public Speaking"
                    desc="Refine your narrative flow and stage mechanics."
                    onClick={() => onStartLive('PUBLIC_SPEAKING')}
                />
                <PracticeCard 
                    icon={<Briefcase size={28} className="text-emerald-500" />}
                    title="Interview Mastery"
                    desc="High-stakes simulation for job roles."
                    onClick={() => onStartLive('INTERVIEW')}
                />
                <PracticeCard 
                    icon={<Presentation size={28} className="text-wellness-coral" />}
                    title="Pitch Coaching"
                    desc="Executive presence for boardroom wins."
                    onClick={() => onStartLive('PRESENTATION')}
                />
                <PracticeCard 
                    icon={<Video size={28} className="text-wellness-text-secondary" />}
                    title="Solo Studio"
                    desc="Rehearse alone with deep post-analysis."
                    onClick={onStartUpload}
                    variant="ghost"
                />
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] border border-black/[0.03] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
            <div className="p-8 border-b border-black/[0.03] flex justify-between items-center bg-black/[0.01]">
              <h2 className="font-black text-xl tracking-tight text-wellness-text-primary">Practice History</h2>
              <span className="text-wellness-text-secondary text-[10px] font-bold uppercase tracking-widest">Personalized for {user.name}</span>
            </div>
            <div className="divide-y divide-black/[0.03] max-h-[500px] overflow-y-auto custom-scrollbar">
              {history.length === 0 ? (
                <div className="p-20 text-center opacity-30 italic font-medium text-wellness-text-secondary">No sessions found. Your progress starts here.</div>
              ) : history.map(session => (
                <div 
                    key={session.id} 
                    onClick={() => setSelectedSession(session)}
                    className="p-6 sm:p-8 flex items-center justify-between hover:bg-black/[0.01] transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-wellness-bg flex items-center justify-center text-wellness-text-secondary group-hover:scale-105 transition-transform border border-black/[0.03]">
                      {session.mode === 'INTERVIEW' ? <Briefcase size={22} /> : 
                       session.mode === 'PRESENTATION' ? <Presentation size={22} /> : 
                       <Activity size={22} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-wellness-text-primary group-hover:gradient-text transition-all">
                        {session.title}
                      </h4>
                      <div className="flex items-center gap-4 text-[10px] text-wellness-text-secondary font-black uppercase tracking-widest mt-1">
                        <span>{session.date}</span>
                        <span className="w-1 h-1 rounded-full bg-black/[0.05]" />
                        <span>{Math.floor(session.duration / 60)}m {session.duration % 60}s</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="text-right hidden sm:block text-wellness-text-primary">
                      <div className="text-2xl font-black gradient-text">{session.score}%</div>
                      <div className="text-[10px] text-wellness-text-secondary uppercase tracking-widest font-black">Score</div>
                    </div>
                    <ChevronRight size={20} className="text-black/[0.1] group-hover:text-wellness-orange transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-black/[0.03] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)] relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-wellness-orange/5 blur-[50px] rounded-full" />
            <h3 className="font-black text-xs uppercase tracking-widest text-wellness-text-secondary mb-8 flex items-center gap-3">
              Performance Index
            </h3>
            <div className="space-y-10">
              <Goal label="Clarity" progress={clarity} />
              <Goal label="Vocal Pace" progress={vocalPace} />
              <Goal label="Sentiment" progress={sentiment} />
              <Goal label="Engagement" progress={engagement} />
            </div>
            {history.length === 0 && (
                <p className="mt-8 text-[10px] text-wellness-text-secondary font-bold text-center uppercase tracking-widest italic">Awaiting first session data...</p>
            )}
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-black/[0.03] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
             <h3 className="font-black text-xs uppercase tracking-widest text-wellness-text-secondary mb-6 flex items-center gap-3">
                 Weekly Milestones
             </h3>
             <ul className="space-y-5">
                 <TaskItem completed label="Account established" />
                 <TaskItem completed={history.length > 0} label="Complete first session" />
                 <TaskItem completed={history.length >= 3} label="3 sessions milestone" />
                 <TaskItem completed={stats.avgScore > 80} label="Break 80% accuracy barrier" />
             </ul>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-wellness-orange/5 border border-wellness-orange/10 text-wellness-orange">
             <p className="text-xs font-black uppercase tracking-widest mb-2">SpeakMate Insight</p>
             <p className="text-sm font-medium leading-relaxed italic text-wellness-text-primary">
                 {history.length > 0 
                    ? `Your current average score of ${stats.avgScore}% indicates strong potential. Focus on ${stats.avgScore < 85 ? 'pausing more' : 'eye contact'} to reach the next level.`
                    : "Consistency is key. Start your first session to receive your personalized communication roadmap."}
             </p>
          </div>
        </div>
      </div>

      {/* SESSION DETAIL MODAL */}
      {selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white border border-black/[0.03] rounded-[2rem] sm:rounded-[3rem] w-full max-w-6xl max-h-[95vh] overflow-y-auto custom-scrollbar shadow-[0_30px_90px_rgba(0,0,0,0.1)] flex flex-col">
                  <div className="p-6 sm:p-8 border-b border-black/[0.03] flex items-center justify-between bg-black/[0.01] sticky top-0 z-20 backdrop-blur-md">
                      <div>
                          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-wellness-text-primary">{selectedSession.title}</h2>
                          <p className="text-wellness-text-secondary text-[10px] font-bold uppercase tracking-widest mt-1">{selectedSession.date} • {selectedSession.score}% Performance Score</p>
                      </div>
                      <button 
                        onClick={() => setSelectedSession(null)}
                        className="p-3 rounded-2xl bg-wellness-bg text-wellness-text-secondary hover:text-wellness-text-primary transition-colors"
                      >
                          <X size={24} />
                      </button>
                  </div>
                  <div className="p-6 sm:p-8 space-y-8">
                      {selectedSession.videoUrl && (
                        <div className="space-y-4">
                           <h3 className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest flex items-center gap-2 text-wellness-orange"><Eye size={16} /> Self-Review Session Recording</h3>
                           <div className="relative aspect-video rounded-3xl overflow-hidden border border-black/[0.03] shadow-2xl bg-black">
                              <video src={selectedSession.videoUrl} controls className="w-full h-full" />
                           </div>
                        </div>
                      )}

                      {selectedSession.report ? (
                        <div className="bg-wellness-bg rounded-3xl p-8 border border-black/[0.03]">
                          <h3 className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2 text-wellness-orange">
                            <BrainCircuit size={16} /> AI Performance Report
                          </h3>
                          <div className="feedback-report">
                            <Markdown>{selectedSession.report}</Markdown>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="flex flex-col min-h-[400px] bg-wellness-bg rounded-3xl p-6 border border-black/[0.03]">
                            <h3 className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2 text-wellness-text-primary"><MessageSquare size={16} /> Transcript History</h3>
                            <TranscriptionPanel transcriptions={selectedSession.transcriptions || []} />
                          </div>
                          <div className="flex flex-col min-h-[400px] bg-wellness-bg rounded-3xl p-6 border border-black/[0.03]">
                            <h3 className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2 text-wellness-text-primary"><Activity size={16} /> AI Feedback Log</h3>
                            <FeedbackList feedback={selectedSession.feedback || []} />
                          </div>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const PracticeCard = ({ icon, title, desc, onClick, variant = 'solid' }: any) => (
    <button 
        onClick={onClick}
        className={`p-8 rounded-[2.5rem] border-2 text-left transition-all active:scale-[0.98] group ${
            variant === 'solid' 
            ? 'bg-white border-black/15 hover:border-wellness-orange/30 hover:bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]' 
            : 'bg-transparent border-dashed border-black/20 hover:border-black/30 hover:bg-black/[0.01]'
        }`}
    >
        <div className="mb-6 p-4 rounded-2xl bg-black/[0.02] w-fit group-hover:scale-110 group-hover:accent-gradient group-hover:text-white transition-all border border-black/[0.03] group-hover:border-transparent">
            {icon}
        </div>
        <h3 className="text-xl font-black text-wellness-text-primary mb-2 tracking-tight transition-colors group-hover:gradient-text">{title}</h3>
        <p className="text-sm text-wellness-text-secondary leading-relaxed font-medium">{desc}</p>
    </button>
);

const StatCard = ({ icon, label, value, change }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-black/15 shadow-[0_10px_30px_rgba(0,0,0,0.05)] group hover:border-wellness-orange/20 transition-all">
    <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl bg-black/[0.02] group-hover:accent-gradient transition-all group-hover:text-white">
            {icon}
        </div>
        {change && <span className="text-[10px] text-emerald-500 font-black tracking-widest bg-emerald-500/10 px-2 py-1 rounded-full">{change}</span>}
    </div>
    <div className="text-3xl font-black text-wellness-text-primary mb-1 tracking-tighter group-hover:gradient-text transition-all">{value}</div>
    <div className="text-[10px] text-wellness-text-secondary uppercase font-black tracking-[0.2em]">{label}</div>
  </div>
);

const Goal = ({ label, progress }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.1em]">
      <span className="text-wellness-text-secondary">{label}</span>
      <span className="text-wellness-orange">{progress}%</span>
    </div>
    <div className="h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
      <div className="h-full accent-gradient rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
    </div>
  </div>
);

const TaskItem = ({ completed, label }: any) => (
    <li className={`flex items-center gap-4 text-xs font-bold transition-all ${completed ? 'text-wellness-text-secondary line-through' : 'text-wellness-text-primary'}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${completed ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-black/[0.05]'}`} />
        {label}
    </li>
);

export default Dashboard;
