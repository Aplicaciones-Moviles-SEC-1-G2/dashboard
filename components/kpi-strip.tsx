import { KpiCard } from "@/components/charts/kpi-card";

export interface KpiEntry {
  label: string;
  value?: string | number | null;
  caption?: string;
}

interface KpiStripProps {
  kpis?: readonly KpiEntry[];
  /** Skeleton placeholder count when no data is available yet. */
  placeholderCount?: number;
}

export function KpiStrip({
  kpis,
  placeholderCount = 3,
}: KpiStripProps): React.JSX.Element {
  const entries: readonly (KpiEntry | null)[] = kpis?.length
    ? kpis
    : Array.from({ length: placeholderCount }, () => null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map((kpi, idx) =>
        kpi ? (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            caption={kpi.caption}
          />
        ) : (
          <KpiCard key={`placeholder-${idx}`} label="—" loading />
        ),
      )}
    </div>
  );
}
