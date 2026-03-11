import React, { useState, useEffect, useRef } from 'react';
import { Clock, Bot, User, AlertOctagon, ShieldCheck, MessageSquare, List, Mic, CheckCircle2 } from 'lucide-react';

interface InterviewRoomProps {
  onExit: () => void;
}

export function InterviewRoom({ onExit }: InterviewRoomProps) {
  const [aiState, setAiState] = useState('speaking'); // speaking, listening, processing
  const [proctoringFlags, setProctoringFlags] = useState<{time: string, reason: string}[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [progress, setProgress] = useState(15);
  const [sidebarTab, setSidebarTab] = useState('transcript'); // 'transcript' or 'telemetry'
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Chat History State
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: "Hi Alex! Thanks for joining today. Are you ready to begin your mock interview?" },
    { role: 'user', text: "Yes, I'm ready. Thanks for having me." },
    { role: 'ai', text: "I see on your resume you've used WebSockets extensively. Can you walk me through a specific challenge you faced handling high-frequency socket events, and how you resolved it?" }
  ]);

  // Simulate webcam stream
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.log("Webcam access denied", err));
    }
  }, []);

  // Hackathon trigger: Simulate Out-of-camera Warning
  const triggerWarning = () => {
    setShowWarning(true);
    setProctoringFlags(prev => [...prev, { time: new Date().toLocaleTimeString([],{hour12:false}), reason: 'User looking away from screen' }]);
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
             <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{width: `${progress}%`}}></div>
           </div>
        </div>

        <div className="w-1/3 flex justify-end">
          <button onClick={onExit} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-zinc-700">
            End Session
          </button>
        </div>
      </header>

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
              <div className={`z-10 bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)] transition-all duration-300 ${
                aiState === 'speaking' ? 'animate-talk' :
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
            <div className={`absolute bottom-3 left-3 px-2 py-1 rounded-md backdrop-blur-md text-[10px] flex items-center gap-1.5 font-bold transition-colors ${showWarning ? 'bg-red-500/80 text-white' : 'bg-black/60 text-emerald-400'}`}>
              {showWarning ? <AlertOctagon className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {showWarning ? 'Focus Lost' : 'Focus Verified'}
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
                  <div className="flex flex-col items-end animate-pulse mt-2">
                    <span className="text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">You</span>
                    <div className="px-4 py-2 bg-emerald-500/5 text-emerald-400/70 border border-emerald-500/10 rounded-2xl rounded-tr-sm text-xs italic flex items-center gap-2">
                      <Mic className="w-3 h-3" /> Transcribing...
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
                    <div className="flex items-center gap-2 text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/> Resume parsed</div>
                    <div className="flex items-center gap-2 text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/> JD ingested</div>
                    <div className="flex items-center gap-2 text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/> Bot Persona loaded</div>
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
                      <span className="font-mono text-zinc-600">12:40</span>
                      <span>Baseline snapshot verified.</span>
                    </div>
                    {proctoringFlags.map((flag, idx) => (
                      <div key={idx} className="flex gap-2 text-red-400 border border-red-900/30 bg-red-500/5 p-2 rounded animate-in slide-in-from-right-2">
                        <AlertOctagon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono font-semibold">{flag.time}</span>
                          <span>Flag: {flag.reason}</span>
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
    </div>
  );
}
