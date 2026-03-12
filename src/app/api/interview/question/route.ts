import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request
    const body = await req.json();
    const { interview_id } = body;

    if (!interview_id) {
      return NextResponse.json({ error: "Missing interview_id" }, { status: 400 });
    }

    // 3. Fetch interview session
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("id, gemini_cache_id, user_id")
      .eq("id", interview_id)
      .eq("user_id", user.id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const rawCacheId = interview.gemini_cache_id as string | undefined;

    if (!rawCacheId) {
      return NextResponse.json({ error: "Gemini cache not initialized" }, { status: 500 });
    }

    // 4. Call Gemini — handle both cached and inline-context modes
    const apiKey = process.env.GEMINI_API_KEY;
    const isDirect = rawCacheId.startsWith("direct|||");

    let geminiRequestBody: object;
    let cacheModel: string;

    if (isDirect) {
      // Format: "direct|||modelName|||base64(JSON context)"
      const parts = rawCacheId.split("|||");
      cacheModel = parts[1] ?? "gemini-2.0-flash";
      const ctx = JSON.parse(Buffer.from(parts[2] ?? "", "base64").toString("utf-8")) as {
        systemPrompt: string;
        resumeText: string;
        jobDescription: string;
      };

      geminiRequestBody = {
        systemInstruction: { parts: [{ text: ctx.systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: `CANDIDATE RESUME:\n${ctx.resumeText}\n\n---\n\nJOB DESCRIPTION:\n${ctx.jobDescription}` }
            ]
          },
          {
            role: "model",
            parts: [{ text: "Understood. I have reviewed the resume and job description. I am ready to begin the interview." }]
          },
          {
            role: "user",
            parts: [{ text: "Start the interview. Ask the first question based on the candidate resume and job description." }]
          }
        ]
      };
    } else {
      // Format: "modelName|||cacheName"
      const separatorIdx = rawCacheId.indexOf("|||");
      cacheModel = separatorIdx !== -1 ? rawCacheId.slice(0, separatorIdx) : "gemini-2.0-flash";
      const geminiCacheId = separatorIdx !== -1 ? rawCacheId.slice(separatorIdx + 3) : rawCacheId;

      geminiRequestBody = {
        cachedContent: geminiCacheId,
        contents: [
          {
            role: "user",
            parts: [{ text: "Start the interview. Ask the first question based on the candidate resume and job description." }]
          }
        ]
      };
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cacheModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiRequestBody)
      }
    );

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      console.error("Gemini Error:", err);
      return NextResponse.json({ error: "Gemini request failed" }, { status: 500 });
    }

    const geminiData = await geminiResponse.json();

    const question =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Tell me about yourself.";

    // 5. Save question to transcripts
    const { error: transcriptError } = await supabase
      .from("transcripts")
      .insert({
        interview_id: interview_id,
        role: "interviewer",
        content: question
      });

    if (transcriptError) {
      console.error("Transcript insert error:", transcriptError);
    }

    // 6. Return question
    return NextResponse.json({
      question
    });

  } catch (error) {
    console.error("Question API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}