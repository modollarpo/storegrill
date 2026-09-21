import { Skeleton } from '@/components/ui/Skeleton';

export default function AccountLoading() {
  return (
    <div className="container-site py-8 lg:py-12 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="hidden lg:block w-[240px] shrink-0 space-y-6">
          <Skeleton width={140} height={28} rounded="sm" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} width={120 + i * 8} height={16} rounded="sm" />
            ))}
          </div>
        </aside>
        <div className="flex-1 space-y-6">
          <Skeleton width={200} height={28} rounded="sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 bg-surface-raised rounded-xl border border-border space-y-3">
                <Skeleton width={100} height={16} rounded="sm" />
                <Skeleton width="80%" height={20} rounded="sm" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-surface-raised rounded-xl border border-border">
                <Skeleton width={48} height={48} rounded="lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton width="50%" height={16} rounded="sm" />
                  <Skeleton width="30%" height={14} rounded="sm" />
                </div>
                <Skeleton width={60} height={24} rounded="md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
