import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const base64 = image.split(",")[1];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

      return NextResponse.json(
        { error: "Gemini API failed", details: text },
        { status: 500 }
      );
    }

    const geminiData = await response.json();

    const textResponse =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let analysis;

    try {
    analysis = JSON.parse(textResponse);
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

    return NextResponse.json({
    success: true,
    analysis,
    warnings
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}