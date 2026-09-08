import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata, organizationJsonLd, webSiteJsonLd, SEO_DEFAULTS } from '@/lib/seo';
import { AmazonHomeGrid } from '@/components/home/AmazonHomeGrid';
import { loadHomeContent } from '@/lib/home-content';

export const revalidate = 60;

interface PageProps {
  params: Record<string, never>;
}

export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const seo = SEO_DEFAULTS.home(regionKey);
  const meta = buildMetadata({
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    path: '/',
    regionKey,
    ogImage: '/banners/bannerOne.jpg',
  });
  return meta;
}

export default async function HomePage() {
  const { regionKey, language } = await getRequestContext();
  const { heroSlides, sections, recent } = await loadHomeContent(regionKey, language);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }} />

      <h1 className="sr-only">Storegrill — Shop millions of products from verified vendors</h1>

      <AmazonHomeGrid
        sections={sections}
        heroSlides={heroSlides}
        recent={recent}
        regionKey={regionKey}
        language={language}
      />
    </>
  );
}
