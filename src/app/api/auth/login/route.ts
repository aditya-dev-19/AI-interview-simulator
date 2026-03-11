import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const data = await login(email, password);

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 401 }
    );
  }
}