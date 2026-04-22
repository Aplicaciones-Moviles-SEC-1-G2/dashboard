import { hhmm5Sequence, hhmm5ToHHColonMM } from "@/lib/time";
import type { AnalyticsMorningArrivalCurve } from "@/lib/types/firestore";
import type {
  BQ08ArrivalBucket,
  BQ08ChartData,
  BQ08Peak,
  BQ08RecommendationBand,
} from "@/lib/types/bq-08";

export interface TransformBQ08Options {
  dayOfWeek: number;
  /** Default 0.8 (the lot-wide recommendation threshold). */
  successThreshold?: number;
}

const DEFAULT_THRESHOLD = 0.8;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * BQ-08 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. Build the 37-bucket expected sequence 0630–0930 at 5-minute stride.
 * 2. Clamp rollup `pSpotsAvailable` to [0,1]; sort ascending by hhmm5.
 * 3. Detect missing buckets.
 * 4. Find the first contiguous band where `p >= threshold`; capture peak.
 */
export function transformBQ08(
  raw: { buckets: AnalyticsMorningArrivalCurve[] },
  opts: TransformBQ08Options,
): BQ08ChartData {
  const threshold = clamp01(opts.successThreshold ?? DEFAULT_THRESHOLD);

  const cleaned: BQ08ArrivalBucket[] = raw.buckets
    .filter((b) => typeof b.hhmm5 === "string" && b.hhmm5.length === 4)
    .map((b) => ({
      hhmm5: b.hhmm5,
      label: hhmm5ToHHColonMM(b.hhmm5),
      pSpotsAvailable: clamp01(b.pSpotsAvailable),
    }))
    .sort((a, b) => (a.hhmm5 < b.hhmm5 ? -1 : a.hhmm5 > b.hhmm5 ? 1 : 0));

  const expected = hhmm5Sequence("0630", "0930");
  const present = new Set(cleaned.map((b) => b.hhmm5));
  const missingBuckets = expected.filter((b) => !present.has(b));

  let band: BQ08RecommendationBand | null = null;
  let i = 0;
  while (i < cleaned.length) {
    const cur = cleaned[i];
    if (cur && cur.pSpotsAvailable >= threshold) {
      let j = i;
      let minP = cur.pSpotsAvailable;
      while (j + 1 < cleaned.length) {
        const next = cleaned[j + 1];
        if (!next || next.pSpotsAvailable < threshold) break;
        if (next.pSpotsAvailable < minP) minP = next.pSpotsAvailable;
        j += 1;
      }
      const end = cleaned[j] as BQ08ArrivalBucket;
      band = {
        startHhmm5: cur.hhmm5,
        endHhmm5: end.hhmm5,
        startLabel: cur.label,
        endLabel: end.label,
        minPSpotsAvailable: minP,
      };
      break;
    }
    i += 1;
  }

  let peak: BQ08Peak | null = null;
  for (const b of cleaned) {
    if (peak === null || b.pSpotsAvailable > peak.pSpotsAvailable) {
      peak = {
        hhmm5: b.hhmm5,
        label: b.label,
        pSpotsAvailable: b.pSpotsAvailable,
      };
    }
  }

  return {
    dayOfWeek: opts.dayOfWeek,
    threshold,
    buckets: cleaned,
    recommendationBand: band,
    peak,
    missingBuckets,
    dataSource: "live",
  };
}
