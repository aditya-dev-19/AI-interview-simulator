import React from 'react';
import { Sidebar } from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-transparent w-full">
        <div className="relative w-full min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
