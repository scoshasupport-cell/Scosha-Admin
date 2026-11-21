import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#e8e8e8]", className)}
      aria-hidden
    />
  )
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)} aria-hidden>
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3.5 w-[88%]" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 xl:grid-cols-4",
        className,
      )}
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProductRailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="space-y-4" role="status" aria-label="Loading collection">
      <div className="flex items-end justify-between gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div
      className="store-container grid gap-8 py-8 lg:grid-cols-2 lg:gap-12"
      role="status"
      aria-label="Loading product"
    >
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-4">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-7 w-[90%]" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-2 pt-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-12 rounded-md" />
          ))}
        </div>
        <Skeleton className="mt-4 h-12 w-full rounded-md" />
      </div>
    </div>
  )
}

export function CartLineSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading bag">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-24 w-20 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
