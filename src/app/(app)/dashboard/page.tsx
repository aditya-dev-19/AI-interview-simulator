"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, Activity, BrainCircuit, TrendingDown, Lightbulb } from 'lucide-react';
import { SkillBar } from '@/components/ui/SkillBar';
import { SessionRow } from '@/components/ui/SessionRow';
import { createClient } from '@/utils/supabase/client';

interface Session {
  id: string
  role: string
  overall: number
  trustScore: number
  created_at: string
}

export default function DashboardView() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
      }
    };
    checkUser();
  }, [supabase, router]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/interview/recent");
        const data = await res.json();

        setSessions(data.sessions || []);
        if (data.latestSession?.feedback_json) {
          setAnalysis(data.latestSession.feedback_json);
        }
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
          <h2 className="h1 text-white mb-2">Welcome back, Alex.</h2>
          <p className="body text-zinc-400">Your interview readiness is up <span className="text-emerald-400 font-medium">12%</span> this week.</p>
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
          <h3 className="h2 text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Readiness Trend (Last 5 Sessions)
          </h3>
          {(() => {
            const chartData = [...sessions].slice(0, 5).reverse();
            if (chartData.length === 0 && !loading) {
              return <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">No data for readiness trend.</div>;
            }
            if (chartData.length === 0 && loading) {
               return <div className="h-48 flex items-center justify-center text-emerald-500 text-sm animate-pulse">Loading charts...</div>;
            }
            if (chartData.length === 1) {
              chartData.unshift({ ...chartData[0], created_at: new Date(new Date(chartData[0].created_at).getTime() - 86400000).toISOString(), overall: chartData[0].overall });
            }

            const points = chartData.map((s, i) => {
              const cx = (i / (chartData.length - 1)) * 100;
              const cy = 100 - ((s.overall || 0) * 0.8) - 10;
              return { cx, cy, score: s.overall || 0, date: s.created_at };
            });

            const pathD = "M " + points.map(p => `${p.cx},${p.cy}`).join(" L ");
            const latestScore = points[points.length - 1]?.score || 0;

            return (
              <>
                <div className="h-48 relative w-full flex items-end animate-in fade-in duration-1000">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d={pathD} fill="none" stroke="#34d399" strokeWidth="3" className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    {points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.cx}
                        cy={p.cy}
                        r={i === points.length - 1 ? "4" : "3"}
                        fill={i === points.length - 1 ? "#fff" : (p.score < 60 ? "#ef4444" : "#10b981")}
                        className={i === points.length - 1 ? "drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" : (p.score < 60 ? "drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" : "")}
                      />
                    ))}
                  </svg>
                  <div className="absolute top-2 right-0 bg-emerald-500/20 text-emerald-300 caption font-bold px-2 py-1 rounded border border-emerald-500/30">
                    Latest: {latestScore}/100
                  </div>
                </div>
                <div className="flex justify-between caption text-zinc-500 mt-4">
                  {points.map((p, i) => (
                    <span key={i} className={i === points.length - 1 ? "text-emerald-400 font-bold" : (p.score < 60 ? "text-red-400 font-bold" : "")}>
                      {i === points.length - 1 ? "Latest" : new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Skill Radar / Breakdown */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
          <h3 className="h2 text-white mb-6">Skill Breakdown</h3>
          <div className="space-y-5">
            <SkillBar label="Technical Accuracy" percentage={analysis?.skillBreakdown?.technicalAccuracy || 0} color="bg-blue-500" />
            <SkillBar label="Communication Clarity" percentage={analysis?.skillBreakdown?.communicationClarity || 0} color="bg-purple-500" />
            <SkillBar label="Confidence Metrics" percentage={analysis?.skillBreakdown?.confidenceMetrics || 0} color="bg-emerald-500" />
          </div>
        </div>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
        <h3 className="h3 text-emerald-400 mb-3 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" /> AI Trend Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="font-semibold text-sm">Why your score dropped</span>
            </div>
            <p className="body text-zinc-400 leading-relaxed">
              {analysis?.trendAnalysis?.scoreDropReason || "Complete an interview to see insights."}
            </p>
          </div>
          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Lightbulb className="w-4 h-4" />
              <span className="font-semibold text-sm">Actionable Tip for Next Mock</span>
            </div>
            <p className="body text-zinc-400 leading-relaxed">
              {analysis?.trendAnalysis?.actionableTip || "Complete an interview to see insights."}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
        <h3 className="h2 text-white mb-4">Recent Sessions</h3>
        <div className="space-y-3">
          {/* <SessionRow role="Senior Frontend Engineer" date="Today, 10:00 AM" score={92} trust={100} />
          <SessionRow role="Full Stack Developer" date="Oct 22, 2:30 PM" score={85} trust={95} />
          <SessionRow role="React Developer" date="Oct 18, 11:15 AM" score={78} trust={80} flagged /> */}
          {loading && (
            <p className="caption text-zinc-500">Loading sessions...</p>
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
            <p className="caption text-zinc-500">No sessions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
