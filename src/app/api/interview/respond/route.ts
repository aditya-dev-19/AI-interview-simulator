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

    const cacheId = interview.gemini_cache_id;

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

    // 7. Ask Gemini for next question
    const apiKey = process.env.GEMINI_API_KEY;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
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
        })
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