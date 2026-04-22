"use client";

import { AreaChart } from "@tremor/react";

import type { BQ08ArrivalBucket } from "@/lib/types/bq-08";

interface BQ08ArrivalCurveProps {
  buckets: readonly BQ08ArrivalBucket[];
  threshold: number;
  recommendationLabel: string | null;
}

interface AreaDatum {
  label: string;
  pSpotsAvailable: number;
  threshold: number;
}

function buildData(
  buckets: readonly BQ08ArrivalBucket[],
  threshold: number,
): AreaDatum[] {
  return buckets.map((b) => ({
    label: b.label,
    pSpotsAvailable: Number((b.pSpotsAvailable * 100).toFixed(2)),
    threshold: Number((threshold * 100).toFixed(2)),
  }));
}

export function BQ08ArrivalCurve({
  buckets,
  threshold,
  recommendationLabel,
}: BQ08ArrivalCurveProps): React.JSX.Element {
  const data = buildData(buckets, threshold);
  return (
    <div className="flex h-full flex-col gap-2">
      <AreaChart
        className="h-full"
        data={data}
        index="label"
        categories={["pSpotsAvailable", "threshold"]}
        colors={["blue", "red"]}
        valueFormatter={(v: number) => `${v.toFixed(0)}%`}
        yAxisWidth={48}
        showLegend
        showGridLines
      />
      {recommendationLabel ? (
        <p className="text-[11px] text-muted-foreground">
          Recommended window: {recommendationLabel}
        </p>
      ) : null}
    </div>
  );
}
