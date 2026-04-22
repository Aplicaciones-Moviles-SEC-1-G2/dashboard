"use client";

import * as React from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { SourceNode } from "@/components/pipeline/nodes/source-node";
import { TransformNode } from "@/components/pipeline/nodes/transform-node";
import { SinkNode } from "@/components/pipeline/nodes/sink-node";
import { layoutGraph } from "@/components/pipeline/layout";

const NODE_TYPES: NodeTypes = {
  source: SourceNode,
  transform: TransformNode,
  sink: SinkNode,
};

interface PipelineDiagramProps {
  nodes: Node[];
  edges: Edge[];
  /** Shown when a BQ page has no pipeline spec wired up yet. */
  emptyMessage?: string;
}

export function PipelineDiagram({
  nodes,
  edges,
  emptyMessage = "Pipeline spec coming soon.",
}: PipelineDiagramProps): React.JSX.Element {
  const laidOut = React.useMemo(() => layoutGraph(nodes, edges), [nodes, edges]);

  if (laidOut.nodes.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-80 w-full overflow-hidden rounded-md border bg-background">
      <ReactFlowProvider>
        <ReactFlow
          nodes={laidOut.nodes}
          edges={laidOut.edges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
