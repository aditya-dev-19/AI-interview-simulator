"use client";

import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, X } from 'lucide-react';
import { ResumeRow } from '@/components/ui/ResumeRow';
import { useEffect } from "react";

export default function ResumeView() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<any[]>([]);

  const [error, setError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  const MAX_RESUMES = 3;


  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await fetch("/api/resume/list", {
        credentials: "include"
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error || "Failed to load resumes");
        return;
      }

      const formatted = (data?.resumes || []).map((r: any) => ({
        id: r.id,
        name: r.file_name,
        date: `Uploaded ${new Date(r.uploaded_at).toLocaleDateString()}`,
        active: false
      }));

      setResumes(formatted);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch resumes");
    }
  };
  const deleteResume = async (id: string) => {
    if (!id) return;
    setError(null);
    try {
      const res = await fetch("/api/resume/delete", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error || "Delete failed");
        return;
      }

      setResumes(prev => prev.filter(r => r.id !== id));

    } catch (err) {
      console.error(err);
      setError("Failed to delete resume");
    }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    // 1. Check Inventory Limit
    if (resumes.length >= MAX_RESUMES) {
      setError(`Storage full. You can only maintain up to ${MAX_RESUMES} resumes.`);
      return;
    }

    // 2. Check File Size
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size allowed is 5MB.");
      return;
    }

    // 3. Check File Type (Bonus validation)
    if (file.type !== "application/pdf") {
      setError("Invalid format. Please upload a PDF file.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      // const newResume = {
      //   id: data.resume.id,
      //   name: data.resume.file_name,
      //   date: `Uploaded ${new Date().toLocaleDateString('en-US', {
      //     month: 'short',
      //     day: 'numeric'
      //   })}`,
      //   active: false
      // };

      await fetchResumes();
    } catch (err) {
      console.error(err);
      setError("Something went wrong during upload");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Resume Library</h2>
        <p className="text-zinc-400">Upload PDFs to train your AI interviewer&apos;s context cache.</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4 text-zinc-500 hover:text-white" />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf"
        className="hidden"
      />

      {/* Upload Zone */}
      <div
        onClick={() => {
          if (resumes.length < MAX_RESUMES) {
            fileInputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center group
          ${resumes.length >= MAX_RESUMES
            ? 'border-zinc-800 bg-zinc-900/10 cursor-not-allowed opacity-50'
            : 'border-zinc-700 hover:border-emerald-500/50 bg-zinc-900/20'}`}
      >
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
          <UploadCloud className={`w-8 h-8 ${resumes.length >= MAX_RESUMES ? 'text-zinc-600' : 'text-emerald-400'}`} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">
          {resumes.length >= MAX_RESUMES ? "Storage Limit Reached" : "Upload New Resume"}
        </h3>
        <p className="text-sm text-zinc-500">
          {resumes.length} of {MAX_RESUMES} slots used • Max 5MB per PDF
        </p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {resumes.map((resume) => (
          <ResumeRow
            key={resume.id}
            id={resume.id}
            name={resume.name}
            date={resume.date}
            active={resume.active}
            onDelete={deleteResume}
          />
        ))}

        {resumes.length === 0 && (
          <div className="text-center py-10 text-zinc-600 border border-zinc-900 rounded-xl">
            No resumes uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}