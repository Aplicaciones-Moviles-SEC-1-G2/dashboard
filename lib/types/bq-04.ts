// BQ-04 dashboard-facing shapes. See plans/bq-04-ocr-confidence-vs-threshold.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-04.ts
// is the single producer; chart components and the page both consume these
// types. Raw Firestore shapes stay in lib/types/firestore.ts.

export interface BQ04HistogramBin {
  binLowerInclusive: number;
  binUpperExclusive: number;
  label: string;
  count: number;
  belowThreshold: boolean;
}

export interface BQ04ObservedRange {
  minConfidence: number;
  maxConfidence: number;
}

export interface BQ04Anomalies {
  invalidCount: number;
}

export interface BQ04ChartData {
  threshold: number;
  totalEvents: number;
  belowThresholdCount: number;
  /** 0..1 */
  belowThresholdShare: number;
  observedRange: BQ04ObservedRange | null;
  /** Length 20, in ascending binLowerInclusive order. */
  bins: BQ04HistogramBin[];
  anomalies: BQ04Anomalies;
}
