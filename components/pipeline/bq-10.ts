import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-10 pipeline spec. Preserved from plans/bq-10-availability-and-queue-accuracy.md
 * §Pipeline diagram. `tx-queue-pending` is the primary reuse-honesty marker
 * (queue half openly flagged as pending). Upstream lineage
 * (`parking_occupancy_history`, `vehicleRecords`) lives in the rollup
 * Cloud Function, not in this dashboard's reads.
 */
export const bq10PipelineNodes: Node[] = [
  {
    id: "src-drift",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "analytics_availability_drift",
      fields: [
        "timestamp",
        "reportedAvailable",
        "reconstructedAvailable",
        "signedError",
        "absError",
      ],
      docCount: "thousands",
      docCountNote: "~1440 per 24h at minute cadence",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-window-scan",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "scan",
      label: "bounded 24h window scan",
      honesty:
        "where(timestamp in [sinceMs, untilMs)).orderBy(timestamp ASC).limit(1500); rollup only, upstream lineage in methodology.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-defensive-drop",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: "drop malformed drift docs",
      honesty: "skip docs with non-finite fields; counter surfaced.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-summary",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "MAE · max abs · within-tolerance share",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-drift-streak",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "longest drift streak minutes",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-queue-pending",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "queue half pending · no sensor",
      honesty:
        "constant RED-label placeholder; no data pathway exists for queue length.",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-line",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "LineChart",
      title: "Signed error over time (availability)",
      library: "tremor",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-mae",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "MAE (spots)",
      library: "tremor",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-within",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "% within tolerance",
      library: "tremor",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-queue-pending",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "BarChart",
      title: "Queue accuracy — pending sensor data",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq10PipelineEdges: Edge[] = [
  { id: "e1", source: "src-drift", target: "tx-window-scan" },
  { id: "e2", source: "tx-window-scan", target: "tx-defensive-drop" },
  { id: "e3", source: "tx-defensive-drop", target: "tx-summary" },
  { id: "e4", source: "tx-defensive-drop", target: "tx-drift-streak" },
  { id: "e5", source: "tx-summary", target: "sink-line" },
  { id: "e6", source: "tx-drift-streak", target: "sink-line" },
  { id: "e7", source: "tx-summary", target: "sink-kpi-mae" },
  { id: "e8", source: "tx-summary", target: "sink-kpi-within" },
  { id: "e9", source: "tx-queue-pending", target: "sink-queue-pending" },
];

export const bq10PipelineDescription: PipelineDescription = {
  fetch:
    "Up to 1 500 docs from analytics_availability_drift where timestamp lies in the last 24 hours, ordered ascending (single-field index on timestamp). No queue reads — that half is pending a sensor signal Firestore does not currently capture. Falls back to the lib/fixtures/bq-10.ts synthetic 24-hour drift timeline when the rollup returns no rows.",
  process:
    "Drop rows with any non-finite field, compute mean absolute error, max abs error, and the share of points whose absError is within ±2 spots. Walk the time-ordered series to find the longest contiguous run where absError > tolerance, reporting its duration in minutes.",
  show:
    "A Tremor LineChart of signed error over 24 hours with a shaded ±2-spot tolerance band, four KPI cards (MAE, max abs error, % within tolerance, longest drift streak), and a persistent \"Queue accuracy — pending sensor data\" placeholder card. An availability-only banner and, when applicable, a demo-data banner render above the KPI strip.",
};
