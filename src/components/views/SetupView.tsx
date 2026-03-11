import React, { useState } from 'react';
import { FileText, Sparkles, ArrowRight } from 'lucide-react';
import { callGemini } from '../../lib/gemini';

interface SetupViewProps {
  onStart: () => void;
  onCancel: () => void;
}

export function SetupView({ onStart, onCancel }: SetupViewProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("We are looking for a Senior Frontend Engineer to join our core product team. You should have 4+ years of experience with React, Next.js, and Tailwind CSS. Experience with WebSockets and real-time audio/video is a huge plus.");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateJD = async () => {
    setIsGenerating(true);
    const titleToUse = jobTitle || "Software Engineer";
    const prompt = `Write a realistic, concise job description for a ${titleToUse} position. Include a brief 2-sentence summary and 3-4 bullet points for key requirements. Do not use markdown formatting like bolding.`;
    
    const generatedJD = await callGemini(prompt);
    setJobDescription(generatedJD);
    setIsGenerating(false);
  };

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">
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
              <input type="radio" name="resume" defaultChecked className="text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700" />
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">frontend_resume_2026.pdf</p>
                  <p className="text-xs text-zinc-500">Updated 2 days ago</p>
                </div>
              </div>
            </label>
            <label className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/50 cursor-pointer transition-colors">
              <input type="radio" name="resume" className="text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700" />
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">fullstack_backup_v2.pdf</p>
                  <p className="text-xs text-zinc-500">Updated last month</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Right Column: JD Paste */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-300">Target Role Title (Optional)</label>
            <input 
              type="text" 
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer" 
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

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
            className="w-full h-48 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none placeholder-zinc-600"
            placeholder="Paste the requirements and responsibilities here. Gemini will use this to generate targeted behavioral and technical questions..."
          ></textarea>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-zinc-800/60">
        <button onClick={onCancel} className="px-6 py-2.5 rounded-xl font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
        <button onClick={onStart} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          Begin Interview <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
