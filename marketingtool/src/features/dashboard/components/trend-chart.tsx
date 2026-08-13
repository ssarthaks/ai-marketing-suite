"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DailyPoint } from "@/lib/timeseries";

// Validated against both light (#fcfcfb) and dark (#1a1a19) surfaces.
const CHART_ACCENT = "#6FB941";

interface TrendChartProps {
  data: DailyPoint[];
  label: string;
  id: string;
}

export function TrendChart({ data, label, id }: TrendChartProps) {
  const config = {
    count: { label, color: CHART_ACCENT },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-56 w-full">
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeOpacity={0.35} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          width={28}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          cursor={{ strokeOpacity: 0.3 }}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Area
          dataKey="count"
          type="monotone"
          stroke={CHART_ACCENT}
          strokeWidth={2}
          fill={`url(#fill-${id})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
