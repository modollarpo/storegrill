import type { Metadata } from 'next';
import { OfflineActions } from './OfflineActions';

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="container-fluid py-16 md:py-24 flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-full bg-surface-sunken flex items-center justify-center" aria-hidden="true">
        <svg className="w-12 h-12 text-action-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v3.75m0 3.75h.007v.008H12v-.008zM2.436 12.507l8.43-8.43a1.125 1.125 0 011.59 0l8.43 8.43c.212.212.32.494.32.786v8.42c0 .621-.504 1.125-1.125 1.125H3.75A1.125 1.125 0 012.625 21.71v-8.42c0-.291.108-.573.32-.786z" />
        </svg>
      </div>
      <h1 className="mt-6 text-2xl md:text-3xl font-bold text-text-primary">You&apos;re offline</h1>
      <p className="mt-3 max-w-md text-text-secondary leading-relaxed">
        It looks like you&apos;ve lost your internet connection. Pages you visited recently are still
        available — everything else will come back as soon as you&apos;re reconnected.
      </p>
      <OfflineActions />
    </div>
  );
}
