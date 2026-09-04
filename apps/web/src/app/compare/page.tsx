import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { CompareClient } from './CompareClient';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({ title: 'Compare Products', description: 'Compare specs, pricing, and features.', path: '/compare', regionKey });
}

export default async function ComparePage() {
  const { regionKey } = await getRequestContext();
  return <CompareClient regionKey={regionKey} />;
}
