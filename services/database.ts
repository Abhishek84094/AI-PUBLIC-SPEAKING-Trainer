
import { User, SessionHistory, SessionMetrics } from '../types';
import { supabase } from './supabase';

/**
 * VOXMASTER DATABASE SERVICE
 * This service handles all persistent storage using Supabase. 
 */

export class Database {
  // --- USER MANAGEMENT (Supabase Auth) ---

  static async findUserByEmail(email: string): Promise<User | undefined> {
    // In Supabase, we usually don't "find" users by email manually for auth,
    // but we might want to check if they exist in a profiles table.
    // For now, we'll rely on Supabase Auth's own mechanisms.
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email === email) {
      return {
        name: user.user_metadata.name || user.email?.split('@')[0] || 'User',
        email: user.email!,
      };
    }
    return undefined;
  }

  static async signUp(user: User, password: string): Promise<{ error: any }> {
    const { error } = await supabase.auth.signUp({
      email: user.email,
      password: password,
      options: {
        data: {
          name: user.name,
        }
      }
    });
    return { error };
  }

  static async signIn(email: string, password: string): Promise<{ data: any, error: any }> {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  static async getSessionUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        name: user.user_metadata.name || user.email?.split('@')[0] || 'User',
        email: user.email!,
      };
    }
    return null;
  }

  // --- HISTORY / PERFORMANCE MANAGEMENT ---

  static async getHistory(email: string): Promise<SessionHistory[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_email', email)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      userEmail: item.user_email,
      videoUrl: item.video_url,
    }));
  }

  static async saveSession(email: string, session: SessionHistory): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .insert([{
        user_email: email,
        date: session.date,
        duration: session.duration,
        score: session.score,
        type: session.type,
        title: session.title,
        mode: session.mode,
        metrics: session.metrics,
        report: session.report,
        video_url: session.videoUrl
      }]);

    if (error) {
      console.error('Error saving session:', error);
    }
  }

  static async deleteSession(email: string, sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_email', email);

    if (error) {
      console.error('Error deleting session:', error);
    }
  }

  static calculateSessionScore(metrics: SessionMetrics, duration: number): number {
    const clarity = 100 - (metrics.fillerWords * 2 + metrics.pauseCount);
    const vocalPace = 100 - (Math.abs(metrics.speechRate - 150) * 0.5);
    const confidence = metrics.confidenceScore;
    const engagement = (metrics.eyeContactScore + metrics.postureScore) / 2;
    
    let score = (
      Math.max(0, clarity) * 0.3 + 
      Math.max(0, vocalPace) * 0.2 + 
      confidence * 0.25 + 
      engagement * 0.25
    );

    if (duration < 10) {
      score *= 0.3;
    } else if (duration < 30) {
      const penaltyFactor = 0.3 + (0.7 * (duration - 10) / 20);
      score *= penaltyFactor;
    }
    
    return Math.round(score);
  }

  // --- ANALYTICS & STREAK CALCULATIONS ---

  static async getStats(email: string) {
    const history = await this.getHistory(email);
    if (history.length === 0) {
      return { 
        avgScore: 0, 
        totalDuration: 0, 
        count: 0, 
        streak: 0,
        performanceIndex: { clarity: 0, vocalPace: 0, sentiment: 0, engagement: 0 }
      };
    }
    
    const last10 = history.slice(0, 10);
    const avgScore = Math.round(last10.reduce((acc, s) => acc + s.score, 0) / last10.length);
    const totalDuration = history.reduce((acc, s) => acc + s.duration, 0);
    
    const uniqueDates = Array.from(new Set(history.map(s => {
      const d = new Date(s.date);
      d.setHours(0,0,0,0);
      return d.getTime();
    }))).sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    if (uniqueDates.length > 0) {
      const mostRecent = uniqueDates[0];
      if (mostRecent === todayTime || mostRecent === yesterdayTime) {
        streak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const current = uniqueDates[i];
          const next = uniqueDates[i+1];
          if (current - next === 86400000) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    const clarity = Math.round(last10.reduce((acc, s) => {
      const fillers = s.metrics?.fillerWords ?? 0;
      const pauses = s.metrics?.pauseCount ?? 0;
      const val = 100 - (fillers * 2 + pauses);
      return acc + Math.max(0, val);
    }, 0) / last10.length);

    const vocalPace = Math.round(last10.reduce((acc, s) => {
      const rate = s.metrics?.speechRate ?? 150;
      const diff = Math.abs(rate - 150);
      const val = 100 - (diff * 0.5);
      return acc + Math.max(0, val);
    }, 0) / last10.length);

    const sentiment = Math.round(last10.reduce((acc, s) => acc + (s.metrics?.confidenceScore ?? 85), 0) / last10.length);

    const engagement = Math.round(last10.reduce((acc, s) => {
      const eye = s.metrics?.eyeContactScore ?? 85;
      const posture = s.metrics?.postureScore ?? 85;
      return acc + (eye + posture) / 2;
    }, 0) / last10.length);

    return {
      avgScore,
      totalDuration,
      count: history.length,
      streak,
      performanceIndex: { clarity, vocalPace, sentiment, engagement }
    };
  }
}
