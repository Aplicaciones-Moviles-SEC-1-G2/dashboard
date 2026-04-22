import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-02 pipeline diagram spec. Node IDs, edges, and operation semantics are
 * preserved verbatim from plans/bq-02-occupancy-snapshot-cadence.md §Pipeline
 * diagram. Property names are translated to the existing node-component
 * contracts in components/pipeline/nodes/*.tsx — `operation/description` maps
 * to `op/label/honesty`, `collection/estimatedCount` maps to `path/docCount`,
 * and `chartType` maps to `chart/library`. The reuse-honesty markers on
 * `tx-scan` and `tx-deltas` are preserved per design spec §4.4; the
 * `tx-histogram-bins → sink-hist` last-hop edge is marked `animated: true`
 * per §4.2.
 */
export const bq02PipelineNodes: Node[] = [
  {
    id: "src-history",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "parking_occupancy_history",
      fields: ["timestamp"],
      docCount: "thousands",
      docCountNote: "≤5000 fetched",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-scan",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "scan",
      label: "bounded 5000-doc scan",
      honesty:
        "orderBy(timestamp DESC).limit(5000); C3-compliant raw fetch (Type 1 reinterpretation disclosed).",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-sort-asc",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "sort asc by timestamp",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-deltas",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "pairwise delta seconds",
      honesty:
        "in-memory over ≤5000 numbers; drops non-positive deltas (duplicate writes).",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-percentiles",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "nearest-rank p50 / p95 / p99",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-stalls",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "count gaps above k × median",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-histogram-bins",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "bucket",
      label: "20-bin histogram + overflow",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-hist",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "BarChart",
      title: "Inter-snapshot gap distribution",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq02PipelineEdges: Edge[] = [
  { id: "e1", source: "src-history", target: "tx-scan" },
  { id: "e2", source: "tx-scan", target: "tx-sort-asc" },
  { id: "e3", source: "tx-sort-asc", target: "tx-deltas" },
  { id: "e4", source: "tx-deltas", target: "tx-percentiles" },
  { id: "e5", source: "tx-percentiles", target: "tx-stalls" },
  { id: "e6", source: "tx-percentiles", target: "tx-histogram-bins" },
  {
    id: "e7",
    source: "tx-histogram-bins",
    target: "sink-hist",
    animated: true,
  },
];

export const bq02PipelineDescription: PipelineDescription = {
  fetch:
    "Read the latest 5 000 parking_occupancy_history docs ordered by timestamp DESC, projected to { timestamp } only so the cached payload stays small.",
  process:
    "Sort the timestamps ascending, compute pairwise gaps in seconds, drop duplicate/non-positive deltas (counted as anomalies). Derive p50/p95/p99 via nearest-rank, set a stall threshold at 3 × median, count gaps above it, and bucket the gap distribution into 20 equal-width bins up to 3 × p95 plus an overflow bin.",
  show:
    "A histogram bar chart of the gap distribution with an observed-range caption, and KPI cards for p50, p95, p99, the above-threshold share, and the distinct stall-period count.",
};
