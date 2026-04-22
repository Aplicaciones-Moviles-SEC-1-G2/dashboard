// BQ-01 dashboard-facing shapes. See plans/bq-01-peak-occupancy-moments.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-01.ts
// is the single producer; chart components and the page both consume these
// types. Raw Firestore shapes stay in lib/types/firestore.ts.

export interface HourBucket {
  /** 0..23, in the `opts.localTz` the transform was called with. */
  hour: number;
  meanOccupancyPct: number;
  maxOccupancyPct: number;
  saturationMinutes: number;
  sampleCount: number;
}

export interface SaturationEvent {
  startMs: number;
  endMs: number;
  durationMinutes: number;
  /** Local hour at startMs (same tz as HourBucket). */
  hour: number;
  peakOccupancyPct: number;
}

export interface BQ01SampleWindow {
  sinceMs: number;
  untilMs: number;
  snapshotCount: number;
}

export interface BQ01Anomalies {
  malformedCount: number;
  negativeOccupancyCount: number;
  overCapacityCount: number;
}

export interface BQ01ChartData {
  /** `null` when `numberOfFloors * spotsPerFloor === 0`. */
  capacity: number | null;
  /** Length 24, hours 0..23 in order. */
  hourBuckets: HourBucket[];
  saturationEvents: SaturationEvent[];
  sampleWindow: BQ01SampleWindow;
  anomalies: BQ01Anomalies;
}
