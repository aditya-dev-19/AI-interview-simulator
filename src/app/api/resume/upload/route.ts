import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("resumes")
      .getPublicUrl(filePath);

    // 2. Parse PDF with Gemini 1.5 Flash
    let parsedText = "";
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = "Extract all the text from this resume. Return only the extracted text, formatted cleanly.";
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf"
          }
        }
      ]);
      
      parsedText = result.response.text();
    } catch (parseError) {
      console.error("Gemini parse error:", parseError);
      // We might want to clean up the storage file here if parsing fails
      await supabase.storage.from("resumes").remove([filePath]);
      return NextResponse.json({ error: "Failed to parse PDF content" }, { status: 500 });
    }

    // 3. Save record to Database
    const { data: resumeRecord, error: dbError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_url: publicUrl,
        file_name: file.name,
        parsed_text: parsedText
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Cleanup storage
      await supabase.storage.from("resumes").remove([filePath]);
      return NextResponse.json({ error: "Failed to save resume record" }, { status: 500 });
    }

    return NextResponse.json({ success: true, resume: resumeRecord }, { status: 201 });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
