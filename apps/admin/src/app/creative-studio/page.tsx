'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';

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

const BANNER_TYPES: { value: BannerType; label: string; description: string; defaultSize: ImageSize }[] = [
  { value: 'HERO_BANNER', label: 'Hero Banner', description: 'Main homepage hero, ~1280×360 rendered', defaultSize: '1792x1024' },
  { value: 'DEAL_BANNER', label: 'Deal Banner', description: 'Flash-sale / discount banner', defaultSize: '1792x1024' },
  { value: 'CATEGORY_BANNER', label: 'Category Banner', description: 'Category hero, min-h 320px card', defaultSize: '1792x1024' },
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

  const loadAssets = useCallback(() => {
    api<{ assets: CreativeAsset[] }>('/api/v1/creative/assets')
      .then(d => { setAssets(d.assets); setError(null); })
      .catch(() => { setAssets([]); });
  }, []);

  useEffect(loadAssets, [loadAssets]);

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
          }),
        }
      );

      setGeneratedImage({ url: result.image.url, revisedPrompt: result.image.revisedPrompt, creativeId: result.creativeId });
      loadAssets();
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
        subtitle="Generate AI-powered banners and marketing creatives with DALL-E 3"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-6">
          <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Banner Type</h3>
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
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    bannerType === type.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="block text-sm font-bold text-slate-800">{type.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Style Presets</h3>
            <div className="space-y-2">
              {STYLE_PRESETS[bannerType].map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                    selectedPreset === preset
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Prompt</h3>
            <textarea
              value={prompt}
              onChange={e => { setPrompt(e.target.value); setSelectedPreset(null); }}
              placeholder="Describe the banner you want to generate..."
              className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              maxLength={2000}
            />
            <p className="text-xs text-slate-400 mt-1">{prompt.length}/2000 characters</p>
          </div>

          <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Size</label>
                <select
                  value={size}
                  onChange={e => setSize(e.target.value as ImageSize)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                >
                  {SIZE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Style</label>
                <select
                  value={style}
                  onChange={e => setStyle(e.target.value as ImageStyle)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="vivid">Vivid</option>
                  <option value="natural">Natural</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Quality</label>
                <select
                  value={quality}
                  onChange={e => setQuality(e.target.value as ImageQuality)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                Generate Banner
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-surface-raised rounded-xl border border-slate-200 p-5 sticky top-24">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Preview</h3>

            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                  <img
                    src={generatedImage.url}
                    alt="Generated banner"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>

                {generatedImage.revisedPrompt && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Revised Prompt:</p>
                    <p className="text-xs text-slate-700">{generatedImage.revisedPrompt}</p>
                  </div>
                )}

                {generatedImage.creativeId && (
                  <p className="text-xs text-slate-500">Saved as creative <span className="font-mono">{generatedImage.creativeId}</span></p>
                )}

                <div className="flex gap-2">
                  <a
                    href={generatedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg text-center transition-colors"
                  >
                    Open Full Size
                  </a>
                  <button
                    type="button"
                    onClick={() => download(generatedImage.url)}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg text-center transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <svg className="w-12 h-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                </svg>
                <p className="text-sm">Enter a prompt and click Generate</p>
              </div>
            )}
          </div>

          <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Generated Library</h3>
              <button
                type="button"
                onClick={() => setGalleryOpen(o => !o)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
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
                    className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 group"
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
              <p className="text-xs text-slate-400 py-2">No generated creatives yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-bold text-brand-800 mb-1">Going live</p>
            <p className="text-xs text-brand-700 leading-relaxed">
              Save the downloaded PNG over the static banner file the storefront already loads, e.g.{' '}
              <code className="font-mono text-[11px]">apps/web/public/banners/bannerOne.jpg</code> (hero),
              <code className="font-mono text-[11px]">bannerTwo.jpg</code> or
              <code className="font-mono text-[11px]">bannerThree.jpg</code> (deals/category). Next deploy serves it.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}