"use client";

import { ProgressCircle } from "@tremor/react";

import type { BQ07ChartData } from "@/lib/types/bq-07";

interface BQ07ProbabilityGaugeProps {
  data: BQ07ChartData;
}

function colorForTier(tier: BQ07ChartData["tier"]): "emerald" | "amber" | "red" {
  if (tier === "green") return "emerald";
  if (tier === "yellow") return "amber";
  return "red";
}

export function BQ07ProbabilityGauge({
  data,
}: BQ07ProbabilityGaugeProps): React.JSX.Element {
  const pct = Math.round(data.proxyProbability * 100);
  const priorPct =
    data.bucket.pFreeSpotGt0 === null
      ? null
      : Math.round(data.bucket.pFreeSpotGt0 * 100);
  const livePct = Math.round(data.liveFreeShare * 100);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <ProgressCircle
        value={pct}
        radius={80}
        strokeWidth={10}
        color={colorForTier(data.tier)}
      >
        <div className="flex flex-col items-center">
          <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            proxy
          </span>
        </div>
      </ProgressCircle>
      <p className="text-xs text-muted-foreground">
        {priorPct === null
          ? `live ${livePct}% · historical prior unavailable`
          : `historical ${priorPct}% · live ${livePct}%`}
      </p>
    </div>
  );
}
