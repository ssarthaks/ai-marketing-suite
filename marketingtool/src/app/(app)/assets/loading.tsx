import { PageSkeleton } from "@/components/page-skeleton";

export default function AssetsLoading() {
  return (
    <PageSkeleton
      cards={8}
      cardHeight="h-40"
      columns="grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
    />
  );
}
