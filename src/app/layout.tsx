import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI-Interview Pro",
  description: "Mock Interview Simulator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased bg-zinc-950 text-zinc-100 min-h-screen relative`}
        suppressHydrationWarning
      >
        {/* Global Dynamic Background Effects */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          {/* Glowing Orbs */}
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-900/30 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
        </div>

        {children}
      </body>
    </html>
  );
}
