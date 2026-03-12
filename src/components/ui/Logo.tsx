import React from 'react';
import { Bot } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  hideText?: boolean;
}

export function Logo({ className = "", iconSize = 24, textSize = "text-xl", hideText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative group">
        {/* Animated outer ring */}
        <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-md group-hover:bg-emerald-400/30 transition-all duration-300"></div>
        
        {/* Logo Icon Container */}
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:border-emerald-400/60 transition-all duration-300">
          <Bot 
            size={iconSize} 
            className="text-emerald-400 group-hover:text-emerald-300 transform group-hover:scale-110 transition-all duration-300" 
          />
          
          {/* Subtle scanning line animation */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-emerald-400/50 animate-scan opacity-0 group-hover:opacity-100"></div>
        </div>
      </div>

      {!hideText && (
        <h1 className={`${textSize} font-extrabold tracking-tight text-white font-syne`}>
          Interview<span className="text-emerald-400 ml-0.5">Pro</span>
        </h1>
      )}
    </div>
  );
}
