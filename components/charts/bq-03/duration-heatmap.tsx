"use client";

import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { HeatmapCell } from "@/lib/types/bq-03";

interface BQ03DurationHeatmapProps {
  cells: readonly HeatmapCell[];
  /**
   * Colour scale is anchored at `2 × cohortMean`. `null` falls back to the
   * maximum observed mean, or `1` if every cell is empty.
   */
  colorAnchorHours: number | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HATCH_ID = "bq03-heatmap-no-data";

interface HeatmapDatum {
  dayOfWeek: number;
  hour: number;
  meanDurationHours: number | null;
  medianDurationHours: number | null;
  sampleCount: number;
  /** Constant size so every cell renders identically. */
  z: number;
}

function buildData(cells: readonly HeatmapCell[]): HeatmapDatum[] {
  return cells.map((c) => ({
    dayOfWeek: c.dayOfWeek,
    hour: c.hour,
    meanDurationHours: c.meanDurationHours,
    medianDurationHours: c.medianDurationHours,
    sampleCount: c.sampleCount,
    z: 1,
  }));
}

function fillFor(datum: HeatmapDatum, anchor: number): string {
  if (datum.sampleCount === 0 || datum.meanDurationHours === null) {
    return `url(#${HATCH_ID})`;
  }
  const ratio = Math.min(
    1,
    Math.max(0, anchor > 0 ? datum.meanDurationHours / anchor : 0),
  );
  // Blend --muted (low) → --primary (high) by varying alpha on primary.
  const alpha = Math.round(ratio * 100);
  return `hsl(var(--primary) / ${alpha}%)`;
}

function formatHour(value: number | string): string {
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? `${String(n).padStart(2, "0")}` : `${value}`;
}

function formatDay(value: number | string): string {
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? (DAY_LABELS[n] ?? `${n}`) : `${value}`;
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

interface TooltipPayload {
  payload: HeatmapDatum;
}

function HeatmapTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  const dayLabel = DAY_LABELS[datum.dayOfWeek] ?? `Day ${datum.dayOfWeek}`;
  const hourLabel = `${String(datum.hour).padStart(2, "0")}:00`;
  if (datum.sampleCount === 0 || datum.meanDurationHours === null) {
    return (
      <div style={CONTENT_STYLE} className="px-2 py-1">
        <p style={LABEL_STYLE}>
          {dayLabel} {hourLabel}
        </p>
        <p>No data</p>
      </div>
    );
  }
  const mean = datum.meanDurationHours.toFixed(2);
  const median =
    datum.medianDurationHours === null
      ? "—"
      : datum.medianDurationHours.toFixed(2);
  return (
    <div style={CONTENT_STYLE} className="px-2 py-1">
      <p style={LABEL_STYLE}>
        {dayLabel} {hourLabel}
      </p>
      <p>
        mean {mean} h · median {median} h · n={datum.sampleCount}
      </p>
    </div>
  );
}

export function BQ03DurationHeatmap({
  cells,
  colorAnchorHours,
}: BQ03DurationHeatmapProps): React.JSX.Element {
  const data = buildData(cells);
  const fallbackMax = data.reduce(
    (max, d) => (d.meanDurationHours !== null && d.meanDurationHours > max ? d.meanDurationHours : max),
    0,
  );
  const anchor =
    colorAnchorHours !== null && colorAnchorHours > 0
      ? colorAnchorHours * 2
      : fallbackMax > 0
        ? fallbackMax
        : 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 12, left: 12, bottom: 16 }}>
        <defs>
          <pattern
            id={HATCH_ID}
            patternUnits="userSpaceOnUse"
            width={6}
            height={6}
            patternTransform="rotate(45)"
          >
            <rect width={6} height={6} fill="hsl(var(--muted))" />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={6}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
          </pattern>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="hour"
          domain={[-0.5, 23.5]}
          ticks={Array.from({ length: 24 }, (_, i) => i)}
          tickFormatter={formatHour}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 11 }}
          label={{
            value: "Hour of exit",
            position: "insideBottom",
            offset: -8,
            fill: "hsl(var(--muted-foreground))",
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="dayOfWeek"
          domain={[-0.5, 6.5]}
          ticks={[0, 1, 2, 3, 4, 5, 6]}
          tickFormatter={formatDay}
          reversed
          width={40}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 11 }}
        />
        <ZAxis type="number" dataKey="z" range={[260, 260]} />
        <Tooltip cursor={{ fill: "hsl(var(--muted) / 30%)" }} content={<HeatmapTooltip />} />
        <Scatter data={data} shape="square" isAnimationActive={false}>
          {data.map((datum, idx) => (
            <Cell
              key={`bq03-cell-${idx}`}
              fill={fillFor(datum, anchor)}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
