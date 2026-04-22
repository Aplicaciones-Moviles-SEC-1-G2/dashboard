// BQ-05 dashboard-facing shapes. See plans/bq-05-email-domain-usage-share.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-05.ts
// is the single producer; chart components and the page both consume these
// types.

export interface BQ05DomainRow {
  domain: string;
  eventCount: number;
  totalHours: number;
  hasNullDuration: boolean;
}

export interface BQ05Totals {
  /** Excludes `(unknown)` domain. */
  totalRegisteredHours: number;
  /** Includes `(unknown)` domain. */
  totalRegisteredEvents: number;
}

export interface BQ05Kpis {
  universityDomainKey: string;
  /** `null` when denominator is 0. */
  universityHoursShare: number | null;
}

export interface BQ05Drops {
  unknownOwnerCount: number;
  nullDurationCount: number;
}

export interface BQ05ChartData {
  /** Top-N (default 10) rows by totalHours DESC, plus an optional synthetic `(others)` row. */
  rows: BQ05DomainRow[];
  /** The `(unknown)` bucket, tracked separately; never present in `rows`. */
  unknownRow: BQ05DomainRow | null;
  totals: BQ05Totals;
  kpis: BQ05Kpis;
  drops: BQ05Drops;
}
