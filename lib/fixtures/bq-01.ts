import "server-only";

import type {
  ConfigParking,
  ParkingOccupancyHistory,
} from "@/lib/types/firestore";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

const FLOORS = 3;
const SPOTS_PER_FLOOR = 20;
const CAPACITY = FLOORS * SPOTS_PER_FLOOR;

const SYNTHETIC_CONFIG: ConfigParking = {
  parkingName: "SD (demo)",
  openingHour: 7,
  closingHour: 22,
  hourlyRate: 5000,
  numberOfFloors: FLOORS,
  spotsPerFloor: SPOTS_PER_FLOOR,
  queueLength: 0,
  ocrConfidenceThreshold: 0.8,
};

function occupancyFor(dayOfWeek: number, hour: number, jitter: number): number {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (hour < 7 || hour > 21) return Math.max(0, 4 + jitter * 4);
  if (isWeekend) {
    const distanceFromAfternoon = Math.abs(hour - 14) / 7;
    return 30 + (1 - distanceFromAfternoon) * 25 + jitter * 6;
  }
  const morningPeak = Math.max(0, 1 - Math.abs(hour - 9) / 3);
  const eveningPeak = Math.max(0, 1 - Math.abs(hour - 17) / 3);
  const peak = Math.max(morningPeak, eveningPeak);
  return 40 + peak * 55 + jitter * 6;
}

function buildSnapshots(nowMs: number): ParkingOccupancyHistory[] {
  const snapshots: ParkingOccupancyHistory[] = [];
  const days = 14;
  const stepsPerDay = DAY_MS / FIFTEEN_MIN_MS; // 96
  for (let d = 0; d < days; d++) {
    const dayStart = nowMs - (d + 1) * DAY_MS;
    for (let step = 0; step < stepsPerDay; step++) {
      const ms = dayStart + step * FIFTEEN_MIN_MS;
      const date = new Date(ms);
      const dayOfWeek = date.getUTCDay();
      const hour = Math.floor((step * 15) / 60);
      // Tiny deterministic jitter so consecutive samples don't look pasted.
      const jitterSeed = ((d * 31 + step * 17) % 40) / 10 - 2; // -2..2
      const pct = Math.max(0, Math.min(100, occupancyFor(dayOfWeek, hour, jitterSeed)));
      const available = Math.max(0, Math.round(CAPACITY * (1 - pct / 100)));
      snapshots.push({
        timestamp: ms,
        hour,
        dayOfWeek,
        availableSpots: available,
        totalSpots: CAPACITY,
        occupancyPercentage: Math.round(pct * 10) / 10,
      });
    }
  }
  return snapshots;
}

/**
 * Synthetic fallback for BQ-01. Mirrors `fetchRawBQ01(sinceMs, untilMs)` so
 * the same `transformBQ01` pipeline runs against it. Shapes 14 days of
 * 15-minute occupancy snapshots with weekday morning + evening peaks that
 * cross the saturation line a few times per day, so the resulting line
 * chart and saturation bars are both visibly non-zero.
 */
export function syntheticBQ01Raw(nowMs: number = Date.now()): {
  snapshots: ParkingOccupancyHistory[];
  config: ConfigParking;
} {
  return {
    snapshots: buildSnapshots(nowMs),
    config: SYNTHETIC_CONFIG,
  };
}
