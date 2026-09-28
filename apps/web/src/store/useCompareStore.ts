import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MAX_COMPARE = 4;

export type CompareToggleResult = 'added' | 'removed' | 'at-limit';

interface CompareState {
  productIds: string[];
  toggleProduct: (id: string) => CompareToggleResult;
  removeProduct: (id: string) => void;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      productIds: [],
      /**
       * Returns why the toggle did what it did so the caller can explain a
       * refused addition. A silently ignored fifth pick reads as a broken
       * button, so the limit is reported rather than swallowed.
       */
      toggleProduct: (id: string) => {
        const current = get().productIds;
        if (current.includes(id)) {
          set({ productIds: current.filter(pId => pId !== id) });
          return 'removed';
        }
        if (current.length >= MAX_COMPARE) return 'at-limit';
        set({ productIds: [...current, id] });
        return 'added';
      },
      removeProduct: (id: string) => {
        set({ productIds: get().productIds.filter(pId => pId !== id) });
      },
      clearCompare: () => set({ productIds: [] }),
    }),
    {
      name: 'storegrill-compare-storage',
      version: 1,
      // A tray persisted before the limit was lowered must not resurrect more
      // items than the UI can render, so stored ids are trimmed on rehydrate.
      migrate: (persisted: unknown) => {
        const state = persisted as { productIds?: unknown };
        const ids = Array.isArray(state?.productIds) ? (state.productIds as string[]) : [];
        return { productIds: ids.filter(id => typeof id === 'string').slice(0, MAX_COMPARE) };
      },
    }
  )
);
