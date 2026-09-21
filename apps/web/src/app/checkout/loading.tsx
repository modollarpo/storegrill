import { Skeleton } from '@/components/ui/Skeleton';

export default function CheckoutLoading() {
  return (
    <div className="container-site py-6 md:py-10 animate-fade-in">
      <Skeleton width={180} height={32} rounded="sm" className="mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[30px]">
        <div className="space-y-5">
          <div className="p-5 bg-surface-raised rounded-xl border border-border space-y-4">
            <Skeleton width={160} height={20} rounded="sm" />
            <Skeleton width="100%" height={44} rounded="lg" />
            <Skeleton width="100%" height={44} rounded="lg" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton width="100%" height={44} rounded="lg" className="col-span-2" />
              <Skeleton width="100%" height={44} rounded="lg" />
            </div>
            <Skeleton width="100%" height={44} rounded="lg" />
          </div>
          <div className="p-5 bg-surface-raised rounded-xl border border-border space-y-4">
            <Skeleton width={120} height={20} rounded="sm" />
            <Skeleton width="100%" height={60} rounded="lg" />
            <Skeleton width="100%" height={60} rounded="lg" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton width="100%" height={300} rounded="xl" />
          <Skeleton width="100%" height={48} rounded="lg" />
        </div>
      </div>
    </div>
  );
}
