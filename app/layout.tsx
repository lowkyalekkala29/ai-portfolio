import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Portfolio + Video Walkthrough",
  description: "Build a portfolio from your GitHub and resume, plus a video walkthrough of yourself.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
