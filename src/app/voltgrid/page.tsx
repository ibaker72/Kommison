import type { Metadata, Viewport } from 'next';
import VoltGrid from './VoltGrid';

export const metadata: Metadata = {
  title: 'VoltGrid — Neon Capture Arcade',
  description: 'Capture territory, dodge the orb, and outrun spark chasers in a fullscreen neon arcade challenge.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function VoltGridPage() {
  return <VoltGrid />;
}
