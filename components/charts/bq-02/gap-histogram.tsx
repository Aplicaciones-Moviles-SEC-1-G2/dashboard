"use client";

import { BarChart } from "@tremor/react";

import type { HistogramBin } from "@/lib/types/bq-02";

interface BQ02GapHistogramProps {
  histogram: readonly HistogramBin[];
}

interface BarDatum {
  label: string;
  count: number;
}

function buildData(histogram: readonly HistogramBin[]): BarDatum[] {
  return histogram.map((bin) => ({
    label: bin.label,
    count: bin.count,
  }));
}

export function BQ02GapHistogram({
  histogram,
}: BQ02GapHistogramProps): React.JSX.Element {
  const data = buildData(histogram);
  return (
    <BarChart
      className="h-full"
      data={data}
      index="label"
      categories={["count"]}
      colors={["indigo"]}
      valueFormatter={(v: number) => v.toLocaleString()}
      yAxisWidth={48}
      showLegend={false}
      showGridLines
    />
  );
}
