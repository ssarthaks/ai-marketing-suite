import { PageSkeleton } from "@/components/page-skeleton";

export default function AnalyticsLoading() {
  return (
    <PageSkeleton
      toolbar={false}
      cards={4}
      cardHeight="h-72"
      columns="lg:grid-cols-2"
    />
  );
}
