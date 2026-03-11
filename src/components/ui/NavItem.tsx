import React from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function NavItem({ icon, label, isActive, onClick }: NavItemProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
        isActive 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]' 
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
