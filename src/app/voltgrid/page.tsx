import type { Metadata } from 'next';
import VoltGrid from './VoltGrid';

export const metadata: Metadata = {
  title: 'VoltGrid — Territory Capture',
  description: 'Capture territory by drawing trails while avoiding electric orbs.',
};

export default function VoltGridPage() {
  return <VoltGrid />;
}
