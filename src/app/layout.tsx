import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "sAIn Assistant — Intelligent Document AI",
  description:
    "Upload your documents and ask intelligent questions using AI-powered semantic search. Supports PDF, DOCX, and TXT files.",
  keywords: ["AI", "document intelligence", "RAG", "semantic search", "chatbot"],
  authors: [{ name: "saincode" }],
  openGraph: {
    title: "sAIn Assistant",
    description: "Your Intelligent Document AI Assistant",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
