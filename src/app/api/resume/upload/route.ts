import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    // Generate file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("resumes")
      .getPublicUrl(filePath);

    // Save metadata in database
    const { data: resumeRecord, error: dbError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_url: publicUrl,
        file_name: file.name
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);

      // Cleanup storage
      await supabase.storage
        .from("resumes")
        .remove([filePath]);

      return NextResponse.json(
        { error: "Failed to save resume record" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, resume: resumeRecord },
      { status: 201 }
    );

  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}