"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lightbulb, Mail, Sparkles } from 'lucide-react';
import { callGemini } from '../../../lib/gemini';
import { createClient } from '@/utils/supabase/client';
import { SkillBar } from '@/components/ui/SkillBar';

function FeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [draftEmail, setDraftEmail] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [name, setName] = React.useState<string>("Loading...");
  
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const dataParam = searchParams.get("data");
      const idParam = searchParams.get("id");

      if (dataParam) {
        // Fresh evaluation passed inline (just finished interview)
        try {
          const parsed = JSON.parse(decodeURIComponent(dataParam));
          setEvaluation(parsed);
        } catch (err) {
          console.error("Failed to parse evaluation data", err);
        }
      } else if (idParam) {
        // Load a specific past session by interview ID
        const { data, error } = await supabase
          .from("interviews")
          .select("overall_score, feedback_json")
          .eq("id", idParam)
          .eq("user_id", user.id)
          .single();

        if (!error && data?.feedback_json) {
          setEvaluation(data.feedback_json);
        }
      } else {
        // Fall back to most recent completed session
        const { data } = await supabase
          .from("interviews")
          .select("overall_score, feedback_json")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data && data.feedback_json) {
          setEvaluation(data.feedback_json);
        }
      }
    };
    checkUser();
  }, [supabase, router, searchParams]);
  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setName(data.full_name);
      }
    };

    fetchUser();
  }, [supabase]);
  
  const handleDraftEmail = async () => {
    setIsDrafting(true);
    const prompt = `Draft a professional, concise follow-up "Thank You" email to an interviewer for a Senior Frontend Engineer position. Mention that I enjoyed discussing React performance optimization and WebSockets. Keep it under 100 words.`;
    const emailText = await callGemini(prompt, "You are an expert career coach.");
    setDraftEmail(emailText);
    setIsDrafting(false);
  };

  if (!evaluation) {
    return <div className="text-white p-10 animate-pulse flex items-center justify-center min-h-screen">Generating AI feedback...</div>;
  }

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col p-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-10">

        <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h2 className="h1 text-white mb-2">Session Complete.</h2>
            <p className="body text-zinc-400">Here is your real-time performance breakdown.</p>
          </div>
          <button onClick={() => router.push('/dashboard')} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors">
            Return to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Score */}
          <div className="col-span-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <p className="body font-semibold text-zinc-400 mb-2">Overall Score</p>
            <div className="display text-white mb-2">{evaluation?.overallScore ?? '--'}</div>
            <p className="text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1 rounded-full text-sm">Great job, {name}!</p>
          </div>

          {/* Breakdown Stats */}
          <div className="col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 grid grid-cols-2 gap-6">
            <div className="space-y-5">
              <SkillBar label="Technical Accuracy" percentage={evaluation?.skillBreakdown?.technicalAccuracy || 0} color="bg-blue-500" />
              <SkillBar label="Communication Clarity" percentage={evaluation?.skillBreakdown?.communicationClarity || 0} color="bg-purple-500" />
              <SkillBar label="Confidence Metrics" percentage={evaluation?.skillBreakdown?.confidenceMetrics || 0} color="bg-emerald-500" />
            </div>

            {/* Trust/Proctor Score */}
            <div className="border-l border-zinc-800 pl-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-6 h-6 text-amber-500" />
                <h3 className="h2 text-white">Trust Score: {evaluation?.skillBreakdown?.confidenceMetrics ?? 85}%</h3>
              </div>
              <p className="body text-zinc-400">2 proctoring flags detected. You looked off-screen for a total of 14 seconds during question 3.</p>
            </div>
          </div>
        </div>

        {/* Actionable Feedback */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 space-y-6">
          <h3 className="h2 text-white flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-400" /> AI Feedback & Tips</h3>

          <div className="space-y-4">
            {evaluation?.feedback?.strengths?.map((item: any, index: number) => (
              <div key={`strength-${index}`} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <h4 className="h3 text-emerald-400 mb-1">Strength: {item.title}</h4>
                <p className="body text-zinc-300">{item.description}</p>
              </div>
            ))}

            {evaluation?.feedback?.improvements?.map((item: any, index: number) => (
              <div key={`improvement-${index}`} className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <h4 className="h3 text-amber-400 mb-1">Area to Improve: {item.title}</h4>
                <p className="body text-zinc-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* NEW: Gemini Powered Email Drafter */}
        <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="h2 text-white flex items-center gap-2">
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
            <div className="mt-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800 body text-zinc-300 whitespace-pre-wrap animate-in fade-in">
              {draftEmail}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function FeedbackView() {
  return (
    <Suspense fallback={<div className="text-white p-10 flex items-center justify-center min-h-screen">Loading feedback...</div>}>
      <FeedbackContent />
    </Suspense>
  );
}

