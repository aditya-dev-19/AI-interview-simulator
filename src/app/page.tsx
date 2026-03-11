"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import AuthView from '@/components/views/AuthView';
import { DashboardView } from '@/components/views/DashboardView';
import { SetupView } from '@/components/views/SetupView';
import { InterviewRoom } from '@/components/views/InterviewRoom';
import { FeedbackView } from '@/components/views/FeedbackView';
import { ResumeView } from '@/components/views/ResumeView';

export default function AIInterviewPro() {
  const [activeTab, setActiveTab] = useState('auth');

  const isFullScreen = activeTab === 'auth' || activeTab === 'interview' || activeTab === 'feedback';

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      {!isFullScreen && (
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-zinc-950">
        {activeTab === 'auth' && <AuthView onLogin={() => setActiveTab('dashboard')} />}
        {activeTab === 'dashboard' && <DashboardView onStart={() => setActiveTab('setup')} />}
        {activeTab === 'resumes' && <ResumeView />}
        {activeTab === 'setup' && <SetupView onStart={() => setActiveTab('interview')} onCancel={() => setActiveTab('dashboard')} />}
        {activeTab === 'interview' && <InterviewRoom onExit={() => setActiveTab('feedback')} />}
        {activeTab === 'feedback' && <FeedbackView onClose={() => setActiveTab('dashboard')} />}
      </main>
    </div>
  );
}
