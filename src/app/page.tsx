"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Github } from 'lucide-react';

export default function LandingPage() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  // Form submission handler to prevent page reload and transition to dashboard
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4 animate-in fade-in duration-700 relative overflow-hidden">
      
      {/* Global Dynamic Background Effects for Landing Page */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Glowing Orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-900/30 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center gap-4 mb-8 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <Sparkles className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Interview<span className="text-emerald-400">Pro</span></h1>
        <p className="text-zinc-400 text-sm">Ace your next tech interview with AI.</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-[420px] bg-[#0c0c0e]/90 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden z-10">

        {/* Subtle background glow inside card */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-emerald-500/10 blur-[50px] pointer-events-none"></div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-zinc-900/80 rounded-xl mb-8 border border-zinc-800/50 relative z-10">
          <button suppressHydrationWarning
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${isLogin ? 'bg-[#18181b] text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Login
          </button>
          <button suppressHydrationWarning
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-[#18181b] text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Elements */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 ml-1">Full Name</label>
              <input suppressHydrationWarning
                type="text"
                placeholder="John Doe"
                required
                className="w-full bg-[#111113] border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 ml-1">Email</label>
            <input suppressHydrationWarning
              type="email"
              placeholder="you@example.com"
              required
              className="w-full bg-[#111113] border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 ml-1">Password</label>
            <input suppressHydrationWarning
              type="password"
              placeholder="••••••••"
              required
              className="w-full bg-[#111113] border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 tracking-widest"
            />
          </div>

          {isLogin && (
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input suppressHydrationWarning type="checkbox" className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950 transition-colors cursor-pointer" />
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium">Remember me</span>
              </label>
              <a href="#" className="text-sm text-emerald-500 hover:text-emerald-400 font-medium transition-colors">Forgot password?</a>
            </div>
          )}

          <button suppressHydrationWarning
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] mt-6 text-sm"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8 relative z-10">
          <div className="flex-1 h-px bg-zinc-800"></div>
          <span className="text-xs text-zinc-500 font-medium">Or continue with</span>
          <div className="flex-1 h-px bg-zinc-800"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <button suppressHydrationWarning type="button" className="flex items-center justify-center gap-2 py-3 bg-[#111113] hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-semibold text-zinc-300 transition-colors">
            <Github className="w-4 h-4 text-white" /> GitHub
          </button>
          <button suppressHydrationWarning type="button" className="flex items-center justify-center gap-2 py-3 bg-[#111113] hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-semibold text-zinc-300 transition-colors">
            <Mail className="w-4 h-4 text-white" /> Google
          </button>
        </div>

        {/* Footer Terms */}
        <p className="text-center text-xs text-zinc-500 mt-8 leading-relaxed relative z-10">
          By continuing, you agree to our <a href="#" className="text-emerald-500 hover:text-emerald-400 transition-colors font-medium">Terms of Service</a> and <a href="#" className="text-emerald-500 hover:text-emerald-400 transition-colors font-medium">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
