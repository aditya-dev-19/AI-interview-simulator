import { NextRequest, NextResponse } from 'next/server';

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
