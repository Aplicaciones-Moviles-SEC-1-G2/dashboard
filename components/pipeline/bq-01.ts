import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-01 pipeline diagram spec. Node IDs, edges, and operation semantics are
 * preserved verbatim from plans/bq-01-peak-occupancy-moments.md §Pipeline
 * diagram. Property names are translated to the existing node-component
 * contracts in components/pipeline/nodes/*.tsx — `operation/description` maps
 * to `op/label/honesty`, `collection/estimatedCount` maps to `path/docCount`,
 * and `chartType` maps to `chart/library`. The reuse-honesty markers on
 * `tx-scan` and `tx-clip` are preserved per design spec §4.4.
 */
export const bq01PipelineNodes: Node[] = [
  {
    id: "src-history",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "parking_occupancy_history",
      fields: [
        "timestamp",
        "availableSpots",
        "totalSpots",
        "occupancyPercentage",
      ],
      docCount: "thousands",
      docCountNote: "≤5000 in 14-day window",
    } satisfies SourceNodeData,
  },
  {
    id: "src-config",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "config/parking",
      fields: ["numberOfFloors", "spotsPerFloor"],
      docCount: "single",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-scan",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "scan",
      label: "bounded 14-day scan",
      honesty:
        "Bounded full-collection scan — .where(timestamp ≥ now-14d).orderBy(timestamp ASC).limit(5000); C3-compliant.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-clip",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "clip",
      label: "clip occupancy to [0,100]",
      honesty:
        "Clamps synthetic noise (OQ-OH-3, OQ-OH-4); tracks negative / over-capacity counts.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-local-hour",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "derive local hour (America/Bogota)",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-hour-mean",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "group",
      label: "group by local hour → mean",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-saturation-runs",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "detect contiguous saturation runs",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-saturation-per-hour",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "sum saturation minutes per hour",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-line",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "LineChart",
      title: "Mean occupancy by local hour",
      library: "recharts",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-bar",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "BarChart",
      title: "Mean saturation duration by local hour",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq01PipelineEdges: Edge[] = [
  { id: "e1", source: "src-history", target: "tx-scan" },
  { id: "e2", source: "tx-scan", target: "tx-clip" },
  { id: "e3", source: "tx-clip", target: "tx-local-hour" },
  { id: "e4", source: "tx-local-hour", target: "tx-hour-mean" },
  { id: "e5", source: "tx-local-hour", target: "tx-saturation-runs" },
  { id: "e6", source: "tx-saturation-runs", target: "tx-saturation-per-hour" },
  { id: "e7", source: "src-config", target: "tx-hour-mean" },
  { id: "e8", source: "tx-hour-mean", target: "sink-line" },
  { id: "e9", source: "tx-saturation-per-hour", target: "sink-bar" },
];

export const bq01PipelineDescription: PipelineDescription = {
  fetch:
    "Read up to 5 000 parking_occupancy_history docs over the last 14 days via where timestamp >= sinceMs AND < untilMs ordered ascending; in parallel, fetch the singleton config/parking doc for capacity (floors × spotsPerFloor).",
  process:
    "Defensively filter non-finite fields, clip occupancyPercentage to [0, 100], and derive the local hour of day in America/Bogota. Group into 24 hour-buckets (mean / max / sampleCount) and walk the time-sorted series to collapse contiguous saturation into runs ≥ 1 minute, attributing each run's minutes to its start hour.",
  show:
    "Two charts in a 2-column grid — a mean-occupancy line across the day and a saturation-duration bar chart — plus KPI cards for capacity, peak hour, total saturation events in the 14-day window, and longest saturation run.",
};
