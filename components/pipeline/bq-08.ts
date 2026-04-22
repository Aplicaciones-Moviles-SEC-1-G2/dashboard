import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-08 pipeline spec. Preserved from plans/bq-08-optimal-departure-window.md
 * §Pipeline diagram. `tx-recommend-band` carries the reuse-honesty marker:
 * lot-wide, not personalized per-user.
 */
export const bq08PipelineNodes: Node[] = [
  {
    id: "src-arrival-curve",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "analytics_morning_arrival_curve",
      fields: ["dayOfWeek", "hhmm5", "pSpotsAvailable"],
      docCount: "tens",
      docCountNote: "~37 per day (5-min buckets 06:30–09:30)",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-filter-day-window",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: "filter dayOfWeek + morning slice",
      honesty:
        "where(dayOfWeek==selected).where(hhmm5>=0630).where(hhmm5<=0930); requires (dayOfWeek, hhmm5) index.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-clamp",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "clip",
      label: "clamp pSpotsAvailable [0,1]",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-sort-hhmm5",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "sort ascending by hhmm5",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-missing-buckets",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "detect missing expected buckets",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-recommend-band",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "first contiguous band p ≥ threshold",
      honesty:
        "lot-wide recommendation — not personalized (no per-user arrival history).",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-peak",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "argmax pSpotsAvailable",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-area",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "AreaChart",
      title: "Morning probability of finding a spot",
      library: "tremor",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-band",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "Recommended window",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq08PipelineEdges: Edge[] = [
  { id: "e1", source: "src-arrival-curve", target: "tx-filter-day-window" },
  { id: "e2", source: "tx-filter-day-window", target: "tx-clamp" },
  { id: "e3", source: "tx-clamp", target: "tx-sort-hhmm5" },
  { id: "e4", source: "tx-sort-hhmm5", target: "tx-missing-buckets" },
  { id: "e5", source: "tx-sort-hhmm5", target: "tx-recommend-band" },
  { id: "e6", source: "tx-sort-hhmm5", target: "tx-peak" },
  { id: "e7", source: "tx-recommend-band", target: "sink-area" },
  { id: "e8", source: "tx-recommend-band", target: "sink-kpi-band" },
  { id: "e9", source: "tx-peak", target: "sink-area" },
];

export const bq08PipelineDescription: PipelineDescription = {
  fetch:
    'Read up to 60 docs from analytics_morning_arrival_curve filtered by the current day-of-week and hhmm5 in ["0630", "0930"], ordered ascending — uses the (dayOfWeek ASC, hhmm5 ASC) composite index. Falls back to the lib/fixtures/bq-08.ts synthetic curve when the rollup returns no rows or the index is not yet deployed.',
  process:
    "Clamp each pSpotsAvailable to [0, 1], sort ascending by hhmm5 defensively, and diff against the expected 37-bucket sequence to detect missing rollup entries. Walk the series to find the first contiguous band whose probability stays ≥ the 0.8 success threshold and capture the peak probability + time.",
  show:
    "A Tremor AreaChart of the morning probability with the threshold visible as a second trace, plus KPI cards for the recommended window, the peak probability + time, and the configured threshold. A lot-wide alert banner and, when applicable, a demo-data banner render above the KPI strip.",
};
