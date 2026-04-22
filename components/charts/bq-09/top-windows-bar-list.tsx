"use client";

import { BarList } from "@tremor/react";

import type { BQ09TopWindow } from "@/lib/types/bq-09";

interface BQ09TopWindowsBarListProps {
  topWindows: readonly BQ09TopWindow[];
}

export function BQ09TopWindowsBarList({
  topWindows,
}: BQ09TopWindowsBarListProps): React.JSX.Element {
  const data = topWindows.map((w) => ({
    name: w.label,
    value: Number(w.utilizationScore.toFixed(2)),
    occupancy: w.avgOccupancyPct,
  }));
  return (
    <div className="flex h-full flex-col gap-3">
      <BarList
        data={data.map((d) => ({
          name: d.name,
          value: d.value,
          color: "emerald",
        }))}
        valueFormatter={(v: number) => v.toFixed(2)}
        className="flex-1"
      />
      <ul className="text-[11px] text-muted-foreground">
        {data.map((d) => (
          <li key={d.name} className="flex justify-between">
            <span className="truncate">{d.name}</span>
            <span className="tabular-nums">{d.occupancy.toFixed(1)}% avg</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
