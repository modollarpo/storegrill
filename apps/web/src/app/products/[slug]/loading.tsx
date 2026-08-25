import { Skeleton, SkeletonProductGrid } from '@/components/ui/Skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="container-site py-4 md:py-8 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 md:mb-8">
        <Skeleton width={80} height={16} rounded="sm" />
        <Skeleton width={16} height={16} rounded="sm" />
        <Skeleton width={180} height={16} rounded="sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_420px] gap-8 xl:gap-16">
        {/* Left: Image gallery */}
        <div className="space-y-4">
          <Skeleton className="w-full aspect-square" rounded="2xl" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="w-20 h-20 shrink-0" rounded="xl" />
            ))}
          </div>
        </div>

        {/* Right: Product info */}
        <div className="space-y-8">
          <div className="space-y-4">
            {/* Vendor + category badge */}
            <div className="flex flex-wrap gap-2">
              <Skeleton width={90} height={26} rounded="full" />
              <Skeleton width={70} height={26} rounded="full" />
            </div>

            {/* Title */}
            <Skeleton lines={2} height="2.5rem" className="w-11/12" />

            {/* Rating */}
            <div className="flex items-center gap-3">
              <Skeleton width={120} height={20} rounded="sm" />
              <Skeleton width={70} height={20} rounded="sm" />
            </div>
          </div>

          <hr className="border-surface-200" />

          {/* Price */}
          <div className="space-y-2">
            <Skeleton width={160} height={44} rounded="sm" />
            <Skeleton width={120} height={16} rounded="sm" />
          </div>

          {/* Variant picker */}
          <div className="space-y-3">
            <Skeleton width={100} height={16} rounded="sm" />
            <div className="flex flex-wrap gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} width={64} height={44} rounded="lg" />
              ))}
            </div>
          </div>

          {/* Buy Box */}
          <div className="bg-surface border border-surface-200 p-6 rounded-2xl shadow-sm space-y-4">
            {/* Qty + Add to cart */}
            <div className="flex gap-4">
              <Skeleton width={120} height={52} rounded="xl" />
              <Skeleton className="flex-1" height={52} rounded="xl" />
            </div>

            {/* Shipping info */}
            <Skeleton className="w-full" height={64} rounded="xl" />
          </div>

          {/* Short description */}
          <Skeleton lines={4} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16 md:mt-24">
        <div className="flex gap-2 border-b border-surface-200 mb-8 overflow-x-auto">
          {[160, 120, 140, 180].map((w, i) => (
            <Skeleton key={i} width={w} height={44} rounded="lg" className="shrink-0" />
          ))}
        </div>
        <div className="max-w-4xl space-y-6">
          <Skeleton lines={4} />
          <Skeleton lines={6} />
        </div>
      </div>

      {/* Related products */}
      <div className="mt-16 md:mt-24 border-t border-surface-200 pt-16">
        <Skeleton width={240} height={32} className="mb-8" rounded="sm" />
        <SkeletonProductGrid count={4} />
      </div>
    </div>
  );
}
