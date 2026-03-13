import React from 'react';
import { FileText, CheckCircle2, Trash2 } from 'lucide-react';

interface ResumeRowProps {
  id: string;
  name: string;
  date: string;
  active?: boolean;
  onDelete: (id: string) => void;
}

export function ResumeRow({ id, name, date, active, onDelete }: ResumeRowProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-zinc-200">{name}</h4>
          <p className="text-xs text-zinc-500">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {active ? (
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Active Context
          </span>
        ) : (
          <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-full transition-colors border border-zinc-700">
            Make Active
          </button>
        )}
        <button
          onClick={() => onDelete(id)}
          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
