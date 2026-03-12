"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Activity, User, BrainCircuit } from 'lucide-react';
import { NavItem } from './ui/NavItem';
import { createClient } from '@/utils/supabase/client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  }, []);
  return (
    <nav className="w-64 border-r border-zinc-800/60 bg-zinc-950/50 flex flex-col justify-between z-20 relative">
      <div>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <BrainCircuit className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Interview<span className="text-emerald-400">Pro</span></h1>
        </div>

        <div className="px-4 space-y-1 mt-4">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" isActive={pathname.startsWith('/dashboard')} href="/dashboard" />
          <NavItem icon={<FileText size={18} />} label="Resume Library" isActive={pathname.startsWith('/uploadresume')} href="/uploadresume" />
          <NavItem icon={<Activity size={18} />} label="Mock Interview" isActive={pathname.startsWith('/setup') || pathname.startsWith('/interviewer') || pathname.startsWith('/feedback')} href="/setup" />
        </div>
      </div>

      <div className="p-6 border-t border-zinc-800/60">
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
            <User className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            {/* <p className="text-xs text-emerald-400">Pro Tier</p> */}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-red-400 transition"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
      </div>
    </nav>
  );
}
