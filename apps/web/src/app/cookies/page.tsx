import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { lawFor, regionConfig } from '@/lib/region-content';
import { CookiePreferences, ConsentLawNote } from './CookiePreferences';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Cookie Settings',
    description: `Choose which cookies Storegrill ${regionConfig(regionKey).name} may use: strictly necessary, analytics and marketing.`,
    path: '/cookies',
    regionKey,
  });
}

export default async function CookiesPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const law = lawFor(regionKey);

  return (
    <div className="container-site py-10 max-w-3xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Cookie settings</h1>
      <p className="mt-3 text-sm text-smoke-600 leading-relaxed max-w-prose">
        Cookies are small files stored on your device. We group them into three categories. You can change your mind at
        any time — this page always reflects your latest choice for this region ({law.jurisdictionNote}).
      </p>

      <div className="mt-8">
        <CookiePreferences />
        <ConsentLawNote />
      </div>
    </div>
  );
}
