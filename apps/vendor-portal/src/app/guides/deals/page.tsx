'use client';

import { VendorGuideLayout } from '@/components/VendorGuide';
import { VENDOR_GUIDES, vendorGuideBySlug } from '@/lib/vendor-guides';

export default function VendorDealsGuidePage() {
  const guide = vendorGuideBySlug('deals');
  if (!guide) return null;
  const related = VENDOR_GUIDES.filter(g => g.slug !== 'deals');
  return <VendorGuideLayout guide={guide} related={related} />;
}