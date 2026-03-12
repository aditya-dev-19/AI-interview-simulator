"use client";

import React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Activity, BrainCircuit, TrendingDown, Lightbulb } from 'lucide-react';
import { SkillBar } from '@/components/ui/SkillBar';
import { SessionRow } from '@/components/ui/SessionRow';

interface Session {
  id: string
  role: string
  overall: number
  trustScore: number
  created_at: string
}

export default function DashboardView() {

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/interview/recent");
        const data = await res.json();

        setSessions(data.sessions || []);
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);
  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header & Hero Action */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back, Alex.</h2>
          <p className="text-zinc-400">Your interview readiness is up <span className="text-emerald-400 font-medium">12%</span> this week.</p>
        </div>
        <Link
          href="/setup"
          className="group relative flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-3 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
        >
          <Play size={18} fill="currentColor" />
          Start Mock Interview
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Readiness Trend Chart (Custom SVG) */}
        <div className="col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Readiness Trend (Last 5 Sessions)
          </h3>
          <div className="h-48 relative w-full flex items-end">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M 0,80 L 25,60 L 50,70 L 75,30 L 100,10" fill="none" stroke="#34d399" strokeWidth="3" className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <circle cx="0" cy="80" r="3" fill="#10b981" />
              <circle cx="25" cy="60" r="3" fill="#10b981" />
              <circle cx="50" cy="70" r="3" fill="#ef4444" className="drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
              <circle cx="75" cy="30" r="3" fill="#10b981" />
              <circle cx="100" cy="10" r="4" fill="#fff" className="drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
            </svg>
            <div className="absolute top-2 right-0 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 rounded border border-emerald-500/30">
              Latest: 92/100
            </div>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-4">
            <span>Oct 12</span><span>Oct 14</span><span className="text-red-400 font-bold">Oct 18</span><span>Oct 22</span><span>Today</span>
          </div>
        </div>

        {/* Skill Radar / Breakdown */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Skill Breakdown</h3>
          <div className="space-y-5">
            <SkillBar label="Technical Accuracy" percentage={88} color="bg-blue-500" />
            <SkillBar label="Communication Clarity" percentage={75} color="bg-purple-500" />
            <SkillBar label="Confidence Metrics" percentage={92} color="bg-emerald-500" />
          </div>
        </div>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" /> AI Trend Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="font-semibold text-sm">Why your score dropped on Oct 18</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Your system design answers lacked structural frameworks (like STAR or PACEM). You lost 15 points in "Technical Communication" due to rambling and failing to define system constraints early on.
            </p>
          </div>
          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Lightbulb className="w-4 h-4" />
              <span className="font-semibold text-sm">Actionable Tip for Next Mock</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              For your next session, practice pausing for 2 seconds before answering complex questions. The AI proctoring engine noted you rushed into answers without clarifying requirements.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Sessions</h3>
        <div className="space-y-3">
          {/* <SessionRow role="Senior Frontend Engineer" date="Today, 10:00 AM" score={92} trust={100} />
          <SessionRow role="Full Stack Developer" date="Oct 22, 2:30 PM" score={85} trust={95} />
          <SessionRow role="React Developer" date="Oct 18, 11:15 AM" score={78} trust={80} flagged /> */}
          {loading && (
            <p className="text-zinc-500 text-sm">Loading sessions...</p>
          )}

          {sessions.map((session) => {

            const date = new Date(session.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit"
            });

            return (
              <SessionRow
                key={session.id}
                role={session.role}
                date={date}
                score={session.overall}
                trust={session.trustScore}
                flagged={session.trustScore < 85}
              />
            );
          })}

          {!loading && sessions.length === 0 && (
            <p className="text-zinc-500 text-sm">No sessions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
