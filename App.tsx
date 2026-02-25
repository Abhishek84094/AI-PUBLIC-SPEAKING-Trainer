
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import {
  Activity,
  Award,
  MessageSquare,
  Settings,
  Home as HomeIcon,
  Video as VideoIcon,
  BarChart2,
  LogOut,
  Menu,
  X,
  Briefcase,
  Presentation,
  ChevronLeft,
  Mic,
  MicOff,
  Square,
  Sparkles,
  Waves,
  AlertTriangle,
  Library
} from 'lucide-react';
import { SessionStatus, Transcription, FeedbackItem, AppView, SessionHistory, User, PracticeMode } from './types';
import VideoPreview, { VideoPreviewHandle } from './components/VideoPreview';
import FeedbackList from './components/FeedbackList';
import TranscriptionPanel from './components/TranscriptionPanel';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import VideoRecorder from './components/VideoRecorder';
import Analytics from './components/Analytics';
import VideoLibrary from './components/VideoLibrary';
import { Database } from './services/database';
import {
  decodeBase64,
  decodeAudioData,
  createPcmBlob
} from './utils/audio-helpers';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('AUTH');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('PUBLIC_SPEAKING');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const statusRef = useRef<SessionStatus>(SessionStatus.IDLE);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [timer, setTimer] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Initial load to check for session
  useEffect(() => {
    const checkSession = async () => {
      const sessionUser = await Database.getSessionUser();
      if (sessionUser) {
        setUser(sessionUser);
        setView('DASHBOARD');
        const userHistory = await Database.getHistory(sessionUser.email);
        setHistory(userHistory);
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  // Robust history sync whenever the view changes to a list-based screen
  useEffect(() => {
    const syncHistory = async () => {
      if (user && (view === 'DASHBOARD' || view === 'LIBRARY' || view === 'ANALYTICS')) {
        const latestHistory = await Database.getHistory(user.email);
        setHistory(latestHistory);
      }
    };
    syncHistory();
  }, [view, user]);

  useEffect(() => {
    let interval: number;
    if (status === SessionStatus.ACTIVE) {
      interval = window.setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const stopSession = useCallback(async () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(() => { });
      inputAudioContextRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) { }
      sessionRef.current = null;
    }

    if (statusRef.current === SessionStatus.ACTIVE && timer > 2 && user) {
      // Calculate metrics from session data
      const fillerWords = feedback.filter(f => f.type === 'filler').length;
      const pauseCount = feedback.filter(f => f.type === 'pace').length;

      // Estimate speech rate from transcriptions
      const userWords = transcriptions
        .filter(t => t.speaker === 'user')
        .reduce((acc, t) => acc + t.text.split(' ').length, 0);
      const speechRate = timer > 0 ? Math.round((userWords / timer) * 60) : 0;

      // Visual metrics derived from feedback or defaults
      const eyeContactScore = feedback.some(f => f.type === 'posture' && f.message.toLowerCase().includes('eye')) ? 70 : 90;
      const postureScore = feedback.some(f => f.type === 'posture' && f.message.toLowerCase().includes('posture')) ? 75 : 95;
      const confidenceScore = feedback.some(f => f.type === 'sentiment' && f.message.toLowerCase().includes('hesitant')) ? 75 : 90;

      const metrics = {
        speechRate: speechRate || 145, // Fallback to reasonable default if no transcript
        pauseCount,
        fillerWords,
        eyeContactScore,
        postureScore,
        confidenceScore
      };

      const score = Database.calculateSessionScore(metrics, timer);

      const newSession: SessionHistory = {
        id: Math.random().toString(),
        userEmail: user.email,
        date: new Date().toISOString(),
        duration: timer,
        score: score,
        type: 'live',
        title: `${practiceMode.split('_').join(' ')} Practice`,
        mode: practiceMode,
        metrics: metrics,
        feedback: [...feedback],
        transcriptions: [...transcriptions]
      };
      await Database.saveSession(user.email, newSession);
      const latestHistory = await Database.getHistory(user.email);
      setHistory(latestHistory);
    }

    setStatus(SessionStatus.IDLE);
    setTimer(0);
  }, [timer, feedback, transcriptions, practiceMode, user]);

  const startSession = async () => {
    setErrorMessage(null);
    const apiKey = process.env.API_KEY;

    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      setErrorMessage("Gemini API Key is missing. Please ensure your environment is configured.");
      setStatus(SessionStatus.ERROR);
      return;
    }

    try {
      setTranscriptions([]);
      setFeedback([]);
      setTimer(0);
      setStatus(SessionStatus.CONNECTING);

      const ai = new GoogleGenAI({ apiKey });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      await inputAudioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      const stats = await Database.getStats(user!.email);
      const systemInstruction = `
        You are SpeakMate AI Coach. Helpful, concise, and professional. 
        Current user: ${user?.name}. History: ${stats.count} sessions.
        Mode: ${practiceMode}.
        Speak back quickly and offer real-time advice.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: async () => {
            setStatus(SessionStatus.ACTIVE);
            sessionPromise.then(session => {
              session.sendRealtimeInput({ text: "Hello! Let's begin." });
            });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);

            scriptProcessor.onaudioprocess = (e) => {
              if (statusRef.current === SessionStatus.ACTIVE) {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = createPcmBlob(inputData);
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: { data: pcmData, mimeType: 'audio/pcm;rate=16000' } });
                });
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);

            frameIntervalRef.current = window.setInterval(() => {
              if (videoPreviewRef.current && statusRef.current === SessionStatus.ACTIVE) {
                const frame = videoPreviewRef.current.getFrame();
                if (frame) {
                  sessionPromise.then(session => {
                    session.sendRealtimeInput({ media: { data: frame, mimeType: 'image/jpeg' } });
                  });
                }
              }
            }, 1000);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === 'user') {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...last, text: last.text + text };
                  return updated;
                }
                return [...prev, { text, speaker: 'user', timestamp: Date.now() }];
              });
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === 'ai') {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...last, text: last.text + text };
                  return updated;
                }
                return [...prev, { text, speaker: 'ai', timestamp: Date.now() }];
              });
            }
          },
          onerror: (e) => { setStatus(SessionStatus.ERROR); setErrorMessage("Connection error occurred."); stopSession(); },
          onclose: () => { stopSession(); }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initialize coach.");
      setStatus(SessionStatus.ERROR);
    }
  };

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<VideoPreviewHandle>(null);
  const sessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const handleLogin = (u: User) => { setUser(u); setView('DASHBOARD'); };
  const handleLogout = async () => {
    stopSession();
    await Database.signOut();
    setUser(null);
    setView('AUTH');
  };
  const handleStartPractice = (mode: PracticeMode) => { stopSession(); setPracticeMode(mode); setView('LIVE'); setIsSidebarOpen(false); };

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (view === 'AUTH') return <Auth onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-full bg-wellness-bg text-wellness-text-primary overflow-hidden relative font-sans">
      <div className="lg:hidden absolute top-0 left-0 right-0 h-16 border-b border-black/[0.03] bg-white/90 backdrop-blur-xl flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tighter gradient-text">SpeakMate</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-wellness-text-secondary hover:text-wellness-text-primary transition-colors">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <nav className={`fixed inset-y-0 left-0 w-72 border-r border-black/[0.03] bg-white/95 backdrop-blur-3xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-10 hidden lg:flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center shadow-lg shadow-wellness-orange/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <span className="font-black text-2xl tracking-tighter gradient-text">SpeakMate</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 space-y-1.5 py-4 custom-scrollbar">
          <NavLink icon={<HomeIcon size={20} />} label="Home" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} />
          <NavLink icon={<BarChart2 size={20} />} label="Progress" active={view === 'ANALYTICS'} onClick={() => { setView('ANALYTICS'); setIsSidebarOpen(false); }} />
          <NavLink icon={<Library size={20} />} label="Video Vault" active={view === 'LIBRARY'} onClick={() => { setView('LIBRARY'); setIsSidebarOpen(false); }} />

          <p className="px-4 text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mt-10 mb-4">Practice Modes</p>
          <NavLink icon={<Activity size={20} />} label="Public Speaking" active={view === 'LIVE' && practiceMode === 'PUBLIC_SPEAKING'} onClick={() => handleStartPractice('PUBLIC_SPEAKING')} />
          <NavLink icon={<Briefcase size={20} />} label="Interview Prep" active={view === 'LIVE' && practiceMode === 'INTERVIEW'} onClick={() => handleStartPractice('INTERVIEW')} />
          <NavLink icon={<Presentation size={20} />} label="Pitch Master" active={view === 'LIVE' && practiceMode === 'PRESENTATION'} onClick={() => handleStartPractice('PRESENTATION')} />
          <NavLink icon={<VideoIcon size={20} />} label="Solo Studio" active={view === 'UPLOAD'} onClick={() => { setView('UPLOAD'); setIsSidebarOpen(false); }} />
        </div>
        <div className="p-8 border-t border-black/[0.03]">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/[0.02] border border-black/[0.03] mb-4 group cursor-default">
            <div className="w-10 h-10 rounded-full accent-gradient flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
              {user?.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-wellness-text-primary">{user?.name}</p>
              <p className="text-[10px] text-wellness-text-secondary font-bold uppercase tracking-wider">Communication Pro</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 rounded-xl text-wellness-text-secondary hover:text-wellness-pink hover:bg-wellness-pink/5 transition-all text-sm font-bold">
            <LogOut size={18} /><span>Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 relative flex flex-col overflow-hidden pt-16 lg:pt-0">
        {view === 'DASHBOARD' && <Dashboard user={user!} onStartLive={handleStartPractice} onStartUpload={() => setView('UPLOAD')} history={history} />}
        {view === 'ANALYTICS' && user && <Analytics user={user} history={history} />}
        {view === 'LIBRARY' && (
          <VideoLibrary
            history={history}
            onBack={() => setView('DASHBOARD')}
            onDelete={async (id) => {
              if (user) {
                await Database.deleteSession(user.email, id);
                const latestHistory = await Database.getHistory(user.email);
                setHistory(latestHistory);
              }
            }}
          />
        )}
        {view === 'UPLOAD' && (
          <VideoRecorder
            user={user!}
            onBack={() => setView('DASHBOARD')}
            onAnalysisComplete={async (item) => {
              if (user) {
                await Database.saveSession(user.email, item);
                const latestHistory = await Database.getHistory(user.email);
                setHistory(latestHistory);
              }
            }}
          />
        )}
        {view === 'LIVE' && (
          <div className="flex-1 flex flex-col p-4 sm:p-10 gap-6 h-full overflow-hidden">
            <div className="flex items-center justify-between">
              <button onClick={() => { stopSession(); setView('DASHBOARD'); }} className="p-3 rounded-xl bg-white border border-black/20 text-wellness-text-primary hover:bg-wellness-bg transition-all shadow-lg active:scale-95"><ChevronLeft size={24} /></button>
              <div className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-sm ${status === SessionStatus.ACTIVE ? 'bg-wellness-orange/10 text-wellness-orange border border-wellness-orange/20' : 'bg-white border border-black/15 text-wellness-text-secondary'}`}>
                <div className={`w-2 h-2 rounded-full ${status === SessionStatus.ACTIVE ? 'bg-wellness-orange animate-pulse' : 'bg-black/20'}`} />
                {practiceMode.split('_').join(' ')}
              </div>
              <div className="flex items-center gap-3">
                {status === SessionStatus.ACTIVE && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-wellness-orange/10 border border-wellness-orange/20 animate-in fade-in slide-in-from-right-2 shadow-sm">
                    <Waves className="w-4 h-4 text-wellness-orange animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-wellness-orange">Recording</span>
                  </div>
                )}
                <button onClick={() => setMicActive(!micActive)} className={`p-3.5 rounded-xl transition-all shadow-lg active:scale-95 border ${micActive ? 'text-wellness-orange bg-wellness-orange/10 border-wellness-orange/30' : 'text-wellness-text-primary bg-white border-black/20'}`}>{micActive ? <Mic size={22} /> : <MicOff size={22} />}</button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center gap-3 text-red-500 animate-in slide-in-from-top-4">
                <AlertTriangle size={20} />
                <p className="text-sm font-bold">{errorMessage}</p>
              </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
              <div className="flex-[3] relative rounded-[2.5rem] overflow-hidden group shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-black/[0.03] bg-black">
                <VideoPreview ref={videoPreviewRef} isActive={cameraActive && (status === SessionStatus.ACTIVE || status === SessionStatus.CONNECTING)} />
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[100]">
                  {status === SessionStatus.ACTIVE ? (
                    <button onClick={stopSession} className="px-10 py-4 rounded-full bg-red-600 text-white font-black flex items-center gap-3 shadow-2xl hover:bg-red-700 transition-all active:scale-95 group relative">
                      <Square size={18} fill="white" className="group-hover:scale-110 transition-transform" /> End Session
                    </button>
                  ) : (
                    <button onClick={startSession} className="px-12 py-5 rounded-full btn-primary shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-3 relative">
                      {status === SessionStatus.CONNECTING ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Calibrating Coach...
                        </>
                      ) : 'Wake up SpeakMate'}
                    </button>
                  )}
                </div>
                {status === SessionStatus.ACTIVE && (
                  <div className="absolute top-10 right-10 flex flex-col items-end gap-2">
                    <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 font-mono text-xl text-white">
                      {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                )}
              </div>
              <aside className="flex-1 flex flex-col gap-6 lg:max-w-md">
                <div className="flex-[2] bg-white border border-black/[0.03] rounded-[2.5rem] p-8 flex flex-col min-h-0 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
                  <h3 className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2"><MessageSquare size={16} /> Conversation</h3>
                  <TranscriptionPanel transcriptions={transcriptions} />
                </div>
                <div className="flex-1 bg-white border border-black/[0.03] rounded-[2.5rem] p-8 flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
                  <h3 className="text-[10px] font-black text-wellness-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2"><Activity size={16} /> Analysis</h3>
                  <FeedbackList feedback={feedback} />
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavLink = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${active ? 'bg-wellness-orange/10 text-wellness-orange border border-wellness-orange/20 shadow-sm' : 'text-wellness-text-primary hover:text-wellness-orange hover:bg-wellness-orange/5'}`}>
    <span className={`${active ? 'text-wellness-orange' : 'text-wellness-text-secondary group-hover:text-wellness-orange'} transition-colors`}>{icon}</span>
    <span className="text-sm font-bold tracking-tight">{label}</span>
  </button>
);

export default App;
