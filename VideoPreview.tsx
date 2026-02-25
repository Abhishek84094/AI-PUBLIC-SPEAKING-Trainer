
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
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Error accessing camera:", err));
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
      if (!videoRef.current || !canvasRef.current) return null;
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
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <p className="text-slate-400 font-medium">Camera Offline</p>
        </div>
      )}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
        <span className="text-xs font-bold uppercase tracking-wider text-white bg-black/50 px-2 py-1 rounded">
          {isActive ? 'Live' : 'Standby'}
        </span>
      </div>
    </div>
  );
});

export default VideoPreview;
