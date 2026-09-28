import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { t } from '@/i18n';
import { CompareClient } from './CompareClient';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey, language } = await getRequestContext();
  return buildMetadata({
    title: t(language, 'compareTitle'),
    description: t(language, 'compareSubtitle'),
    path: '/compare',
    regionKey,
  });
}

export default async function ComparePage() {
  const { regionKey } = await getRequestContext();
  return <CompareClient regionKey={regionKey} />;
}
