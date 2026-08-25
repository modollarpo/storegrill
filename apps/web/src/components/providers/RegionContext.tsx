'use client';

import { createContext, useContext, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { t } from '@/i18n';

interface RegionContextValue {
  regionKey: string;
  language: string;
  setRegion: (key: string) => void;
  setLanguage: (code: string) => void;
}

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({
  children,
  initialRegionKey,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialRegionKey: string;
  initialLanguage: string;
}) {
  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);

  const regionKey = useStore(s => s.regionKey);
  const language = useStore(s => s.language);
  const hydrated = useStore(s => s.hydrated);
  const setRegion = useStore(s => s.setRegion);
  const setLanguage = useStore(s => s.setLanguage);

  return (
    <RegionContext.Provider value={{
      regionKey: hydrated ? regionKey : initialRegionKey,
      language: hydrated ? language : initialLanguage,
      setRegion,
      setLanguage,
    }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error('useRegion must be used within RegionProvider');
  return ctx;
}

export function useTranslations(_namespace?: string) {
  const language = useStore(s => s.language);
  return (key: string, ...args: Array<string | number>): string => t(language, key, ...args);
}
