import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-04 pipeline spec. Node IDs, edges, and operation semantics preserved
 * from plans/bq-04-ocr-confidence-vs-threshold.md §Pipeline diagram. The
 * reuse-honesty marker on `tx-scan` (bounded full-collection scan) and
 * `tx-invalid-drop` (out-of-range drop counter) match §4.4 of the design
 * spec.
 */
export const bq04PipelineNodes: Node[] = [
  {
    id: "src-config",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "config/parking",
      fields: ["ocrConfidenceThreshold"],
      docCount: "single",
    } satisfies SourceNodeData,
  },
  {
    id: "src-vehicle",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "vehicleRecords",
      fields: ["ocrConfidence", "timestamp", "type"],
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
      label: "bounded full-collection scan",
      honesty:
        'orderBy(timestamp DESC).limit(5000); C3-compliant raw fetch.',
    } satisfies TransformNodeData,
  },
  {
    id: "tx-invalid-drop",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: "drop out-of-range confidence",
      honesty:
        "drop rows where ocrConfidence is NaN or outside [0,1]; counter surfaced.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-bucket-20-bins",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "bucket",
      label: "20 × 0.05 bins",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-threshold-share",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "below-threshold share",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-hist",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "BarChart",
      title: "OCR confidence distribution with threshold overlay",
      library: "recharts",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-below",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "% events below threshold",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq04PipelineEdges: Edge[] = [
  { id: "e1", source: "src-vehicle", target: "tx-scan" },
  { id: "e2", source: "tx-scan", target: "tx-invalid-drop" },
  { id: "e3", source: "tx-invalid-drop", target: "tx-bucket-20-bins" },
  { id: "e4", source: "src-config", target: "tx-threshold-share" },
  { id: "e5", source: "tx-invalid-drop", target: "tx-threshold-share" },
  { id: "e6", source: "tx-bucket-20-bins", target: "sink-hist" },
  { id: "e7", source: "tx-threshold-share", target: "sink-kpi-below" },
];

export const bq04PipelineDescription: PipelineDescription = {
  fetch:
    "Read the 5 000 most recent vehicleRecords ordered by timestamp DESC, projected to { ocrConfidence, timestamp, type }; in parallel, fetch config/parking for ocrConfidenceThreshold.",
  process:
    "Clamp the operator threshold to [0, 1]. Iterate records, skipping rows whose confidence is non-finite or outside [0, 1] (counted as anomalies). Bucket the remainder into 20 × 0.05-wide bins spanning [0, 1]; mark each bin as below-threshold iff its upper edge is ≤ the threshold. Count rows strictly below the threshold and derive the share.",
  show:
    "A Recharts bar chart of the histogram with red bars for below-threshold bins, a dashed reference line at the configured threshold, and KPI cards for the below-threshold share, the threshold value, and the observed confidence range.",
};
