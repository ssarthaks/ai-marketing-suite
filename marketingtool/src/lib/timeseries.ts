import { format, startOfDay, subDays } from "date-fns";

export interface DailyPoint {
  date: string;
  label: string;
  count: number;
}

/** Bucket timestamps into a contiguous per-day series covering the last N days. */
export function buildDailySeries(dates: Date[], days: number): DailyPoint[] {
  const today = startOfDay(new Date());
  const buckets = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    buckets.set(format(subDays(today, i), "yyyy-MM-dd"), 0);
  }
  for (const date of dates) {
    const key = format(startOfDay(date), "yyyy-MM-dd");
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({
    date,
    label: format(new Date(`${date}T00:00:00`), "MMM d"),
    count,
  }));
}
