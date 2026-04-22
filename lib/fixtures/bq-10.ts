import "server-only";

import type { AnalyticsAvailabilityDrift } from "@/lib/types/firestore";

const POINT_COUNT = 96; // ~15-minute cadence over 24h

// Tolerance default is ±2; we want most points inside the band with two
// visible drift streaks so the chart highlights what the KPI measures.
const STREAK_A_START = 28;
const STREAK_A_END = 34; // 7 points → ~1h45m long drift
const STREAK_B_START = 62;
const STREAK_B_END = 67; // 6 points → ~1h30m

function driftAt(index: number): number {
  if (index >= STREAK_A_START && index <= STREAK_A_END) {
    return 4 + ((index - STREAK_A_START) % 3); // 4..6 spots over-reported
  }
  if (index >= STREAK_B_START && index <= STREAK_B_END) {
    return -(3 + ((index - STREAK_B_START) % 2)); // -3..-4 under-reported
  }
  // Normal noise: sine with small amplitude, rounded so the chart lands on
  // integer spot counts.
  const noise = Math.sin(index / 4.8) + Math.cos(index / 7.1) * 0.6;
  return Math.round(noise);
}

/**
 * Synthetic fallback for BQ-10. Produces a 24-hour ascending timeline of
 * drift points with two visible streaks outside the ±2 tolerance band and
 * otherwise small noise inside the band.
 */
export function syntheticBQ10Raw(
  sinceMs: number,
  untilMs: number,
): {
  drift: AnalyticsAvailabilityDrift[];
} {
  const drift: AnalyticsAvailabilityDrift[] = [];
  const stepMs = (untilMs - sinceMs) / POINT_COUNT;
  const reconstructedAvailable = 30; // "true" free-spot count
  for (let i = 0; i < POINT_COUNT; i++) {
    const tMs = Math.floor(sinceMs + i * stepMs);
    const signedError = driftAt(i);
    const reportedAvailable = reconstructedAvailable - signedError;
    drift.push({
      timestamp: tMs,
      reportedAvailable,
      reconstructedAvailable,
      signedError,
      absError: Math.abs(signedError),
    });
  }
  return { drift };
}
