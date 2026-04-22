import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-06 pipeline spec. Preserved from plans/bq-06-overstay-incidence.md
 * §Pipeline diagram. Honesty markers on `tx-scan`, `tx-tz-localize`
 * (OQ-NEW-19-1), `tx-null-drop-log` (OQ-VR-2), and `tx-overstay-flag`
 * per §4.4 of the design spec.
 */
export const bq06PipelineNodes: Node[] = [
  {
    id: "src-vehicle",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "vehicleRecords",
      fields: ["type", "timestamp", "durationHours", "isRegistered", "plate"],
      docCount: "thousands",
      docCountNote: '≤5000 with type=="exit" filter',
    } satisfies SourceNodeData,
  },
  {
    id: "src-config",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "config/parking",
      fields: ["openingHour", "closingHour"],
      docCount: "single",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-scan",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "scan",
      label: "bounded type-filtered scan",
      honesty:
        'where(type=="exit").orderBy(timestamp DESC).limit(5000); composite index (type, timestamp).',
    } satisfies TransformNodeData,
  },
  {
    id: "tx-tz-localize",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "tz normalize → America/Bogota",
      honesty:
        "Intl.DateTimeFormat; derive localHour & localDate (OQ-NEW-19-1).",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-null-drop-log",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: "log null durationHours · keep row",
      honesty:
        "null/neg durationHours counted (OQ-VR-2); hour-based overstay still possible.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-overstay-flag",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "flag overstay (envelope OR closing hour)",
      honesty:
        "durationHours > envelopeHours OR localHour >= closingHour.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-daily-stacks",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "group",
      label: "group by local date × isRegistered",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-overall-share",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "overall overstay share",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-repeat-offenders",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "group",
      label: "group registered overstays by plate",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-stacked-bar",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "BarChart",
      title: "Daily overstays (last 30 days, stacked)",
      library: "tremor",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-overall",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "Overall overstay share",
      library: "tremor",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-repeat",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "Registered repeat-offender share",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq06PipelineEdges: Edge[] = [
  { id: "e1", source: "src-vehicle", target: "tx-scan" },
  { id: "e2", source: "tx-scan", target: "tx-tz-localize" },
  { id: "e3", source: "tx-tz-localize", target: "tx-null-drop-log" },
  { id: "e4", source: "tx-null-drop-log", target: "tx-overstay-flag" },
  { id: "e5", source: "src-config", target: "tx-overstay-flag" },
  { id: "e6", source: "tx-overstay-flag", target: "tx-daily-stacks" },
  { id: "e7", source: "tx-overstay-flag", target: "tx-overall-share" },
  { id: "e8", source: "tx-overstay-flag", target: "tx-repeat-offenders" },
  { id: "e9", source: "tx-daily-stacks", target: "sink-stacked-bar" },
  { id: "e10", source: "tx-overall-share", target: "sink-kpi-overall" },
  { id: "e11", source: "tx-repeat-offenders", target: "sink-kpi-repeat" },
];

export const bq06PipelineDescription: PipelineDescription = {
  fetch:
    'Read up to 5 000 vehicleRecords where type == "exit" ordered by timestamp DESC via the (type, timestamp) composite index; in parallel, fetch the config/parking doc for openingHour and closingHour. Falls back to the lib/fixtures/bq-06.ts synthetic 30-day exit log when Firestore returns no exits or the index is not yet deployed.',
  process:
    "Compute envelopeHours = closingHour − openingHour. Pre-seed 30 rolling days in America/Bogota. For each exit in the window, derive the local (date, hour); flag overstay when durationHours > envelopeHours OR the local hour is ≥ closingHour. Bucket daily overstays by registered vs unregistered, and track per-plate counts to derive the registered repeat-offender share.",
  show:
    "A 30-day stacked bar chart splitting overstays into registered (emerald) and unregistered (orange), plus KPI cards for the overall overstay share, the registered repeat-offender share, and the operating envelope. A demo-data banner renders when the synthetic fallback is active.",
};
