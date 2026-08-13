import { PageSkeleton } from "@/components/page-skeleton";

export default function AiStudioLoading() {
  return (
    <PageSkeleton
      toolbar={false}
      cards={2}
      cardHeight="h-[28rem]"
      columns="lg:grid-cols-2"
    />
  );
}
