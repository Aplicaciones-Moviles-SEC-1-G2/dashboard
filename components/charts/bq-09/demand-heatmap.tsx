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

import type { BQ09FacilityCell, BQ09MissingCell } from "@/lib/types/bq-09";

interface BQ09DemandHeatmapProps {
  cells: readonly BQ09FacilityCell[];
  missingCells: readonly BQ09MissingCell[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HATCH_ID = "bq09-heatmap-missing";

interface HeatmapDatum {
  dayOfWeek: number;
  hour: number;
  avgOccupancyPct: number;
  utilizationScore: number;
  missing: boolean;
  z: number;
}

function buildData(
  cells: readonly BQ09FacilityCell[],
  missing: readonly BQ09MissingCell[],
): HeatmapDatum[] {
  const missingSet = new Set(
    missing.map((m) => `${m.dayOfWeek}_${m.hour}`),
  );
  return cells.map((c) => ({
    dayOfWeek: c.dayOfWeek,
    hour: c.hour,
    avgOccupancyPct: c.avgOccupancyPct,
    utilizationScore: c.utilizationScore,
    missing: missingSet.has(`${c.dayOfWeek}_${c.hour}`),
    z: 1,
  }));
}

function fillFor(datum: HeatmapDatum): string {
  if (datum.missing) return `url(#${HATCH_ID})`;
  const ratio = Math.min(1, Math.max(0, datum.avgOccupancyPct / 100));
  const alpha = Math.round(ratio * 100);
  return `hsl(var(--destructive) / ${alpha}%)`;
}

function formatHour(value: number | string): string {
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? String(n).padStart(2, "0") : `${value}`;
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
  if (datum.missing) {
    return (
      <div style={CONTENT_STYLE} className="px-2 py-1">
        <p style={LABEL_STYLE}>
          {dayLabel} {hourLabel}
        </p>
        <p>Missing cell</p>
      </div>
    );
  }
  return (
    <div style={CONTENT_STYLE} className="px-2 py-1">
      <p style={LABEL_STYLE}>
        {dayLabel} {hourLabel}
      </p>
      <p>
        occupancy {datum.avgOccupancyPct.toFixed(1)}% · utilization{" "}
        {datum.utilizationScore.toFixed(2)}
      </p>
    </div>
  );
}

export function BQ09DemandHeatmap({
  cells,
  missingCells,
}: BQ09DemandHeatmapProps): React.JSX.Element {
  const data = buildData(cells, missingCells);
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
            value: "Hour",
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
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 30%)" }}
          content={<HeatmapTooltip />}
        />
        <Scatter data={data} shape="square" isAnimationActive={false}>
          {data.map((datum, idx) => (
            <Cell
              key={`bq09-cell-${idx}`}
              fill={fillFor(datum)}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
