// BQ-06 dashboard-facing shapes. See plans/bq-06-overstay-incidence.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-06.ts
// is the single producer; chart components and the page both consume these
// types.

export interface BQ06DailyOverstayBucket {
  /** `YYYY-MM-DD` in the transform's local tz. */
  date: string;
  registeredOverstays: number;
  unregisteredOverstays: number;
}

export interface BQ06Envelope {
  openingHour: number;
  closingHour: number;
  envelopeHours: number;
  invalid: boolean;
}

export interface BQ06Overall {
  totalExits: number;
  totalOverstays: number;
  /** 0..1 */
  overstayShare: number;
}

export interface BQ06RepeatOffenders {
  registeredOverstaysTotal: number;
  repeatOffenderOverstays: number;
  /** `null` when denominator is 0. */
  repeatOffenderShare: number | null;
}

export interface BQ06Drops {
  nullDurationCount: number;
}

export interface BQ06ChartData {
  envelope: BQ06Envelope;
  /** Ascending by `date`, pre-seeded to cover the full rolling window. */
  dailyBuckets: BQ06DailyOverstayBucket[];
  overall: BQ06Overall;
  repeatOffenders: BQ06RepeatOffenders;
  drops: BQ06Drops;
  /**
   * `live` when the underlying Firestore reads returned usable rows;
   * `synthetic` when the action fell back to `lib/fixtures/bq-06.ts` so
   * the page still renders a populated chart while the real data is
   * absent or the required composite index has not been deployed.
   */
  dataSource: "live" | "synthetic";
}
