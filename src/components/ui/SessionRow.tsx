import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, AlertOctagon, Eye, ChevronRight } from 'lucide-react';

interface SessionRowProps {
  role: string;
  date: string;
  score: number;
  trust: number;
  flagged?: boolean;
  sessionId: string;
}

export function SessionRow({ role, date, score, trust, flagged, sessionId }: SessionRowProps) {
  return (
    <Link href={`/feedback?id=${sessionId}`} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/80 hover:bg-zinc-800/50 transition-colors group cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
          <LayoutDashboard className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-zinc-200 group-hover:text-white transition-colors">{role}</h4>
          <p className="text-xs text-zinc-500">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-zinc-500 mb-1">Trust Score</p>
          <div className="flex items-center gap-1.5 justify-end">
            {flagged ? <AlertOctagon className="w-3.5 h-3.5 text-red-500"/> : <Eye className="w-3.5 h-3.5 text-emerald-500"/>}
            <span className={`text-sm font-semibold ${flagged ? 'text-red-500' : 'text-emerald-500'}`}>{trust}%</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 mb-1">Overall</p>
          <p className="text-xl font-bold text-white">{score}<span className="text-xs text-zinc-600">/100</span></p>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
      </div>
    </Link>
  );
}
