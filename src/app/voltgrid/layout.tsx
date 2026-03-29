import type { ReactNode } from 'react';

export default function VoltGridRouteLayout({ children }: { children: ReactNode }) {
  return <section className="voltgrid-route-layout">{children}</section>;
}
