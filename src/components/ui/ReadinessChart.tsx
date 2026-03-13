"use client";

import React from 'react';
import { Activity } from 'lucide-react';

interface Session {
  id: string;
  role: string;
  overall: number;
  trustScore: number;
  created_at: string;
}

interface ReadinessChartProps {
  sessions: Session[];
  loading: boolean;
}

export function ReadinessChart({ sessions, loading }: ReadinessChartProps) {
  const chartData = [...sessions].slice(0, 5).reverse();

  if (chartData.length === 0 && !loading) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
        No data for readiness trend.
      </div>
    );
  }

  if (chartData.length === 0 && loading) {
    return (
      <div className="h-48 flex items-center justify-center text-emerald-500 text-sm animate-pulse">
        Loading charts...
      </div>
    );
  }

  if (chartData.length === 1) {
    chartData.unshift({
      ...chartData[0],
      id: 'placeholder',
      created_at: new Date(new Date(chartData[0].created_at).getTime() - 86400000).toISOString(),
      overall: chartData[0].overall
    });
  }

  const points = chartData.map((s, i) => {
    const cx = (i / (chartData.length - 1)) * 100;
    const cy = 100 - ((s.overall || 0) * 0.8) - 10;
    return { cx, cy, score: s.overall || 0, date: s.created_at };
  });

  const pathD = "M " + points.map(p => `${p.cx},${p.cy}`).join(" L ");
  const latestScore = points[points.length - 1]?.score || 0;

  return (
    <div className="space-y-6">
      <div className="h-48 relative w-full flex items-end animate-in fade-in duration-1000">
        <svg
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Vertical axis labels */}
          <g fill="#52525b" fontSize="2.5" textAnchor="end">
            {[0, 25, 50, 75, 100].map((v, i) => (
              <text key={i} x="-3" y={`${100 - (v / 100) * 80 - 10 + 1}`}>
                {v}
              </text>
            ))}
          </g>

          {/* Grid lines */}
          <g stroke="#27272a" strokeWidth="0.2" opacity="0.5">
            {[0, 20, 40, 60, 80, 100].map((y) => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} />
            ))}
            {points.map((p, i) => (
              <line key={i} x1={p.cx} y1="0" x2={p.cx} y2="100" />
            ))}
          </g>

          {/* Area fill */}
          <path
            d={`${pathD} L 100,100 L 0,100 Z`}
            fill="url(#chartGradient)"
          />

          {/* Line - Thinner and Sharper */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Data Points */}
          {points.map((p, i) => {
            const isLatest = i === points.length - 1;
            const isFailing = p.score < 60;
            
            return (
              <g key={i} className="group/point">
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={isLatest ? "2.5" : "1.8"}
                  fill={isLatest ? "#fff" : (isFailing ? "#ef4444" : "#10b981")}
                  className="transition-all duration-300 group-hover/point:r-3"
                />
                
                {/* Invisible hover area for better UX */}
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r="8"
                  fill="transparent"
                  className="cursor-pointer"
                />

                {/* Score Label Tooltip-style */}
                <g className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-200">
                  <rect
                    x={p.cx - 5}
                    y={p.cy - 10}
                    width="10"
                    height="6"
                    rx="1"
                    fill="#18181b"
                    stroke="#3f3f46"
                    strokeWidth="0.2"
                  />
                  <text
                    x={p.cx}
                    y={p.cy - 6}
                    fill="#fff"
                    fontSize="3"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {p.score}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Latest Score Badge */}
        <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-500/20 backdrop-blur-md">
          Latest: {latestScore}/100
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-1">
        {points.map((p, i) => (
          <span
            key={i}
            className={`text-[10px] transition-colors duration-300 ${
              i === points.length - 1
                ? "text-emerald-400 font-bold"
                : (p.score < 60 ? "text-red-400/70" : "text-zinc-500")
            }`}
          >
            {i === points.length - 1
              ? "Latest"
              : new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        ))}
      </div>
    </div>
  );
}
