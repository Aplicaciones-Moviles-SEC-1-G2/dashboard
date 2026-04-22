"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BQ10DriftPoint } from "@/lib/types/bq-10";

interface BQ10SignedErrorLineProps {
  points: readonly BQ10DriftPoint[];
  toleranceSpots: number;
}

interface LineDatum {
  time: string;
  signedError: number;
  absError: number;
  timestampMs: number;
}

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function buildData(points: readonly BQ10DriftPoint[]): LineDatum[] {
  return points.map((p) => ({
    time: TIME_FORMATTER.format(new Date(p.timestampMs)),
    signedError: p.signedError,
    absError: p.absError,
    timestampMs: p.timestampMs,
  }));
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

export function BQ10SignedErrorLine({
  points,
  toleranceSpots,
}: BQ10SignedErrorLineProps): React.JSX.Element {
  const data = buildData(points);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="time"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 11 }}
          minTickGap={48}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 12 }}
          width={48}
          tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}`}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
          contentStyle={CONTENT_STYLE}
          labelStyle={LABEL_STYLE}
          itemStyle={ITEM_STYLE}
          formatter={(value: number | string, name: string) => [
            typeof value === "number"
              ? `${value > 0 ? "+" : ""}${value} spots`
              : value,
            name,
          ]}
        />
        <ReferenceArea
          y1={-toleranceSpots}
          y2={toleranceSpots}
          stroke="none"
          fill="hsl(var(--muted))"
          fillOpacity={0.3}
        />
        <ReferenceLine
          y={toleranceSpots}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="3 3"
        />
        <ReferenceLine
          y={-toleranceSpots}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="3 3"
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Line
          type="monotone"
          dataKey="signedError"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
