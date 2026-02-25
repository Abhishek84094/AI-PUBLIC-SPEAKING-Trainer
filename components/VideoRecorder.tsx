
import React, { useState, useRef, useEffect } from 'react';
import {
  Square,
  RefreshCcw,
  Sparkles,
  ArrowLeft,
  Video,
  Play,
  Monitor,
  CheckCircle2,
  ChevronRight,
  BrainCircuit
} from 'lucide-react';
import { SessionHistory, User } from '../types';
import { GoogleGenAI } from '@google/genai';
import { Database } from '../services/database';
import Markdown from 'react-markdown';

interface VideoRecorderProps {
  user: User;
  onBack: () => void;
  onAnalysisComplete: (history: any) => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ user, onBack, onAnalysisComplete }) => {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'ready' | 'recording' | 'review' | 'analyzing' | 'complete'>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [report, setReport] = useState<string>('');
  const [generatedScore, setGeneratedScore] = useState(0);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
  };

  const startCamera = async () => {
    try {
      stopAll();
      setIsSaved(false);
      setStatus('preparing');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.style.transform = 'scaleX(-1)';
        await videoRef.current.play();
        setStatus('ready');
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setStatus('idle');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    setIsSaved(false);
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoBlobUrl(url);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.muted = false;
        videoRef.current.controls = true;
        videoRef.current.style.transform = 'none';
        videoRef.current.play();
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setStatus('recording');
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus('review');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    }
    return null;
  };

  const handleAnalyze = async () => {
    setStatus('analyzing');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Convert recorded chunks to base64
      const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
      const base64Video = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(videoBlob);
      });

      const prompt = `Analyze this public speaking practice session. Act as a world-class executive speech coach. 
      
      You are watching the FULL video recording. Evaluate the speaker's clarity, pacing, and visual presence (posture, framing, and eye contact) throughout the entire duration.
      
      CRITICAL:
      1. If the user is NOT speaking or just adjusting their equipment/hair for the whole video, you MUST explicitly mention this as the primary observation.
      2. Analyze the audio and visual synchronization.
      
      Provide a highly structured, professional performance report using the following sections:
      
      # EXECUTIVE SUMMARY
      A high-level overview of the session's impact and the speaker's overall presence.
      
      # KEY STRENGTHS
      * Bullet points of what went exceptionally well.
      
      # AREAS FOR MASTERY
      * Specific technical improvements needed in delivery or visual presence.
      
      # STRATEGIC ACTION PLAN
      1. Immediate next step.
      2. Mid-term practice focus.
      
      Maintain a professional, sophisticated, and encouraging tone. Use clear headings and bullet points.
      
      IMPORTANT: At the end of your response, provide numerical metrics in the following JSON format enclosed in <metrics> tags:
      <metrics>
      {
        "speechRate": number,
        "pauseCount": number,
        "fillerWords": number,
        "eyeContactScore": number,
        "postureScore": number,
        "confidenceScore": number
      }
      </metrics>
      
      Use reasonable estimates based on the visual and context.`;

      const contents = {
        parts: [
          { inlineData: { data: base64Video, mimeType: 'video/webm' } },
          { text: prompt }
        ]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents
      });

      const text = response.text || "";
      let metrics = {
        speechRate: 150,
        pauseCount: 5,
        fillerWords: 8,
        eyeContactScore: 85,
        postureScore: 80,
        confidenceScore: 88
      };

      // Extract metrics from AI response
      const metricsMatch = text.match(/<metrics>([\s\S]*?)<\/metrics>/);
      if (metricsMatch) {
        try {
          const parsedMetrics = JSON.parse(metricsMatch[1].trim());
          metrics = { ...metrics, ...parsedMetrics };
        } catch (e) {
          console.error("Failed to parse metrics from AI response", e);
        }
      }

      const score = Database.calculateSessionScore(metrics, recordingTime);
      setGeneratedScore(score);
      setReport(text.replace(/<metrics>[\s\S]*?<\/metrics>/, '').trim() || "Insightful performance. You maintained good pace but could emphasize your key points with more tonal variation.");
      setLastMetrics(metrics);
      setStatus('complete');
    } catch (err) {
      console.error(err);
      setStatus('review');
    }
  };

  const [lastMetrics, setLastMetrics] = useState<any>(null);

  const finalizeSession = async () => {
    if (!user || isSaved) return;
    await onAnalysisComplete({
      id: Math.random().toString(),
      userEmail: user.email,
      date: new Date().toISOString(),
      duration: recordingTime,
      score: generatedScore,
      type: 'upload',
      title: `Studio Practice`,
      mode: 'PUBLIC_SPEAKING',
      metrics: lastMetrics || {
        speechRate: 150,
        pauseCount: 5,
        fillerWords: 8,
        eyeContactScore: 85,
        postureScore: 80,
        confidenceScore: 88
      },
      report: report,
      videoUrl: videoBlobUrl
    });
    setIsSaved(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isMirrored = status === 'preparing' || status === 'ready' || status === 'recording';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-10 max-w-6xl mx-auto w-full animate-in fade-in duration-500 pb-20">
      <canvas ref={canvasRef} className="hidden" />
      <button onClick={onBack} className="flex items-center gap-2 text-wellness-text-primary hover:text-wellness-orange mb-8 transition-colors group">
        <div className="p-2.5 rounded-xl bg-white border border-black/20 shadow-md group-hover:border-wellness-orange/40 transition-all">
          <ArrowLeft size={20} />
        </div>
        <span className="text-sm font-black uppercase tracking-widest">Exit Studio</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="relative aspect-video bg-black rounded-[2.5rem] border border-black/10 overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
            />

            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

            <div className="absolute top-8 left-8 flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full flex items-center gap-2.5 backdrop-blur-xl border ${status === 'recording' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-black/40 border-white/10 text-white/70'}`}>
                <div className={`w-2 h-2 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/30'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none pt-0.5">
                  {status === 'recording' ? 'REC STUDIO' : 'Solo Studio'}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest">
                720p HD
              </div>
            </div>

            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 text-center p-6">
                <div className="w-20 h-20 rounded-full bg-wellness-orange/20 flex items-center justify-center mb-6">
                  <Video className="text-wellness-orange w-10 h-10" />
                </div>
                <h3 className="text-xl font-black mb-6 text-white">Initialize Solo Studio</h3>
                <button onClick={startCamera} className="btn-primary px-12 py-5 shadow-2xl">Enable Camera</button>
              </div>
            )}

            {status === 'recording' && (
              <div className="absolute top-8 right-8 flex items-center gap-3 bg-red-600 px-4 py-2 rounded-full shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-black font-mono text-white">{formatTime(recordingTime)}</span>
              </div>
            )}

            {status === 'ready' && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100]">
                <button onClick={startRecording} className="p-6 rounded-full bg-red-600 border-4 border-white/20 shadow-2xl animate-in zoom-in hover:scale-110 transition-transform relative">
                  <div className="w-5 h-5 bg-white rounded-full" />
                </button>
              </div>
            )}

            {status === 'recording' && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100]">
                <button onClick={stopRecording} className="p-6 rounded-full bg-white text-black shadow-2xl hover:scale-110 transition-transform relative">
                  <Square fill="currentColor" size={24} />
                </button>
              </div>
            )}

            {status === 'analyzing' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl z-30">
                <div className="w-16 h-16 border-4 border-wellness-orange/20 border-t-wellness-orange rounded-full animate-spin mb-6" />
                <h3 className="text-xl font-bold text-white">Analyzing Presence & Clarity...</h3>
                <p className="text-white/60 text-sm mt-2">SpeakMate Intelligence is synthesizing your session.</p>
              </div>
            )}
          </div>

          {status === 'review' && (
            <div className="flex gap-4 animate-in slide-in-from-top-4">
              <button onClick={handleAnalyze} className="flex-1 btn-primary shadow-xl">
                <BrainCircuit size={20} /> Generate AI Performance Report
              </button>
              <button onClick={startCamera} className="p-5 rounded-2xl bg-white border border-black/20 text-wellness-text-primary hover:bg-wellness-bg transition-all shadow-lg active:scale-95">
                <RefreshCcw size={22} />
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white rounded-[2.5rem] border border-black/[0.03] p-8 flex flex-col min-h-[450px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] relative overflow-hidden">
            <h2 className="text-sm font-black uppercase tracking-widest text-wellness-text-secondary mb-8 flex items-center gap-2">
              <Monitor size={16} />
              {status === 'complete' ? 'AI Performance Report' : 'Session Intelligence'}
            </h2>

            {status === 'complete' ? (
              <div className="flex-1 overflow-y-auto space-y-6 animate-in fade-in duration-700 no-scrollbar">
                <div className="flex items-center justify-between p-6 rounded-3xl bg-wellness-orange/5 border border-wellness-orange/10">
                  <div>
                    <p className="gradient-text font-black text-2xl">{generatedScore}%</p>
                    <p className="text-[10px] text-wellness-text-secondary font-bold uppercase tracking-widest">Overall Score</p>
                  </div>
                  <CheckCircle2 size={32} className="text-wellness-orange opacity-50" />
                </div>

                <div className="feedback-report">
                  <Markdown>{report}</Markdown>
                </div>

                <div className="pt-6 mt-6 border-t border-black/[0.03]">
                  <button
                    onClick={finalizeSession}
                    disabled={isSaved}
                    className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] ${isSaved
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default'
                        : 'bg-wellness-text-primary text-white hover:opacity-90'
                      }`}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 size={18} /> Saved to Vault
                      </>
                    ) : (
                      <>
                        Complete Session & Save <ChevronRight size={18} />
                      </>
                    )}
                  </button>

                  {isSaved && (
                    <button
                      onClick={startCamera}
                      className="w-full mt-4 bg-wellness-bg text-wellness-text-primary py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/[0.02] transition-all border border-black/[0.03] animate-in fade-in slide-in-from-bottom-2"
                    >
                      <RefreshCcw size={18} /> Start New Session
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-wellness-text-secondary opacity-30 space-y-6 py-12">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-black/[0.1] flex items-center justify-center">
                  <Sparkles size={32} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1">Awaiting Content</p>
                  <p className="text-[10px] font-medium max-w-[180px] mx-auto">Record your practice to unlock deep behavioral insights.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoRecorder;
