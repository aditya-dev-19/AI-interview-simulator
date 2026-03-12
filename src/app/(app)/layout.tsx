import React from "react";
import { Sidebar } from "@/components/Sidebar";
// import { createClient } from "@/utils/supabase/server";
// import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const supabase = await createClient();

  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // if (!session) {
  //   redirect("/auth");
  // }

  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      <Sidebar />

      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-transparent w-full">
        <div className="relative w-full min-h-full">{children}</div>
      </main>
    </div>
  );
}