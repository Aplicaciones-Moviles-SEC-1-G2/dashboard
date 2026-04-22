import "server-only";

import { hhmm5Sequence } from "@/lib/time";
import type { AnalyticsMorningArrivalCurve } from "@/lib/types/firestore";

const PEAK_MINUTES = 8 * 60; // 08:00 is the busiest arrival minute.

function curveAt(minutes: number): number {
  // Unimodal dip centred on 08:00. High availability at the fringes
  // (06:30 and 09:30), deepest around 07:30–08:15 where most students
  // arrive. Range roughly [0.22, 0.95].
  const distance = Math.abs(minutes - PEAK_MINUTES); // 0..180 over the window
  const normalized = distance / 180;
  const base = 0.25 + normalized * 0.7;
  // Tiny deterministic jitter so neighbouring buckets don't look pasted.
  const jitter = ((minutes % 15) - 7) / 200; // ±0.035
  return Math.round(Math.max(0.18, Math.min(0.96, base + jitter)) * 100) / 100;
}

/**
 * Synthetic fallback for BQ-08. Generates the 37-bucket morning curve for
 * the supplied day-of-week. The curve has a pronounced dip around 08:00
 * (peak arrival) and recovers past 09:00 — matches the plan's example
 * shape so the recommendation band always lands in a non-trivial window.
 */
export function syntheticBQ08Raw(dayOfWeek: number): {
  buckets: AnalyticsMorningArrivalCurve[];
} {
  const hhmms = hhmm5Sequence("0630", "0930");
  const buckets: AnalyticsMorningArrivalCurve[] = hhmms.map((hhmm5) => {
    const hh = Number.parseInt(hhmm5.slice(0, 2), 10);
    const mm = Number.parseInt(hhmm5.slice(2, 4), 10);
    const minutes = hh * 60 + mm;
    return {
      dayOfWeek,
      hhmm5,
      pSpotsAvailable: curveAt(minutes),
    };
  });
  return { buckets };
}
