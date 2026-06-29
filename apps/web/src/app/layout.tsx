import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "HireMind AI - Recruiter Dashboard & Candidate Discoverability",
  description: "Intelligent recruiter workspace for candidate ingestion, search, and job description processing. Powered by Blue Bolt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-purple-500/30 selection:text-purple-200">
        <SessionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
