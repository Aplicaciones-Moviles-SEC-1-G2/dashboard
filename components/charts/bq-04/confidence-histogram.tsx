"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BQ04HistogramBin } from "@/lib/types/bq-04";

interface BQ04ConfidenceHistogramProps {
  bins: readonly BQ04HistogramBin[];
  threshold: number;
}

const CONTENT_STYLE: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--card-foreground))",
  fontSize: "12px",
};

const LABEL_STYLE: React.CSSProperties = {
  color: "hsl(var(--muted-foreground))",
};

const ITEM_STYLE: React.CSSProperties = {
  color: "hsl(var(--card-foreground))",
};

function findThresholdLabel(
  bins: readonly BQ04HistogramBin[],
  threshold: number,
): string | null {
  for (const bin of bins) {
    if (threshold >= bin.binLowerInclusive && threshold < bin.binUpperExclusive) {
      return bin.label;
    }
  }
  const last = bins[bins.length - 1];
  if (last && threshold >= last.binUpperExclusive) return last.label;
  return null;
}

export function BQ04ConfidenceHistogram({
  bins,
  threshold,
}: BQ04ConfidenceHistogramProps): React.JSX.Element {
  const data = bins.map((b) => ({
    label: b.label,
    count: b.count,
    belowThreshold: b.belowThreshold,
  }));
  const thresholdLabel = findThresholdLabel(bins, threshold);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={60}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 12 }}
          width={48}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 30%)" }}
          contentStyle={CONTENT_STYLE}
          labelStyle={LABEL_STYLE}
          itemStyle={ITEM_STYLE}
          formatter={(value: number | string) => [
            typeof value === "number" ? value.toLocaleString() : value,
            "Events",
          ]}
        />
        {thresholdLabel ? (
          <ReferenceLine
            x={thresholdLabel}
            stroke="hsl(var(--destructive))"
            strokeDasharray="4 4"
            label={{
              value: `threshold ${threshold.toFixed(2)}`,
              position: "top",
              fill: "hsl(var(--destructive))",
              fontSize: 11,
            }}
          />
        ) : null}
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((d, idx) => (
            <Cell
              key={`bq04-bar-${idx}`}
              fill={
                d.belowThreshold
                  ? "hsl(var(--destructive))"
                  : "hsl(var(--primary))"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
