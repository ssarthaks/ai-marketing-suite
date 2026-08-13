import { PageSkeleton } from "@/components/page-skeleton";

export default function LeadsLoading() {
  return <PageSkeleton cards={1} cardHeight="h-96" columns="grid-cols-1" />;
}
