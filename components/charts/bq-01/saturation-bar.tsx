"use client";

import { BarChart } from "@tremor/react";

import type { HourBucket } from "@/lib/types/bq-01";

interface BQ01SaturationBarProps {
  hourBuckets: readonly HourBucket[];
}

function padHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

interface BarDatum {
  hour: string;
  saturationMinutes: number;
}

function buildData(hourBuckets: readonly HourBucket[]): BarDatum[] {
  return hourBuckets.map((b) => ({
    hour: padHour(b.hour),
    saturationMinutes: Number(b.saturationMinutes.toFixed(2)),
  }));
}

export function BQ01SaturationBar({
  hourBuckets,
}: BQ01SaturationBarProps): React.JSX.Element {
  const data = buildData(hourBuckets);
  return (
    <BarChart
      className="h-full"
      data={data}
      index="hour"
      categories={["saturationMinutes"]}
      colors={["red"]}
      valueFormatter={(v: number) => `${v.toFixed(0)} min`}
      yAxisWidth={48}
      showLegend={false}
      showGridLines
    />
  );
}
