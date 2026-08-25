import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor, lawFor } from '@/lib/region-content';
import { ContactForm } from './ContactForm';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Contact Us — Storegrill ${cfg.name}`,
    description: `Get in touch with Storegrill ${cfg.name} support by email or contact form. Replies within one working day.`,
    path: '/contact',
    regionKey,
  });
}

const TZ_LABEL: Record<string, string> = {
  'Africa/Lagos': 'WAT', 'Africa/Accra': 'GMT', 'Africa/Nairobi': 'EAT',
  'Africa/Kampala': 'EAT', 'Africa/Johannesburg': 'SAST', 'Africa/Cairo': 'EET',
  'Africa/Casablanca': 'WEST', 'Africa/Dar_es_Salaam': 'EAT',
};

export default async function ContactPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const tz = TZ_LABEL[cfg.defaultTimezone] ?? cfg.defaultTimezone;

  return (
    <div className="container-site py-10 max-w-4xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Contact us</h1>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <ContactForm />

        <aside className="space-y-3" aria-label="Other ways to reach us">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-charcoal">Email</h2>
            <a href={`mailto:${supportEmailFor(regionKey)}`} className="text-sm text-ember font-semibold hover:underline underline-offset-2 break-all">
              {supportEmailFor(regionKey)}
            </a>
            <p className="text-xs text-smoke-600 mt-1">Include your SG- order number for the fastest reply.</p>
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-bold text-charcoal">Support hours</h2>
            <p className="text-xs text-smoke-600 mt-1 leading-relaxed">
              Monday–Friday, 8:00–18:00 ({tz})<br />
              Saturday, 9:00–14:00 ({tz})<br />
              Sunday &amp; public holidays: email only
            </p>
          </div>
          <div className="card p-5 bg-ember-pale border-ember-light">
            <h2 className="text-sm font-bold text-charcoal">Data protection requests</h2>
            <p className="text-xs text-smoke-600 mt-1 leading-relaxed">
              Access, correction or deletion of your data is handled under the {lawFor(regionKey).act}. Email{' '}
              <span className="font-mono">{regionKey.toLowerCase()}.privacy@storegrill.net</span>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
