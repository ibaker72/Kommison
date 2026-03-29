import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kommison',
  description: 'Arcade game collection',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}