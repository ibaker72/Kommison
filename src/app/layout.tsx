import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kommison",
  description: "Game collection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
