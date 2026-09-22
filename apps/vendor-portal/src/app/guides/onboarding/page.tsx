'use client';

import { VendorGuideLayout } from '@/components/VendorGuide';
import { VENDOR_GUIDES, vendorGuideBySlug } from '@/lib/vendor-guides';

export default function VendorOnboardingGuidePage() {
  const guide = vendorGuideBySlug('onboarding');
  if (!guide) return null;
  const related = VENDOR_GUIDES.filter(g => g.slug !== 'onboarding');
  return <VendorGuideLayout guide={guide} related={related} />;
}