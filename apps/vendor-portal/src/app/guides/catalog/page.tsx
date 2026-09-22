'use client';

import { VendorGuideLayout } from '@/components/VendorGuide';
import { VENDOR_GUIDES, vendorGuideBySlug } from '@/lib/vendor-guides';

export default function VendorCatalogGuidePage() {
  const guide = vendorGuideBySlug('catalog');
  if (!guide) return null;
  const related = VENDOR_GUIDES.filter(g => g.slug !== 'catalog');
  return <VendorGuideLayout guide={guide} related={related} />;
}