import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const PREFERRED_PARSER_MODELS = [
  process.env.GEMINI_RESUME_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-pro-001",
].filter((value): value is string => Boolean(value));

type GeminiModelListItem = {
  name?: string;
  supportedGenerationMethods?: string[];
};

async function getAvailableGenerateContentModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      const body = await response.text();
      console.warn("Gemini ListModels failed:", response.status, body);
      return [];
    }

    const payload = (await response.json()) as { models?: GeminiModelListItem[] };
    const models = payload.models || [];

    return models
      .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model) => model.name?.replace(/^models\//, ""))
      .filter((name): name is string => Boolean(name));
  } catch (error) {
    console.warn("Gemini ListModels error:", error);
    return [];
  }
}

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

    // 2. Parse PDF with Gemini
    let parsedText = "";
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");
      const prompt = "Extract all the text from this resume. Return only the extracted text, formatted cleanly.";

      const apiKey = process.env.GEMINI_API_KEY || "";
      const availableModels = apiKey ? await getAvailableGenerateContentModels(apiKey) : [];

      const sortedAvailablePreferred = PREFERRED_PARSER_MODELS.filter((model) => availableModels.includes(model));
      const extraAvailable = availableModels.filter((model) => !sortedAvailablePreferred.includes(model));
      const parserModelCandidates = [...sortedAvailablePreferred, ...extraAvailable];

      let lastModelError: unknown;

      for (const modelName of parserModelCandidates) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
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
          if (parsedText) {
            break;
          }
        } catch (modelError) {
          lastModelError = modelError;
          console.warn(`Gemini resume parse failed for model ${modelName}:`, modelError);
        }
      }

      if (!parsedText) {
        if (parserModelCandidates.length === 0) {
          throw new Error("No generateContent-capable Gemini models found for this API key");
        }
        throw lastModelError || new Error("No Gemini parser model returned parsed text");
      }
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
