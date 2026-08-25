import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { supportEmailFor } from '@/lib/region-content';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Product Recalls — Storegrill',
    description: 'Current product recalls and safety notices for items sold on Storegrill.',
    path: '/recalls',
    regionKey,
  });
}

export default async function RecallsPage() {
  const { regionKey } = await getRequestContext();

  return (
    <div className="container-site py-10 max-w-3xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Safety first</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Product recalls</h1>

      <div className="mt-8 card p-8 text-center">
        <p className="text-2xl mb-2" aria-hidden="true">✓</p>
        <h2 className="text-sm font-bold text-charcoal">No active recalls</h2>
        <p className="text-xs text-smoke-600 mt-2 leading-relaxed max-w-md mx-auto">
          There are currently no open recall or safety notices for products sold on Storegrill.
          If a recall is ever issued we contact affected buyers directly by email and SMS, and refund
          automatically on return.
        </p>
      </div>

      <p className="mt-6 text-xs text-smoke-600 leading-relaxed">
        Spotted a safety concern? Email <span className="font-mono">{supportEmailFor(regionKey)}</span> with
        “Product safety” in the subject line, or use the{' '}
        <Link href="/contact" className="text-ember hover:underline underline-offset-2">contact form</Link>.
      </p>
    </div>
  );
}
