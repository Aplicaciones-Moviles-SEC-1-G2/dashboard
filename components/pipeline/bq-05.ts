import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-05 pipeline spec. Node IDs, edges, and operation semantics preserved
 * from plans/bq-05-email-domain-usage-share.md §Pipeline diagram. Reuse-
 * honesty markers on `tx-filter` (composite-index dependency), `tx-extract-
 * domain` (unknown bucket), and `tx-null-duration` (OQ-VR-2) per §4.4.
 */
export const bq05PipelineNodes: Node[] = [
  {
    id: "src-vehicle",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "vehicleRecords",
      fields: ["isRegistered", "type", "ownerEmail", "durationHours"],
      docCount: "thousands",
      docCountNote: "≤5000 after (isRegistered, type) filter",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-filter",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: 'where(isRegistered==true, type=="exit")',
      honesty:
        "requires composite index (isRegistered ASC, type ASC) — firestore.indexes.json.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-extract-domain",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "extract lowercase email domain",
      honesty:
        'split ownerEmail on "@"; missing/malformed rows → "(unknown)" bucket.',
    } satisfies TransformNodeData,
  },
  {
    id: "tx-null-duration",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: "track null durationHours separately",
      honesty:
        "null/negative durationHours counted in event total but skipped in hours total (OQ-VR-2).",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-group-sum",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "group",
      label: "group by domain · sum hours · count events",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-top-n-sort",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "sort desc · top 10 with (others) tail",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-university-kpi",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "university-domain hours share",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-barlist",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "BarList",
      title: "Top parking-hours by email domain",
      library: "tremor",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-university",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "University-domain share",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq05PipelineEdges: Edge[] = [
  { id: "e1", source: "src-vehicle", target: "tx-filter" },
  { id: "e2", source: "tx-filter", target: "tx-extract-domain" },
  { id: "e3", source: "tx-extract-domain", target: "tx-null-duration" },
  { id: "e4", source: "tx-null-duration", target: "tx-group-sum" },
  { id: "e5", source: "tx-group-sum", target: "tx-top-n-sort" },
  { id: "e6", source: "tx-group-sum", target: "tx-university-kpi" },
  { id: "e7", source: "tx-top-n-sort", target: "sink-barlist" },
  { id: "e8", source: "tx-university-kpi", target: "sink-kpi-university" },
];

export const bq05PipelineDescription: PipelineDescription = {
  fetch:
    'Read up to 5 000 vehicleRecords where isRegistered == true AND type == "exit" using the composite (isRegistered ASC, type ASC) index declared in firestore.indexes.json.',
  process:
    'Lower-case every ownerEmail and extract the text after "@" as the domain; rows with missing / malformed emails go into the "(unknown)" bucket and are counted separately. Count events and sum durationHours per domain (null/negative durations skipped for the hours sum but still counted as events). Sort desc by total hours, keep the top 10, and roll the tail into a synthetic "(others)" row. Compute the hours share held by uniandes.edu.co.',
  show:
    "A Tremor BarList of the top domains sized by total parking hours with per-row event counts underneath, plus KPI cards for the university-domain share, total registered hours, and unknown-owner events.",
};
