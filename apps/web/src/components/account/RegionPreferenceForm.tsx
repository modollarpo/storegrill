'use client';

import { useRegion } from '../providers/RegionContext';
import { REGION_META, regionUrl } from '@/lib/regions';

export function RegionPreferenceForm() {
  const { regionKey, language, setRegion, setLanguage } = useRegion();
  const region = REGION_META.find(r => r.key === regionKey) ?? REGION_META[0];

  return (
    <div className="space-y-6">
      <section aria-label="Region">
        <h3 className="text-xs font-bold mb-2">Shopping region</h3>
        <p className="text-2xs text-smoke-500 mb-2">Switching regions moves you to that country&apos;s storefront.</p>
        <label htmlFor="pref-region" className="sr-only">Region</label>
        <select
          id="pref-region"
          value={regionKey}
          onChange={e => {
            if (e.target.value !== regionKey) window.location.href = regionUrl(e.target.value);
          }}
          className="input max-w-sm h-9 text-xs"
        >
          {REGION_META.map(r => (
            <option key={r.key} value={r.key}>{r.flag} {r.name} — prices in {r.currency}</option>
          ))}
        </select>
      </section>

      <section aria-label="Language">
        <h3 className="text-xs font-bold mb-2">Content language</h3>
        <label htmlFor="pref-lang" className="sr-only">Language</label>
        <select
          id="pref-lang"
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="input max-w-sm h-9 text-xs"
        >
          {region.languages.map(l => (
            <option key={l.code} value={l.code}>{l.nativeName} ({l.code})</option>
          ))}
        </select>
      </section>
    </div>
  );
}
