import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeScan — Security Scanner for Vibe-Coded Apps",
  description:
    "VibeScan audits deployed AI-built apps for exposed secrets, missing RLS, insecure API routes, and production security gaps in under two minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full scroll-smooth`}
    >
      <body className="min-h-full bg-[var(--bg)] font-sans text-[var(--white)] antialiased selection:bg-[var(--red-dim)] selection:text-[var(--white)]">
        {children}
      </body>
    </html>
  );
}
