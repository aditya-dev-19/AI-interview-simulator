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
