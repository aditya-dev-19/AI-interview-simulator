import http from 'node:http';
import process from 'node:process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

// ── Load .env.local so GEMINI_API_KEY is available without a Next.js call ──
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const { config } = await import('dotenv');
  config({ path: resolve(__dirname, '..', '.env.local'), override: false });
} catch { /* dotenv unavailable — rely on shell env */ }

const PROXY_PORT = Number(process.env.INTERVIEW_STREAM_PROXY_PORT || 8081);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
const GEMINI_WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

if (!GEMINI_API_KEY) {
  console.error('[proxy] FATAL: GEMINI_API_KEY not set. Add it to .env.local or your environment.');
  process.exit(1);
}
console.log(`[proxy] GEMINI_API_KEY loaded ✅  model: ${GEMINI_LIVE_MODEL}`);

// ── HTTP server (health check only) ─────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ noServer: true });

function safeClose(socket, code, reason) {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) socket.close(code, reason);
  } catch { /* no-op */ }
}

// ── Connect to Gemini and await setupComplete ────────────────────────────────
async function createGeminiSocket({ tag, systemInstruction }) {
  console.log(`${tag} → connecting to Gemini (${GEMINI_LIVE_MODEL})...`);

  const geminiUrl = `${GEMINI_WS_BASE}?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const geminiSocket = new WebSocket(geminiUrl);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Gemini WS open timeout (10s)')), 10000);
    geminiSocket.once('open', () => { clearTimeout(timeout); resolve(); });
    geminiSocket.once('error', (err) => { 
      clearTimeout(timeout); 
      console.error(`${tag} ❌ Gemini Socket Error:`, err);
      reject(new Error('Failed to open Gemini WebSocket')); 
    });
  });

  const setupMessage = {
    setup: {
      model: `models/${GEMINI_LIVE_MODEL}`,
      systemInstruction: {
        role: 'user',
        parts: [{ text: (systemInstruction ?? '') + '\n\nTRANSCRIPTION RULE: Always transcribe the candidate\'s speech into English, even if they speak in another language. Render all input transcriptions in English.' }],
      },
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      realtimeInputConfig: {
        activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
        turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY',
        automaticActivityDetection: {
          disabled: false,
          prefixPaddingMs: 200,
          silenceDurationMs: 500,
        },
      },
    },
  };

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Gemini setupComplete timeout (10s)')), 10000);
    const cleanup = () => {
      clearTimeout(timeout);
      geminiSocket.off('message', onMsg);
      geminiSocket.off('close', onClose);
    };
    const onClose = (code, reason) => {
      cleanup();
      console.error(`${tag} ❌ Gemini WS closed during setup: code=${code} reason=${reason?.toString()}`);
      reject(new Error(`Gemini WS closed during setup (code ${code})`));
    };
    const onMsg = (data) => {
      try {
        const msg = JSON.parse(typeof data === 'string' ? data : data.toString());
        if (msg?.setupComplete !== undefined) {
          cleanup();
          console.log(`${tag} ✅ Gemini setupComplete received`);
          resolve();
        } else if (msg?.error) {
          console.error(`${tag} ❌ Gemini setup error:`, JSON.stringify(msg.error, null, 2));
          cleanup();
          reject(new Error(`Gemini setup error: ${msg.error.message || 'Unknown error'}`));
        } else {
          console.log(`${tag} ℹ Gemini msg during setup (keys: ${typeof msg === 'object' ? Object.keys(msg).join(',') : msg})`);
        }
      } catch (err) { 
        const raw = (typeof data === 'string' ? data : data.toString()).slice(0, 200);
        console.warn(`${tag} ⚠ Non-JSON frame during setup raw:`, raw);
      }
    };
    geminiSocket.on('close', onClose);
    geminiSocket.on('message', onMsg);
    console.log(`${tag} → sending setup frame`);
    geminiSocket.send(JSON.stringify(setupMessage));
  });

  return geminiSocket;
}

// ── WebSocket session handler ────────────────────────────────────────────────
wss.on('connection', async (clientSocket, req) => {
  const requestUrl = new URL(req.url || '', `http://${req.headers.host}`);
  const interviewId = requestUrl.searchParams.get('interview_id');

  if (!interviewId) {
    clientSocket.send(JSON.stringify({ error: 'Missing interview_id query param' }));
    safeClose(clientSocket, 1008, 'Missing interview_id');
    return;
  }

  const tag = `[proxy][${interviewId.slice(0, 8)}]`;
  console.log(`${tag} 🔌 client connected`);

  // ── Step 1: Receive the init frame from the browser ──────────────────────
  // The browser fetches systemInstruction + initialPrompt from the Next.js
  // session route (using its own auth cookies), then sends them here as the
  // very first WS message. This avoids the proxy ever needing to call Next.js.
  let systemInstruction, initialPrompt;
  try {
    ({ systemInstruction, initialPrompt } = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for client init frame (10s)')), 10000
      );
      clientSocket.once('message', (data) => {
        clearTimeout(timeout);
        try {
          const msg = JSON.parse(data.toString());
          if (msg?.type !== 'init') {
            reject(new Error(`Expected init frame; got type="${msg?.type}"`));
            return;
          }
          console.log(`${tag} ✅ init frame received`);
          resolve({
            systemInstruction: msg.systemInstruction ?? '',
            initialPrompt: msg.initialPrompt ?? '',
          });
        } catch {
          reject(new Error('Failed to parse init frame'));
        }
      });
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Init failed';
    console.error(`${tag} ❌`, msg);
    clientSocket.send(JSON.stringify({ error: msg }));
    safeClose(clientSocket, 1008, msg);
    return;
  }

  // ── Step 2: Buffer subsequent client messages during Gemini setup ─────────
  const earlyMessageBuffer = [];
  const bufferMsg = (message, isBinary) => earlyMessageBuffer.push({ message, isBinary });
  clientSocket.on('message', bufferMsg);

  // ── Step 3: Connect to Gemini ─────────────────────────────────────────────
  let geminiSocket;
  try {
    geminiSocket = await createGeminiSocket({ tag, systemInstruction });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gemini setup failed';
    console.error(`${tag} ❌`, msg);
    clientSocket.send(JSON.stringify({ error: msg }));
    safeClose(clientSocket, 1011, msg);
    return;
  }

  // ── Step 4: Swap buffer for real relay, then drain ────────────────────────
  clientSocket.off('message', bufferMsg);

  let clientAudioFrames = 0;
  clientSocket.on('message', (message, isBinary) => {
    if (!geminiSocket || geminiSocket.readyState !== WebSocket.OPEN) return;
    try {
      const parsed = JSON.parse(typeof message === 'string' ? message : message.toString());
      if (parsed?.realtimeInput?.mediaChunks) {
        clientAudioFrames++;
        if (clientAudioFrames === 1 || clientAudioFrames % 50 === 0) {
          console.log(`${tag} 🎙 client→Gemini audio frame #${clientAudioFrames}`);
        }
      }
    } catch { /* relay binary or non-JSON as-is */ }
    geminiSocket.send(message, { binary: isBinary });
  });

  if (earlyMessageBuffer.length > 0) {
    console.log(`${tag} 📦 draining ${earlyMessageBuffer.length} buffered frame(s)`);
  }
  for (const { message, isBinary } of earlyMessageBuffer) {
    if (geminiSocket.readyState === WebSocket.OPEN) geminiSocket.send(message, { binary: isBinary });
  }

  // ── Step 5: Gemini → client relay with diagnostics ────────────────────────
  let geminiAudioFrames = 0;
  geminiSocket.on('message', (message, isBinary) => {
    if (clientSocket.readyState !== WebSocket.OPEN) return;
    try {
      const msg = JSON.parse(typeof message === 'string' ? message : message.toString());
      const sc = msg?.serverContent;
      if (sc?.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part?.inlineData?.mimeType?.startsWith('audio/pcm')) {
            geminiAudioFrames++;
            const bytes = Math.round((part.inlineData.data?.length ?? 0) * 0.75);
            if (geminiAudioFrames === 1 || geminiAudioFrames % 20 === 0) {
              console.log(`${tag} 🔊 Gemini→client audio frame #${geminiAudioFrames} (~${bytes}B PCM)`);
            }
          }
        }
      }
      if (sc?.turnComplete) console.log(`${tag} ✔ turnComplete (audio frames: ${geminiAudioFrames})`);
      if (sc?.interrupted) console.log(`${tag} ⚡ Gemini interrupted`);
      if (sc?.inputTranscription?.text) console.log(`${tag} 👤 user: "${sc.inputTranscription.text}"`);
      if (sc?.outputTranscription?.text) console.log(`${tag} 🤖 AI:   "${sc.outputTranscription.text}"`);
      if (msg?.error) console.warn(`${tag} ⚠ Gemini error:`, msg.error);
    } catch { /* non-JSON / binary — relay without logging */ }
    clientSocket.send(message, { binary: isBinary });
  });

  // ── Step 6: Send initial prompt so Gemini speaks first ───────────────────
  if (initialPrompt && geminiSocket.readyState === WebSocket.OPEN) {
    console.log(`${tag} 💬 sending initialPrompt`);
    geminiSocket.send(JSON.stringify({ realtimeInput: { text: initialPrompt } }));
  }

  // ── Close / error handlers ────────────────────────────────────────────────
  const closeBoth = (code, reason) => {
    safeClose(clientSocket, code, reason);
    safeClose(geminiSocket, code, reason);
  };

  clientSocket.on('close', () => {
    console.log(`${tag} 🔌 client disconnected`);
    safeClose(geminiSocket, 1000, 'Client disconnected');
  });
  clientSocket.on('error', (err) => {
    console.error(`${tag} client socket error:`, err.message);
    closeBoth(1011, 'Client websocket error');
  });
  geminiSocket.on('close', () => {
    console.log(`${tag} 🔌 Gemini disconnected`);
    safeClose(clientSocket, 1000, 'Gemini disconnected');
  });
  geminiSocket.on('error', (err) => {
    console.error(`${tag} Gemini socket error:`, err.message);
    closeBoth(1011, 'Gemini websocket error');
  });
});

// ── HTTP upgrade → WS ────────────────────────────────────────────────────────
server.on('upgrade', (req, socket, head) => {
  const requestUrl = new URL(req.url || '', `http://${req.headers.host}`);
  if (requestUrl.pathname !== '/api/interview/stream') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

server.listen(PROXY_PORT, () => {
  console.log(`[interview-stream-proxy] listening on :${PROXY_PORT}`);
});