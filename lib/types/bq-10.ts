// BQ-10 dashboard-facing shapes. See plans/bq-10-availability-and-queue-accuracy.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-10.ts
// is the single producer.

export interface BQ10DriftPoint {
  timestampMs: number;
  reportedAvailable: number;
  reconstructedAvailable: number;
  signedError: number;
  absError: number;
}

export interface BQ10Window {
  sinceMs: number;
  untilMs: number;
  toleranceSpots: number;
}

export interface BQ10Summary {
  mae: number;
  maxAbsError: number;
  /** 0..1 */
  withinToleranceShare: number;
  longestDriftStreakMinutes: number;
}

export interface BQ10Queue {
  status: "pending-sensor-data";
  note: string;
}

export interface BQ10Anomalies {
  malformedCount: number;
}

export interface BQ10ChartData {
  window: BQ10Window;
  /** Ascending by `timestampMs`. */
  points: BQ10DriftPoint[];
  summary: BQ10Summary;
  queue: BQ10Queue;
  anomalies: BQ10Anomalies;
  /** `synthetic` when the availability-drift rollup returned no rows. */
  dataSource: "live" | "synthetic";
}
