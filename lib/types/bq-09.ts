// BQ-09 dashboard-facing shapes. See plans/bq-09-monetizable-peak-demand.md
// "Chart data shape (TypeScript)". The transform in lib/transforms/bq-09.ts
// is the single producer.

export interface BQ09FacilityCell {
  /** 0..6 */
  dayOfWeek: number;
  /** 0..23 */
  hour: number;
  avgOccupancyPct: number;
  utilizationScore: number;
}

export interface BQ09TopWindow {
  dayOfWeek: number;
  hour: number;
  /** e.g. "Mon 08:00" */
  label: string;
  utilizationScore: number;
  avgOccupancyPct: number;
}

export interface BQ09PeakCell {
  dayOfWeek: number;
  hour: number;
  label: string;
  avgOccupancyPct: number;
}

export interface BQ09Anomalies {
  malformedCount: number;
}

export interface BQ09MissingCell {
  dayOfWeek: number;
  hour: number;
}

export interface BQ09ChartData {
  facilityId: string;
  facilityName: string;
  capacity: number | null;
  /** Length 168 (7×24), dayOfWeek-major then hour. */
  cells: BQ09FacilityCell[];
  topWindows: BQ09TopWindow[];
  peak: BQ09PeakCell | null;
  missingCells: BQ09MissingCell[];
  anomalies: BQ09Anomalies;
  /** `synthetic` when the facility demand rollup returned no cells. */
  dataSource: "live" | "synthetic";
}
