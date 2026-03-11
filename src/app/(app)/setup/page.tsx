"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Sparkles, ArrowRight, X, AlertCircle } from 'lucide-react';

export default function SetupView() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("We are looking for a Senior Frontend Engineer to join our core product team. You should have 4+ years of experience with React, Next.js, and Tailwind CSS. Experience with WebSockets and real-time audio/video is a huge plus.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // Changed from boolean to string for specific errors

  const handleBeginInterview = () => {
    // 1. Validation for Empty JD
    if (!jobDescription || jobDescription.trim() === "") {
      setErrorMessage("Job description cannot be empty. Please paste a JD or generate one.");
      return;
    }

    // 2. Validation for JD Length (1000 chars)
    if (jobDescription.length > 1000) {
      setErrorMessage("Job description is too long. Please keep it under 1000 characters.");
      return;
    }

    // 3. Validation for Title Length (50 chars)
    if (jobTitle.length > 50) {
      setErrorMessage("Job title is too long. Please keep it under 50 characters.");
      return;
    }

    router.push('/interviewer');
  };

  const handleGenerateJD = async () => {
    setIsGenerating(true);
    // Logic for API call would go here
    setIsGenerating(false);
  };

  return (
    <div className="relative p-10 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">

      {/* ERROR MODAL */}
      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800/80">
              <h3 className="text-white font-semibold">Validation Error</h3>
              <button onClick={() => setErrorMessage("")} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-zinc-300 font-medium leading-snug">{errorMessage}</p>
            </div>
            <div className="p-4 border-t border-zinc-800/80 flex justify-end">
              <button
                onClick={() => setErrorMessage("")}
                className="bg-red-500 hover:bg-red-400 text-white px-6 py-2 rounded-xl font-bold transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Configure Your Session</h2>
        <p className="text-zinc-400">Provide context so the AI can tailor the interview questions accurately.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Resume Select */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-zinc-300">1. Select Target Resume</label>
          <div className="space-y-3">
            <label className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/50 bg-emerald-500/5 cursor-pointer">
              <input type="radio" name="resume" defaultChecked className="text-emerald-500 bg-zinc-900 border-zinc-700" />
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">frontend_resume_2026.pdf</p>
                  <p className="text-xs text-zinc-500">Updated 2 days ago</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Right Column: JD Paste */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-semibold text-zinc-300">Target Role Title (Optional)</label>
              <span className={`text-[10px] ${jobTitle.length >= 50 ? 'text-red-500' : 'text-zinc-500'}`}>
                {jobTitle.length}/50
              </span>
            </div>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              maxLength={50} // Hard limit
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-300 flex justify-between items-center mt-4">
              <span>2. Paste Job Description</span>
              <button
                onClick={handleGenerateJD}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-2 rounded-lg font-medium transition-colors border border-indigo-500/30 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGenerating ? "Generating..." : "✨ Auto-Generate JD"}
              </button>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              maxLength={1000} // Hard limit
              className="w-full h-48 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              placeholder="Paste requirements here..."
            ></textarea>
            <div className="flex justify-end">
              <span className={`text-[10px] ${jobDescription.length >= 1000 ? 'text-red-500' : 'text-zinc-500'}`}>
                {jobDescription.length}/1000 characters
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-zinc-800/60">
        <button onClick={() => router.push('/dashboard')} className="px-6 py-2.5 rounded-xl font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
        <button onClick={handleBeginInterview} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          Begin Interview <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}