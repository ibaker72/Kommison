import type { Metadata, Viewport } from 'next';
import VoltGrid from './VoltGrid';

export const metadata: Metadata = {
  title: 'VoltGrid — Neon Capture Arcade',
  description: 'Capture territory, dodge the plasma orb, and outrun spark chasers in a fullscreen neon arcade challenge.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#030612',
  colorScheme: 'dark',
};

export default function VoltGridPage() {
  return (
    <main className="voltgrid-route">
      <VoltGrid />
    </main>
  );
}
