'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endsAt: Date | string;
  className?: string;
}

function parseDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : d;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

interface TimeLeft {
  h: string;
  m: string;
  s: string;
  expired: boolean;
}

function calcTimeLeft(endsAt: Date): TimeLeft {
  const diff = endsAt.getTime() - Date.now();
  if (diff <= 0) return { h: '00', m: '00', s: '00', expired: true };
  const totalSecs = Math.floor(diff / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return { h: pad(h), m: pad(m), s: pad(s), expired: false };
}

function Digit({ value }: { value: string }) {
  const prevRef = useRef(value);
  const changed = prevRef.current !== value;
  useEffect(() => { prevRef.current = value; });

  return (
    <span key={changed ? `${value}-${Date.now()}` : value} className="flip-digit tabular-nums font-black text-2xl">
      <span>{value}</span>
    </span>
  );
}

export function CountdownTimer({ endsAt, className }: CountdownTimerProps) {
  const end = parseDate(endsAt);
  const [time, setTime] = useState<TimeLeft>(() => calcTimeLeft(end));

  useEffect(() => {
    const id = setInterval(() => setTime(calcTimeLeft(end)), 1000);
    return () => clearInterval(id);
  }, [end]);

  if (time.expired) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 bg-gray-900 text-white rounded-xl px-4 py-2 shadow-lg select-none',
        className
      )}
      aria-label={`Ends in ${time.h} hours ${time.m} minutes ${time.s} seconds`}
      aria-live="off"
    >
      <div className="flex items-center gap-0.5">
        <Digit value={time.h[0]} />
        <Digit value={time.h[1]} />
      </div>
      <span className="text-xl font-black text-gray-400 pb-0.5">:</span>
      <div className="flex items-center gap-0.5">
        <Digit value={time.m[0]} />
        <Digit value={time.m[1]} />
      </div>
      <span className="text-xl font-black text-gray-400 pb-0.5">:</span>
      <div className="flex items-center gap-0.5">
        <Digit value={time.s[0]} />
        <Digit value={time.s[1]} />
      </div>
    </div>
  );
}
