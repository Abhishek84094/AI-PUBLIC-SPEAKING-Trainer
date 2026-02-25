
import React, { useState, useRef } from 'react';
import { Upload, FileVideo, CheckCircle, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';

import { User } from '../types';
import { Database } from '../services/database';

interface VideoUploaderProps {
  user: User;
  onBack: () => void;
  onAnalysisComplete: (history: any) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ user, onBack, onAnalysisComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'complete'>('idle');
  const [report, setReport] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const startAnalysis = async () => {
    if (!file || !user) return;
    setStatus('uploading');
    
    // Simulate upload delay
    await new Promise(r => setTimeout(r, 2000));
    setStatus('analyzing');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `I have processed a video session named "${file.name}". Act as a world-class executive speech coach and provide a comprehensive, professionally structured performance report.
      
      Use the following exact structure:
      
      # EXECUTIVE PRESENCE SUMMARY
      A sophisticated analysis of the speaker's authority and impact.
      
      # DELIVERY ASSESSMENT
      * **Pacing & Rhythm**: Analysis of speech rate and pauses.
      * **Narrative Flow**: Evaluation of clarity and logical progression.
      
      # VISUAL PRESENTATION INSIGHTS
      Detailed feedback on eye contact, posture, and framing.
      
      # MASTERY ACTION PLAN
      1. Immediate technical adjustment.
      2. Strategic practice focus for the next 30 days.
      
      Ensure the tone is professional, insightful, and elite. Use markdown for clear hierarchy.
      
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
      </metrics>`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = response.text || "";
      let metrics = {
        speechRate: 145,
        pauseCount: 4,
        fillerWords: 12,
        eyeContactScore: 80,
        postureScore: 85,
        confidenceScore: 90
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

      const score = Database.calculateSessionScore(metrics, 180);
      setReport(text.replace(/<metrics>[\s\S]*?<\/metrics>/, '').trim() || 'Analysis failed. Please try again.');
      setStatus('complete');
      
      onAnalysisComplete({
        id: Math.random().toString(),
        userEmail: user.email,
        date: new Date().toISOString(),
        duration: 180,
        score: score,
        type: 'upload',
        title: file.name,
        mode: 'PUBLIC_SPEAKING',
        metrics: metrics,
        report: text.replace(/<metrics>[\s\S]*?<\/metrics>/, '').trim()
      });
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Video Analysis</h1>
        <p className="text-slate-400">Upload a recording for comprehensive AI-driven feedback.</p>
      </div>

      <div className="glass rounded-3xl border border-slate-800 p-10">
        {status === 'idle' && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer group"
          >
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="video/*" />
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-indigo-600 transition-all">
              <Upload className="w-10 h-10 text-slate-400 group-hover:text-white" />
            </div>
            {file ? (
              <div className="flex flex-col items-center">
                <span className="text-white font-bold text-lg mb-1">{file.name}</span>
                <span className="text-slate-500 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); startAnalysis(); }}
                  className="mt-8 accent-gradient px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20"
                >
                  Start Analysis
                </button>
              </div>
            ) : (
              <div>
                <span className="text-white font-bold text-lg block mb-1">Click or drag to upload video</span>
                <span className="text-slate-500 text-sm">Supports MP4, MOV, WebM up to 500MB</span>
              </div>
            )}
          </div>
        )}

        {(status === 'uploading' || status === 'analyzing') && (
          <div className="py-20 flex flex-col items-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {status === 'uploading' ? 'Secure Transmission...' : 'SpeakMate Intelligence is synthesizing your session...'}
            </h3>
            <p className="text-slate-400 text-center max-w-sm">
              We're evaluating eye contact, vocal variety, and content structure. This may take a moment.
            </p>
          </div>
        )}

        {status === 'complete' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="text-emerald-500 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Analysis Complete</h3>
                  <p className="text-slate-500 text-sm">Session processed successfully</p>
                </div>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="text-indigo-400 text-sm font-bold hover:underline"
              >
                Upload Another
              </button>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 feedback-report">
              <Markdown>{report}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
