// BQ-08 dashboard-facing shapes. See plans/bq-08-optimal-departure-window.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-08.ts
// is the single producer.

export interface BQ08ArrivalBucket {
  /** e.g. "0630" */
  hhmm5: string;
  /** e.g. "06:30" */
  label: string;
  /** 0..1 */
  pSpotsAvailable: number;
}

export interface BQ08RecommendationBand {
  startHhmm5: string;
  endHhmm5: string;
  startLabel: string;
  endLabel: string;
  /** min pSpotsAvailable across the band */
  minPSpotsAvailable: number;
}

export interface BQ08Peak {
  hhmm5: string;
  label: string;
  pSpotsAvailable: number;
}

export interface BQ08ChartData {
  /** 0..6 to match `Date.getDay()` */
  dayOfWeek: number;
  /** 0..1 */
  threshold: number;
  /** Returned in ascending hhmm5 order. */
  buckets: BQ08ArrivalBucket[];
  recommendationBand: BQ08RecommendationBand | null;
  peak: BQ08Peak | null;
  /** Expected hhmm5 buckets that were not returned by the rollup. */
  missingBuckets: string[];
  /** `synthetic` when the rollup returned no rows for the selected day. */
  dataSource: "live" | "synthetic";
}
