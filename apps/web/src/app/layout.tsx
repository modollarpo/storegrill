import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/outfit';
import './globals.css';
import { ToastProvider } from '@/components/feedback/Toast';
import { CartProvider } from '@/components/providers/CartContext';
import { WishlistProvider } from '@/components/providers/WishlistContext';
import { RegionProvider } from '@/components/providers/RegionContext';
import Header from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getRequestContext } from '@/lib/server-context';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import { UserContextProvider } from '@/components/providers/UserContext';
import { PWAProvider } from '@/components/providers/PWAProvider';
import { PwaSplashScreen } from '@/components/layout/PwaSplashScreen';

export const dynamic = 'force-dynamic';

const APEX = process.env.NEXT_PUBLIC_APEX_DOMAIN || 'Storegrill.net';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${APEX}`),
  title: {
    default: 'Storegrill — Online Shopping Marketplace',
    template: '%s | Storegrill',
  },
  description:
    'Storegrill is a global multi-region marketplace. Shop millions of products from verified vendors with local currency, payments and delivery across North America, Europe, Asia-Pacific and the Middle East.',
  applicationName: 'Storegrill',
  creator: 'Storegrill',
  publisher: 'Storegrill Ltd',
  category: 'shopping',
  keywords: ['online marketplace', 'online shopping', 'multi-vendor', 'global shopping', 'deals', 'electronics', 'fashion', 'home goods'],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Storegrill',
    title: 'Storegrill — Online Shopping Marketplace',
    description: 'Shop millions of products from verified vendors. Local currency, payments and delivery across 44 regions.',
    images: [{ url: '/banners/og-default.jpg', width: 1200, height: 630, alt: 'Storegrill — Online Shopping Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Storegrill',
    creator: '@Storegrill',
    title: 'Storegrill — Online Shopping Marketplace',
    description: 'Shop millions of products from verified vendors. Local currency, payments and delivery across 44 regions.',
    images: ['/banners/og-default.jpg'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icons/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/icon-96.png', type: 'image/png', sizes: '96x96' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: [{ url: '/icons/icon-32.png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Storegrill',
    startupImage: ['/icons/icon-512.png'],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1c073d',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { regionKey, language } = await getRequestContext();
  const primaryLang = language.split('-')[0];
  const dir = ['ar', 'he', 'fa', 'ur'].includes(primaryLang) ? 'rtl' : 'ltr';

  return (
    <html lang={language} dir={dir}>
      <body className="min-h-screen flex flex-col antialiased bg-surface-page text-primary">
        <PwaSplashScreen />
        <AnalyticsProvider>
          <UserContextProvider>
            <ToastProvider>
              <CartProvider>
                <WishlistProvider>
                  <RegionProvider initialRegionKey={regionKey} initialLanguage={language}>
                    <div className="flex flex-col min-h-screen">
                      <a href="#main-content" className="skip-link">Skip to main content</a>
                      <Header />
                      <main id="main-content" className="flex-1">{children}</main>
                      <Footer />
                      <CookieBanner />
                      <ScrollToTop />
                      <PWAProvider />
                    </div>
                  </RegionProvider>
                </WishlistProvider>
              </CartProvider>
            </ToastProvider>
          </UserContextProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
