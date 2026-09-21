import { Skeleton } from '@/components/ui/Skeleton';

export default function CartLoading() {
  return (
    <div className="container-site py-8 lg:py-12 animate-fade-in">
      <Skeleton width={200} height={32} rounded="sm" className="mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4 bg-surface-raised rounded-xl border border-border">
              <Skeleton width={96} height={96} rounded="lg" />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" height={18} rounded="sm" />
                <Skeleton width="40%" height={14} rounded="sm" />
                <div className="flex items-center gap-3 mt-3">
                  <Skeleton width={32} height={32} rounded="md" />
                  <Skeleton width={40} height={18} rounded="sm" />
                  <Skeleton width={32} height={32} rounded="md" />
                </div>
              </div>
              <Skeleton width={80} height={20} rounded="sm" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton width="100%" height={200} rounded="xl" />
          <Skeleton width="100%" height={48} rounded="lg" />
        </div>
      </div>
    </div>
  );
}
