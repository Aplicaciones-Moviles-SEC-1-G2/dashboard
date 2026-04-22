import "server-only";

import type {
  AnalyticsAvailabilityByBucket,
  ConfigParking,
  ParkingSpot,
} from "@/lib/types/firestore";

const FLOORS = 3;
const SPOTS_PER_FLOOR = 20;

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

function buildSpots(): ParkingSpot[] {
  const spots: ParkingSpot[] = [];
  let idx = 0;
  for (let floor = 1; floor <= FLOORS; floor++) {
    for (let number = 1; number <= SPOTS_PER_FLOOR; number++) {
      // ~55% available — a plausible weekday-midmorning snapshot.
      const isAvailable = idx % 9 < 5;
      spots.push({
        floor,
        number,
        isAvailable,
        currentPlate: isAvailable ? "" : `SYN-${String(100 + idx).padStart(4, "0")}`,
      });
      idx += 1;
    }
  }
  return spots;
}

function priorFor(dayOfWeek: number, hour: number): number {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const distanceFromNoon = Math.abs(hour - 12) / 12; // 0 at noon, 1 at midnight
  if (isWeekend) {
    // Weekends: gentler drop, high availability in general.
    return Math.round((0.6 + distanceFromNoon * 0.35) * 100) / 100;
  }
  // Weekday: lunch dip, morning/evening peaks drive down availability.
  const morningPeak = Math.max(0, 1 - Math.abs(hour - 9) / 3);
  const eveningPeak = Math.max(0, 1 - Math.abs(hour - 17) / 3);
  const peak = Math.max(morningPeak, eveningPeak);
  const p = 0.85 - peak * 0.5;
  return Math.round(Math.max(0.2, Math.min(0.95, p)) * 100) / 100;
}

/**
 * Synthetic fallback for BQ-07. Returns 60 parking spots (~55% available),
 * a realistic `config/parking` doc, and a bucket prior derived from the
 * requested `(dayOfWeek, hour)` to match live-like weekday / weekend
 * patterns.
 */
export function syntheticBQ07Raw(
  dayOfWeek: number,
  hour: number,
): {
  spots: ParkingSpot[];
  config: ConfigParking;
  bucket: AnalyticsAvailabilityByBucket;
} {
  return {
    spots: buildSpots(),
    config: SYNTHETIC_CONFIG,
    bucket: {
      dayOfWeek,
      hour,
      pFreeSpotGt0: priorFor(dayOfWeek, hour),
      sampleSize: 120,
    },
  };
}
