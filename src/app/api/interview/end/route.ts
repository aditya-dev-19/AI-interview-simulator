import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SYSTEM_PROMPT = `You are an expert technical recruiter and career coach. I am providing you with the full transcript of a candidate's interview, along with a list of 'Proctoring Flags' (moments they looked away from the camera or were distracted). 

Evaluate the candidate deeply. You must return your evaluation STRICTLY as a JSON object matching this exact structure, with no markdown formatting outside the JSON:
{
  "overallScore": <number 0-100>,
  "skillBreakdown": {
    "technicalAccuracy": <number 0-100>,
    "communicationClarity": <number 0-100>,
    "confidenceMetrics": <number 0-100, heavily penalize this if there are many proctoring flags>
  },
  "feedback": {
    "strengths": [
      { "title": "<Short Title, e.g., Contextualization>", "description": "<1 sentence explanation>" }
    ],
    "improvements": [
      { "title": "<Short Title, e.g., Tangible Metrics>", "description": "<1 sentence explanation incorporating transcript and proctoring feedback>" }
    ]
  },
  "trendAnalysis": {
    "scoreDropReason": "<1-2 sentences explaining the biggest mistake or reason they didn't score 100>",
    "actionableTip": "<1-2 sentences with a concrete tip for their next interview>"
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { interview_id } = body;

    if (!interview_id) {
      return NextResponse.json({ error: "Missing required field: interview_id" }, { status: 400 });
    }

    // 3. Fetch Data (Transcripts and Proctoring Flags)
    const { data: transcripts, error: transcriptsError } = await supabase
      .from("transcripts")
      .select("role, content")
      .eq("interview_id", interview_id)
      .order("created_at", { ascending: true });

    if (transcriptsError) {
      console.error("Error fetching transcripts:", transcriptsError);
      return NextResponse.json({ error: "Failed to fetch transcripts" }, { status: 500 });
    }

    const { data: flags, error: flagsError } = await supabase
      .from("proctoring_flags")
      .select("flag_type, reason, timestamp")
      .eq("interview_id", interview_id)
      .order("timestamp", { ascending: true });

    if (flagsError) {
      console.error("Error fetching proctoring flags:", flagsError);
      return NextResponse.json({ error: "Failed to fetch proctoring flags" }, { status: 500 });
    }

    // Format Transcript
    const formattedTranscript = (transcripts || [])
      .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
      .join("\n\n");

    // Format Proctoring Flags
    let formattedFlags = "No proctoring flags recorded.";
    if (flags && flags.length > 0) {
      formattedFlags = flags
        .map((f) => `FLAG (${f.flag_type}): ${f.reason} at ${f.timestamp}`)
        .join("\n");
    }

    // 4. Call Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const geminiModel = "gemini-2.5-pro"; // Advanced reasoning model
    const geminiRequestBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: `TRANSCRIPT:\n${formattedTranscript}\n\n---\n\nPROCTORING FLAGS:\n${formattedFlags}\n\nProvide the evaluation JSON.` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    let geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiRequestBody)
      }
    );

    if (!geminiResponse.ok) {
      // Try fallback to standard model if 2.5-pro is unavailable or errors out
      console.warn("Gemini 2.5 Pro failed, falling back to gemini-2.5-flash");
      const fallbackModel = "gemini-2.5-flash";
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiRequestBody)
        }
      );

      if (!geminiResponse.ok) {
        const err = await geminiResponse.text();
        console.error("Gemini generation failed (fallback):", err);
        return NextResponse.json({ error: "Failed to generate interview analysis" }, { status: 500 });
      }
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return NextResponse.json({ error: "No response from AI model" }, { status: 500 });
    }

    // Parse the JSON
    let evaluationJson;
    try {
      evaluationJson = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON:", parseError, responseText);
      return NextResponse.json({ error: "Invalid JSON from AI model" }, { status: 500 });
    }

    const overallScore = evaluationJson.overallScore || 0;

    // 5. Update Database
    const { error: updateError } = await supabase
      .from("interviews")
      .update({
        status: 'completed',
        overall_score: overallScore,
        feedback_json: evaluationJson
      })
      .eq("id", interview_id)
      .eq("user_id", user.id); // Ensure user owns the interview record being updated

    if (updateError) {
      console.error("Error updating interview status:", updateError);
      return NextResponse.json({ error: "Failed to save final interview evaluation" }, { status: 500 });
    }

    // 6. Return Data
    return NextResponse.json({
      success: true,
      evaluation: evaluationJson
    });

  } catch (error) {
    console.error("Interview end API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
