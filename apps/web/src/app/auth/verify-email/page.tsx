import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmailClient } from '@/components/forms/VerifyEmailClient';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Verify email',
    description: 'Confirm your email address for Storegrill.',
    path: '/auth/verify-email',
    regionKey,
    noIndex: true,
  });
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailClient />
    </Suspense>
  );
}
