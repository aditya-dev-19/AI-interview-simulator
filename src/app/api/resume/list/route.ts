import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    /* -------------------------
       1. Validate query params
    -------------------------- */

    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    /* -------------------------
       2. Validate UUID format
    -------------------------- */

    // const uuidRegex =
    //   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // if (!uuidRegex.test(userId)) {
    //   return NextResponse.json(
    //     { error: "Invalid userId format" },
    //     { status: 400 }
    //   );
    // }

    /* -------------------------
       3. Optional pagination
    -------------------------- */

    const limitParam = req.nextUrl.searchParams.get("limit");
    const pageParam = req.nextUrl.searchParams.get("page");

    const limit = limitParam ? parseInt(limitParam) : 10;
    const page = pageParam ? parseInt(pageParam) : 1;

    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json(
        { error: "limit must be a positive number" },
        { status: 400 }
      );
    }

    if (limit > 50) {
      return NextResponse.json(
        { error: "limit cannot exceed 50" },
        { status: 400 }
      );
    }

    if (isNaN(page) || page <= 0) {
      return NextResponse.json(
        { error: "page must be a positive number" },
        { status: 400 }
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    /* -------------------------
       4. Fetch resumes
    -------------------------- */

    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Supabase error:", error);

      return NextResponse.json(
        { error: "Failed to fetch resumes" },
        { status: 500 }
      );
    }

    /* -------------------------
       5. Handle empty results
    -------------------------- */

    if (!data || data.length === 0) {
      return NextResponse.json({
        resumes: [],
        message: "No resumes found for this user",
      });
    }

    /* -------------------------
       6. Success response
    -------------------------- */

    return NextResponse.json({
      resumes: data,
      page,
      limit,
    });

  } catch (err) {
    console.error("Unexpected error:", err);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}