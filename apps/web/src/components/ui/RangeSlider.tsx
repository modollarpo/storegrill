'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
  className?: string;
}

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatLabel = (v) => String(v),
  className,
}: RangeSliderProps) {
  const id = useId();
  const [low, high] = value;

  const pctLow  = ((low  - min) / (max - min)) * 100;
  const pctHigh = ((high - min) / (max - min)) * 100;

  function handleLow(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.min(Number(e.target.value), high - step);
    onChange([v, high]);
  }

  function handleHigh(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.max(Number(e.target.value), low + step);
    onChange([low, v]);
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Track */}
      <div className="relative h-1.5 bg-surface-sunken rounded-full mx-2 my-5">
        {/* Active range fill */}
        <div
          className="absolute h-full bg-action-primary rounded-full"
          style={{ left: `${pctLow}%`, width: `${pctHigh - pctLow}%` }}
        />

        {/* Low thumb */}
        <input
          type="range"
          id={`${id}-low`}
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={handleLow}
          aria-label="Minimum price"
          aria-valuetext={formatLabel(low)}
          className={cn(
            'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
            'pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto',
            '[&::-moz-range-thumb]:pointer-events-auto',
          )}
        />

        {/* High thumb */}
        <input
          type="range"
          id={`${id}-high`}
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={handleHigh}
          aria-label="Maximum price"
          aria-valuetext={formatLabel(high)}
          className={cn(
            'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
            'pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto',
            '[&::-moz-range-thumb]:pointer-events-auto',
          )}
        />

        {/* Visual thumbs */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-surface-raised border-2 border-action-primary shadow-md transition-transform hover:scale-110 active:scale-95 focus-within:ring-2 focus-within:ring-action-primary/30"
          style={{ left: `${pctLow}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-surface-raised border-2 border-action-primary shadow-md transition-transform hover:scale-110 active:scale-95"
          style={{ left: `${pctHigh}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex-1">
          <label htmlFor={`${id}-low`} className="sr-only">Min</label>
          <div className="h-10 px-3 flex items-center rounded-lg border border-border bg-surface text-sm font-bold text-text-primary tabular-nums">
            {formatLabel(low)}
          </div>
        </div>
        <span className="text-text-tertiary font-bold text-sm shrink-0">–</span>
        <div className="flex-1">
          <label htmlFor={`${id}-high`} className="sr-only">Max</label>
          <div className="h-10 px-3 flex items-center rounded-lg border border-border bg-surface text-sm font-bold text-text-primary tabular-nums">
            {formatLabel(high)}
          </div>
        </div>
      </div>
    </div>
  );
}
