'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { Card, CardHeader, CardTitle, Button, Badge, Input, Select, Field, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

type BannerType = 'HERO_BANNER' | 'DEAL_BANNER' | 'CATEGORY_BANNER' | 'AD_BANNER' | 'SOCIAL_MEDIA' | 'PRODUCT_HERO';
type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
type ImageStyle = 'vivid' | 'natural';
type ImageQuality = 'standard' | 'hd';

interface CreativeAsset {
  id: string;
  name: string;
  url: string;
  metadata: Record<string, string>;
  createdBy: string;
  createdAt: string;
}

interface HomepageBanner {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  content: Record<string, unknown>;
}

const BANNER_TYPES: { value: BannerType; label: string; description: string; defaultSize: ImageSize }[] = [
  { value: 'HERO_BANNER', label: 'Hero Banner', description: 'Main homepage hero', defaultSize: '1792x1024' },
  { value: 'DEAL_BANNER', label: 'Deal Banner', description: 'Flash-sale / discount banner', defaultSize: '1792x1024' },
  { value: 'CATEGORY_BANNER', label: 'Category Banner', description: 'Category hero card', defaultSize: '1792x1024' },
  { value: 'AD_BANNER', label: 'Ad Banner', description: 'Digital advertising creative', defaultSize: '1792x1024' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media', description: 'Instagram/Facebook post', defaultSize: '1024x1024' },
  { value: 'PRODUCT_HERO', label: 'Product Hero', description: 'Product showcase image', defaultSize: '1024x1024' },
];

const SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: '1792x1024', label: 'Landscape (16:9)' },
  { value: '1024x1792', label: 'Portrait (9:16)' },
  { value: '1024x1024', label: 'Square (1:1)' },
];

const STYLE_PRESETS: Record<BannerType, string[]> = {
  HERO_BANNER: [
    'Modern minimalist e-commerce hero, gradient background, clean typography',
    'Lifestyle photography, happy customer using product, warm lighting',
    'Bold geometric shapes, brand colors, attention-grabbing',
    'Seasonal theme, festive atmosphere, limited time offer feel',
  ],
  DEAL_BANNER: [
    'Flash sale countdown, red and yellow urgency colors, bold discount percentage',
    'Black Friday style, dark background, neon accents, massive savings',
    'Clean sale banner, price slash, modern retail design',
    'Coupon style, torn-edge effect, promotional feel',
  ],
  CATEGORY_BANNER: [
    'Category lifestyle shot, products in natural setting, aspirational',
    'Flat lay arrangement, category products, clean composition',
    'Gradient overlay with category name, professional photography',
    'Split design, lifestyle on one side, products on other',
  ],
  AD_BANNER: [
    'Google Display ad style, clear CTA, product focused',
    'Facebook ad creative, social proof elements, engaging',
    'Retargeting banner, product showcase, limited offer',
    'Brand awareness, lifestyle imagery, emotional connection',
  ],
  SOCIAL_MEDIA: [
    'Instagram post style, square format, trendy aesthetic',
    'Story format, vertical, swipe-up call to action',
    'User-generated content style, authentic feel',
    'Product flat lay, aesthetic arrangement, hashtag ready',
  ],
  PRODUCT_HERO: [
    'Studio shot, white background, professional lighting',
    'Lifestyle context, product in use, natural setting',
    'Close-up detail shot, texture focus, premium feel',
    'Multiple angles, product variety, comparison',
  ],
};

function BannerRowCard({ banner, onSaved, onError }: { banner: HomepageBanner; onSaved: () => void; onError: (msg: string) => void }) {
  const [status, setStatus] = useState(banner.status);
  const [title, setTitle] = useState(typeof banner.content.title === 'string' ? banner.content.title : '');
  const [subtitle, setSubtitle] = useState(typeof banner.content.subtitle === 'string' ? banner.content.subtitle : '');
  const [href, setHref] = useState(typeof banner.content.href === 'string' ? banner.content.href : '');
  const [region, setRegion] = useState(typeof banner.content.regionKey === 'string' ? banner.content.regionKey : '');
  const [order, setOrder] = useState(typeof banner.content.order === 'number' ? banner.content.order : 0);
  const [saving, setSaving] = useState(false);

  const image =
    typeof banner.content.blobUrl === 'string'
      ? banner.content.blobUrl
      : typeof banner.content.url === 'string'
        ? banner.content.url
        : null;

  async function save(nextStatus: string) {
    setSaving(true);
    try {
      await api(`/api/v1/creative/banners/${banner.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          title,
          subtitle,
          href,
          regionKey: region || null,
          order,
        }),
      });
      setStatus(nextStatus as HomepageBanner['status']);
      onSaved();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  }

  const isActive = status === 'ACTIVE';

  return (
    <div className="border border-surface-200 rounded-xl p-3 bg-white">
      <div className="flex gap-3">
        {image ? (
          <img src={image} alt={banner.name} className="w-20 h-24 object-cover rounded-lg bg-surface-100 shrink-0" loading="lazy" />
        ) : (
          <div className="w-20 h-24 rounded-lg bg-surface-100 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-bold text-surface-800 truncate">{banner.name}</p>
            <StatusPill active={isActive} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="h-8 text-xs" maxLength={120} />
            <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subtitle" className="h-8 text-xs" maxLength={200} />
            <Input value={href} onChange={e => setHref(e.target.value)} placeholder="/categories/slug" className="h-8 text-xs" maxLength={300} />
            <div className="flex gap-2">
              <Input value={region} onChange={e => setRegion(e.target.value)} placeholder="Region" className="h-8 text-xs flex-1" maxLength={20} />
              <Select
                value={order}
                onChange={e => setOrder(Number(e.target.value))}
                className="w-16 h-8 text-xs"
                aria-label="Card order"
              >
                {Array.from({ length: 20 }, (_, i) => i).map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        {!isActive ? (
          <Button size="sm" variant="success" loading={saving} onClick={() => save('ACTIVE')}>
            Publish
          </Button>
        ) : (
          <Button size="sm" variant="secondary" loading={saving} onClick={() => save('PAUSED')}>
            Unpublish
          </Button>
        )}
        <Button size="sm" variant="primary" loading={saving} onClick={() => save(status)}>
          Save
        </Button>
      </div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <Badge status={active ? 'ACTIVE' : 'DRAFT'} className="shrink-0">
      {active ? 'Live' : 'Draft'}
    </Badge>
  );
}

export default function CreativeStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [bannerType, setBannerType] = useState<BannerType>('HERO_BANNER');
  const [size, setSize] = useState<ImageSize>('1792x1024');
  const [style, setStyle] = useState<ImageStyle>('vivid');
  const [quality, setQuality] = useState<ImageQuality>('hd');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; revisedPrompt?: string; creativeId?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [assets, setAssets] = useState<CreativeAsset[] | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroHref, setHeroHref] = useState('');
  const [heroRegion, setHeroRegion] = useState('');
  const [homeBanners, setHomeBanners] = useState<HomepageBanner[] | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const loadAssets = useCallback(() => {
    api<{ assets: CreativeAsset[] }>('/api/v1/creative/assets')
      .then(d => { setAssets(d.assets); setError(null); })
      .catch(() => { setAssets([]); });
  }, []);

  const loadBanners = useCallback(() => {
    api<{ banners: HomepageBanner[] }>('/api/v1/creative/banners')
      .then(d => { setHomeBanners(d.banners); setBannerError(null); })
      .catch(() => { setHomeBanners([]); });
  }, []);

  useEffect(() => {
    loadAssets();
    loadBanners();
  }, [loadAssets, loadBanners]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await api<{ image: { url: string; revisedPrompt?: string; modelUsed: string }; creativeId: string }>(
        '/api/v1/creative/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            prompt: prompt.trim(),
            size,
            style,
            quality,
            purpose: bannerType,
            ...(heroTitle.trim() ? { title: heroTitle.trim() } : {}),
            ...(heroSubtitle.trim() ? { subtitle: heroSubtitle.trim() } : {}),
            ...(heroHref.trim() ? { href: heroHref.trim() } : {}),
            ...(heroRegion.trim() ? { regionKey: heroRegion.trim() } : {}),
          }),
        }
      );

      setGeneratedImage({ url: result.image.url, revisedPrompt: result.image.revisedPrompt, creativeId: result.creativeId });
      loadAssets();
      loadBanners();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Generation failed. Check your Azure OpenAI configuration.');
    } finally {
      setGenerating(false);
    }
  }

  function download(url: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `storegrill-${bannerType.toLowerCase()}-${Date.now()}.png`;
    link.click();
  }

  function applyPreset(preset: string) {
    setPrompt(preset);
    setSelectedPreset(preset);
  }

  return (
    <AdminShell>
      <PageHeader
        title="Creative Studio"
        subtitle="Generate AI-powered banners and marketing creatives"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="mb-4">
              <CardTitle>Banner Type</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BANNER_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setBannerType(type.value);
                    setSize(type.defaultSize);
                    setSelectedPreset(null);
                  }}
                  className={cn(
                    'p-3.5 rounded-xl border-2 text-left transition-all',
                    bannerType === type.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-surface-200 hover:border-surface-300 bg-white text-surface-600',
                  )}
                >
                  <span className="block text-sm font-bold text-surface-800">{type.label}</span>
                  <span className="block text-xs text-surface-500 mt-0.5">{type.description}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader className="mb-4">
              <CardTitle>Style Presets</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {STYLE_PRESETS[bannerType].map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border text-sm transition-all',
                    selectedPreset === preset
                      ? 'border-brand-500 bg-brand-50 text-brand-900'
                      : 'border-surface-200 bg-white hover:border-surface-300 text-surface-700',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader className="mb-4">
              <CardTitle>Prompt</CardTitle>
            </CardHeader>
            <textarea
              value={prompt}
              onChange={e => { setPrompt(e.target.value); setSelectedPreset(null); }}
              placeholder="Describe the banner you want to generate..."
              className="w-full h-32 p-3 border border-surface-200 rounded-lg text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              maxLength={2000}
            />
            <p className="text-xs text-surface-400 mt-1.5 font-medium tabular-nums">{prompt.length}/2000 characters</p>
          </Card>

          <Card>
            <CardHeader className="mb-4">
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Size">
                <Select value={size} onChange={e => setSize(e.target.value as ImageSize)}>
                  {SIZE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Style">
                <Select value={style} onChange={e => setStyle(e.target.value as ImageStyle)}>
                  <option value="vivid">Vivid</option>
                  <option value="natural">Natural</option>
                </Select>
              </Field>
              <Field label="Quality">
                <Select value={quality} onChange={e => setQuality(e.target.value as ImageQuality)}>
                  <option value="standard">Standard</option>
                  <option value="hd">HD</option>
                </Select>
              </Field>
            </div>

            <div className="mt-5 pt-5 border-t border-surface-100">
              <h4 className="text-[13px] font-bold text-surface-800 mb-3">Homepage hero placement</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Card title">
                  <Input value={heroTitle} onChange={e => setHeroTitle(e.target.value)} placeholder="e.g. High-end audio" maxLength={120} />
                </Field>
                <Field label="Card subtitle">
                  <Input value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="e.g. Curated category drop" maxLength={200} />
                </Field>
                <Field label="Link (internal path)">
                  <Input value={heroHref} onChange={e => setHeroHref(e.target.value)} placeholder="/categories/audio" maxLength={300} />
                </Field>
                <Field label="Region (optional)">
                  <Input value={heroRegion} onChange={e => setHeroRegion(e.target.value)} placeholder="e.g. UK" maxLength={20} />
                </Field>
              </div>
            </div>
          </Card>

          <Button
            type="button"
            size="lg"
            variant="brand"
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            loading={generating}
          >
            {generating ? 'Generating…' : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                Generate Banner
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardHeader className="mb-4">
              <CardTitle>Preview</CardTitle>
            </CardHeader>

            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-surface-100">
                  <img
                    src={generatedImage.url}
                    alt="Generated banner"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>

                {generatedImage.revisedPrompt && (
                  <div className="p-3 bg-surface-50 rounded-lg">
                    <p className="text-xs font-medium text-surface-600 mb-1">Revised Prompt:</p>
                    <p className="text-xs text-surface-700">{generatedImage.revisedPrompt}</p>
                  </div>
                )}

                {generatedImage.creativeId && (
                  <p className="text-xs text-surface-500">
                    Saved as creative <span className="font-mono">{generatedImage.creativeId}</span>
                  </p>
                )}

                <div className="flex gap-2">
                  <a
                    href={generatedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-medium rounded-lg text-center transition-colors"
                  >
                    Open Full Size
                  </a>
                  <Button variant="brand" className="flex-1" size="sm" onClick={() => download(generatedImage.url)}>
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border-2 border-dashed border-surface-200 flex flex-col items-center justify-center text-surface-400">
                <svg className="w-12 h-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                </svg>
                <p className="text-sm">Enter a prompt and click Generate</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <CardTitle>Generated Library</CardTitle>
              <button
                type="button"
                onClick={() => setGalleryOpen(o => !o)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                {galleryOpen ? 'Hide' : `Show ${assets?.length ?? 0}`}
              </button>
            </div>

            {galleryOpen && assets && assets.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {assets.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setGeneratedImage({ url: a.url })}
                    className="relative aspect-video rounded-lg overflow-hidden bg-surface-100 group"
                    title={a.name}
                  >
                    <img src={a.url} alt={a.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">
                      {a.metadata.purpose ?? 'image'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {galleryOpen && assets && assets.length === 0 && (
              <p className="text-xs text-surface-400 py-2">No generated creatives yet.</p>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-1">Homepage hero banners</CardTitle>
            <p className="text-xs text-surface-500 mb-3">
              ACTIVE banners replace the deal-driven hero cards (same 316×420 card size, up to 14). Homepage falls back to deals/static until any banner is published.
            </p>

            {bannerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3" role="alert">
                {bannerError}
              </div>
            )}

            {homeBanners === null ? (
              <div className="flex items-center gap-2 text-xs text-surface-400 py-2">
                <Spinner size="sm" /> Loading banners…
              </div>
            ) : homeBanners.length === 0 ? (
              <p className="text-xs text-surface-400 py-2">
                No banners yet. Generate one, set the title/link, then publish it.
              </p>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {homeBanners.map(b => (
                  <BannerRowCard key={b.id} banner={b} onSaved={loadBanners} onError={msg => setBannerError(msg)} />
                ))}
              </div>
            )}
          </Card>

          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-bold text-brand-800 mb-1">Going live</p>
            <p className="text-xs text-brand-700 leading-relaxed">
              Generate a <span className="font-mono text-[11px]">HERO_BANNER</span> or{' '}
              <span className="font-mono text-[11px]">CATEGORY_BANNER</span> portrait image, set an internal link, and
              press <span className="font-semibold">Publish</span>. Active banners are served by{' '}
              <span className="font-mono text-[11px]">GET /api/v1/banners?regionKey=</span> and render on the homepage
              immediately (ISR 60s). No static file copy is needed.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}