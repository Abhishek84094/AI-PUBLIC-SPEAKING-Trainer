
import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, LogIn, UserPlus, CheckCircle2, ShieldCheck, Zap, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { Database } from '../services/database';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isNameValid = name.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      if (!isEmailValid) { setError('Please enter a valid email address.'); return; }
    } else {
      if (!isNameValid) { setError('Name must be at least 2 characters.'); return; }
      if (!isEmailValid) { setError('Please enter a valid email address.'); return; }
      if (!isPasswordValid) { setError('Password must be at least 6 characters.'); return; }
    }

    setIsLoading(true);

    if (isLogin) {
      const { data, error: signInError } = await Database.signIn(email, password);
      if (signInError) {
        setError(signInError.message || 'Invalid email or password. Please try again.');
        setIsLoading(false);
      } else if (data.user) {
        const sessionUser = await Database.getSessionUser();
        if (sessionUser) {
          onLogin(sessionUser);
        } else {
          setError('Failed to retrieve user profile.');
          setIsLoading(false);
        }
      }
    } else {
      const newUser: User = { name, email };
      const { error: signUpError } = await Database.signUp(newUser, password);

      if (signUpError) {
        setError(signUpError.message || 'Failed to create account.');
        setIsLoading(false);
      } else {
        // Supabase might require email verification depending on settings.
        // For this demo, we'll assume it's auto-confirmed or the user can sign in now.
        const sessionUser = await Database.getSessionUser();
        if (sessionUser) {
          onLogin(sessionUser);
        } else {
          setIsLogin(true);
          setError('Account created! Please sign in.');
          setIsLoading(false);
        }
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-wellness-bg flex flex-col lg:flex-row relative overflow-y-auto overflow-x-hidden font-sans custom-scrollbar">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] bg-wellness-orange/5 blur-[140px] rounded-full animate-pulse pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-wellness-coral/5 blur-[140px] rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Feature Side */}
      <div className="hidden lg:flex lg:sticky lg:top-0 h-screen flex-1 flex-col justify-center p-16 xl:p-24 relative z-10 border-r border-black/[0.03]">
        <div className="flex items-center gap-3 mb-16 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="w-12 h-12 rounded-2xl accent-gradient flex items-center justify-center shadow-lg shadow-wellness-orange/20">
            <Sparkles className="text-white w-7 h-7" />
          </div>
          <span className="font-black text-3xl tracking-tighter text-wellness-text-primary">SpeakMate</span>
        </div>

        <div className="animate-in fade-in slide-in-from-left-6 duration-700">
          <h2 className="text-6xl xl:text-7xl font-extrabold tracking-tighter leading-[1] mb-8 text-wellness-text-primary">
            Master the art of <br />
            <span className="gradient-text">Communication.</span>
          </h2>
          <p className="text-wellness-text-secondary text-lg xl:text-xl font-medium max-w-lg leading-relaxed mb-12">
            The world's most advanced AI speech lab. Train with real-time feedback and detailed analytics.
          </p>

          <div className="space-y-8">
            <Feature icon={<ShieldCheck className="text-wellness-orange" />} title="Private & Secure" desc="Your data is encrypted and stored securely in our premium cloud infrastructure." />
            <Feature icon={<Zap className="text-wellness-pink" />} title="Personalized Insights" desc="Get deep analysis on your tone, pace, and clarity to master every interaction." />
            <Feature icon={<CheckCircle2 className="text-emerald-500" />} title="Proven Methodology" desc="Coaching models based on executive presence and public speaking best practices." />
          </div>
        </div>
      </div>

      {/* Auth Side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative z-10 bg-wellness-bg/40 backdrop-blur-sm min-h-screen py-20 lg:py-12">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center mb-4 shadow-xl">
              <Sparkles className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-wellness-text-primary">SpeakMate</h1>
          </div>

          <div className="bg-white rounded-[3rem] border border-black/[0.03] p-8 sm:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)] relative">
            <div className="mb-10 text-center sm:text-left">
              <h3 className="text-3xl font-black mb-3 tracking-tight text-wellness-text-primary">{isLogin ? 'Sign In' : 'Create Account'}</h3>
              <p className="text-wellness-text-secondary text-sm font-medium">
                {isLogin ? 'Welcome back. Let’s get you in.' : 'Start your mastery journey today.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-wellness-text-secondary ml-1">Full Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wellness-text-secondary group-focus-within:text-wellness-orange transition-colors" />
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      className="w-full bg-white border border-black/20 rounded-2xl py-4 pl-12 pr-4 text-black focus:outline-none focus:ring-2 focus:ring-wellness-orange/20 transition-all placeholder:text-slate-500 font-bold"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-wellness-text-secondary ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wellness-text-secondary group-focus-within:text-wellness-orange transition-colors" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className={`w-full bg-white border ${emailTouched && !isEmailValid ? 'border-red-500' : 'border-black/20'} rounded-2xl py-4 pl-12 pr-4 text-black focus:outline-none focus:ring-2 focus:ring-wellness-orange/20 transition-all placeholder:text-slate-500 font-bold`}
                    value={email}
                    onBlur={() => setEmailTouched(true)}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {emailTouched && !isEmailValid && <p className="text-[10px] text-red-500 font-bold ml-1 uppercase">Please enter a valid email</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-wellness-text-secondary ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wellness-text-secondary group-focus-within:text-wellness-orange transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    className={`w-full bg-white border ${passwordTouched && !isPasswordValid ? 'border-red-500' : 'border-black/20'} rounded-2xl py-4 pl-12 pr-12 text-black focus:outline-none focus:ring-2 focus:ring-wellness-orange/20 transition-all placeholder:text-slate-500 font-bold`}
                    value={password}
                    onBlur={() => setPasswordTouched(true)}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-wellness-text-secondary hover:text-wellness-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordTouched && !isPasswordValid && <p className="text-[10px] text-red-500 font-bold ml-1 uppercase">At least 6 characters required</p>}
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-black/[0.03] text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setEmailTouched(false);
                  setPasswordTouched(false);
                }}
                className="relative z-10 text-wellness-text-secondary hover:text-wellness-orange text-sm font-bold transition-all"
              >
                {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, desc }: any) => (
  <div className="flex gap-6 group">
    <div className="mt-1 p-3 rounded-2xl bg-black/[0.02] border border-black/[0.05] group-hover:bg-wellness-orange/10 group-hover:border-wellness-orange/20 transition-all duration-300">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-wellness-text-primary text-lg mb-1 group-hover:gradient-text transition-all">{title}</h4>
      <p className="text-wellness-text-secondary text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  </div>
);

export default Auth;
