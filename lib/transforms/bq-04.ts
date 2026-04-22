import type {
  BQ04Anomalies,
  BQ04ChartData,
  BQ04HistogramBin,
  BQ04ObservedRange,
} from "@/lib/types/bq-04";

export interface TransformBQ04Input {
  records: Array<{ ocrConfidence: number; timestamp: unknown; type: string }>;
  config: { ocrConfidenceThreshold: number };
}

const BIN_COUNT = 20;
const BIN_WIDTH = 1 / BIN_COUNT;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function formatBinLabel(lower: number, upper: number): string {
  return `${lower.toFixed(2)}–${upper.toFixed(2)}`;
}

/**
 * BQ-04 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. Clamp the operator threshold to `[0, 1]`.
 * 2. Bucket `records` into 20 × 0.05-width bins over `[0, 1]`; last bin is
 *    inclusive on both edges so `ocrConfidence === 1.0` lands there.
 * 3. Count invalid rows (non-finite or outside `[0, 1]`).
 * 4. Compute `belowThresholdCount`, `belowThresholdShare`, observed range.
 */
export function transformBQ04(raw: TransformBQ04Input): BQ04ChartData {
  const threshold = clamp01(raw.config.ocrConfidenceThreshold);

  const bins: BQ04HistogramBin[] = Array.from({ length: BIN_COUNT }, (_, i) => {
    const binLowerInclusive = i * BIN_WIDTH;
    const binUpperExclusive = (i + 1) * BIN_WIDTH;
    return {
      binLowerInclusive,
      binUpperExclusive,
      label: formatBinLabel(binLowerInclusive, binUpperExclusive),
      count: 0,
      belowThreshold: binUpperExclusive <= threshold,
    };
  });

  const anomalies: BQ04Anomalies = { invalidCount: 0 };

  let totalEvents = 0;
  let belowThresholdCount = 0;
  let minSeen = Number.POSITIVE_INFINITY;
  let maxSeen = Number.NEGATIVE_INFINITY;

  for (const record of raw.records) {
    const v = record.ocrConfidence;
    if (!Number.isFinite(v) || v < 0 || v > 1) {
      anomalies.invalidCount += 1;
      continue;
    }
    const binIndex = Math.min(BIN_COUNT - 1, Math.floor(v / BIN_WIDTH));
    const bin = bins[binIndex];
    if (bin === undefined) continue;
    bin.count += 1;
    totalEvents += 1;
    if (v < threshold) belowThresholdCount += 1;
    if (v < minSeen) minSeen = v;
    if (v > maxSeen) maxSeen = v;
  }

  const belowThresholdShare = totalEvents === 0 ? 0 : belowThresholdCount / totalEvents;
  const observedRange: BQ04ObservedRange | null =
    totalEvents === 0
      ? null
      : { minConfidence: minSeen, maxConfidence: maxSeen };

  return {
    threshold,
    totalEvents,
    belowThresholdCount,
    belowThresholdShare,
    observedRange,
    bins,
    anomalies,
  };
}
