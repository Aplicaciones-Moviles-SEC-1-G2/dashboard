// BQ-07 dashboard-facing shapes. See plans/bq-07-spot-probability-10min.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-07.ts
// is the single producer.

export type BQ07Tier = "green" | "yellow" | "red";

export interface BQ07BucketInfo {
  id: string;
  /** 0..6 (Sun..Sat) local tz. */
  dayOfWeek: number;
  /** 0..23 local tz. */
  hour: number;
  pFreeSpotGt0: number | null;
  sampleSize: number;
}

export interface BQ07Disclaimers {
  noRealTripData: boolean;
  bucketMissing: boolean;
  liveStateEmpty: boolean;
}

export interface BQ07Anomalies {
  bucketClamped: boolean;
}

export interface BQ07ChartData {
  capacity: number;
  freeSpotsNow: number;
  /** 0..1 */
  liveFreeShare: number;
  bucket: BQ07BucketInfo;
  /** 0..1 */
  proxyProbability: number;
  tier: BQ07Tier;
  disclaimers: BQ07Disclaimers;
  anomalies: BQ07Anomalies;
  /** `synthetic` when both live spots and the bucket doc were absent. */
  dataSource: "live" | "synthetic";
}
