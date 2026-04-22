import "server-only";

import type { AnalyticsFacilityDemandPattern } from "@/lib/types/firestore";

function occupancyFor(dayOfWeek: number, hour: number): number {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  // Tiny deterministic jitter avoids pastel stripes across the heatmap.
  const jitter = ((dayOfWeek * 17 + hour * 31) % 100) / 10; // 0..9.9
  if (hour < 7 || hour > 21) {
    return Math.round((5 + jitter * 0.4) * 10) / 10; // night: 5–9%
  }
  if (isWeekend) {
    // Weekend: gentle midday bump.
    const distanceFromAfternoon = Math.abs(hour - 14) / 7;
    const base = 28 + (1 - distanceFromAfternoon) * 25;
    return Math.round(Math.max(0, Math.min(100, base + jitter * 0.4)) * 10) / 10;
  }
  // Weekday: sharp peaks at 9am and 5pm.
  const morningPeak = Math.max(0, 1 - Math.abs(hour - 9) / 3);
  const eveningPeak = Math.max(0, 1 - Math.abs(hour - 17) / 3);
  const peak = Math.max(morningPeak, eveningPeak);
  const base = 35 + peak * 55;
  return Math.round(Math.max(0, Math.min(100, base + jitter * 0.35)) * 10) / 10;
}

/**
 * Synthetic fallback for BQ-09. Produces a full 168-cell demand pattern
 * for the requested facility plus a facility metadata doc. Weekdays carry
 * the classic 9-am / 5-pm peaks; weekends get a soft midday bump.
 */
export function syntheticBQ09Raw(facilityId: string): {
  cells: AnalyticsFacilityDemandPattern[];
  facility: { name: string; capacity: number };
} {
  const cells: AnalyticsFacilityDemandPattern[] = [];
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (let hour = 0; hour < 24; hour++) {
      const avgOccupancyPct = occupancyFor(dayOfWeek, hour);
      // Utilization tracks occupancy here because we have no sustained-
      // saturation signal in the synthetic data — plan treats them as
      // independent. Scaled 0..1.
      const utilizationScore =
        Math.round((avgOccupancyPct / 100) ** 1.3 * 100) / 100;
      cells.push({
        facilityId,
        dayOfWeek,
        hour,
        avgOccupancyPct,
        utilizationScore,
      });
    }
  }
  const displayName =
    facilityId === "SD" ? "SD (Sebastián de Belalcázar, demo)" : facilityId;
  return {
    cells,
    facility: { name: displayName, capacity: 60 },
  };
}
