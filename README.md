# AI Interview Simulator

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). It forms the base for an AI Interview Simulator web application.

## Technologies Used

*   **Framework:** Next.js (App Router)
*   **Styling:** Tailwind CSS v4
*   **UI Components:** Shadcn UI
*   **Language:** TypeScript

## Getting Started

### Prerequisites

*   Node.js (18+ recommended)
*   npm

### Installation

1.  Clone the repository or open the project folder.
2.  Install all required dependencies:

```bash
npm install
```

3.  Set up your environment variables (see [Environment Variables](#environment-variables) below).

### Running the Development Server

Start the application locally:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.
The application's API endpoints can be found in the `src/app/api` directory.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values. `.env.local` is git-ignored so your secrets are never committed.

```bash
cp .env.example .env.local
```

| Variable | Required | Exposed to browser? | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | ❌ No | Google Gemini API key. **Server-side only.** |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ Yes (safe) | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ Yes (safe) | Your Supabase anonymous/public key. |

### Why `GEMINI_API_KEY` and not `NEXT_PUBLIC_GEMINI_API_KEY`?

Next.js has two kinds of environment variables:

| Prefix | Where it lives | Who can see it |
|---|---|---|
| `NEXT_PUBLIC_*` | Bundled into client-side JavaScript | **Anyone** who opens DevTools in a browser |
| *(no prefix)* | Server process only | Only your server code |

The Gemini key is a **secret credential** — if it leaks, anyone can charge API calls to your account. That is why it must **not** use the `NEXT_PUBLIC_` prefix.

### How the Gemini API call is secured (two-layer architecture)

```
Browser / React component
        │
        │  POST /api/gemini  (internal, no secret in the request)
        ▼
Next.js API Route  ──  src/app/api/gemini/route.ts
        │
        │  reads GEMINI_API_KEY from server environment (never leaves the server)
        │  POST https://generativelanguage.googleapis.com/...?key=<secret>
        ▼
Google Gemini API
```

**Files involved:**

| File | Role |
|---|---|
| `src/lib/gemini.ts` | Client-safe helper. Calls the internal `/api/gemini` route — no secret key here. |
| `src/app/api/gemini/route.ts` | **Server-only** Next.js API route. Reads `GEMINI_API_KEY` from the server environment and forwards the request to Google. The secret never reaches the browser. |
| `.env.example` | Template showing every required variable with explanations. |
| `.env.local` *(git-ignored)* | Your actual secrets. Never commit this file. |
