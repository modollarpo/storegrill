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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-midnight transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[120%] bg-ember rounded-full blur-[120px] opacity-60 pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-30%] right-[10%] w-[60%] h-[80%] bg-deal rounded-full blur-[100px] opacity-30 pointer-events-none mix-blend-screen" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Brand Logo / Icon */}
        <div className="mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" alt="Storegrill" className="h-[48px] w-auto animate-pulse" />
        </div>
        
        <Spinner size="lg" />
      </div>
    </div>
  );
}
