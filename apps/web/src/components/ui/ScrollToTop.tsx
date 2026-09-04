'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

export function ScrollToTop({ threshold = 400, className }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  function scrollUp() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Scroll to top"
      className={cn(
        'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gray-900 text-white shadow-xl',
        'flex items-center justify-center transition-all duration-300',
        'hover:bg-action-primary hover:shadow-2xl hover:-translate-y-1 active:scale-95',
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none',
        className
      )}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}
