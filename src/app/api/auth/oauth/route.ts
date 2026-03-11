import { NextRequest, NextResponse } from "next/server";
import { oauthLogin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json(
        { error: "Provider required" },
        { status: 400 }
      );
    }

    const data = await oauthLogin(provider);

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}