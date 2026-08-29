import { SkeletonProductGrid, Skeleton } from '@/components/ui/Skeleton';

export default function ProductsLoading() {
  return (
    <div className="container-site py-8 lg:py-12 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
        {/* Sidebar filter skeleton */}
        <aside className="hidden lg:block w-[260px] shrink-0 space-y-10">
          <div>
            <Skeleton width={120} height={24} rounded="sm" className="mb-6" />
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton width={20} height={20} rounded="sm" />
                  <Skeleton width={100 + i * 15} height={16} rounded="sm" />
                </div>
              ))}
            </div>
          </div>
          
          <hr className="border-gray-200" />
          
          <div>
            <Skeleton width={90} height={24} rounded="sm" className="w-full mb-4" />
            <div className="flex items-center justify-between">
              <Skeleton width={70} height={36} rounded="md" />
              <span className="text-gray-400 font-bold">-</span>
              <Skeleton width={70} height={36} rounded="md" />
            </div>
          </div>

          <hr className="border-gray-200" />
          
          <div>
            <Skeleton width={110} height={24} rounded="sm" className="mb-6" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton width={20} height={20} rounded="sm" />
                  <Skeleton width={80 + i * 12} height={16} rounded="sm" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header & Sort bar */}
          <div className="mb-8">
            <Skeleton width="40%" height={36} rounded="sm" className="mb-6" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-y border-gray-200">
              <Skeleton width={180} height={16} rounded="sm" />
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Skeleton width={200} height={44} rounded="lg" />
                <Skeleton width={120} height={44} rounded="lg" />
              </div>
            </div>
          </div>
          <SkeletonProductGrid count={12} />
        </div>
      </div>
    </div>
  );
}
