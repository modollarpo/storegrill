'use client';

import { VendorGuideLayout } from '@/components/VendorGuide';
import { VENDOR_GUIDES, vendorGuideBySlug } from '@/lib/vendor-guides';

export default function VendorPayoutsGuidePage() {
  const guide = vendorGuideBySlug('payouts');
  if (!guide) return null;
  const related = VENDOR_GUIDES.filter(g => g.slug !== 'payouts');
  return <VendorGuideLayout guide={guide} related={related} />;
}