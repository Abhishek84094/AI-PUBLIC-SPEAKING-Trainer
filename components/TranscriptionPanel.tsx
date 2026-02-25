
import React, { useRef, useEffect } from 'react';
import { Transcription } from '../types';

interface TranscriptionPanelProps {
  transcriptions: Transcription[];
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ transcriptions }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth"
    >
      {transcriptions.map((t, i) => (
        <div 
          key={i} 
          className={`flex flex-col ${t.speaker === 'ai' ? 'items-start' : 'items-end'}`}
        >
          <div 
            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${
              t.speaker === 'ai' 
                ? 'accent-gradient text-white rounded-tl-none' 
                : 'bg-wellness-bg text-wellness-text-primary rounded-tr-none border border-black/[0.03]'
            }`}
          >
            {t.text}
          </div>
          <span className="text-[10px] text-wellness-text-secondary font-black uppercase tracking-widest mt-1.5 px-1 opacity-50">
            {t.speaker === 'ai' ? 'Coach' : 'You'} • {new Date(t.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      ))}
      {transcriptions.length === 0 && (
        <div className="h-full flex items-center justify-center text-wellness-text-secondary italic text-sm opacity-30">
          Awaiting conversation...
        </div>
      )}
    </div>
  );
};

export default TranscriptionPanel;
