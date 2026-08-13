import { Skeleton } from "@/components/ui/skeleton";

export default function AiMediaGenLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-[500px] lg:col-span-5 rounded-xl" />
        <Skeleton className="h-[500px] lg:col-span-7 rounded-xl" />
      </div>
    </div>
  );
}
