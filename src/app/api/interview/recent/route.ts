import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .rpc("get_recent_sessions", { user_id_input: user.id });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const sessions = data.map((session: any) => {
    const trustScore = Math.max(100 - session.flag_count * 10, 50);

    return {
      id: session.id,
      role: session.role,
      overall: session.overall_score,
      trustScore,
      created_at: session.created_at
    };
  });

  return NextResponse.json({ sessions });
}