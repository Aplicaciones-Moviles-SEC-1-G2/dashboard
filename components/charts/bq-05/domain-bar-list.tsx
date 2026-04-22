"use client";

import { BarList } from "@tremor/react";

import type { BQ05DomainRow } from "@/lib/types/bq-05";

interface BQ05DomainBarListProps {
  rows: readonly BQ05DomainRow[];
  /** Appended to row names as secondary text. */
  footnote?: string | null;
}

const OTHERS = "(others)";

function formatName(row: BQ05DomainRow): string {
  return row.hasNullDuration ? `${row.domain} *` : row.domain;
}

export function BQ05DomainBarList({
  rows,
  footnote,
}: BQ05DomainBarListProps): React.JSX.Element {
  const data = rows.map((row) => ({
    name: formatName(row),
    value: Number(row.totalHours.toFixed(2)),
    eventCount: row.eventCount,
    isOthers: row.domain === OTHERS,
  }));

  return (
    <div className="flex h-full flex-col gap-3">
      <BarList
        data={data.map((d) => ({
          name: d.name,
          value: d.value,
          color: d.isOthers ? "neutral" : "indigo",
        }))}
        valueFormatter={(v: number) => `${v.toFixed(1)} h`}
        className="flex-1"
      />
      <ul className="text-[11px] text-muted-foreground">
        {data.map((d) => (
          <li key={d.name} className="flex justify-between">
            <span className="truncate">{d.name}</span>
            <span className="tabular-nums">
              {d.eventCount.toLocaleString()} events
            </span>
          </li>
        ))}
      </ul>
      {footnote ? (
        <p className="text-[11px] text-muted-foreground">{footnote}</p>
      ) : null}
    </div>
  );
}
