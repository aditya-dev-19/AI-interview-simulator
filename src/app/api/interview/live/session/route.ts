import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const PERSONAS: Record<string, string> = {
  software:
    "You are a senior engineering manager conducting a technical and behavioral interview for a Software Engineering role. Focus on algorithms, system design, and coding best practices.",
  cyber:
    "You are a Chief Information Security Officer (CISO) conducting an interview for a Cybersecurity role. Focus on security principles, threat modeling, and incident response.",
  data:
    "You are a Lead Data Scientist conducting a technical interview. Focus on statistics, machine learning algorithms, and data wrangling.",
  hr: "You are an HR Director conducting a behavioral interview. Focus on cultural fit, conflict resolution, and soft skills.",
  default:
    "You are an expert technical recruiter conducting a professional interview. Ask relevant, challenging questions based on the candidate's experience and the target job description.",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const interviewId = body?.interview_id as string | undefined;

    if (!interviewId) {
      return NextResponse.json({ error: "Missing interview_id" }, { status: 400 });
    }

    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("id, resume_id, track, user_id")
      .eq("id", interviewId)
      .eq("user_id", user.id)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("parsed_text")
      .eq("id", interview.resume_id)
      .eq("user_id", user.id)
      .single();

    if (resumeError || !resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const track = interview.track || "default";
    const persona = PERSONAS[track] || PERSONAS.default;
    const resumeText = (resume.parsed_text || "").slice(0, 24000);

    const systemInstruction =
      `${persona}\n\n` +
      "Use this candidate context throughout the interview:\n" +
      `CANDIDATE RESUME:\n${resumeText}\n\n` +
      "Ask one question at a time, wait for user response, and keep answers concise.";

    const initialPrompt =
      "Introduce yourself as Sarah, the senior recruiter, and ask the first question " +
      "based on the resume and job description information provided in your context. " +
      "Start the interview naturally.";

    // Return session config for the browser. The browser sends this to the
    // proxy as the first WebSocket message so the proxy never needs to call
    // Next.js itself (avoiding the same-process Turbopack hang).
    return NextResponse.json({
      systemInstruction,
      initialPrompt,
      vad: {
        enabled: true,
        threshold: 0.015,
        hangoverMs: 350,
      },
    });
  } catch (error) {
    console.error("Live session bootstrap error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
