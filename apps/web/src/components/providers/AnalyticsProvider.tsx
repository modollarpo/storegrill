'use client';

import { createContext, useContext, useEffect, ReactNode, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export interface DataLayerEvent {
  event: 'page_view' | 'searchhit' | 'detail' | 'add_to_cart' | 'purchase';
  page_type?: string;
  search_term?: string;
  product_id?: string;
  product_name?: string;
  category?: string;
  value?: number;
  currency?: string;
  ecommerce?: any;
}

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
  }
}

interface AnalyticsContextType {
  track: (event: DataLayerEvent) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  track: () => {},
});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize dataLayer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
    }
  }, []);

  const track = useCallback((event: DataLayerEvent) => {
    if (typeof window !== 'undefined') {
      window.dataLayer.push(event);
      if (process.env.NODE_ENV === 'development') {
        console.debug('[DataLayer]', event);
      }
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (pathname) {
      const pageType = pathname === '/' ? 'homepage' 
        : pathname.startsWith('/products/') ? 'product_detail'
        : pathname.startsWith('/products') ? 'category_list'
        : pathname.startsWith('/search') ? 'search_results'
        : pathname.startsWith('/cart') ? 'cart'
        : pathname.startsWith('/checkout') ? 'checkout'
        : 'other';

      track({
        event: 'page_view',
        page_type: pageType,
      });
      
      if (pageType === 'search_results' && searchParams) {
        track({
          event: 'searchhit',
          search_term: searchParams.get('q') || '',
        });
      }
    }
  }, [pathname, searchParams, track]);

  return (
    <AnalyticsContext.Provider value={{ track }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
