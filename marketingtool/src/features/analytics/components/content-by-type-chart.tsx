"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Validated against both light (#fcfcfb) and dark (#1a1a19) surfaces.
const CHART_ACCENT = "#6FB941";

interface ContentByTypeChartProps {
  data: { label: string; count: number }[];
}

export function ContentByTypeChart({ data }: ContentByTypeChartProps) {
  const config = {
    count: { label: "Generations", color: CHART_ACCENT },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      config={config}
      className="w-full"
      style={{ height: Math.max(160, data.length * 36) }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
        barSize={16}
      >
        <CartesianGrid horizontal={false} strokeOpacity={0.35} />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.06 }}
          content={<ChartTooltipContent hideIndicator />}
        />
        <Bar
          dataKey="count"
          fill={CHART_ACCENT}
          radius={[0, 4, 4, 0]}
          label={{
            position: "right",
            fontSize: 11,
            className: "fill-muted-foreground",
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}
