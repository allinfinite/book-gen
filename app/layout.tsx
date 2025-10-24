import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice-to-Book Creator",
  description: "Create books with voice prompts and AI assistance",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
