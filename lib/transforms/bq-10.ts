import type { AnalyticsAvailabilityDrift } from "@/lib/types/firestore";
import type {
  BQ10Anomalies,
  BQ10ChartData,
  BQ10DriftPoint,
  BQ10Queue,
  BQ10Summary,
} from "@/lib/types/bq-10";

export interface TransformBQ10Options {
  sinceMs: number;
  untilMs: number;
  /** Default ±2 spots. */
  toleranceSpots?: number;
}

const DEFAULT_TOLERANCE = 2;

/**
 * BQ-10 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. Drop docs with any non-finite numeric field.
 * 2. Sort ascending by timestamp; project to `DriftPoint`.
 * 3. MAE, max abs error, within-tolerance share.
 * 4. Walk points to find the longest contiguous streak where
 *    `absError > tolerance` (duration in minutes).
 * 5. Queue half: static `pending-sensor-data` placeholder.
 */
export function transformBQ10(
  raw: { drift: AnalyticsAvailabilityDrift[] },
  opts: TransformBQ10Options,
): BQ10ChartData {
  const tolerance = opts.toleranceSpots ?? DEFAULT_TOLERANCE;
  const anomalies: BQ10Anomalies = { malformedCount: 0 };

  const points: BQ10DriftPoint[] = [];
  for (const doc of raw.drift) {
    if (
      !Number.isFinite(doc.timestamp) ||
      !Number.isFinite(doc.reportedAvailable) ||
      !Number.isFinite(doc.reconstructedAvailable) ||
      !Number.isFinite(doc.signedError) ||
      !Number.isFinite(doc.absError)
    ) {
      anomalies.malformedCount += 1;
      continue;
    }
    points.push({
      timestampMs: doc.timestamp,
      reportedAvailable: doc.reportedAvailable,
      reconstructedAvailable: doc.reconstructedAvailable,
      signedError: doc.signedError,
      absError: doc.absError,
    });
  }
  points.sort((a, b) => a.timestampMs - b.timestampMs);

  let maeSum = 0;
  let maxAbs = 0;
  let withinCount = 0;
  for (const p of points) {
    maeSum += p.absError;
    if (p.absError > maxAbs) maxAbs = p.absError;
    if (p.absError <= tolerance) withinCount += 1;
  }
  const n = points.length;
  const mae = n === 0 ? 0 : maeSum / n;
  const withinToleranceShare = n === 0 ? 0 : withinCount / n;

  let longestStreakMinutes = 0;
  let streakStart: number | null = null;
  let streakLastMs: number | null = null;
  for (const p of points) {
    if (p.absError > tolerance) {
      if (streakStart === null) {
        streakStart = p.timestampMs;
      }
      streakLastMs = p.timestampMs;
    } else if (streakStart !== null && streakLastMs !== null) {
      const duration = (streakLastMs - streakStart) / 60000;
      if (duration > longestStreakMinutes) longestStreakMinutes = duration;
      streakStart = null;
      streakLastMs = null;
    }
  }
  if (streakStart !== null && streakLastMs !== null) {
    const duration = (streakLastMs - streakStart) / 60000;
    if (duration > longestStreakMinutes) longestStreakMinutes = duration;
  }

  const summary: BQ10Summary = {
    mae,
    maxAbsError: maxAbs,
    withinToleranceShare,
    longestDriftStreakMinutes: longestStreakMinutes,
  };

  const queue: BQ10Queue = {
    status: "pending-sensor-data",
    note: "Queue-length accuracy requires a signal Firestore does not currently capture.",
  };

  return {
    window: {
      sinceMs: opts.sinceMs,
      untilMs: opts.untilMs,
      toleranceSpots: tolerance,
    },
    points,
    summary,
    queue,
    anomalies,
    dataSource: "live",
  };
}
