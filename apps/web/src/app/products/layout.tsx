import type { ReactNode } from 'react';

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-surface-page">{children}</div>;
}
