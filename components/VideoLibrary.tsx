
import React, { useState } from 'react';
import { SessionHistory } from '../types';
import { Play, Calendar, Clock, Award, Trash2, X, Eye, VideoOff, LayoutGrid, ArrowLeft, MessageSquare, BrainCircuit } from 'lucide-react';
import FeedbackList from './FeedbackList';
import Markdown from 'react-markdown';

interface VideoLibraryProps {
  history: SessionHistory[];
  onBack: () => void;
  onDelete: (id: string) => void;
}

const VideoLibrary: React.FC<VideoLibraryProps> = ({ history, onBack, onDelete }) => {
  const [selectedVideo, setSelectedVideo] = useState<SessionHistory | null>(null);

  // Filter only sessions that have an associated video recording
  const videoSessions = history.filter(s => !!s.videoUrl);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-14 max-w-7xl mx-auto w-full animate-in fade-in duration-700 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-wellness-text-secondary hover:text-wellness-text-primary mb-8 transition-colors">
        <ArrowLeft size={16} /> <span className="text-sm font-bold">Back to Dashboard</span>
      </button>

      <header className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-wellness-orange/5 blur-[80px] rounded-full -z-10" />
        <div>
          <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tighter text-wellness-text-primary">
            Video <span className="gradient-text">Vault</span>
          </h1>
          <p className="text-wellness-text-secondary text-lg font-medium max-w-2xl">Your personal archive of performance recordings and self-critique tools.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-black/15 rounded-2xl text-[10px] font-black uppercase tracking-widest text-wellness-text-primary shadow-sm">
           <LayoutGrid size={14} /> {videoSessions.length} Total Recordings
        </div>
      </header>

      {videoSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-dashed border-black/[0.05]">
          <div className="w-20 h-20 rounded-full bg-wellness-bg flex items-center justify-center mb-6">
            <VideoOff size={32} className="text-wellness-text-secondary opacity-30" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-wellness-text-primary">The Vault is Empty</h2>
          <p className="text-wellness-text-secondary max-w-sm mb-8">Record a session in the Solo Studio or start a Live Practice to see your videos here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {videoSessions.map((session) => (
            <div 
              key={session.id}
              className="group relative bg-white border border-black/15 rounded-[2.5rem] overflow-hidden hover:border-wellness-orange/40 transition-all shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_80px_rgba(0,0,0,0.08)]"
            >
              {/* Thumbnail Area */}
              <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                <video src={session.videoUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                <button 
                  onClick={() => setSelectedVideo(session)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-16 h-16 rounded-full bg-wellness-orange flex items-center justify-center text-white shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                    <Play fill="currentColor" size={24} className="ml-1" />
                  </div>
                </button>

                <div className="absolute top-4 right-4 z-10">
                   <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                    className="p-2 rounded-xl bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white transition-all backdrop-blur-md border border-red-500/20"
                    title="Delete Recording"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>

                <div className="absolute top-4 left-4">
                  <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{session.score}% Score</span>
                  </div>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-8">
                <h3 className="text-xl font-black text-wellness-text-primary mb-4 line-clamp-1 group-hover:gradient-text transition-all">{session.title}</h3>
                <div className="flex items-center gap-6 text-[10px] text-wellness-text-secondary font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-wellness-orange" />
                    {session.date}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-wellness-orange" />
                    {Math.floor(session.duration/60)}m {session.duration%60}s
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-black/[0.03] flex items-center justify-between">
                   <button 
                    onClick={() => setSelectedVideo(session)}
                    className="text-xs font-black text-wellness-orange uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity"
                   >
                     <Eye size={16} /> Watch Session
                   </button>
                   <span className="text-[10px] font-black text-wellness-text-secondary uppercase opacity-50">{session.mode || 'Practice'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIDEO MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-5xl max-h-[95vh] bg-white border border-black/[0.03] rounded-[2rem] sm:rounded-[3rem] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col">
             <div className="p-6 sm:p-8 border-b border-black/[0.03] flex items-center justify-between bg-white/80 sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-wellness-orange/10 flex items-center justify-center text-wellness-orange">
                    <Award size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-wellness-text-primary tracking-tight">{selectedVideo.title}</h2>
                    <p className="text-[10px] text-wellness-text-secondary font-black uppercase tracking-widest mt-1">
                      {selectedVideo.date} • <span className="gradient-text">{selectedVideo.score}% Overall Presence Score</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="p-3 rounded-2xl bg-wellness-bg text-wellness-text-secondary hover:text-wellness-text-primary transition-colors"
                >
                  <X size={24} />
                </button>
             </div>
             
             <div className="p-4 sm:p-6 bg-black flex items-center justify-center aspect-video relative">
                <video 
                  src={selectedVideo.videoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full rounded-2xl shadow-2xl"
                />
             </div>

             <div className="p-8 bg-wellness-bg grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-black/[0.03]">
                <DetailStat label="Duration" value={`${Math.floor(selectedVideo.duration/60)}m ${selectedVideo.duration%60}s`} />
                <DetailStat label="Accuracy" value={`${selectedVideo.score}%`} />
                <DetailStat label="Fillers" value={selectedVideo.metrics.fillerWords} />
                <DetailStat label="Analysis" value="Verified" />
             </div>

             <div className="p-6 sm:p-10 flex-1 bg-white">
                {selectedVideo.report ? (
                  <div className="space-y-8">
                    <h3 className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest flex items-center gap-2 text-wellness-orange">
                      <BrainCircuit size={16} /> AI Performance Report
                    </h3>
                    <div className="feedback-report">
                      <Markdown>{selectedVideo.report}</Markdown>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2 text-wellness-orange">
                      <MessageSquare size={16} /> Performance Feedback
                    </h3>
                    {selectedVideo.feedback && selectedVideo.feedback.length > 0 ? (
                      <FeedbackList feedback={selectedVideo.feedback} />
                    ) : (
                      <div className="py-10 text-center text-wellness-text-secondary italic text-sm">
                        No specific feedback markers recorded for this session.
                      </div>
                    )}
                  </>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailStat = ({ label, value }: { label: string, value: string | number }) => (
  <div className="text-center sm:text-left">
    <p className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mb-1">{label}</p>
    <p className="text-xl font-black text-wellness-text-primary">{value}</p>
  </div>
);

export default VideoLibrary;
