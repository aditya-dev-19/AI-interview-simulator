import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ sessions: [] });
  }

  const { data, error } = await supabase.rpc("get_recent_sessions", {
    user_id_input: user.id
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  // Fetch feedback_json so we can use confidenceMetrics as trustScore (matches feedback page)
  const sessionIds = (data || []).map((s: any) => s.id);
  const feedbackMap: Record<string, number | null> = {};

  if (sessionIds.length > 0) {
    const { data: feedbackRows } = await supabase
      .from("interviews")
      .select("id, feedback_json")
      .in("id", sessionIds);

    for (const row of feedbackRows || []) {
      const confidence = row.feedback_json?.skillBreakdown?.confidenceMetrics;
      feedbackMap[row.id] = typeof confidence === "number" ? confidence : null;
    }
  }

  const sessions = (data || []).map((session: any) => {
    // Prefer AI-evaluated confidenceMetrics (same value shown on feedback page),
    // fall back to flag-count formula for sessions without completed evaluation
    const trustScore =
      feedbackMap[session.id] != null
        ? feedbackMap[session.id]!
        : Math.max(100 - session.flag_count * 10, 50);

    return {
      id: session.id,
      role: session.role,
      track: session.track,
      overallScore: session.overall_score,
      overall: session.overall_score,
      flagCount: session.flag_count,
      trustScore,
      status: session.status,
      created_at: session.created_at
    };
  });

  // Fetch the latest completed session for the full JSON analytics panel
  const { data: latestSessionData } = await supabase
    .from("interviews")
    .select("overall_score, feedback_json")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const latestSession = latestSessionData ? {
    overallScore: latestSessionData.overall_score,
    feedback_json: latestSessionData.feedback_json
  } : null;

  return NextResponse.json({ sessions, latestSession });
}