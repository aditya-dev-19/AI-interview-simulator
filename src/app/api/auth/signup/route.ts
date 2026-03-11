import { NextRequest, NextResponse } from "next/server";
import { signup } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const data = await signup(email, password, fullName);

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}