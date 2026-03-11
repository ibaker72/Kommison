import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({
  src: "./fonts/Geist-Latin.woff2",
  variable: "--font-geist",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kommison — Referral Tracking for Modern Businesses",
  description:
    "Stop tracking referrals in spreadsheets. Kommison gives your business a clean system to manage referral partners, track leads, calculate commissions, and handle payouts — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
