"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BarChart3, LineChart } from "lucide-react";

import { cn } from "@/lib/utils";

export type SinkChart =
  | "BarChart"
  | "LineChart"
  | "AreaChart"
  | "DonutChart"
  | "BarList"
  | "ProgressCircle"
  | "Heatmap";

export interface SinkNodeData extends Record<string, unknown> {
  chart: SinkChart;
  title: string;
  library: "tremor" | "recharts";
}

function libraryChipLabel(library: SinkNodeData["library"]): string {
  return library === "tremor" ? "T" : "R";
}

export function SinkNode({ data }: NodeProps): React.JSX.Element {
  const d = data as SinkNodeData;
  const Icon = d.chart === "LineChart" || d.chart === "AreaChart" ? LineChart : BarChart3;
  return (
    <div
      className={cn(
        "relative w-60 rounded-md border bg-card px-3 py-3 text-card-foreground shadow-sm",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{d.title}</p>
          <p className="text-[11px] text-muted-foreground">{d.chart}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-sm border text-[10px] font-semibold",
            d.library === "tremor"
              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
              : "border-sky-500/40 text-sky-600 dark:text-sky-300",
          )}
          title={d.library}
        >
          {libraryChipLabel(d.library)}
        </span>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
    </div>
  );
}
