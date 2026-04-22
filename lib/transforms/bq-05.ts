import type { VehicleRecordExit } from "@/lib/types/firestore";
import type {
  BQ05ChartData,
  BQ05DomainRow,
  BQ05Drops,
  BQ05Kpis,
  BQ05Totals,
} from "@/lib/types/bq-05";

export interface TransformBQ05Options {
  /** Default 10. Controls the BarList length (tail rolled into `(others)`). */
  topN?: number;
  /** Default `uniandes.edu.co`. */
  universityDomain?: string;
}

const DEFAULT_TOP_N = 10;
const DEFAULT_UNIVERSITY = "uniandes.edu.co";
const UNKNOWN = "(unknown)";
const OTHERS = "(others)";

interface DomainAccumulator {
  eventCount: number;
  totalHours: number;
  hasNullDuration: boolean;
}

function extractDomain(ownerEmail: string | null): string {
  const normalized = ownerEmail?.trim().toLowerCase() ?? "";
  if (normalized.length === 0 || !normalized.includes("@")) return UNKNOWN;
  const parts = normalized.split("@");
  const tail = parts[1] ?? "";
  return tail.length === 0 ? UNKNOWN : tail;
}

function sortRowsDesc(a: BQ05DomainRow, b: BQ05DomainRow): number {
  if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
  return b.eventCount - a.eventCount;
}

/**
 * BQ-05 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. Bucket registered exits by lowercased email domain; `(unknown)` for
 *    missing or malformed ownerEmails.
 * 2. Sum total hours (skipping null/negative `durationHours`) and count
 *    events per domain.
 * 3. Sort desc by totalHours; top-N with a synthetic `(others)` tail row.
 * 4. Compute `universityHoursShare = hours[universityDomain] / totalRegisteredHours`.
 */
export function transformBQ05(
  raw: { registeredExits: VehicleRecordExit[] },
  opts: TransformBQ05Options = {},
): BQ05ChartData {
  const topN = opts.topN ?? DEFAULT_TOP_N;
  const universityDomainKey = (opts.universityDomain ?? DEFAULT_UNIVERSITY).toLowerCase();

  const byDomain = new Map<string, DomainAccumulator>();
  const drops: BQ05Drops = { unknownOwnerCount: 0, nullDurationCount: 0 };

  for (const exit of raw.registeredExits) {
    const domain = extractDomain(exit.ownerEmail);
    if (domain === UNKNOWN) drops.unknownOwnerCount += 1;

    const durRaw = exit.durationHours;
    const dur =
      typeof durRaw === "number" && Number.isFinite(durRaw) && durRaw >= 0
        ? durRaw
        : null;
    if (dur === null) drops.nullDurationCount += 1;

    const existing = byDomain.get(domain) ?? {
      eventCount: 0,
      totalHours: 0,
      hasNullDuration: false,
    };
    existing.eventCount += 1;
    if (dur !== null) existing.totalHours += dur;
    else existing.hasNullDuration = true;
    byDomain.set(domain, existing);
  }

  const allRows: BQ05DomainRow[] = [];
  let unknownRow: BQ05DomainRow | null = null;
  for (const [domain, acc] of byDomain) {
    const row: BQ05DomainRow = {
      domain,
      eventCount: acc.eventCount,
      totalHours: acc.totalHours,
      hasNullDuration: acc.hasNullDuration,
    };
    if (domain === UNKNOWN) unknownRow = row;
    else allRows.push(row);
  }
  allRows.sort(sortRowsDesc);

  const top = allRows.slice(0, topN);
  const tail = allRows.slice(topN);
  if (tail.length > 0) {
    let sumEvents = 0;
    let sumHours = 0;
    let anyNull = false;
    for (const row of tail) {
      sumEvents += row.eventCount;
      sumHours += row.totalHours;
      if (row.hasNullDuration) anyNull = true;
    }
    top.push({
      domain: OTHERS,
      eventCount: sumEvents,
      totalHours: sumHours,
      hasNullDuration: anyNull,
    });
  }

  const totalRegisteredHours = allRows.reduce((s, r) => s + r.totalHours, 0);
  const totalRegisteredEvents =
    allRows.reduce((s, r) => s + r.eventCount, 0) +
    (unknownRow?.eventCount ?? 0);

  const universityHoursShare: BQ05Kpis["universityHoursShare"] =
    totalRegisteredHours === 0
      ? null
      : (byDomain.get(universityDomainKey)?.totalHours ?? 0) /
        totalRegisteredHours;

  const totals: BQ05Totals = {
    totalRegisteredHours,
    totalRegisteredEvents,
  };
  const kpis: BQ05Kpis = { universityDomainKey, universityHoursShare };

  return {
    rows: top,
    unknownRow,
    totals,
    kpis,
    drops,
  };
}
