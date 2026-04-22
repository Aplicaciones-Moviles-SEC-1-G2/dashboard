"use client";

import { BarChart } from "@tremor/react";

import type { BQ06DailyOverstayBucket } from "@/lib/types/bq-06";

interface BQ06DailyOverstayStackedProps {
  dailyBuckets: readonly BQ06DailyOverstayBucket[];
}

interface BarDatum {
  date: string;
  registered: number;
  unregistered: number;
}

function buildData(
  buckets: readonly BQ06DailyOverstayBucket[],
): BarDatum[] {
  return buckets.map((b) => ({
    date: b.date,
    registered: b.registeredOverstays,
    unregistered: b.unregisteredOverstays,
  }));
}

export function BQ06DailyOverstayStacked({
  dailyBuckets,
}: BQ06DailyOverstayStackedProps): React.JSX.Element {
  const data = buildData(dailyBuckets);
  return (
    <BarChart
      className="h-full"
      data={data}
      index="date"
      categories={["registered", "unregistered"]}
      colors={["emerald", "orange"]}
      stack
      valueFormatter={(v: number) => v.toLocaleString()}
      yAxisWidth={40}
      showLegend
      showGridLines
    />
  );
}
