"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HourBucket } from "@/lib/types/bq-01";

interface BQ01OccupancyLineProps {
  hourBuckets: readonly HourBucket[];
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

function padHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatPercent(value: number | string): string {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : `${value}`;
}

export function BQ01OccupancyLine({
  hourBuckets,
}: BQ01OccupancyLineProps): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={[...hourBuckets]} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="hour"
          tickFormatter={padHour}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          width={48}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
          contentStyle={CONTENT_STYLE}
          labelStyle={LABEL_STYLE}
          itemStyle={ITEM_STYLE}
          labelFormatter={(label: number | string) =>
            padHour(typeof label === "number" ? label : Number.parseInt(label, 10) || 0)
          }
          formatter={(value: number | string) => [formatPercent(value), "Mean occupancy"]}
        />
        <ReferenceLine
          y={100}
          stroke="hsl(var(--destructive))"
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
          label={{ value: "Full", position: "right", fill: "hsl(var(--destructive))", fontSize: 11 }}
        />
        <Line
          type="monotone"
          dataKey="meanOccupancyPct"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
