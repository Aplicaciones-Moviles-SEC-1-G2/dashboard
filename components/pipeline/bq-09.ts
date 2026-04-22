import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-09 pipeline spec. Preserved from plans/bq-09-monetizable-peak-demand.md
 * §Pipeline diagram. `tx-filter-facility` carries the reuse-honesty marker
 * (single-facility scope today — SD-only).
 */
export const bq09PipelineNodes: Node[] = [
  {
    id: "src-demand-pattern",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "analytics_facility_demand_pattern",
      fields: [
        "facilityId",
        "dayOfWeek",
        "hour",
        "avgOccupancyPct",
        "utilizationScore",
      ],
      docCount: "thousands",
      docCountNote: "~168 cells per facility",
    } satisfies SourceNodeData,
  },
  {
    id: "src-facility-meta",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "facilities",
      fields: ["name", "capacity"],
      docCount: "single",
      docCountNote: "may be absent during Sprint 2",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-filter-facility",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "filter",
      label: "where(facilityId == SD)",
      honesty:
        "single-facility today — scoped to SD until a second facility onboards.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-matrix-7x24",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "bucket",
      label: "build 7×24 matrix · fill missing",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-top-utilization",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "sort desc utilizationScore · top 10",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-peak",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "argmax avgOccupancyPct",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-heatmap",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "Heatmap",
      title: "SD demand heatmap (day × hour)",
      library: "recharts",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-top-windows",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "BarList",
      title: "Top utilization windows",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq09PipelineEdges: Edge[] = [
  { id: "e1", source: "src-demand-pattern", target: "tx-filter-facility" },
  { id: "e2", source: "tx-filter-facility", target: "tx-matrix-7x24" },
  { id: "e3", source: "tx-matrix-7x24", target: "tx-top-utilization" },
  { id: "e4", source: "tx-matrix-7x24", target: "tx-peak" },
  { id: "e5", source: "src-facility-meta", target: "sink-heatmap" },
  { id: "e6", source: "tx-matrix-7x24", target: "sink-heatmap" },
  { id: "e7", source: "tx-top-utilization", target: "sink-top-windows" },
];

export const bq09PipelineDescription: PipelineDescription = {
  fetch:
    "Up to 200 docs from analytics_facility_demand_pattern filtered by facilityId (scoped to \"SD\" by default), in parallel with the optional facilities/{facilityId} metadata doc. Falls back to the lib/fixtures/bq-09.ts synthetic 168-cell pattern with weekday/weekend shapes when the rollup returns no cells.",
  process:
    "Drop malformed cells (dayOfWeek outside 0–6 or hour outside 0–23), enumerate the expected 168-cell matrix filling missing entries with zeros, sort real cells by utilizationScore DESC (ties broken by occupancy then by index) to pick the top 10, and identify the peak cell by avgOccupancyPct.",
  show:
    "A 7×24 Recharts scatter heatmap coloured by occupancy with a hatch pattern for missing cells, a Tremor BarList of the top utilization windows, plus KPI cards for the peak window, the top utilization score, and the missing-cell count. A single-facility alert banner and, when applicable, a demo-data banner render above the KPI strip.",
};
