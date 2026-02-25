
import React from 'react';
import { FeedbackItem } from '../types';
import { 
  Zap, 
  MessageCircle, 
  User, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';

interface FeedbackListProps {
  feedback: FeedbackItem[];
}

const FeedbackList: React.FC<FeedbackListProps> = ({ feedback }) => {
  const getIcon = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'pace': return <TrendingUp className="w-4 h-4 text-wellness-orange" />;
      case 'filler': return <Zap className="w-4 h-4 text-orange-400" />;
      case 'posture': return <User className="w-4 h-4 text-wellness-coral" />;
      case 'sentiment': return <MessageCircle className="w-4 h-4 text-emerald-500" />;
      case 'positive': return <AlertCircle className="w-4 h-4 text-emerald-500" />;
      default: return <AlertCircle className="w-4 h-4 text-wellness-text-secondary" />;
    }
  };

  return (
    <div className="flex flex-col gap-3 max-h-full overflow-y-auto pb-4 pr-2">
      {feedback.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-black/[0.05] text-center bg-black/[0.01]">
          <p className="text-wellness-text-secondary text-sm font-medium opacity-50">Start speaking for real-time analysis...</p>
        </div>
      ) : (
        feedback.map((item) => (
          <div 
            key={item.id} 
            className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-black/[0.03] hover:border-wellness-orange/20 transition-all shadow-sm animate-in slide-in-from-right-4 duration-300 group"
          >
            <div className="mt-1 p-2 rounded-xl bg-wellness-bg group-hover:accent-gradient group-hover:text-white transition-all">
              {getIcon(item.type)}
            </div>
            <div>
              <p className="text-sm font-bold text-wellness-text-primary leading-snug">{item.message}</p>
              <span className="text-[10px] text-wellness-text-secondary font-black uppercase tracking-widest mt-1.5 block opacity-50">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FeedbackList;
