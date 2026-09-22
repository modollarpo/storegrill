'use client';

import { VendorGuideLayout } from '@/components/VendorGuide';
import { VENDOR_GUIDES, vendorGuideBySlug } from '@/lib/vendor-guides';

export default function VendorImportsGuidePage() {
  const guide = vendorGuideBySlug('imports');
  if (!guide) return null;
  const related = VENDOR_GUIDES.filter(g => g.slug !== 'imports');
  return <VendorGuideLayout guide={guide} related={related} />;
}