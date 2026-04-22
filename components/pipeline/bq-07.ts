import type { Edge, Node } from "@xyflow/react";

import type { SinkNodeData } from "@/components/pipeline/nodes/sink-node";
import type { SourceNodeData } from "@/components/pipeline/nodes/source-node";
import type { TransformNodeData } from "@/components/pipeline/nodes/transform-node";
import type { PipelineDescription } from "@/components/pipeline/pipeline-description";

/**
 * BQ-07 pipeline spec. Preserved from plans/bq-07-spot-probability-10min.md
 * §Pipeline diagram. `tx-combine-proxy` carries the primary reuse-honesty
 * marker — the metric is a proxy blend because no real trip data exists.
 */
export const bq07PipelineNodes: Node[] = [
  {
    id: "src-spots",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "parkingSpots",
      fields: ["isAvailable"],
      docCount: "tens",
      docCountNote: "~60; up to 121 per OQ-PS-1",
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
    id: "src-bucket",
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      path: "analytics_availability_by_bucket",
      fields: ["pFreeSpotGt0", "sampleSize"],
      docCount: "single",
      docCountNote: "keyed {dayOfWeek}_{hour}; may be absent",
    } satisfies SourceNodeData,
  },
  {
    id: "tx-count-free",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "aggregate",
      label: "count isAvailable=true in-memory",
      honesty: "C3-compliant: no .count() query for rendered metric.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-capacity",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "capacity = floors × spotsPerFloor",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-live-share",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "liveFreeShare · clamp [0,1]",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-bucket-lookup",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "dayOfWeek_hour bucket lookup",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-combine-proxy",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "proxy blend live + prior",
      honesty:
        "0.5 × pFreeSpotGt0Prior + 0.5 × liveFreeShare; fallback to live when bucket absent. Proxy — no real trip data.",
    } satisfies TransformNodeData,
  },
  {
    id: "tx-tier",
    type: "transform",
    position: { x: 0, y: 0 },
    data: {
      op: "derive",
      label: "map probability → tier",
    } satisfies TransformNodeData,
  },
  {
    id: "sink-gauge",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "Probability of finding a spot in 10 min",
      library: "tremor",
    } satisfies SinkNodeData,
  },
  {
    id: "sink-kpi-free-spots",
    type: "sink",
    position: { x: 0, y: 0 },
    data: {
      chart: "ProgressCircle",
      title: "Free spots right now",
      library: "tremor",
    } satisfies SinkNodeData,
  },
];

export const bq07PipelineEdges: Edge[] = [
  { id: "e1", source: "src-spots", target: "tx-count-free" },
  { id: "e2", source: "src-config", target: "tx-capacity" },
  { id: "e3", source: "tx-count-free", target: "tx-live-share" },
  { id: "e4", source: "tx-capacity", target: "tx-live-share" },
  { id: "e5", source: "src-bucket", target: "tx-bucket-lookup" },
  { id: "e6", source: "tx-live-share", target: "tx-combine-proxy" },
  { id: "e7", source: "tx-bucket-lookup", target: "tx-combine-proxy" },
  { id: "e8", source: "tx-combine-proxy", target: "tx-tier" },
  { id: "e9", source: "tx-tier", target: "sink-gauge" },
  { id: "e10", source: "tx-live-share", target: "sink-kpi-free-spots" },
];

export const bq07PipelineDescription: PipelineDescription = {
  fetch:
    "Three parallel reads: up to 200 parkingSpots for live availability, the config/parking doc for capacity (floors × spotsPerFloor), and a single analytics_availability_by_bucket/{dayOfWeek}_{hour} doc keyed to the current local time in America/Bogota. Falls back to the lib/fixtures/bq-07.ts demo snapshot when both the spots collection and the bucket doc are empty.",
  process:
    "Count spots where isAvailable === true, derive capacity from the config, and compute liveFreeShare clamped to [0, 1]. Blend 0.5 × pFreeSpotGt0Prior + 0.5 × liveFreeShare into the proxy probability; fall back to liveFreeShare alone when the bucket doc is absent. Map the probability into a green / yellow / red tier at 0.70 and 0.40.",
  show:
    "A tier-coloured Tremor ProgressCircle gauge with live + historical sub-labels, plus KPI cards for the proxy probability and the current free-spot count. A persistent proxy-metric banner and, when applicable, a demo-data banner render above the KPI strip.",
};
