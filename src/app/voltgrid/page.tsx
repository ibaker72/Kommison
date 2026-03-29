import type { Metadata, Viewport } from 'next';
import VoltGrid from './VoltGrid';

export const metadata: Metadata = {
  title: 'VoltGrid — Neon Territory Arcade',
  description: 'Capture territory, trap Volt Orbs, and outrun the Shock Ball in this neon Qix reimagining.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#05050a',
  colorScheme: 'dark',
};

export default function VoltGridPage() {
  return <VoltGrid />;
}
