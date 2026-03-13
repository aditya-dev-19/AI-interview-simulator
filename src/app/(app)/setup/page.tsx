"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Sparkles, ArrowRight, X, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Resume {
  id: string;
  file_name: string;
  uploaded_at: string;
  parsed_text: string;
}

export default function SetupView() {
  const router = useRouter();
  const supabase = createClient();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorHeader, setErrorHeader] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const fetchResumes = async () => {
      setIsLoadingResumes(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
          return;
        }

        const { data, error } = await supabase
          .from('resumes')
          .select('id, file_name, uploaded_at, parsed_text')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false });

        if (error) throw error;
        setResumes(data || []);
        if (data && data.length > 0) {
          setSelectedResumeId(data[0].id);
        }
      } catch (err: any) {
        console.error("Error fetching resumes:", err);
        setErrorHeader("Fetch Error");
        setErrorMessage("Failed to load your resumes. Please try again later.");
        setShowError(true);
      } finally {
        setIsLoadingResumes(false);
      }
    };

    fetchResumes();
  }, [supabase, router]);

  const handleBeginInterview = async () => {
    if (!selectedResumeId) {
      setErrorHeader("Missing Resume");
      setErrorMessage("Please select a resume to continue.");
      setShowError(true);
      return;
    }

    if (!jobDescription || jobDescription.trim() === "") {
      setErrorHeader("Missing Job Description");
      setErrorMessage("Job description cannot be empty. Please paste a JD or generate one.");
      setShowError(true);
      return;
    }

    if (!jobTitle || jobTitle.trim() === "") {
      setErrorHeader("Missing Target Role");
      setErrorMessage("Please enter the target role title so the interviewer persona can adapt correctly.");
      setShowError(true);
      return;
    }

    setIsStarting(true);
    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_id: selectedResumeId,
          job_description: jobDescription,
          target_role: jobTitle.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start interview");
      }

      router.push(`/interviewer?id=${data.interview_id}`);
    } catch (err: any) {
      console.error("Start interview error:", err);
      setErrorHeader("Session Error");
      setErrorMessage(err.message || "An unexpected error occurred while starting the session.");
      setShowError(true);
    } finally {
      setIsStarting(false);
    }
  };

  const handleGenerateJD = async () => {
    setIsGenerating(true);
    // Note: In a real implementation, you'd call a dedicated JD generation endpoint.
    // Setting a placeholder for now as per original mock logic.
    setTimeout(() => {
      const titleToUse = jobTitle || "Software Engineer";
      setJobDescription(`Role: ${titleToUse}\n\nKey Requirements:\n- Proficient in modern JavaScript frameworks (React/Next.js)\n- Solid understanding of distributed systems and API design\n- Strong problem solving and communication skills\n- Experience with cloud infrastructure (AWS/Vercel)`);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="relative p-10 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">

      {/* ERROR MODAL */}
      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800/80">
              <h3 className="h3 text-white">{errorHeader}</h3>
              <button onClick={() => setShowError(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="body font-medium text-zinc-300 leading-snug">{errorMessage}</p>
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
        <h2 className="h1 text-white mb-2">Configure Your Session</h2>
        <p className="body text-zinc-400">Provide context so the AI can tailor the interview questions accurately.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Resume & Track Select */}
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="body font-semibold text-zinc-300">1. Select Target Resume</label>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {isLoadingResumes ? (
                <div className="flex flex-col items-center justify-center p-8 border border-zinc-800 rounded-xl bg-zinc-900/20">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
                  <p className="caption text-zinc-500">Loading resumes...</p>
                </div>
              ) : resumes.length === 0 ? (
                <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/20 text-center">
                  <p className="body text-zinc-400 mb-3">No resumes found.</p>
                  <button
                    onClick={() => router.push('/uploadresume')}
                    className="body font-medium text-emerald-500 hover:underline"
                  >
                    Upload your first resume
                  </button>
                </div>
              ) : (
                resumes.map((resume) => (
                  <label
                    key={resume.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${selectedResumeId === resume.id
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="resume"
                      checked={selectedResumeId === resume.id}
                      onChange={() => setSelectedResumeId(resume.id)}
                      className="text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700"
                    />
                    <div className="flex items-center gap-3">
                      <FileText className={`w-5 h-5 ${selectedResumeId === resume.id ? 'text-emerald-400' : 'text-zinc-400'}`} />
                      <div>
                        <p className={`body font-medium ${selectedResumeId === resume.id ? 'text-white' : 'text-zinc-300'}`}>
                          {resume.file_name}
                        </p>
                        <p className="caption text-zinc-500">
                          {new Date(resume.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="body font-semibold text-zinc-300">2. Target Role Persona</label>
            <p className="caption text-zinc-500">
              The AI interviewer will automatically adapt its persona using the target role title you provide.
            </p>
          </div>
        </div>

        {/* Right Column: JD Paste */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="body font-semibold text-zinc-300">Target Role Title</label>
              <span className={`caption ${jobTitle.length >= 50 ? 'text-red-500' : 'text-zinc-500'}`}>
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

          <label className="body font-semibold text-zinc-300 flex justify-between items-center mt-4">
            <span>3. Paste Job Description</span>
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
            className="w-full h-56 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none placeholder-zinc-600 custom-scrollbar"
            placeholder="Paste the requirements and responsibilities here. Gemini will use this to generate targeted behavioral and technical questions..."
          ></textarea>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-zinc-800/60">
        <button
          onClick={() => router.push('/dashboard')}
          disabled={isStarting}
          className="px-6 py-2.5 rounded-xl font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleBeginInterview}
          disabled={isStarting || isLoadingResumes}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Initializing Session...
            </>
          ) : (
            <>
              Begin Interview <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}