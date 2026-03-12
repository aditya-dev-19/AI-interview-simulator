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

  const sessions = data.map((session: any) => {
    const trustScore = Math.max(100 - session.flag_count * 10, 50);

    return {
      id: session.id,
      role: session.role,
      track: session.track,
      overallScore: session.overall_score,
      flagCount: session.flag_count,
      trustScore,
      status: session.status,
      created_at: session.created_at
    };
  });

  return NextResponse.json({ sessions });
}