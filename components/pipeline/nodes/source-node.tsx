"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SourceNodeData extends Record<string, unknown> {
  path: string;
  fields: string[];
  docCount: "single" | "tens" | "thousands";
  docCountNote?: string;
}

export function SourceNode({ data }: NodeProps): React.JSX.Element {
  const d = data as SourceNodeData;
  return (
    <div
      className={cn(
        "group relative w-60 overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-blue-500",
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <Database className="mt-0.5 h-4 w-4 text-blue-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-medium">{d.path}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {d.fields.slice(0, 3).join(", ")}
            {d.fields.length > 3 ? "…" : ""}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {d.docCount}
            {d.docCountNote ? ` · ${d.docCountNote}` : ""}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
    </div>
  );
}
