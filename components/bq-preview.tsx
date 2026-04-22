"use client";

import * as React from "react";
import { AreaChart, BarChart, BarList, LineChart, ProgressCircle } from "@tremor/react";
import {
  Bar,
  BarChart as RechartsBarChart,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { BqPayload } from "@/lib/actions";
import type { BQ09FacilityCell, BQ09MissingCell } from "@/lib/types/bq-09";

interface BqPreviewProps {
  payload: BqPayload;
}


/** Compact chart for the overview mosaic. Reuses the full data shape so the
 * preview tracks live Firestore state (or the synthetic fallback) without
 * duplicating the transform. */
export function BqPreview({ payload }: BqPreviewProps): React.JSX.Element {
  switch (payload.id) {
    case "01":
      return <PreviewBQ01 data={payload.data.hourBuckets} />;
    case "02":
      return <PreviewBQ02 data={payload.data.histogram} />;
    case "03":
      return <PreviewBQ03 cells={payload.data.cells} />;
    case "04":
      return (
        <PreviewBQ04
          bins={payload.data.bins}
          threshold={payload.data.threshold}
        />
      );
    case "05":
      return <PreviewBQ05 rows={payload.data.rows} />;
    case "06":
      return <PreviewBQ06 daily={payload.data.dailyBuckets} />;
    case "07":
      return (
        <PreviewBQ07
          probability={payload.data.proxyProbability}
          tier={payload.data.tier}
        />
      );
    case "08":
      return <PreviewBQ08 buckets={payload.data.buckets} />;
    case "09":
      return (
        <PreviewBQ09
          cells={payload.data.cells}
          missing={payload.data.missingCells}
        />
      );
    case "10":
      return (
        <PreviewBQ10
          points={payload.data.points}
          tolerance={payload.data.window.toleranceSpots}
        />
      );
  }
}

function Wrap({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="h-full w-full min-h-0">{children}</div>;
}

interface HourBucketPreview {
  hour: number;
  meanOccupancyPct: number;
}

function PreviewBQ01({
  data,
}: {
  data: readonly HourBucketPreview[];
}): React.JSX.Element {
  const rows = data.map((b) => ({
    hour: `${String(b.hour).padStart(2, "0")}:00`,
    occupancy: Number(b.meanOccupancyPct.toFixed(1)),
  }));
  return (
    <Wrap>
      <LineChart
        className="h-full"
        data={rows}
        index="hour"
        categories={["occupancy"]}
        colors={["indigo"]}
        valueFormatter={(v: number) => `${v.toFixed(0)}%`}
        showLegend={false}
        showYAxis={false}
        showXAxis={false}
        showGridLines={false}
        curveType="monotone"
      />
    </Wrap>
  );
}

interface HistogramBinPreview {
  label: string;
  count: number;
}

function PreviewBQ02({
  data,
}: {
  data: readonly HistogramBinPreview[];
}): React.JSX.Element {
  const rows = data.map((b) => ({ label: b.label, count: b.count }));
  return (
    <Wrap>
      <BarChart
        className="h-full"
        data={rows}
        index="label"
        categories={["count"]}
        colors={["violet"]}
        showLegend={false}
        showYAxis={false}
        showXAxis={false}
        showGridLines={false}
      />
    </Wrap>
  );
}

interface HeatmapCellPreview {
  dayOfWeek: number;
  hour: number;
  meanDurationHours: number | null;
  sampleCount: number;
}

function PreviewBQ03({
  cells,
}: {
  cells: readonly HeatmapCellPreview[];
}): React.JSX.Element {
  const maxDuration = cells.reduce(
    (m, c) =>
      c.meanDurationHours !== null && c.meanDurationHours > m
        ? c.meanDurationHours
        : m,
    0,
  );
  const anchor = maxDuration > 0 ? maxDuration : 1;
  return (
    <Wrap>
      <div
        className="grid h-full w-full gap-[2px]"
        style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        aria-label="Stay-duration mini heatmap"
      >
        {cells.map((c, idx) => {
          const ratio =
            c.meanDurationHours === null || c.sampleCount === 0
              ? 0
              : Math.min(1, c.meanDurationHours / anchor);
          const alpha = Math.round(ratio * 100);
          return (
            <div
              key={idx}
              className="rounded-[1px]"
              style={{
                backgroundColor:
                  alpha === 0
                    ? "hsl(var(--muted))"
                    : `hsl(var(--primary) / ${alpha}%)`,
              }}
            />
          );
        })}
      </div>
    </Wrap>
  );
}

interface BQ04BinPreview {
  label: string;
  count: number;
  belowThreshold: boolean;
  binLowerInclusive: number;
  binUpperExclusive: number;
}

function PreviewBQ04({
  bins,
  threshold,
}: {
  bins: readonly BQ04BinPreview[];
  threshold: number;
}): React.JSX.Element {
  const rows = bins.map((b) => ({
    label: b.label,
    count: b.count,
    below: b.belowThreshold,
  }));
  const thresholdLabel =
    bins.find(
      (b) => threshold >= b.binLowerInclusive && threshold < b.binUpperExclusive,
    )?.label ?? null;
  return (
    <Wrap>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={rows} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey="label" hide />
          <YAxis hide />
          {thresholdLabel ? (
            <ReferenceLine
              x={thresholdLabel}
              stroke="hsl(var(--destructive))"
              strokeDasharray="3 3"
            />
          ) : null}
          <Bar dataKey="count" isAnimationActive={false}>
            {rows.map((r, idx) => (
              <Cell
                key={idx}
                fill={
                  r.below
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--primary))"
                }
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </Wrap>
  );
}

interface BQ05RowPreview {
  domain: string;
  totalHours: number;
}

function PreviewBQ05({
  rows,
}: {
  rows: readonly BQ05RowPreview[];
}): React.JSX.Element {
  const top = rows.slice(0, 5).map((r) => ({
    name: r.domain,
    value: Number(r.totalHours.toFixed(1)),
  }));
  if (top.length === 0) {
    return (
      <Wrap>
        <EmptyBlock />
      </Wrap>
    );
  }
  return (
    <Wrap>
      <BarList
        data={top}
        valueFormatter={(v: number) => `${v.toFixed(0)}h`}
        className="h-full"
      />
    </Wrap>
  );
}

interface BQ06DailyPreview {
  date: string;
  registeredOverstays: number;
  unregisteredOverstays: number;
}

function PreviewBQ06({
  daily,
}: {
  daily: readonly BQ06DailyPreview[];
}): React.JSX.Element {
  const rows = daily.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    registered: d.registeredOverstays,
    unregistered: d.unregisteredOverstays,
  }));
  return (
    <Wrap>
      <BarChart
        className="h-full"
        data={rows}
        index="date"
        categories={["registered", "unregistered"]}
        colors={["emerald", "orange"]}
        stack
        showLegend={false}
        showYAxis={false}
        showXAxis={false}
        showGridLines={false}
      />
    </Wrap>
  );
}

function PreviewBQ07({
  probability,
  tier,
}: {
  probability: number;
  tier: "green" | "yellow" | "red";
}): React.JSX.Element {
  const color =
    tier === "green" ? "emerald" : tier === "yellow" ? "amber" : "red";
  return (
    <Wrap>
      <div className="flex h-full items-center justify-center">
        <ProgressCircle
          value={Math.round(probability * 100)}
          radius={48}
          strokeWidth={8}
          color={color}
        >
          <span className="text-lg font-semibold tabular-nums">
            {Math.round(probability * 100)}%
          </span>
        </ProgressCircle>
      </div>
    </Wrap>
  );
}

interface BQ08BucketPreview {
  label: string;
  pSpotsAvailable: number;
}

function PreviewBQ08({
  buckets,
}: {
  buckets: readonly BQ08BucketPreview[];
}): React.JSX.Element {
  const rows = buckets.map((b) => ({
    time: b.label,
    p: Number((b.pSpotsAvailable * 100).toFixed(0)),
  }));
  return (
    <Wrap>
      <AreaChart
        className="h-full"
        data={rows}
        index="time"
        categories={["p"]}
        colors={["sky"]}
        showLegend={false}
        showYAxis={false}
        showXAxis={false}
        showGridLines={false}
        curveType="monotone"
      />
    </Wrap>
  );
}

function PreviewBQ09({
  cells,
  missing,
}: {
  cells: readonly BQ09FacilityCell[];
  missing: readonly BQ09MissingCell[];
}): React.JSX.Element {
  const missingSet = new Set(missing.map((m) => `${m.dayOfWeek}_${m.hour}`));
  const data = cells.map((c) => ({
    dayOfWeek: c.dayOfWeek,
    hour: c.hour,
    avgOccupancyPct: c.avgOccupancyPct,
    missing: missingSet.has(`${c.dayOfWeek}_${c.hour}`),
    z: 1,
  }));
  return (
    <Wrap>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <XAxis type="number" dataKey="hour" domain={[-0.5, 23.5]} hide />
          <YAxis type="number" dataKey="dayOfWeek" domain={[-0.5, 6.5]} reversed hide />
          <ZAxis type="number" dataKey="z" range={[48, 48]} />
          <Scatter data={data} shape="square" isAnimationActive={false}>
            {data.map((d, idx) => {
              const ratio = d.missing ? 0 : Math.min(1, Math.max(0, d.avgOccupancyPct / 100));
              const alpha = Math.round(ratio * 100);
              const fill =
                alpha === 0
                  ? "hsl(var(--muted))"
                  : `hsl(var(--destructive) / ${alpha}%)`;
              return <Cell key={idx} fill={fill} />;
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Wrap>
  );
}

interface BQ10PointPreview {
  timestampMs: number;
  signedError: number;
}

function PreviewBQ10({
  points,
  tolerance,
}: {
  points: readonly BQ10PointPreview[];
  tolerance: number;
}): React.JSX.Element {
  if (points.length === 0) {
    return (
      <Wrap>
        <EmptyBlock />
      </Wrap>
    );
  }
  const minMs = points[0]!.timestampMs;
  const maxMs = points[points.length - 1]!.timestampMs;
  const rows = points.map((p) => ({
    t: p.timestampMs,
    signed: p.signedError,
  }));
  return (
    <Wrap>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={rows}
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        >
          <XAxis type="number" dataKey="t" domain={[minMs, maxMs]} hide />
          <YAxis hide domain={[-8, 8]} />
          <ReferenceArea
            y1={-tolerance}
            y2={tolerance}
            stroke="none"
            fill="hsl(var(--muted))"
            fillOpacity={0.5}
          />
          <Bar dataKey="signed" isAnimationActive={false}>
            {rows.map((r, idx) => (
              <Cell
                key={idx}
                fill={
                  Math.abs(r.signed) > tolerance
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--primary))"
                }
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </Wrap>
  );
}

function EmptyBlock(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
      No data
    </div>
  );
}
