import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-03 pipeline diagram spec. Node IDs, edges, and operation semantics are
 * preserved verbatim from plans/bq-03-registered-user-stay-duration.md
 * §Pipeline diagram. Property names are translated to the existing node-
 * component contracts in components/pipeline/nodes/*.tsx. The reuse-honesty
 * markers on `tx-exit-scan`, `tx-driver-filter`, `tx-client-side-join`, and
 * `tx-null-drop` are preserved per design spec §4.4.
 */
export const bq03PipelineNodes: Node[] = [
  {
    id: "src-vehicle-exits",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "vehicleRecords",
      fields: ["type", "timestamp", "durationHours", "plate", "isRegistered"],
      docCount: "thousands",
      docCountNote: "≤5000 fetched with type==\"exit\" filter",
    } satisfies SourceNodeData,
  },
  {
    id: "src-users-drivers",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "users",
      fields: ["cars", "role", "vehicles"],
      docCount: "tens",
      docCountNote: "role==\"driver\" filter, ≤500",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-exit-scan",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "scan",
      label: "bounded type-filtered scan",
      honesty:
        "where(type==\"exit\").orderBy(timestamp DESC).limit(5000); needs composite index.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-driver-filter",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: "role==\"driver\" filter",
      honesty:
        "where(role==\"driver\"); legacy users.vehicles ignored (OQ-USR-1).",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-plate-set",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "flatten cars → plate Set",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-client-side-join",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "join",
      label: "client-side join on plate",
      honesty:
        "keep exit rows whose plate ∈ plateSet; unregistered rows dropped with count.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-null-drop",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: "drop null/negative durationHours",
      honesty:
        "drop rows with null/negative durationHours (OQ-VR-2); count surfaced as caption.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-bucket-day-hour",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "bucket",
      label: "bucket by local (day, hour)",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-cell-aggregate",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "mean + median per 7×24 cell",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-heatmap",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "Heatmap",
      title: "Registered-user mean stay by (day, hour)",
      library: "recharts",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-cohort-mean",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "Registered-cohort mean stay",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq03PipelineEdges: Edge[] = [
  { id: "e1", source: "src-vehicle-exits", target: "tx-exit-scan" },
  { id: "e2", source: "src-users-drivers", target: "tx-driver-filter" },
  { id: "e3", source: "tx-driver-filter", target: "tx-plate-set" },
  { id: "e4", source: "tx-exit-scan", target: "tx-client-side-join" },
  { id: "e5", source: "tx-plate-set", target: "tx-client-side-join" },
  { id: "e6", source: "tx-client-side-join", target: "tx-null-drop" },
  { id: "e7", source: "tx-null-drop", target: "tx-bucket-day-hour" },
  { id: "e8", source: "tx-bucket-day-hour", target: "tx-cell-aggregate" },
  { id: "e9", source: "tx-cell-aggregate", target: "sink-heatmap" },
  { id: "e10", source: "tx-cell-aggregate", target: "sink-kpi-cohort-mean" },
];

export const bq03PipelineDescription: PipelineDescription = {
  fetch:
    'Read up to 5 000 vehicleRecords where type == "exit", in parallel with up to 500 users where role == "driver"; both run through Promise.all.',
  process:
    "Build a normalized plate set (and a fallback email set) from drivers[].cars[].plate and drivers[].email. Drop exits whose plate is not in the set and whose email also doesn't match; drop null / negative durationHours. Derive local (dayOfWeek, hour) in America/Bogota and compute mean + median + sampleCount per cell across the 7×24 grid.",
  show:
    "A 7×24 heatmap coloured by mean stay duration with a hatch pattern for empty cells, plus KPI cards for the registered-cohort mean stay, number of exits analysed, and the counts of dropped rows by reason.",
};
