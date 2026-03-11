import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const PERSONAS: Record<string, string> = {
  software: "You are a senior engineering manager conducting a technical and behavioral interview for a Software Engineering role. Focus on algorithms, system design, and coding best practices.",
  cyber: "You are a Chief Information Security Officer (CISO) conducting an interview for a Cybersecurity role. Focus on security principles, threat modeling, and incident response.",
  data: "You are a Lead Data Scientist conducting a technical interview. Focus on statistics, machine learning algorithms, and data wrangling.",
  hr: "You are an HR Director conducting a behavioral interview. Focus on cultural fit, conflict resolution, and soft skills.",
  default: "You are an expert technical recruiter conducting a professional interview. Ask relevant, challenging questions based on the candidate's experience and the target job description."
};

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
    const { resume_id, job_description, track } = body;

    if (!resume_id || !job_description) {
      return NextResponse.json({ error: "Missing required fields: resume_id or job_description" }, { status: 400 });
    }

    const selectedTrack = track || "default";

    // 3. Fetch parsed resume text from Supabase
    const { data: resumeRecord, error: dbError } = await supabase
      .from("resumes")
      .select("parsed_text, id")
      .eq("id", resume_id)
      .eq("user_id", user.id)
      .single();

    if (dbError || !resumeRecord) {
      console.error("Error fetching resume:", dbError);
      return NextResponse.json({ error: "Resume not found or access denied" }, { status: 404 });
    }

    // 4. Construct Gemini Persona Prompt
    const personaPrompt = PERSONAS[selectedTrack] || PERSONAS.default;

    // 5. Build context payload for Gemini Caching API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const cachePayload = {
      model: "models/gemini-1.5-flash-001",
      contents: [
        {
          role: "user",
          parts: [
            { text: "CANDIDATE RESUME:\\n" + resumeRecord.parsed_text + "\\n\\n---" },
            { text: "\\n\\nJOB DESCRIPTION:\\n" + job_description }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          { text: personaPrompt }
        ]
      },
      ttl: "3600s" // 1 hour expiration
    };

    // 6. Make POST request to Gemini CachedContents API
    const cacheResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cachePayload)
    });

    if (!cacheResponse.ok) {
      const errorData = await cacheResponse.text();
      console.error("Gemini Cache API Error:", errorData);
      return NextResponse.json({ error: "Failed to initialize Gemini Context Cache" }, { status: cacheResponse.status });
    }

    const cacheData = await cacheResponse.json();
    const geminiCacheId = cacheData.name; // This is the ID we use in subsequent requests

    // 7. Store the Initialized Session in Supabase `interviews` table
    const { data: interviewRecord, error: insertError } = await supabase
      .from("interviews")
      .insert({
        user_id: user.id,
        resume_id: resumeRecord.id,
        track: selectedTrack,
        gemini_cache_id: geminiCacheId,
        status: "ongoing"
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting interview record:", insertError);
      return NextResponse.json({ error: "Failed to create interview session record" }, { status: 500 });
    }

    // 8. Return successful session info to client
    return NextResponse.json({ 
      success: true, 
      interview_id: interviewRecord.id, 
      cache_id: geminiCacheId 
    }, { status: 201 });

  } catch (error) {
    console.error("Interview start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
