import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard } from '@/components/forms/AuthCard';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Reset password',
    description: 'Securely access your Storegrill account.',
    path: '/auth/forgot-password',
    regionKey,
    noIndex: true,
  });
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthCard mode="forgot" />
    </Suspense>
  );
}
