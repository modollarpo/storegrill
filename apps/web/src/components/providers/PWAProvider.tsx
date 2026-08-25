'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/feedback/Toast';

const DISMISS_KEY = 'sg-install-dismissed';
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PWAProvider() {
  const { toast } = useToast();
  const [updateReady, setUpdateReady] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  const installPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then(registration => {
      const checkWaiting = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorker.current = registration.waiting;
          setUpdateReady(true);
        }
      };
      checkWaiting();
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker.current = installing;
            setUpdateReady(true);
          }
        });
      });
    }).catch(() => {});

    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {});
    }, UPDATE_CHECK_INTERVAL_MS);

    const onControllerChange = () => {
      if (waitingWorker.current && !reloading.current) {
        reloading.current = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPrompt.current = event as BeforeInstallPromptEvent;
      if (localStorage.getItem(DISMISS_KEY) !== '1') setInstallAvailable(true);
    };
    const onInstalled = () => {
      setInstallAvailable(false);
      localStorage.removeItem(DISMISS_KEY);
      toast({ variant: 'success', title: 'Storegrill installed', description: 'Find it on your home screen.' });
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    setIsOnline(navigator.onLine);
    const goOffline = () => {
      setIsOnline(false);
      toast({ variant: 'info', title: "You're offline", description: 'Recently viewed pages are still available.', duration: 6000 });
    };
    const goOnline = () => {
      setIsOnline(true);
      toast({ variant: 'success', title: 'Back online', duration: 3000 });
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [toast]);

  const applyUpdate = useCallback(() => {
    waitingWorker.current?.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  const dismissUpdate = useCallback(() => setUpdateReady(false), []);

  const install = useCallback(async () => {
    const prompt = installPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'dismissed') localStorage.setItem(DISMISS_KEY, '1');
    installPrompt.current = null;
    setInstallAvailable(false);
  }, []);

  const dismissInstall = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setInstallAvailable(false);
  }, []);

  return (
    <>
      {updateReady && (
        <div
          role="alert"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[60] rounded-xs border border-border bg-surface p-4 shadow-lg"
        >
          <p className="text-sm font-bold text-text-primary">New version available</p>
          <p className="mt-1 text-xs text-text-secondary">Refresh to get the latest Storegrill experience.</p>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={applyUpdate} className="btn btn-primary px-4 py-2 text-sm font-extrabold">
              Update now
            </button>
            <button type="button" onClick={dismissUpdate} className="text-xs font-bold text-text-secondary hover:text-text-primary">
              Later
            </button>
          </div>
        </div>
      )}

      {installAvailable && isOnline && (
        <div
          role="dialog"
          aria-label="Install Storegrill app"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-xs z-50 rounded-xs border border-border bg-surface p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <img src="/icons/icon-192.png" alt="" width={40} height={40} className="rounded-xs shrink-0" />
            <div>
              <p className="text-sm font-bold text-text-primary">Install Storegrill</p>
              <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
                Add the app to your home screen for faster shopping and offline access.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 pl-[52px]">
            <button type="button" onClick={install} className="btn btn-primary px-4 py-2 text-sm font-extrabold">
              Install
            </button>
            <button type="button" onClick={dismissInstall} className="text-xs font-bold text-text-secondary hover:text-text-primary">
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
