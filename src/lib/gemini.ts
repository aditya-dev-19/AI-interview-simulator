/**
 * callGemini — client-safe Gemini helper
 *
 * This function does NOT hold any API key. It sends the prompt to the
 * internal Next.js API route (`/api/gemini/route.ts`) which runs exclusively
 * on the server and keeps the GEMINI_API_KEY out of the browser bundle.
 *
 * ┌─ Browser ──────────────────────────────────────────────────────┐
 * │  callGemini(prompt)  →  POST /api/gemini  (no secret sent)     │
 * └────────────────────────────────────────────────────────────────┘
 *              ↓  handled by src/app/api/gemini/route.ts (server)
 * ┌─ Server ───────────────────────────────────────────────────────┐
 * │  reads process.env.GEMINI_API_KEY  →  calls Google Gemini API  │
 * └────────────────────────────────────────────────────────────────┘
 */
export const callGemini = async (prompt: string, systemPrompt: string = "You are an expert technical recruiter."): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating content. Please try again.";
  }
};

type LiveRole = 'user' | 'ai';

type LiveState = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'processing' | 'closed' | 'error';

type LiveCallbacks = {
  onStateChange?: (state: LiveState) => void;
  onTranscript?: (role: LiveRole, text: string) => void;
  onError?: (message: string) => void;
  onDebug?: (payload: unknown) => void;
};

type LiveClientOptions = {
  rmsThreshold?: number;
  silenceHangoverMs?: number;
  chunkIntervalMs?: number;
};

type QueuedAudioChunk = {
  base64Data: string;
  mimeType: string;
};

const DEFAULT_OPTIONS: Required<LiveClientOptions> = {
  rmsThreshold: 0.015,
  silenceHangoverMs: 350,
  chunkIntervalMs: 100,
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export class GeminiLiveClient {
  private readonly interviewId: string;
  private readonly callbacks: LiveCallbacks;
  private readonly options: Required<LiveClientOptions>;

  private websocket: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;

  // ── Audio playback (AI → speaker) ──────────────────────────────
  private playbackContext: AudioContext | null = null;
  private nextPlaybackTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private audioQueue: QueuedAudioChunk[] = [];
  private isProcessingAudioQueue = false;
  private pendingTurnComplete = false;

  private isSpeaking = false;
  private lastSpeechAt = 0;
  private lastAudioSentAt = 0;
  private muted = false;

  constructor(interviewId: string, callbacks: LiveCallbacks = {}, options: LiveClientOptions = {}) {
    this.interviewId = interviewId;
    this.callbacks = callbacks;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  private setState(state: LiveState) {
    this.callbacks.onStateChange?.(state);
  }

  // ── Stop all queued / playing AI audio (called on barge-in) ────
  private stopAudioPlayback() {
    for (const src of this.activeSources) {
      try { src.stop(); } catch { /* already ended */ }
    }
    this.activeSources = [];
    this.audioQueue = [];
    this.pendingTurnComplete = false;
    this.nextPlaybackTime = 0;
  }

  private sendRealtimeInput(payload: Record<string, unknown>) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.websocket.send(JSON.stringify({ realtimeInput: payload }));
  }

  private maybeSetListeningAfterPlayback() {
    if (!this.pendingTurnComplete) return;
    if (this.audioQueue.length > 0) return;
    if (this.activeSources.length > 0) return;

    this.pendingTurnComplete = false;
    this.setState('listening');
  }

  private parseSampleRate(mimeType: string): number {
    const rateMatch = mimeType.match(/rate=(\d+)/);
    return rateMatch ? parseInt(rateMatch[1], 10) : 24000;
  }

  private decodeBase64Pcm16ToFloat32(base64Data: string): Float32Array {
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let index = 0; index < binaryStr.length; index++) {
      bytes[index] = binaryStr.charCodeAt(index);
    }

    const alignedLength = bytes.length - (bytes.length % 2);
    const sampleCount = alignedLength / 2;
    const float32 = new Float32Array(sampleCount);
    const view = new DataView(bytes.buffer, bytes.byteOffset, alignedLength);

    for (let index = 0; index < sampleCount; index++) {
      const sample = view.getInt16(index * 2, true);
      float32[index] = sample / 0x8000;
    }

    return float32;
  }

  private enqueueAudioChunk(base64Data: string, mimeType: string) {
    this.audioQueue.push({ base64Data, mimeType });
    void this.processAudioQueue();
  }

  // ── Decode queued base64 PCM-16 chunks and schedule contiguously ──
  private async processAudioQueue(): Promise<void> {
    if (this.isProcessingAudioQueue) return;

    this.isProcessingAudioQueue = true;

    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      this.playbackContext = new AudioContext({ sampleRate: 24000 });
      this.nextPlaybackTime = 0;
    }

    const ctx = this.playbackContext;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    while (this.audioQueue.length > 0) {
      const queued = this.audioQueue.shift();
      if (!queued) continue;

      const sampleRate = this.parseSampleRate(queued.mimeType);
      const float32 = this.decodeBase64Pcm16ToFloat32(queued.base64Data);
      if (float32.length === 0) continue;

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.copyToChannel(new Float32Array(float32), 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startAt = Math.max(this.nextPlaybackTime, now + 0.04);
      source.start(startAt);
      this.nextPlaybackTime = startAt + audioBuffer.duration;

      source.onended = () => {
        this.activeSources = this.activeSources.filter((item) => item !== source);
        this.maybeSetListeningAfterPlayback();
      };

      this.activeSources.push(source);
    }

    this.isProcessingAudioQueue = false;
  }

  // Server auto-VAD handles turn detection.
  // Client-side barge-in only cancels local AI audio playback.
  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public handleSpeechStart() {
    this.stopAudioPlayback();
    this.setState('listening');
  }

  public handleSpeechEnd() {
    // No-op: server VAD drives state.
  }

  public getMicrophoneStreamClone(): MediaStream | null {
    if (!this.mediaStream) {
      return null;
    }

    return new MediaStream(this.mediaStream.getAudioTracks().map((track) => track.clone()));
  }

  private sendAudioChunk(int16Audio: Int16Array) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
    if (this.muted) return;  // gate: don't send audio to Gemini while muted

    const byteView = new Uint8Array(int16Audio.buffer, int16Audio.byteOffset, int16Audio.byteLength);
    this.sendRealtimeInput({
      mediaChunks: [
        {
          mimeType: 'audio/pcm;rate=16000',
          data: toBase64(byteView),
        },
      ],
    });
  }

  private buildProxyWsUrl(): string {
    const envProxyUrl = process.env.NEXT_PUBLIC_INTERVIEW_STREAM_URL;
    if (envProxyUrl) {
      const normalized = envProxyUrl.replace(/\/$/, '');
      return `${normalized}?interview_id=${encodeURIComponent(this.interviewId)}`;
    }

    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const defaultPort = process.env.NEXT_PUBLIC_INTERVIEW_STREAM_PORT || '8081';
      return `${protocol}//${host}:${defaultPort}/api/interview/stream?interview_id=${encodeURIComponent(this.interviewId)}`;
    }

    throw new Error('Unable to resolve interview stream websocket URL');
  }

  private async readSocketMessageData(data: string | Blob | ArrayBuffer): Promise<string | null> {
    if (typeof data === 'string') {
      return data;
    }

    if (data instanceof Blob) {
      return await data.text();
    }

    if (data instanceof ArrayBuffer) {
      return new TextDecoder().decode(data);
    }

    return null;
  }

  private async handleSocketMessage(event: MessageEvent<string | Blob | ArrayBuffer>) {
    try {
      const rawMessage = await this.readSocketMessageData(event.data);
      if (!rawMessage) {
        return;
      }

      const trimmedMessage = rawMessage.trim();
      if (!trimmedMessage.startsWith('{') && !trimmedMessage.startsWith('[')) {
        this.callbacks.onDebug?.({ type: 'non-json-socket-frame', preview: trimmedMessage.slice(0, 120) });
        return;
      }

      const payload = JSON.parse(trimmedMessage);
      this.callbacks.onDebug?.(payload);

      if (payload?.error) {
        this.callbacks.onError?.(String(payload.error));
      }

      const serverContent = payload?.serverContent;

      if (serverContent?.interrupted) {
        this.stopAudioPlayback();
        this.setState('listening');
      }

      // ── Play back audio chunks returned by Gemini ──────────────
      const parts: Array<{ inlineData?: { data: string; mimeType: string } }> =
        serverContent?.modelTurn?.parts ?? [];
      for (const part of parts) {
        if (part?.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) {
          this.pendingTurnComplete = false;
          this.enqueueAudioChunk(part.inlineData.data, part.inlineData.mimeType);
          this.setState('speaking');
        }
      }

      // ── Transcripts (text overlays in UI) ─────────────────────
      if (serverContent?.inputTranscription?.text) {
        this.setState('listening');
        this.callbacks.onTranscript?.('user', serverContent.inputTranscription.text);
      }

      if (serverContent?.outputTranscription?.text) {
        this.setState('speaking');
        this.callbacks.onTranscript?.('ai', serverContent.outputTranscription.text);
      }

      // "turnComplete" is the correct field name in the Gemini Live protocol
      if (serverContent?.turnComplete) {
        this.pendingTurnComplete = true;
        this.maybeSetListeningAfterPlayback();
      }

      if (payload?.goAway) {
        this.callbacks.onError?.('Gemini Live session is closing soon (go_away).');
      }
    } catch (error) {
      this.callbacks.onError?.(`Live message parse error: ${String(error)}`);
    }
  }

  private async startMicrophoneLoop(vadThreshold: number, hangoverMs: number, chunkIntervalMs: number) {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });

    this.audioContext = new AudioContext();

    // Load the AudioWorklet processor from the public folder.
    // Using AudioWorkletNode replaces the deprecated ScriptProcessorNode and
    // processes audio on a dedicated real-time thread without routing mic audio
    // back to speakers (numberOfOutputs:0 makes it a true sink).
    await this.audioContext.audioWorklet.addModule('/audio-processor.js');

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor', {
      numberOfOutputs: 0, // sink — audio stays off speakers
      processorOptions: { targetChunkMs: chunkIntervalMs },
    });

    this.workletNode.port.onmessage = (event: MessageEvent<{ type: string; data: Int16Array }>) => {
      if (event.data?.type !== 'pcm16') return;
      const pcm16 = event.data.data;

      if (!pcm16 || pcm16.length === 0) return;

      // Client-side RMS tracking for isSpeaking state
      let sumSquares = 0;
      for (let index = 0; index < pcm16.length; index++) {
        const sample = pcm16[index] / 0x8000;
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / pcm16.length);
      const now = performance.now();
      if (rms >= vadThreshold) {
        this.lastSpeechAt = now;
        if (!this.isSpeaking) this.isSpeaking = true;
      } else if (this.isSpeaking && now - this.lastSpeechAt >= hangoverMs) {
        this.isSpeaking = false;
      }

      // Stream worklet-converted 16 kHz PCM to Gemini — server VAD decides turns.
      this.sendAudioChunk(pcm16);
    };

    this.sourceNode.connect(this.workletNode);
    // No connection to destination needed; numberOfOutputs:0 keeps it alive as a sink
  }

  async connect() {
    try {
      this.setState('connecting');

      // ── Step 1: Fetch session config from Next.js (browser has auth cookies) ──
      const sessionRes = await fetch('/api/interview/live/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ interview_id: this.interviewId }),
      });
      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Session fetch failed (${sessionRes.status})`);
      }
      const { systemInstruction, initialPrompt } = await sessionRes.json() as {
        systemInstruction?: string; initialPrompt?: string;
      };

      // ── Step 2: Open WebSocket to proxy ──────────────────────────────────────
      const wsUrl = this.buildProxyWsUrl();
      const ws = new WebSocket(wsUrl);
      this.websocket = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('Interview stream websocket failed to connect'));
      });

      // ── Step 3: Send init frame so proxy can connect to Gemini ───────────────
      ws.send(JSON.stringify({
        type: 'init',
        systemInstruction: systemInstruction ?? '',
        initialPrompt: initialPrompt ?? '',
      }));

      ws.onmessage = (event) => {
        void this.handleSocketMessage(event);
      };
      ws.onclose = () => {
        this.setState('closed');
      };

      await this.startMicrophoneLoop(
        this.options.rmsThreshold,
        this.options.silenceHangoverMs,
        this.options.chunkIntervalMs
      );

      this.setState('connected');
      this.setState('listening');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start live session';
      this.callbacks.onError?.(message);
      this.setState('error');
      await this.disconnect();
      throw error;
    }
  }

  async sendText(text: string) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN || !text.trim()) {
      return;
    }

    this.websocket.send(
      JSON.stringify({
        realtimeInput: {
          text,
        },
      })
    );
  }

  async disconnect() {
    this.workletNode?.port.close();
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }

    // Stop all scheduled AI audio
    this.stopAudioPlayback();
    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      await this.playbackContext.close().catch(() => {});
    }
    this.playbackContext = null;

    this.mediaStream?.getTracks().forEach((track) => track.stop());

    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close(1000, 'Client disconnected');
    }

    this.workletNode = null;
    this.sourceNode = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.websocket = null;
    this.isSpeaking = false;
    this.setState('closed');
  }
}

export const createGeminiLiveClient = (
  interviewId: string,
  callbacks: LiveCallbacks = {},
  options: LiveClientOptions = {}
) => new GeminiLiveClient(interviewId, callbacks, options);
