"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, Workflow } from "lucide-react";

import { cn } from "@/lib/utils";

export type TransformOp =
  | "filter"
  | "group"
  | "join"
  | "aggregate"
  | "rollup"
  | "bucket"
  | "scan"
  | "clip"
  | "derive";

export interface TransformNodeData extends Record<string, unknown> {
  op: TransformOp;
  label: string;
  honesty?: string;
}

export function TransformNode({ data }: NodeProps): React.JSX.Element {
  const d = data as TransformNodeData;
  const hasHonesty = typeof d.honesty === "string" && d.honesty.length > 0;
  return (
    <div
      className={cn(
        "relative w-60 rounded-full border bg-card px-4 py-3 text-card-foreground shadow-sm",
        hasHonesty && "border-amber-500/50",
      )}
    >
      <div className="flex items-center gap-2">
        <Workflow className="h-4 w-4 text-violet-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d.op}
          </p>
          <p className="truncate text-sm font-medium">{d.label}</p>
        </div>
        {hasHonesty ? (
          <AlertCircle
            className="h-4 w-4 text-amber-500"
            aria-label={d.honesty}
          />
        ) : null}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-violet-500" />
      <Handle type="source" position={Position.Right} className="!bg-violet-500" />
    </div>
  );
}
