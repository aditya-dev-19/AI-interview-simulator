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
    /* -------------------------------------
      PARSE RESUME WITH GEMINI 2.5 FLASH
    ------------------------------------- */

    let parsedText = "";

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.5-flash",
      });

      const prompt = `
        You are an AI resume parser for an interview simulation platform.

        Your task is to read the provided resume PDF and convert it into structured interview context. Extract information faithfully and organize it into the sections below.

        Do NOT invent or assume information that does not appear in the resume.

        -------------------------------------

        INPUT VALIDATION

        Before parsing:

        • If no file is attached respond:
        "No resume was provided. Please upload a PDF resume."

        • If the document does not appear to be a resume respond:
        "The uploaded file does not appear to be a resume."

        • If the PDF is a scanned image with no readable text respond:
        "This resume appears to be a scanned image. Text could not be extracted."

        If information is unclear or ambiguous, mark it inline with:
        ⚠️ [brief explanation]

        -------------------------------------

        OUTPUT STRUCTURE

        Use the following sections exactly as written.

        1. CANDIDATE SUMMARY
        Write a concise 2–3 sentence professional summary describing the candidate’s field, experience level, and primary strengths based only on resume content.

        2. TECHNICAL SKILLS
        Scan the entire resume (skills section, projects, experience, certifications) for technical skills.

        If the candidate grouped skills into categories, preserve those categories.

        If not, organize them into:
        Programming Languages  
        Frameworks & Libraries  
        Databases  
        Tools & Platforms  
        Cloud & DevOps  
        Concepts & Methodologies

        Avoid duplicates.

        3. HUMAN LANGUAGES
        List spoken or written languages and proficiency if provided (Native, Fluent, Intermediate, Basic).  
        If proficiency is not stated write: Proficiency not specified.  
        If absent write: Not mentioned on resume.

        4. SOFT SKILLS
        List interpersonal abilities in two groups:

        Explicitly stated  
        Inferred (with source)

        Example:
        Leadership — inferred from "Led a team of 5 engineers".

        Only infer skills clearly supported by the text.

        5. WORK EXPERIENCE
        For each role include:

        Role  
        Company  
        Duration  

        Key Responsibilities  
        • Summarize main duties

        Technologies Used  
        • List only technologies mentioned for that role

        Achievements & Impact  
        • Summarize outcomes  
        • Mark quantified achievements with ⭐

        6. PROJECTS
        For each project include:

        Project Name  
        Description  
        Technologies Used  
        Key Results & Impact (mark quantified results with ⭐)

        If none exist write: Not specified.

        7. EDUCATION
        For each degree include:

        Degree & Major  
        Institution  
        Year or Duration  

        Key Achievements (GPA, honors, research topics if present)

        If unclear mark:
        ⚠️ [Year not specified]

        8. ADDITIONAL SECTIONS
        Include other sections if present, such as:

        Certifications  
        Publications  
        Awards  
        Research  
        Leadership Roles  
        Volunteer Work  
        Hackathons  
        Open Source Contributions  
        Extracurricular Activities

        If none exist write: Not specified.

        9. INTERVIEW FOCUS AREAS
        List 6–8 strong interview discussion topics from the resume.

        For each include:

        Topic  
        Type: Technical | Behavioral | Situational | Project Deep-Dive  
        Source (experience/project/achievement)  
        Suggested Question Angle

        Prioritize topics that show measurable impact ⭐, leadership, complex projects, or strong technical depth.

        -------------------------------------

        FORMATTING RULES

        • Use the section headings exactly as written.
        • Use bullet points where appropriate.
        • Do not omit sections.
        • If information is missing write: Not specified.
        • Flag ambiguity with ⚠️.
        • Do not resolve conflicting information; present it as written.
        • Keep the output concise and structured.
    `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf",
          },
        },
      ]);

      parsedText = result.response.text();

    } catch (parseError) {
      console.error("Gemini parse error:", parseError);

      await supabase.storage
        .from("resumes")
        .remove([filePath]);

      return NextResponse.json(
        { error: "Failed to parse PDF content" },
        { status: 500 }
      );
    }
    // Save metadata in database
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