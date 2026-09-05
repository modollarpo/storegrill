'use client';

import React, { useState } from 'react';
import { MobileBottomNav } from './MobileBottomNav';

export function MobileBottomNavWrapper({ categories }: { categories: any[] }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <>
      <MobileBottomNav 
        onOpenSearch={() => {
          // Focus search bar if present or trigger search modal/scroll
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }} 
        onOpenCategories={() => {
          // Open mobile hamburger menu categories
          const menuBtn = document.querySelector('button[aria-label="Open menu"]') as HTMLButtonElement;
          if (menuBtn) menuBtn.click();
        }} 
      />
    </>
  );
}
