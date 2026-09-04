'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useAnalytics } from '@/components/providers/AnalyticsProvider';

export function WaitingRoomClient({ children }: { children: ReactNode }) {
  // Simulate high-traffic waiting room (randomised 20% chance of queue)
  const [inQueue, setInQueue] = useState(false);
  const [position, setPosition] = useState(0);
  const { track } = useAnalytics();

  useEffect(() => {
    // Only run once per session (using sessionStorage to persist bypass)
    const hasPassed = sessionStorage.getItem('queue_passed');
    if (hasPassed) return;

    // Simulate high traffic surge protection (Currys Queue-it pattern)
    const isSurge = Math.random() < 0.2; // 20% chance of queue for demo purposes
    if (isSurge) {
      setInQueue(true);
      setPosition(Math.floor(Math.random() * 500) + 150);
      
      track({ event: 'page_view', page_type: 'waiting_room' });
    } else {
      sessionStorage.setItem('queue_passed', '1');
    }
  }, [track]);

  useEffect(() => {
    if (!inQueue) return;

    // Drain the queue slowly
    const interval = setInterval(() => {
      setPosition(prev => {
        const next = prev - Math.floor(Math.random() * 20);
        if (next <= 0) {
          clearInterval(interval);
          setInQueue(false);
          sessionStorage.setItem('queue_passed', '1');
          return 0;
        }
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [inQueue]);

  if (inQueue) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-surface-page p-6 text-center animate-fade-in">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-10 shadow-xl">
          <div className="mx-auto w-16 h-16 mb-6 rounded-full border-4 border-border border-t-action-primary animate-spin" />
          <h1 className="text-2xl font-black text-text-primary mb-3">You are in the virtual queue</h1>
          <p className="text-text-secondary font-medium mb-8 leading-relaxed">
            Due to extremely high demand for Today&apos;s Deals, we have placed you in a waiting room to ensure a smooth shopping experience.
          </p>
          
          <div className="bg-surface-sunken border border-border rounded-xl p-6 mb-8">
            <p className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-2">People ahead of you</p>
            <p className="text-4xl font-black text-action-primary tabular-nums flip-digit">
              <span>{position}</span>
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-text-secondary font-bold">Please do not refresh this page.</p>
            <p className="text-xs text-text-tertiary">Queue ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
