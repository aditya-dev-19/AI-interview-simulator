"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lightbulb, Mail, Sparkles } from 'lucide-react';
import { callGemini } from '../../../lib/gemini';
import { createClient } from '@/utils/supabase/client';

export default function FeedbackView() {
  const router = useRouter();
  const supabase = createClient();
  const [draftEmail, setDraftEmail] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
      }
    };
    checkUser();
  }, [supabase, router]);

  const handleDraftEmail = async () => {
    setIsDrafting(true);
    const prompt = `Draft a professional, concise follow-up "Thank You" email to an interviewer for a Senior Frontend Engineer position. Mention that I enjoyed discussing React performance optimization and WebSockets. Keep it under 100 words.`;
    const emailText = await callGemini(prompt, "You are an expert career coach.");
    setDraftEmail(emailText);
    setIsDrafting(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col p-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-10">

        <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Session Complete.</h2>
            <p className="text-zinc-400">Here is your real-time performance breakdown.</p>
          </div>
          <button onClick={() => router.push('/dashboard')} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors">
            Return to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Score */}
          <div className="col-span-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <p className="text-sm font-semibold text-zinc-400 mb-2">Overall Score</p>
            <div className="text-7xl font-bold text-white mb-2">88</div>
            <p className="text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1 rounded-full text-sm">Great job, Alex!</p>
          </div>

          {/* Breakdown Stats */}
          <div className="col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Technical Depth</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full"><div className="w-[85%] h-full bg-blue-500 rounded-full"></div></div>
                  <span className="text-sm font-bold">85%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Communication</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full"><div className="w-[92%] h-full bg-purple-500 rounded-full"></div></div>
                  <span className="text-sm font-bold">92%</span>
                </div>
              </div>
            </div>

            {/* Trust/Proctor Score */}
            <div className="border-l border-zinc-800 pl-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-bold text-white">Trust Score: 85%</h3>
              </div>
              <p className="text-sm text-zinc-400">2 proctoring flags detected. You looked off-screen for a total of 14 seconds during question 3.</p>
            </div>
          </div>
        </div>

        {/* Actionable Feedback */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-400" /> AI Feedback & Tips</h3>

          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <h4 className="font-semibold text-emerald-400 mb-1">Strength: Contextualization</h4>
              <p className="text-sm text-zinc-300">You did a great job tying your past experience at Stripe directly to the job description's requirement for building scalable checkout flows.</p>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <h4 className="font-semibold text-amber-400 mb-1">Area to Improve: Tangible Metrics</h4>
              <p className="text-sm text-zinc-300">When asked about performance optimization, you mentioned "it got faster". Next time, try to use specific metrics (e.g., "Reduced Time to Interactive by 400ms").</p>
            </div>
          </div>
        </div>

        {/* NEW: Gemini Powered Email Drafter */}
        <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              Post-Interview Action
            </h3>
            <button
              onClick={handleDraftEmail}
              disabled={isDrafting}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            >
              <Sparkles className="w-4 h-4" />
              {isDrafting ? "Drafting with Gemini..." : "✨ Draft Thank You Email"}
            </button>
          </div>

          {draftEmail && (
            <div className="mt-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-sm text-zinc-300 whitespace-pre-wrap animate-in fade-in">
              {draftEmail}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
