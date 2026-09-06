'use client';

import React, { useState } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileSearchOverlay } from '../search/MobileSearchOverlay';

export function MobileBottomNavWrapper({ categories }: { categories: any[] }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <MobileBottomNav
        onOpenSearch={() => setSearchOpen(true)}
        onOpenCategories={() => window.dispatchEvent(new Event('storegrill:open-menu'))}
      />
      <MobileSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}