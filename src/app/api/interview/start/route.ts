import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Models that support context caching, in order of preference
const CACHE_MODEL_CANDIDATES = [
  process.env.GEMINI_INTERVIEW_MODEL,
  "gemini-2.0-flash-001",
  "gemini-2.0-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-pro-001",
].filter((m): m is string => Boolean(m));

async function findCachingModel(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };

    const available = new Set(
      (payload.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes("createCachedContent"))
        .map((m) => m.name?.replace(/^models\//, ""))
        .filter(Boolean) as string[]
    );

    return CACHE_MODEL_CANDIDATES.find((m) => available.has(m)) ?? null;
  } catch {
    return null;
  }
}

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

    const cacheModel = await findCachingModel(apiKey);
    if (!cacheModel) {
      return NextResponse.json(
        { error: "No Gemini model available for context caching on this API key" },
        { status: 503 }
      );
    }

    const cachePayload = {
      model: `models/${cacheModel}`,
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

    // 6. Attempt Gemini CachedContents API; fall back to inline context if content is too small
    const cacheResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cachePayload)
    });

    let geminiCacheId: string;

    if (!cacheResponse.ok) {
      const errorText = await cacheResponse.text();
      console.warn("Gemini Cache API Error:", errorText);

      let isTooSmall = false;
      try {
        isTooSmall = JSON.parse(errorText)?.error?.message?.includes("too small") ?? false;
      } catch { /* ignore */ }

      if (!isTooSmall) {
        // Genuine cache failure — surface the error
        return NextResponse.json({ error: "Failed to initialize Gemini Context Cache" }, { status: cacheResponse.status });
      }

      // Content too small for caching — store context inline instead
      console.log("Content too small for Gemini cache; using inline context fallback");
      const inlineContext = Buffer.from(
        JSON.stringify({
          systemPrompt: personaPrompt,
          resumeText: resumeRecord.parsed_text,
          jobDescription: job_description,
        })
      ).toString("base64");

      geminiCacheId = `direct|||${cacheModel}|||${inlineContext}`;
    } else {
      const cacheData = await cacheResponse.json();
      // Store as "modelName|||cacheName" so question/respond routes use the same model
      geminiCacheId = `${cacheModel}|||${cacheData.name}`;
    }

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
