import React from 'react';

interface SkillBarProps {
  label: string;
  percentage: number;
  color: string;
}

export function SkillBar({ label, percentage, color }: SkillBarProps) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-zinc-400">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
