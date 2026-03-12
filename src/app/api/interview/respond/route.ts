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
    const { interview_id, answer } = body;

    if (!interview_id || !answer) {
      return NextResponse.json(
        { error: "Missing interview_id or answer" },
        { status: 400 }
      );
    }

    // 3. Store candidate answer
    const { error: insertAnswerError } = await supabase
      .from("transcripts")
      .insert({
        interview_id,
        role: "candidate",
        content: answer
      });

    if (insertAnswerError) {
      console.error(insertAnswerError);
      return NextResponse.json(
        { error: "Failed to save candidate answer" },
        { status: 500 }
      );
    }

    // 4. Fetch interview session
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("gemini_cache_id, user_id")
      .eq("id", interview_id)
      .eq("user_id", user.id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: "Interview session not found" },
        { status: 404 }
      );
    }

    const rawCacheId = interview.gemini_cache_id as string | undefined;

    // 5. Fetch conversation history
    const { data: transcripts, error: transcriptError } = await supabase
      .from("transcripts")
      .select("role, content")
      .eq("interview_id", interview_id)
      .order("created_at", { ascending: true });

    if (transcriptError) {
      console.error(transcriptError);
      return NextResponse.json(
        { error: "Failed to fetch transcripts" },
        { status: 500 }
      );
    }

    // 6. Convert transcript history for Gemini
    const conversationText = transcripts
      .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
      .join("\n");

    // 7. Ask Gemini for next question — handle both cached and inline-context modes
    const apiKey = process.env.GEMINI_API_KEY;
    const isDirect = rawCacheId?.startsWith("direct|||") ?? false;

    let cacheModel: string;
    let geminiRequestBody: object;

    if (isDirect) {
      // Format: "direct|||modelName|||base64(JSON context)"
      const parts = (rawCacheId as string).split("|||");
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
            parts: [
              {
                text:
                  "Here is the interview conversation so far:\n\n" +
                  conversationText +
                  "\n\nAsk the next interview question."
              }
            ]
          }
        ]
      };
    } else {
      // Format: "modelName|||cacheName"
      const separatorIdx = rawCacheId?.indexOf("|||") ?? -1;
      cacheModel = separatorIdx !== -1 ? rawCacheId!.slice(0, separatorIdx) : "gemini-2.0-flash";
      const cacheId = separatorIdx !== -1 ? rawCacheId!.slice(separatorIdx + 3) : rawCacheId;

      geminiRequestBody = {
        cachedContent: cacheId,
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Here is the interview conversation so far:\n\n" +
                  conversationText +
                  "\n\nAsk the next interview question."
              }
            ]
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
      console.error("Gemini error:", err);
      return NextResponse.json(
        { error: "Gemini generation failed" },
        { status: 500 }
      );
    }

    const geminiData = await geminiResponse.json();

    const nextQuestion =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Can you elaborate on that experience?";

    // 8. Store next interviewer question
    await supabase.from("transcripts").insert({
      interview_id,
      role: "interviewer",
      content: nextQuestion
    });

    // 9. Return next question
    return NextResponse.json({
      question: nextQuestion
    });

  } catch (error) {
    console.error("Respond API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}