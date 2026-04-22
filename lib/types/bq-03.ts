// BQ-03 dashboard-facing shapes. See plans/bq-03-registered-user-stay-duration.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-03.ts is
// the single producer; chart components and the page both consume these types.
// Raw Firestore shapes stay in lib/types/firestore.ts.

export interface HeatmapCell {
  /** 0..6 (Sun..Sat) in the transform's local tz. */
  dayOfWeek: number;
  /** 0..23 */
  hour: number;
  meanDurationHours: number | null;
  medianDurationHours: number | null;
  sampleCount: number;
}

export interface BQ03Cohort {
  overallMeanDurationHours: number | null;
  exitCount: number;
  registeredPlateCount: number;
}

export interface BQ03Drops {
  nullDurationCount: number;
  invalidDurationCount: number;
  unregisteredPlateCount: number;
  legacyOnlyUserCount: number;
}

export interface BQ03ChartData {
  /** Length 168, dayOfWeek-major then hour (i.e. index = dayOfWeek * 24 + hour). */
  cells: HeatmapCell[];
  cohort: BQ03Cohort;
  drops: BQ03Drops;
}
