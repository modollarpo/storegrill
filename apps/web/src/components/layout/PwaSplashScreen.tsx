'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Loaders';

export function PwaSplashScreen() {
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Start fading out after 500ms
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 500);

    // Unmount completely after transition finishes (500ms transition + 500ms delay)
    const unmountTimer = setTimeout(() => {
      setMounted(false);
    }, 1000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`} suppressHydrationWarning
    >
      <div className="relative z-10 flex flex-col items-center">
        <Spinner size="lg" />
      </div>
    </div>
  );
}
