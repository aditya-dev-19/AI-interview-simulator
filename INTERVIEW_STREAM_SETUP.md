# Interview Stream WebSocket Proxy

## Overview

The interview live audio feature uses a **WebSocket proxy server** to relay real-time audio between your browser and Google's Gemini Multimodal Live API. This decouples the browser connection from Gemini's backend, allowing:

- Seamless session bootstrap with authentication (cookies forwarded from browser → proxy → Next.js session endpoint)
- Bidirectional audio streaming with PCM encoding
- Automatic session management (ephemeral tokens, VAD, turn-taking)
- Clean error reporting back to the client

## Architecture

```
Browser (GeminiLiveClient)
        │
        │ WebSocket (PCM audio chunks)
        ▼
Proxy Server (/server/interview-stream-proxy.mjs)
        │
        ├─ [1st request] Bootstrap: POST /api/interview/live/session (with cookies)
        │                ↓
        │               Next.js API Route (auth, resume lookup, token generation)
        │
        └─ [2nd] WebSocket to Gemini Live API
                 ↓
            wss://generativelanguage.googleapis.com/...
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

The package.json already includes `ws@^8.18.3` for the proxy server.

### 2. Environment Variables

Add these to your `.env.local`:

```bash
# Optional: Configure proxy connection in dev
NEXT_PUBLIC_INTERVIEW_STREAM_URL=ws://localhost:8081/api/interview/stream
NEXT_PUBLIC_INTERVIEW_STREAM_PORT=8081
```

**Note:** These are optional. If not set, the client defaults to `ws://localhost:8081`.

### 3. Run Both Services

**Option A: Two terminals**

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run dev:proxy
```

**Option B: Single command (backgrounded)**

```bash
npm run dev:all
```

### 4. Verify Connection

- Next.js dev server should be listening on `http://localhost:3000`
- Proxy server should log: `[interview-stream-proxy] listening on :8081`
- During an interview, check browser DevTools → Network → WS for a connection to `ws://localhost:8081/api/interview/stream?interview_id=...`

## How It Works

### Session Bootstrap

1. Browser calls `GeminiLiveClient.connect()`
2. Client opens WS to local proxy at `/api/interview/stream?interview_id=<id>`
3. Proxy:
   - Forwards auth cookies from the browser to your Next.js `/api/interview/live/session` endpoint
   - Gets back ephemeral token, model name, and Gemini WebSocket URL
   - Opens **second** WebSocket to Gemini (authenticated with the ephemeral token)

### Audio Relay

- **Browser → Proxy** (via first WebSocket):
  - JSON frames with `{ realtimeInput: { mediaChunks: [...] } }`
  - PCM-16 audio chunks base64-encoded
- **Proxy → Gemini** (via second WebSocket):
  - Forwards raw JSON frames
- **Gemini → Proxy** (via second WebSocket):
  - Sends back transcripts, audio chunks, turn signals
- **Proxy → Browser**:
  - Forwards all responses to the client

### Error Handling

- If session bootstrap fails → proxy sends `{ error: "..." }` and closes
- If Gemini disconnects → proxy closes browser connection
- If browser disconnects → proxy closes Gemini connection cleanly

## Client Integration (Already Done)

The `GeminiLiveClient` class in `src/lib/gemini.ts` is pre-configured to:

1. Build proxy URL via `buildProxyWsUrl()` (respects env vars)
2. Skip sending setup message (proxy handles it)
3. Stream PCM audio directly
4. Listen for transcripts and audio responses

**No changes needed in your interviewer components** — they already use `GeminiLiveClient`.

## Production Deployment

For production, run the proxy alongside your Next.js server:

```bash
# Example with PM2
pm2 start server/interview-stream-proxy.mjs --name interview-stream-proxy
pm2 start npm -- run start --name my-app

# Set environment in .env or your deployment platform
NEXT_INTERNAL_BASE_URL=http://127.0.0.1:3000
INTERVIEW_STREAM_PROXY_PORT=8081
NEXT_PUBLIC_INTERVIEW_STREAM_URL=wss://yourdomain.com/api/interview/stream
```

Or containerize both services together:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci
EXPOSE 3000 8081
CMD ["sh", "-c", "npm start & node server/interview-stream-proxy.mjs"]
```

## Troubleshooting

| Issue | Solution |
|---|---|
| "Failed to connect to interview stream" | Ensure proxy (port 8081) is running and accessible |
| "Missing interview_id" | Browser must send `?interview_id=<uuid>` in WS URL |
| "Session bootstrap failed" | Check that Next.js `/api/interview/live/session` is returning valid token |
| "Gemini websocket failed to connect" | Verify GEMINI_API_KEY is set and valid |
| CORS / "Connection refused" | If running on different machines, set `NEXT_PUBLIC_INTERVIEW_STREAM_URL` to proxy's external URL |
