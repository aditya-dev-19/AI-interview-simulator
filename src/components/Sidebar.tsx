"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Activity, User } from 'lucide-react';
import { NavItem } from './ui/NavItem';
import { createClient } from '@/utils/supabase/client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Logo } from './ui/Logo';

export function Sidebar() {
  const pathname = usePathname() || '';
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = React.useState<string>("Loading...");
  
  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.replace("/auth");
  };

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

  // Hide sidebar on specific pages
  if (pathname.startsWith('/interviewer') || pathname.startsWith('/feedback')) {
    return null;
  }

  return (
    <nav className="w-64 border-r border-zinc-800/60 bg-zinc-950/50 flex flex-col justify-between z-20 relative">
      <div>
        <div className="p-6">
          <Logo />
        </div>

        <div className="px-4 space-y-1 mt-4">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" isActive={pathname.startsWith('/dashboard')} href="/dashboard" />
          <NavItem icon={<FileText size={18} />} label="Resume Library" isActive={pathname.startsWith('/uploadresume')} href="/uploadresume" />
          <NavItem icon={<Activity size={18} />} label="Mock Interview" isActive={pathname.startsWith('/setup') || pathname.startsWith('/interviewer') || pathname.startsWith('/feedback')} href="/setup" />
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800/60">
        <div className="group relative transition-all duration-300">
          <div className="absolute -inset-2 bg-emerald-500/5 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  <User className="w-5 h-5 text-emerald-400/80" />
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{name}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse"></div>
                  <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">Candidate</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg border border-transparent hover:border-red-500/10 transition-all"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
