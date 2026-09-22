'use client';

import { VendorGuideLayout } from '@/components/VendorGuide';
import { VENDOR_GUIDES, vendorGuideBySlug } from '@/lib/vendor-guides';

export default function VendorFulfillmentGuidePage() {
  const guide = vendorGuideBySlug('fulfillment');
  if (!guide) return null;
  const related = VENDOR_GUIDES.filter(g => g.slug !== 'fulfillment');
  return <VendorGuideLayout guide={guide} related={related} />;
}