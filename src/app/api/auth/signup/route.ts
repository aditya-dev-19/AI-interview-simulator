import { NextRequest, NextResponse } from "next/server";
import { signup } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName } = body;

    // 1. Basic Presence Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "All fields (email, password, fullName) are required" },
        { status: 400 }
      );
    }

    // 2. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // 3. Password Strength Validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // 4. Database Operation
    // Ensure 'signup' handles password hashing (e.g., bcrypt) inside @/lib/auth
    const data = await signup(email, password, fullName);

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      data
    }, { status: 201 });

  } catch (err: any) {
    // Log the error for debugging
    console.error("Signup Error:", err);

    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}