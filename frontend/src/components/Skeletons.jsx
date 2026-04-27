export function DealCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse" data-testid="deal-card-skeleton">
      <div className="aspect-[4/3] rounded-xl bg-gray-200 mb-4" />
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-16 bg-gray-200 rounded-lg" />
        <div className="h-6 w-16 bg-gray-200 rounded-lg" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3 w-16 bg-gray-200 rounded" />
        <div className="h-3 w-12 bg-gray-200 rounded" />
      </div>
      <div className="h-5 w-full bg-gray-200 rounded mb-1" />
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-full bg-gray-100 rounded mb-1" />
      <div className="h-4 w-2/3 bg-gray-100 rounded mb-4" />
      <div className="h-12 w-full bg-gray-200 rounded-xl" />
    </div>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center animate-pulse" data-testid="store-card-skeleton">
      <div className="w-16 h-16 rounded-xl bg-gray-200 mb-3" />
      <div className="h-4 w-20 bg-gray-200 rounded" />
    </div>
  );
}

export function CouponCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse" data-testid="coupon-card-skeleton">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-3 w-12 bg-gray-200 rounded" />
            </div>
            <div className="h-5 w-full bg-gray-200 rounded mb-1" />
            <div className="h-5 w-2/3 bg-gray-200 rounded" />
          </div>
          <div className="ml-3 h-8 w-20 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-4 w-full bg-gray-100 rounded mb-1" />
        <div className="h-4 w-1/2 bg-gray-100 rounded mb-3" />
        <div className="flex items-center gap-3">
          <div className="h-7 w-16 bg-gray-200 rounded-lg" />
          <div className="h-5 w-16 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="border-t border-dashed border-gray-200 px-5 py-4 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-14 bg-gray-200 rounded-xl" />
          <div className="h-12 w-20 bg-gray-200 rounded-xl" />
        </div>
        <div className="mt-3 h-5 w-32 bg-gray-100 rounded mx-auto" />
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="py-8 md:py-12 animate-pulse" data-testid="hero-skeleton">
      <div className="max-w-3xl mx-auto text-center px-4">
        <div className="h-12 w-3/4 bg-gray-200 rounded-xl mx-auto mb-4" />
        <div className="h-6 w-1/2 bg-gray-100 rounded mx-auto mb-8" />
        <div className="flex justify-center gap-4">
          <div className="h-12 w-40 bg-gray-200 rounded-xl" />
          <div className="h-12 w-40 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="aspect-square rounded-2xl bg-gray-200 animate-pulse" data-testid="category-card-skeleton" />
  );
}

export function SectionSkeleton({ title, count = 4, type = 'deal' }) {
  const Skeleton = type === 'store' ? StoreCardSkeleton : DealCardSkeleton;
  const gridCols = type === 'store'
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="py-6" data-testid="section-skeleton">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && (
          <div className="flex items-center gap-2 mb-6">
            <div className="h-6 w-6 bg-gray-200 rounded" />
            <div className="h-7 w-40 bg-gray-200 rounded" />
          </div>
        )}
        <div className={`grid ${gridCols} gap-6`}>
          {[...Array(count)].map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
