import { PageSkeleton } from "@/components/page-skeleton";

export default function SettingsLoading() {
  return (
    <PageSkeleton toolbar={false} cards={1} cardHeight="h-[32rem]" columns="grid-cols-1" />
  );
}
