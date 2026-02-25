
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface VideoPreviewProps {
  isActive: boolean;
}

export interface VideoPreviewHandle {
  getFrame: () => string | null;
}

const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(({ isActive }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isActive) {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, frameRate: 30 } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Error accessing camera:", err);
        });
    } else {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isActive]);

  useImperativeHandle(ref, () => ({
    getFrame: () => {
      if (!videoRef.current || !canvasRef.current || !isActive) return null;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      }
      return null;
    }
  }));

  return (
    <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-black border border-black/[0.03] shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.4)_100%)]" />
      
      <canvas ref={canvasRef} className="hidden" />
      
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center mb-4">
            <div className="w-3 h-3 rounded-full bg-white/20" />
          </div>
          <p className="text-white/40 font-black text-xs uppercase tracking-widest">Studio Camera Offline</p>
        </div>
      )}

      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-full flex items-center gap-2.5 backdrop-blur-xl border ${isActive ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-black/40 border-white/10 text-white/70'}`}>
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/30'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest leading-none pt-0.5">
            {isActive ? 'Live Studio' : 'Standby'}
          </span>
        </div>
        
        {isActive && (
            <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest">
                720p HD
            </div>
        )}
      </div>
    </div>
  );
});

export default VideoPreview;
