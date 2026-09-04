'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PdpImageGalleryProps {
  images: string[];
  productName: string;
  discountPct: number;
}

export function PdpImageGallery({ images, productName, discountPct }: PdpImageGalleryProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div
        className="relative w-full aspect-square border border-border rounded-2xl overflow-hidden bg-surface shadow-sm group cursor-zoom-in"
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        {images.length > 0 ? (
          <Image
            src={images[activeImage]}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
            priority
            className="object-contain p-12 mix-blend-multiply transition-transform duration-300"
            style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-surface-sunken text-text-tertiary font-bold text-5xl">
            {productName.slice(0, 1)}
          </div>
        )}

        {discountPct > 0 && (
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-deal text-white text-xs font-bold uppercase tracking-wider shadow">
            -{discountPct}%
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-4 overflow-x-auto scrollbar-none snap-x pb-1" role="list" aria-label="Product images">
          {images.slice(0, 8).map((img, i) => (
            <li key={img} className="snap-start shrink-0">
              <button
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1} of ${productName}`}
                aria-current={i === activeImage}
                className={cn(
                  'relative w-20 h-20 rounded-lg border-2 overflow-hidden bg-surface transition-all',
                  i === activeImage
                    ? 'border-action-primary'
                    : 'border-transparent hover:border-border'
                )}
              >
                <Image src={img} alt="" fill sizes="80px" className="object-contain p-2 mix-blend-multiply" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
