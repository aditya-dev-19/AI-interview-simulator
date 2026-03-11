import React from 'react';
import { UploadCloud } from 'lucide-react';
import { ResumeRow } from '../ui/ResumeRow';

export function ResumeView() {
  return (
    <div className="p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Resume Library</h2>
        <p className="text-zinc-400">Upload PDFs to train your AI interviewer's context cache.</p>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 bg-zinc-900/20 rounded-2xl p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center group">
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
          <UploadCloud className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Upload New Resume</h3>
        <p className="text-sm text-zinc-500">PDF up to 5MB. Text will be parsed via Next.js Serverless.</p>
      </div>

      {/* List */}
      <div className="space-y-3">
        <ResumeRow name="frontend_resume_2026.pdf" date="Uploaded Oct 22" active />
        <ResumeRow name="fullstack_backup_v2.pdf" date="Uploaded Sep 14" />
      </div>
    </div>
  );
}
