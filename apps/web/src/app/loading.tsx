import { SkeletonProductGrid, Skeleton } from '@/components/ui/Skeleton';

export default function HomeLoading() {
  return (
    <div className="animate-fade-in w-full pb-20">
      {/* Premium Hero skeleton */}
      <div className="relative w-full h-[400px] md:h-[500px] bg-surface-950 overflow-hidden mb-8 md:mb-16">
        <div className="absolute inset-0 bg-shimmer bg-[length:200%_100%] animate-shimmer opacity-10" />
        <div className="container-site h-full flex flex-col justify-center">
          <Skeleton width="50%" height="3.5rem" rounded="lg" className="mb-4 bg-surface-800" />
          <Skeleton width="40%" height="1.5rem" rounded="md" className="mb-8 bg-surface-800" />
          <Skeleton width="180px" height="3rem" rounded="full" className="bg-surface-800" />
        </div>
      </div>

      {/* Category row skeleton */}
      <div className="container-site mb-12 md:mb-20">
        <div className="flex justify-between items-center mb-6">
          <Skeleton width="200px" height="2rem" rounded="md" />
        </div>
        <div className="flex gap-4 md:gap-6 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3 shrink-0">
              <Skeleton width={80} height={80} rounded="full" />
              <Skeleton width={64} height={12} rounded="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Featured products */}
      <div className="container-site mb-16">
        <Skeleton width="220px" height="2.5rem" className="mb-6" rounded="md" />
        <SkeletonProductGrid count={8} />
      </div>

      {/* Deals section */}
      <div className="container-site mb-16">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton width="180px" height="2.5rem" rounded="md" />
          <Skeleton width="100px" height="2.5rem" rounded="xl" />
        </div>
        <SkeletonProductGrid count={4} />
      </div>
    </div>
  );
}
