import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, interview_id } = body;
    const supabase = await createClient();

    console.log("[proctor] received request for interview_id:", interview_id);

    if (!image || !interview_id) {
      console.error("[proctor] missing image or interview_id");
      return NextResponse.json(
        { error: "Missing image or interview_id" },
        { status: 400 }
      );
    }

    const base64 = image.split(",")[1];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `
You are an AI interview proctor.

Analyze the image and determine:
- Is the candidate looking at the screen?
- Is a phone visible?
- Are multiple people visible?
- Is the candidate absent?
- Do a behavioral analysis of the candidate.
- Is the candidate's face visible properly?
- Adjustments needed for the candidate to be able to see the screen?

Return ONLY JSON:

{
  "lookingAway": boolean,
  "phoneDetected": boolean,
  "multiplePeople": boolean,
  "notes": string,
  "behavioralAnalysis": string,
  "faceVisible": boolean,
  "adjustmentsNeeded": string
}
`,
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`[proctor] Gemini API failed with status ${response.status}:`, text);

      if (response.status === 429) {
        return NextResponse.json(
          { error: "Gemini quota exceeded. Please wait a moment.", status: 429 },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "Gemini API failed", status: response.status, details: text },
        { status: 500 }
      );
    }

    const geminiData = await response.json();
    console.log("[proctor] Gemini Response Data:", JSON.stringify(geminiData).slice(0, 500));

    const textResponse =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!textResponse) {
      console.error("[proctor] Gemini returned empty text. FinishReason:", geminiData?.candidates?.[0]?.finishReason);
      return NextResponse.json(
        { error: "Gemini returned no analysis", details: geminiData },
        { status: 500 }
      );
    }

    let analysis;

    try {
      const cleaned = textResponse.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Gemini JSON", raw: textResponse },
        { status: 500 }
      );
    }

    // Generate warnings based on analysis
    const warnings: string[] = [];

    if (analysis.lookingAway) {
      warnings.push("Please keep your eyes on the screen.");
    }

    if (analysis.phoneDetected) {
      warnings.push("Phone detected. Please remove it from the desk.");
    }

    if (analysis.multiplePeople) {
      warnings.push("Multiple people detected in the frame.");
    }

    if (!analysis.faceVisible) {
      warnings.push("Your face is not clearly visible.");
    }

    if (analysis.adjustmentsNeeded) {
      warnings.push(`Adjustment needed: ${analysis.adjustmentsNeeded}`);
    }
    if (warnings.length > 0) {
      const flags = [];

      if (analysis.lookingAway) {
        flags.push({
          interview_id,
          flag_type: "LOOKING_AWAY",
          reason: analysis.notes || "Candidate looked away from screen"
        });
      }

      if (analysis.phoneDetected) {
        flags.push({
          interview_id,
          flag_type: "PHONE_DETECTED",
          reason: "Phone detected in frame"
        });
      }

      if (analysis.multiplePeople) {
        flags.push({
          interview_id,
          flag_type: "MULTIPLE_PEOPLE",
          reason: "Multiple people detected"
        });
      }

      if (!analysis.faceVisible) {
        flags.push({
          interview_id,
          flag_type: "FACE_NOT_VISIBLE",
          reason: "Candidate face not visible"
        });
      }

      if (flags.length > 0) {
        const { error: dbError } = await supabase
          .from("proctoring_flags")
          .insert(flags);

        if (dbError) {
          console.error("Proctoring flag insert error:", dbError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      warnings,
      model: "gemini-2.5-flash-lite"
    });

  } catch (error: any) {
    console.error("[proctor] Internal Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Unknown error occurred",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
