"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, Bot, User, AlertOctagon, ShieldCheck, MessageSquare, List, Mic, MicOff, CheckCircle2 } from 'lucide-react';
import { createGeminiLiveClient, type GeminiLiveClient } from '@/lib/gemini';
import { Logo } from '@/components/ui/Logo';

const VAD_BASE_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/';
const VAD_ONNX_WASM_BASE_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

type MicVadController = {
  start: () => void;
  pause: () => void;
  listening: boolean;
};

export default function InterviewRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = searchParams.get('id');

  const [aiState, setAiState] = useState('speaking'); // speaking, listening, processing
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [proctoringFlags, setProctoringFlags] = useState<{ time: string, reason: string }[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(15);
  const [sidebarTab, setSidebarTab] = useState('transcript'); // 'transcript' or 'telemetry'
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [hasMicAccess, setHasMicAccess] = useState<boolean | null>(null);
  const [lastProctorStatus, setLastProctorStatus] = useState<'scanning' | 'safe' | 'flagged' | 'idle'>('idle');
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: "Connecting to live session… Please allow microphone access when prompted." }
  ]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const vadRef = useRef<MicVadController | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const captureFrame = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.6);
  };

  // Auto-scroll transcript to bottom whenever a new message arrives
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Simulate webcam stream
  useEffect(() => {
    if (!interviewId) return;

    const interval = setInterval(async () => {
      const frame = captureFrame();
      if (!frame) return;

      try {
        setLastProctorStatus('scanning');
        const res = await fetch("/api/proctor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: frame,
            interview_id: interviewId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("Proctor API error:", data);
          setLastProctorStatus('idle');
          return;
        }

        console.debug("[proctor] analysis received:", data.analysis);

        if (data.warnings?.length > 0) {
          setShowWarning(true);

          setProctoringFlags(prev => [
            ...prev,
            {
              time: new Date().toLocaleTimeString([], { hour12: false }),
              reason: data.warnings.join(", "),
            },
          ]);

          setSidebarTab("telemetry");

          setTimeout(() => setShowWarning(false), 4000);
          setLastProctorStatus('flagged');
        } else {
          setLastProctorStatus('safe');
          setProctoringFlags(prev => [
            ...prev,
            {
              time: new Date().toLocaleTimeString([], { hour12: false }),
              reason: "Frame verified: No issues detected.",
            },
          ]);
        }

      } catch (err) {
        console.error("Proctor request failed:", err);
        setLastProctorStatus('idle');
      }
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, [interviewId]);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          webcamStreamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setHasCameraAccess(true);
        })
        .catch(err => {
          console.log("Webcam access denied", err);
          setHasCameraAccess(false);
        });
    } else {
      setHasCameraAccess(false);
    }

    return () => {
      webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Auto-connect once the page mounts (or when interviewId becomes available).
  useEffect(() => {
    void startMic();

    return () => {
      vadRef.current?.pause();
      vadRef.current = null;
      void liveClientRef.current?.disconnect();
      liveClientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    liveClientRef.current?.setMuted(next);
  };

  const startPreVad = async (client: GeminiLiveClient) => {
    const stream = client.getMicrophoneStreamClone();
    if (!stream) {
      return;
    }

    if (vadRef.current) {
      vadRef.current.pause();
      vadRef.current = null;
    }

    try {
      const { MicVAD } = await import('@ricky0123/vad-web');
      const vad = await MicVAD.new({
        baseAssetPath: VAD_BASE_ASSET_PATH,
        onnxWASMBasePath: VAD_ONNX_WASM_BASE_PATH,
        getStream: async () => stream,
        pauseStream: async (vadStream: MediaStream) => {
          vadStream.getTracks().forEach((track) => track.stop());
        },
        onSpeechRealStart: () => {
          client.handleSpeechStart();
          setAiState('listening');
        },
        onSpeechEnd: () => {
          client.handleSpeechEnd();
        },
        positiveSpeechThreshold: 0.6,
        negativeSpeechThreshold: 0.45,
        minSpeechMs: 420,
        redemptionMs: 900,
        preSpeechPadMs: 120,
      });

      vad.start();
      vadRef.current = vad;
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      console.warn('Pre-VAD failed to initialize. Falling back to built-in mic interrupt logic.', error);
    }
  };

  const startMic = async () => {
    if (!interviewId) {
      setLiveError('Missing interview id. Please restart from setup page.');
      return;
    }

    try {
      setLiveError(null);
      setLiveStatus('connecting');
      setAiState('processing');

      if (liveClientRef.current) {
        await liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }

      const client = createGeminiLiveClient(
        interviewId,
        {
          onStateChange: (state) => {
            if (state === 'connecting') setAiState('processing');
            if (state === 'listening') setAiState('listening');
            if (state === 'speaking') setAiState('speaking');
            if (state === 'error') {
              setLiveStatus('error');
              setAiState('processing');
            }
          },
          onDebug: (payload) => {
            const p = payload as Record<string, unknown>;
            const sc = p?.serverContent as Record<string, unknown> | undefined;
            if (sc?.turnComplete)   console.debug('[gemini] turnComplete');
            if (sc?.interrupted)    console.debug('[gemini] interrupted');
            if ((sc?.inputTranscription  as Record<string,unknown>)?.text) console.debug('[gemini] user transcript:', (sc?.inputTranscription  as Record<string,unknown>)?.text);
            if ((sc?.outputTranscription as Record<string,unknown>)?.text) console.debug('[gemini] AI transcript:  ', (sc?.outputTranscription as Record<string,unknown>)?.text);
            const parts = (sc?.modelTurn as Record<string,unknown>)?.parts as Array<Record<string,unknown>> | undefined;
            if (parts) {
              const audioParts = parts.filter(pt => String((pt?.inlineData as Record<string,unknown>)?.mimeType ?? '').startsWith('audio/pcm'));
              if (audioParts.length > 0) console.debug(`[gemini] 🔊 ${audioParts.length} audio PCM part(s) received`);
            }
            if (p?.error) console.warn('[gemini] error from server:', p.error);
          },
          onTranscript: (role, text) => {
            if (!text?.trim()) return;
            const mappedRole = role === 'ai' ? 'ai' : 'user';
            setChatHistory((prev) => {
              const last = prev[prev.length - 1];
              // Accumulate fragments from the same speaker into one bubble;
              // start a new bubble only when the speaker changes.
              if (last && last.role === mappedRole) {
                return [
                  ...prev.slice(0, -1),
                  { role: mappedRole, text: last.text + ' ' + text.trim() },
                ];
              }
              return [...prev, { role: mappedRole, text: text.trim() }];
            });
            if (mappedRole === 'user') setAiState('processing');
          },
          onError: (message) => {
            setLiveStatus('error');
            setLiveError(message);
          },
        },
        {
          rmsThreshold: 0.015,
          silenceHangoverMs: 350,
        }
      );

      setHasMicAccess(null);
      await client.connect();
      liveClientRef.current = client;
      await startPreVad(client);
      setLiveStatus('connected');
      setAiState('listening');
      setSidebarTab('transcript');
      setHasMicAccess(true);
    } catch (error) {
      console.error('Failed to start live microphone:', error);
      setLiveStatus('error');
      setLiveError(error instanceof Error ? error.message : 'Failed to start live microphone');
      setAiState('processing');
      setHasMicAccess(false);
    }
  };

  // Hackathon trigger: Simulate Out-of-camera Warning
  const triggerWarning = () => {
    setShowWarning(true);
    setProctoringFlags(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour12: false }), reason: 'User looking away from screen' }]);
    // Switch to telemetry tab automatically to show the flag to judges
    setSidebarTab('telemetry');
    setTimeout(() => setShowWarning(false), 4000);
  };

  // Hackathon trigger: Simulate adding a user message to transcript
  const triggerUserAnswer = () => {
    setChatHistory(prev => [...prev, { role: 'user', text: "We faced an issue where the React state was updating too frequently, causing massive re-renders. I implemented a debouncing utility and moved the socket listener outside the component tree." }]);
    setAiState('processing');
    setTimeout(() => {
      setChatHistory(prev => [...prev, { role: 'ai', text: "That's a solid approach. Using a custom hook or a global store for the socket connection is definitely best practice. Follow-up question: How did you handle dropped connections?" }]);
      setAiState('speaking');
    }, 3000);
  };

  const handleEndSession = async () => {
    if (!interviewId) return;
    
    // Disconnect resources first
    vadRef.current?.pause();
    void liveClientRef.current?.disconnect();

    const res = await fetch("/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id: interviewId })
    });

    const data = await res.json();

    if (data.success) {
      router.push(`/feedback?data=${encodeURIComponent(JSON.stringify(data.evaluation))}`);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950 animate-in zoom-in-95 duration-300">
      {/* ON-SCREEN WARNING TOAST */}
      {showWarning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-[0_0_30px_rgba(220,38,38,0.8)] animate-in slide-in-from-top-4 fade-in duration-200 border border-red-400">
          <AlertOctagon className="w-6 h-6 animate-pulse" />
          PROCTOR ALERT: Please look at the camera. Eyes off-screen detected.
        </div>
      )}

      {/* Room Header with Progress Bar */}
      <header className="h-16 border-b border-zinc-800 flex items-center px-8 bg-zinc-900/30 shrink-0">
        <div className="flex items-center gap-4 w-1/3">
          <Logo hideText className="scale-75 origin-left" />
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-400/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            Live Session
          </div>
        </div>

        {/* Central Progress Tracking */}
        <div className="w-1/3 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium mb-1.5">
            <Clock className="w-3.5 h-3.5" /> 12:45 remaining • Question 2 of 5
          </div>
          <div className="w-full max-w-xs h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="w-1/3 flex justify-end items-center gap-3">
          {/* Connection status badge — replaces the old Start/Stop Mic button */}
          <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
            isMuted
              ? 'bg-red-500/10 text-red-400 border-red-400/20'
              : liveStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20'
              : liveStatus === 'connecting'
              ? 'bg-amber-500/10 text-amber-400 border-amber-400/20'
              : liveStatus === 'error'
              ? 'bg-red-500/10 text-red-400 border-red-400/20'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
          }`}>
            {isMuted
              ? <MicOff className="w-3.5 h-3.5" />
              : <Mic className={`w-3.5 h-3.5 ${liveStatus === 'connected' ? 'animate-pulse' : liveStatus === 'connecting' ? 'opacity-60' : ''}`} />
            }
            {isMuted ? 'Muted' :
             liveStatus === 'connected' ? 'Mic Active' :
             liveStatus === 'connecting' ? 'Connecting…' :
             liveStatus === 'error' ? 'Mic Error' : 'Mic Off'}
          </div>
          <button onClick={handleEndSession} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-zinc-700">
            End Session
          </button>
        </div>
      </header>

      {liveError && (
        <div className="mx-8 mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {liveError}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">

        {/* Main Stage: AI Avatar & Captions */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-8">

          {/* AI Bot Avatar Frame */}
          <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
            {/* Animated Rings for speech */}
            <div className={`absolute inset-0 rounded-full border border-emerald-500/20 transition-all duration-1000 ${aiState === 'speaking' ? 'animate-ping opacity-100 scale-[1.3]' : 'opacity-0 scale-90'}`}></div>
            <div className={`absolute inset-0 rounded-full border border-emerald-400/30 transition-all duration-700 ${aiState === 'speaking' ? 'animate-ping opacity-100 scale-[1.15]' : 'opacity-0 scale-90'}`}></div>

            {/* Custom Robot Face */}
            <div className="relative w-48 h-48 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.6)] border-4 border-zinc-700 flex flex-col items-center justify-center overflow-hidden z-10 transition-all duration-500">
              {/* Glossy top highlight */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/5 rounded-t-[2.5rem] pointer-events-none"></div>

              {/* Eyes */}
              <div className="flex gap-8 mb-6 z-10">
                <div className={`w-8 h-8 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] relative transition-all duration-300 ${aiState === 'processing' ? 'animate-process' : ''}`}>
                  <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-white rounded-full opacity-80"></div>
                </div>
                <div className={`w-8 h-8 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] relative transition-all duration-300 ${aiState === 'processing' ? 'animate-process' : ''}`} style={{ animationDelay: '0.1s' }}>
                  <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-white rounded-full opacity-80"></div>
                </div>
              </div>

              {/* Animated Lips / Mouth */}
              <div className={`z-10 bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)] transition-all duration-300 ${aiState === 'speaking' ? 'animate-talk' :
                aiState === 'processing' ? 'w-6 h-6 rounded-full' :
                  'w-16 h-1.5 rounded-full'
                }`}></div>
            </div>

            {/* Name badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-xs px-3 py-1 rounded-full text-zinc-300 font-medium z-20 shadow-lg whitespace-nowrap flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              Sarah (AI Recruiter)
            </div>
          </div>

          {/* Floating mic mute control */}
          <div className="flex flex-col items-center gap-2 mt-6">
            <button
              onClick={toggleMute}
              disabled={liveStatus !== 'connected'}
              className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                isMuted
                  ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25 shadow-[0_0_18px_rgba(239,68,68,0.15)]'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_18px_rgba(16,185,129,0.1)]'
              }`}
            >
              {isMuted ? (
                <><MicOff className="w-4 h-4" /> Unmute mic</>
              ) : (
                <><Mic className="w-4 h-4 animate-pulse" /> Mute mic</>
              )}
            </button>
            {isMuted && (
              <span className="text-[10px] text-red-400/70 uppercase tracking-widest font-semibold animate-pulse">
                Audio paused — Gemini is waiting
              </span>
            )}
          </div>

          {/* User Webcam Feed (Shifted to corner and resized) */}
          <div className="absolute top-8 right-8 h-28 w-44 bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden shadow-2xl z-30 group hover:border-zinc-500 hover:scale-105 transition-all duration-300 ease-out cursor-move">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 -z-10">
              <User className="w-12 h-12 text-zinc-600" />
            </div>

            {/* User Name Badge (Top Left inside PIP) */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] text-white font-medium">
              You
            </div>

            {/* Live Proctoring Status on Cam (Bottom Left) */}
            <div className={`absolute bottom-3 left-3 px-2 py-1 rounded-md backdrop-blur-md text-[10px] flex items-center gap-1.5 font-bold transition-all duration-300 ${
              lastProctorStatus === 'flagged' ? 'bg-red-500/80 text-white' :
              lastProctorStatus === 'scanning' ? 'bg-amber-500/80 text-white animate-pulse' :
              lastProctorStatus === 'safe' ? 'bg-emerald-500/80 text-white' :
              'bg-black/60 text-emerald-400'
            }`}>
              {lastProctorStatus === 'flagged' ? <AlertOctagon className="w-3.5 h-3.5" /> :
               lastProctorStatus === 'scanning' ? <Bot className="w-3.5 h-3.5" /> :
               <ShieldCheck className="w-3.5 h-3.5" />}

              {lastProctorStatus === 'flagged' ? 'Focus Lost' :
               lastProctorStatus === 'scanning' ? 'Scanning…' :
               lastProctorStatus === 'safe' ? 'Verified' : 'Active'}
            </div>
          </div>

          {/* Demo Controls (Hidden from judges) */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-10 hover:opacity-100 transition-opacity p-2 bg-zinc-900 border border-zinc-800 rounded z-40">
            <span className="text-[10px] text-zinc-500 uppercase font-bold text-center">Demo Controls</span>
            <div className="flex gap-2">
              <button onClick={() => setAiState('speaking')} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded">Sim AI Speak</button>
              <button onClick={() => setAiState('listening')} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded">Sim Barge-In</button>
            </div>
            <button onClick={triggerWarning} className="text-xs bg-red-900/30 hover:bg-red-900/60 border border-red-500/50 text-red-400 px-2 py-1 rounded transition-colors">Simulate Cheating Flag</button>
            <button onClick={triggerUserAnswer} className="text-xs bg-emerald-900/30 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-400 px-2 py-1 rounded transition-colors">Simulate User Answer</button>
            <button onClick={() => setProgress(prev => Math.min(prev + 20, 100))} className="text-xs bg-zinc-800 text-white px-2 py-1 rounded">Advance Progress</button>
          </div>
        </div>

        {/* Sidebar: Transcript & Telemetry Tabs */}
        <div className="w-80 border-l border-zinc-800 bg-zinc-900/20 flex flex-col z-20 shrink-0 relative">

          {/* Tab Navigation */}
          <div className="flex border-b border-zinc-800 pt-4 px-6">
            <button
              onClick={() => setSidebarTab('transcript')}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center justify-center gap-2 ${sidebarTab === 'transcript' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Transcript
            </button>
            <button
              onClick={() => setSidebarTab('telemetry')}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center justify-center gap-2 ${sidebarTab === 'telemetry' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="w-3.5 h-3.5" /> Telemetry
            </button>
          </div>

          <div className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto">
            {/* TAB CONTENT: TRANSCRIPT */}
            {sidebarTab === 'transcript' && (
              <div className="flex-1 flex flex-col space-y-4 pr-2">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                    <span className="text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">
                      {msg.role === 'user' ? 'You' : 'Sarah (AI)'}
                    </span>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[90%] shadow-sm ${msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-100 rounded-tr-sm border border-emerald-500/20' : 'bg-zinc-800/80 text-zinc-200 rounded-tl-sm border border-zinc-700'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiState === 'listening' && (
                  <div className="flex flex-col items-start mt-2">
                    <span className="text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">Sarah (AI)</span>
                    <div className="px-4 py-2 bg-zinc-800/40 text-zinc-500 border border-zinc-700/40 rounded-2xl rounded-tl-sm text-xs italic flex items-center gap-2">
                      <Mic className="w-3 h-3 text-emerald-400 animate-pulse" /> Listening…
                    </div>
                  </div>
                )}
                <div ref={transcriptEndRef} />
                {aiState === 'processing' && (
                  <div className="flex flex-col items-start animate-pulse mt-2">
                    <span className="text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">Sarah (AI)</span>
                    <div className="px-4 py-2 bg-zinc-800/40 text-zinc-500 border border-zinc-700/40 rounded-2xl rounded-tl-sm text-xs italic flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping inline-block" /> Thinking…
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: TELEMETRY */}
            {sidebarTab === 'telemetry' && (
              <div className="space-y-6 flex-1 flex flex-col">
                {/* Context Cache Status */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-zinc-400">Gemini Context Cache</span>
                    <span className="text-emerald-400 font-mono">ACTIVE</span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Resume parsed</div>
                    <div className="flex items-center gap-2 text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> JD ingested</div>
                    <div className="flex items-center gap-2 text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bot Persona loaded</div>
                  </div>
                </div>

                {/* Video Proctoring Log */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-zinc-400">Vision Proctoring</span>
                    <span className="text-zinc-500 font-mono">20s Loop</span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs space-y-3 flex-1 overflow-y-auto">
                    <div className="flex gap-2 text-zinc-500 border-b border-zinc-800/50 pb-2">
                      <span className="font-mono text-zinc-600">START</span>
                      <span>Baseline snapshot verified. Proctoring active.</span>
                    </div>
                    {proctoringFlags.map((flag, idx) => (
                      <div key={idx} className={`flex gap-2 p-2 rounded animate-in slide-in-from-right-2 border ${
                        flag.reason.includes("No issues")
                          ? 'text-zinc-400 border-zinc-800 bg-zinc-800/20'
                          : 'text-red-400 border-red-900/30 bg-red-500/5'
                      }`}>
                        {flag.reason.includes("No issues")
                          ? <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          : <AlertOctagon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        }
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono font-semibold">{flag.time}</span>
                          <span>{flag.reason.includes("No issues") ? flag.reason : `Flag: ${flag.reason}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Barge-in Status */}
                <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-700 flex items-center justify-between shadow-inner shrink-0 mt-4">
                  <span className="text-xs text-zinc-300 font-medium">VAD Engine</span>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold tracking-widest uppercase transition-colors ${aiState === 'speaking' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-zinc-800 text-zinc-500 border border-transparent'}`}>
                    {aiState === 'speaking' ? 'Barge-In Ready' : 'Standby'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* PERMISSION BLOCKING OVERLAY */}
      {(hasCameraAccess === false || hasMicAccess === false) && (
        <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
            <AlertOctagon className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
          <h2 className="h1 text-white mb-4">Permissions Required</h2>
          <div className="text-zinc-400 max-w-md leading-relaxed space-y-4 mb-8">
            <p className="body">
              To ensure a secure and interactive interview experience, both{" "}
              <span className="text-white font-semibold">camera</span> and{" "}
              <span className="text-white font-semibold">microphone</span> access are mandatory.
            </p>

            <p className="body">
              Please enable camera and microphone access in your browser settings.
            </p>

            <p className="caption text-zinc-500">
              Audio and video recording will be used for proctoring purposes only.
            </p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <div className={`flex items-center justify-between p-4 rounded-xl border ${hasCameraAccess === false ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5" />
                <span className="font-semibold text-sm">Camera Access</span>
              </div>
              {hasCameraAccess === false ? <AlertOctagon className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div className={`flex items-center justify-between p-4 rounded-xl border ${hasMicAccess === false ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5" />
                <span className="font-semibold text-sm">Microphone Access</span>
              </div>
              {hasMicAccess === false ? <AlertOctagon className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-10 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 text-sm uppercase tracking-widest"
          >
            Grant Permissions & Retry
          </button>
          <p className="caption text-zinc-500 font-bold uppercase tracking-widest mt-6">
            Sarah AI is waiting for you
          </p>
        </div>
      )}
    </div>
  );
}
