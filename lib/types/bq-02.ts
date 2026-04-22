// BQ-02 dashboard-facing shapes. See plans/bq-02-occupancy-snapshot-cadence.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-02.ts
// is the single producer; chart components and the page both consume these
// types. Raw Firestore shapes stay in lib/types/firestore.ts.

export interface HistogramBin {
  lowerSec: number;
  /** `Number.POSITIVE_INFINITY` for the overflow bin. */
  upperSec: number;
  /** e.g. "0–30s", "30–60s", "≥ 600s". */
  label: string;
  count: number;
}

export interface BQ02Observed {
  /** `null` when no usable snapshots were supplied to the transform. */
  earliestMs: number | null;
  /** `null` when no usable snapshots were supplied to the transform. */
  latestMs: number | null;
  snapshotCount: number;
  deltaCount: number;
}

export interface BQ02Percentiles {
  p50Sec: number;
  p95Sec: number;
  p99Sec: number;
  /** Alias of `p50Sec`, kept for direct reference in the stalls block. */
  medianSec: number;
}

export interface BQ02Stalls {
  thresholdMultiplier: number;
  thresholdSec: number;
  gapsAboveThreshold: number;
  distinctStallPeriods: number;
}

export interface BQ02Anomalies {
  duplicateCount: number;
}

export interface BQ02ChartData {
  observed: BQ02Observed;
  percentiles: BQ02Percentiles;
  stalls: BQ02Stalls;
  histogram: HistogramBin[];
  anomalies: BQ02Anomalies;
}
