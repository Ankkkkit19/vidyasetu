import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "VidyaSetu — Intelligent Coaching ERP + AI Student Intelligence",
  description:
    "An intelligent coaching management platform that analyses performance, predicts risk and gives actionable recommendations.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased min-h-screen">{children}</body>
    </html>
  );
}
