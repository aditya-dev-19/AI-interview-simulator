import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/gemini  — server-side Gemini proxy
 *
 * WHY this route exists:
 *   Next.js exposes any env variable prefixed with NEXT_PUBLIC_ to the browser.
 *   The Gemini API key must stay secret, so it is stored without that prefix
 *   (GEMINI_API_KEY) and accessed only here, on the server.
 *
 *   The client-side helper (src/lib/gemini.ts) calls this route instead of
 *   calling Google directly, so the API key is never bundled into JavaScript
 *   that gets sent to the browser.
 *
 * Required environment variable (set in .env.local — never commit that file):
 *   GEMINI_API_KEY=<your Google Gemini API key>
 */

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  try {
    const { prompt, systemPrompt } = await req.json();

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt || "You are an expert technical recruiter." }] }
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: "Error generating content. Please try again." }, { status: 500 });
  }
}
