import dagre from "dagre";
import { Position, type Edge, type Node } from "@xyflow/react";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 96;

export interface LaidOutGraph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Left-to-right dagre auto-layout for a pipeline diagram. Positions are
 * computed once at mount and not re-flowed on resize. Nodes are returned
 * with `position` set; edges pass through untouched.
 */
export function layoutGraph(nodes: Node[], edges: Edge[]): LaidOutGraph {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 32, ranksep: 64 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const laidOut: Node[] = nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
  });

  return { nodes: laidOut, edges };
}
