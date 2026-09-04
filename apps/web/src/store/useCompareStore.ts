import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompareState {
  productIds: string[];
  toggleProduct: (id: string) => void;
  removeProduct: (id: string) => void;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      productIds: [],
      toggleProduct: (id: string) => {
        const current = get().productIds;
        if (current.includes(id)) {
          set({ productIds: current.filter((pId) => pId !== id) });
        } else {
          // Max 4 items to compare
          if (current.length < 4) {
            set({ productIds: [...current, id] });
          }
        }
      },
      removeProduct: (id: string) => {
        set({ productIds: get().productIds.filter((pId) => pId !== id) });
      },
      clearCompare: () => set({ productIds: [] }),
    }),
    {
      name: 'storegrill-compare-storage',
    }
  )
);
