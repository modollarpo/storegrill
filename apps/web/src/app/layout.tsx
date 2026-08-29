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
import { colors } from '@/design-system/tokens';


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
  keywords: ['marketplace', 'online shopping', 'multi-vendor', 'global shipping', 'deals'],
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
    shortcut: [{ url: '/icon.png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Storegrill',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: colors.brand.ember.DEFAULT,
};

const ANNOUNCEMENTS = [
  'Free delivery on eligible orders — shop millions of products from verified vendors',
  'New vendors joining every week across 44 regions worldwide',
  "Today's Deals: limited-time offers refreshed daily",
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { regionKey, language } = await getRequestContext();

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased bg-surface-page text-primary">
        <AnalyticsProvider>
          <UserContextProvider>
            <ToastProvider>
              <CartProvider>
                <WishlistProvider>
                  <RegionProvider initialRegionKey={regionKey} initialLanguage={language}>
                    <div className="flex flex-col min-h-screen">
                      <a href="#main-content" className="skip-link">Skip to main content</a>
                      <Header announcementMessages={ANNOUNCEMENTS} />
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
