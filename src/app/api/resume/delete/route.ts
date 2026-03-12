import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();

    /* -------------------------
       1. Parse JSON safely
    -------------------------- */

    let body;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { id } = body;

    /* -------------------------
       2. Validate ID exists
    -------------------------- */

    if (!id) {
      return NextResponse.json(
        { error: "Resume id is required" },
        { status: 400 }
      );
    }

    /* -------------------------
       3. Validate UUID format
    -------------------------- */

    // const uuidRegex =
    //   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // if (!uuidRegex.test(id)) {
    //   return NextResponse.json(
    //     { error: "Invalid resume id format" },
    //     { status: 400 }
    //   );
    // }

    /* -------------------------
       4. Authenticate user
    -------------------------- */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* -------------------------
       5. Verify resume exists
    -------------------------- */

    const { data: resume, error: fetchError } = await supabase
      .from("resumes")
      .select("id, user_id, file_url")
      .eq("id", id)
      .single();

    if (fetchError || !resume) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    /* -------------------------
       6. Ownership validation
    -------------------------- */

    if (resume.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* -------------------------
       7. Delete file from storage
    -------------------------- */

    if (resume.file_url) {
      const url = new URL(resume.file_url);
      const path = url.pathname.replace("/storage/v1/object/public/resumes/", "");

      if (path) {
        const { error: storageError } = await supabase.storage
          .from("resumes")
          .remove([path]);

        if (storageError) {
          console.warn("Storage delete failed:", storageError);
        }
      }
    }

    /* -------------------------
       8. Delete DB record
    -------------------------- */

    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete error:", error);

      return NextResponse.json(
        { error: "Failed to delete resume" },
        { status: 500 }
      );
    }

    /* -------------------------
       9. Success response
    -------------------------- */

    return NextResponse.json({
      success: true,
      deletedId: id,
    });

  } catch (err) {
    console.error("Unexpected error:", err);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}