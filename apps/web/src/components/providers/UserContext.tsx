'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export interface UserContextState {
  recentlyViewed: string[];
  categoryAffinity: Record<string, number>;
  cartAbandonment: boolean;
}

interface UserContextType extends UserContextState {
  trackProductView: (productId: string, categoryId?: string) => void;
  setCartAbandonment: (abandoned: boolean) => void;
}

const DEFAULT_STATE: UserContextState = {
  recentlyViewed: [],
  categoryAffinity: {},
  cartAbandonment: false,
};

const UserContext = createContext<UserContextType>({
  ...DEFAULT_STATE,
  trackProductView: () => {},
  setCartAbandonment: () => {},
});

export function useUserContext() {
  return useContext(UserContext);
}

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserContextState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sg_user_context');
        if (stored) {
          setState(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to parse user context', e);
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('sg_user_context', JSON.stringify(state));
    }
  }, [state, isLoaded]);

  const trackProductView = useCallback((productId: string, categoryId?: string) => {
    setState(prev => {
      // Manage recently viewed queue (max 12)
      const recentlyViewed = [productId, ...prev.recentlyViewed.filter(id => id !== productId)].slice(0, 12);
      
      // Bump category affinity
      const categoryAffinity = { ...prev.categoryAffinity };
      if (categoryId) {
        categoryAffinity[categoryId] = (categoryAffinity[categoryId] || 0) + 1;
      }
      
      return { ...prev, recentlyViewed, categoryAffinity };
    });
  }, []);

  const setCartAbandonment = useCallback((abandoned: boolean) => {
    setState(prev => ({ ...prev, cartAbandonment: abandoned }));
  }, []);

  return (
    <UserContext.Provider value={{ ...state, trackProductView, setCartAbandonment }}>
      {children}
    </UserContext.Provider>
  );
}
