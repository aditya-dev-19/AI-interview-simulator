import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import * as pdfParseImport from "pdf-parse";
const pdf = (pdfParseImport as any).default || pdfParseImport;
// import { parseResume } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(`resume-${Date.now()}.pdf`, buffer, {
        contentType: "application/pdf",
      });

    if (uploadError) throw uploadError;

    const fileUrl = supabase.storage
      .from("resumes")
      .getPublicUrl(uploadData.path).data.publicUrl;

    // Extract text
    const parsed = await pdf(buffer);

    // Clean text with Gemini
    // const structuredText = await parseResume(parsed.text);

    // Insert into DB
    const { data, error } = await supabase.from("resumes").insert({
      user_id: userId,
      file_url: fileUrl,
      file_name: file.name,
      parsed_text: parsed.text,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (err) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}