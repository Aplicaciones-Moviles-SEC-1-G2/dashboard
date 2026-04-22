import type { AnalyticsFacilityDemandPattern } from "@/lib/types/firestore";
import type {
  BQ09Anomalies,
  BQ09ChartData,
  BQ09FacilityCell,
  BQ09MissingCell,
  BQ09PeakCell,
  BQ09TopWindow,
} from "@/lib/types/bq-09";

export interface TransformBQ09Options {
  facilityId: string;
  /** Default 10. */
  topN?: number;
}

const DAYS = 7;
const HOURS = 24;
const CELL_COUNT = DAYS * HOURS;
const DEFAULT_TOP_N = 10;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface FacilityInput {
  cells: AnalyticsFacilityDemandPattern[];
  facility: { name: string; capacity: number } | null;
}

function labelFor(dayOfWeek: number, hour: number): string {
  const day = DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
  return `${day} ${String(hour).padStart(2, "0")}:00`;
}

function clampNonNegative(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v;
}

/**
 * BQ-09 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. Drop malformed cells (dayOfWeek outside 0..6 or hour outside 0..23).
 * 2. Enumerate the expected 168-cell matrix; flag missing cells.
 * 3. Top-N utilization windows (desc), peak by avgOccupancyPct.
 */
export function transformBQ09(
  raw: FacilityInput,
  opts: TransformBQ09Options,
): BQ09ChartData {
  const topN = opts.topN ?? DEFAULT_TOP_N;
  const anomalies: BQ09Anomalies = { malformedCount: 0 };

  const byKey = new Map<string, BQ09FacilityCell>();
  for (const cell of raw.cells) {
    const day = cell.dayOfWeek;
    const hour = cell.hour;
    if (
      !Number.isFinite(day) ||
      day < 0 ||
      day > 6 ||
      !Number.isFinite(hour) ||
      hour < 0 ||
      hour > 23
    ) {
      anomalies.malformedCount += 1;
      continue;
    }
    byKey.set(`${day}_${hour}`, {
      dayOfWeek: day,
      hour,
      avgOccupancyPct: clampNonNegative(cell.avgOccupancyPct),
      utilizationScore: clampNonNegative(cell.utilizationScore),
    });
  }

  const cells: BQ09FacilityCell[] = Array.from({ length: CELL_COUNT }, (_, idx) => {
    const dayOfWeek = Math.floor(idx / HOURS);
    const hour = idx % HOURS;
    const existing = byKey.get(`${dayOfWeek}_${hour}`);
    return (
      existing ?? {
        dayOfWeek,
        hour,
        avgOccupancyPct: 0,
        utilizationScore: 0,
      }
    );
  });

  const missingCells: BQ09MissingCell[] = [];
  for (let idx = 0; idx < CELL_COUNT; idx++) {
    const dayOfWeek = Math.floor(idx / HOURS);
    const hour = idx % HOURS;
    if (!byKey.has(`${dayOfWeek}_${hour}`)) {
      missingCells.push({ dayOfWeek, hour });
    }
  }

  const nonZero = cells.filter((c) => c.utilizationScore > 0);
  nonZero.sort((a, b) => {
    if (b.utilizationScore !== a.utilizationScore)
      return b.utilizationScore - a.utilizationScore;
    if (b.avgOccupancyPct !== a.avgOccupancyPct)
      return b.avgOccupancyPct - a.avgOccupancyPct;
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.hour - b.hour;
  });
  const topWindows: BQ09TopWindow[] = nonZero.slice(0, topN).map((c) => ({
    dayOfWeek: c.dayOfWeek,
    hour: c.hour,
    label: labelFor(c.dayOfWeek, c.hour),
    utilizationScore: c.utilizationScore,
    avgOccupancyPct: c.avgOccupancyPct,
  }));

  let peak: BQ09PeakCell | null = null;
  for (const c of cells) {
    if (c.avgOccupancyPct <= 0) continue;
    if (peak === null || c.avgOccupancyPct > peak.avgOccupancyPct) {
      peak = {
        dayOfWeek: c.dayOfWeek,
        hour: c.hour,
        label: labelFor(c.dayOfWeek, c.hour),
        avgOccupancyPct: c.avgOccupancyPct,
      };
    }
  }

  return {
    facilityId: opts.facilityId,
    facilityName: raw.facility?.name ?? opts.facilityId,
    capacity: raw.facility?.capacity ?? null,
    cells,
    topWindows,
    peak,
    missingCells,
    anomalies,
    dataSource: "live",
  };
}
