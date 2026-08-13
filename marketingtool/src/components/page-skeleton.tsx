import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared route-level loading skeleton: page header, optional toolbar row,
 * then a card grid. Mirrors the layout of the list pages so content pops in
 * without layout shift.
 */
export function PageSkeleton({
  toolbar = true,
  cards = 6,
  cardHeight = "h-44",
  columns = "sm:grid-cols-2 xl:grid-cols-3",
}: {
  toolbar?: boolean;
  cards?: number;
  cardHeight?: string;
  columns?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      {toolbar && (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 flex-1 min-w-48" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      )}
      <div className={`grid gap-4 ${columns}`}>
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className={`${cardHeight} rounded-xl`} />
        ))}
      </div>
    </div>
  );
}
