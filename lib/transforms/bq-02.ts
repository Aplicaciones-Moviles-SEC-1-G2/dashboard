import type {
  BQ02Anomalies,
  BQ02ChartData,
  BQ02Observed,
  BQ02Percentiles,
  BQ02Stalls,
  HistogramBin,
} from "@/lib/types/bq-02";

export interface TransformBQ02Options {
  /** Multiplier on the median delta that defines a stall. Default: 3. */
  stallMultiplier?: number;
  /** Number of equal-width bins below the overflow bin. Default: 20. */
  histogramBins?: number;
}

const DEFAULT_STALL_MULTIPLIER = 3;
const DEFAULT_HISTOGRAM_BINS = 20;

/**
 * BQ-02 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. Defensive filter of non-finite/non-positive timestamps.
 * 2. Sort ascending and derive pairwise deltas in seconds.
 * 3. Drop non-positive deltas as `anomalies.duplicateCount`.
 * 4. Nearest-rank p50 / p95 / p99; stall threshold = k × median.
 * 5. Walk deltas in temporal order for distinct stall periods; bucket into
 *    20 equal-width bins up to 3 × p95 + one overflow bin (`> upperBound`).
 */
export function transformBQ02(
  raw: { snapshots: Array<{ timestamp: number }> },
  opts: TransformBQ02Options = {},
): BQ02ChartData {
  const stallMultiplier = opts.stallMultiplier ?? DEFAULT_STALL_MULTIPLIER;
  const binCount = opts.histogramBins ?? DEFAULT_HISTOGRAM_BINS;

  const timestamps: number[] = [];
  for (const snap of raw.snapshots) {
    if (Number.isFinite(snap.timestamp) && snap.timestamp > 0) {
      timestamps.push(snap.timestamp);
    }
  }
  timestamps.sort((a, b) => a - b);

  const deltasSec: number[] = [];
  const anomalies: BQ02Anomalies = { duplicateCount: 0 };
  for (let i = 1; i < timestamps.length; i++) {
    const prev = timestamps[i - 1] as number;
    const curr = timestamps[i] as number;
    const deltaMs = curr - prev;
    if (deltaMs <= 0) {
      anomalies.duplicateCount += 1;
      continue;
    }
    deltasSec.push(deltaMs / 1000);
  }

  const observed: BQ02Observed = {
    earliestMs: timestamps.length > 0 ? (timestamps[0] as number) : null,
    latestMs:
      timestamps.length > 0
        ? (timestamps[timestamps.length - 1] as number)
        : null,
    snapshotCount: timestamps.length,
    deltaCount: deltasSec.length,
  };

  if (deltasSec.length === 0) {
    const percentilesEmpty: BQ02Percentiles = {
      p50Sec: 0,
      p95Sec: 0,
      p99Sec: 0,
      medianSec: 0,
    };
    const stallsEmpty: BQ02Stalls = {
      thresholdMultiplier: stallMultiplier,
      thresholdSec: 0,
      gapsAboveThreshold: 0,
      distinctStallPeriods: 0,
    };
    return {
      observed,
      percentiles: percentilesEmpty,
      stalls: stallsEmpty,
      histogram: [],
      anomalies,
    };
  }

  const deltasSorted = [...deltasSec].sort((a, b) => a - b);
  const p50Sec = nearestRank(deltasSorted, 50);
  const p95Sec = nearestRank(deltasSorted, 95);
  const p99Sec = nearestRank(deltasSorted, 99);
  const percentiles: BQ02Percentiles = {
    p50Sec,
    p95Sec,
    p99Sec,
    medianSec: p50Sec,
  };

  const thresholdSec = stallMultiplier * p50Sec;
  let gapsAboveThreshold = 0;
  let distinctStallPeriods = 0;
  let inStall = false;
  for (const delta of deltasSec) {
    const above = delta > thresholdSec;
    if (above) {
      gapsAboveThreshold += 1;
      if (!inStall) {
        distinctStallPeriods += 1;
        inStall = true;
      }
    } else {
      inStall = false;
    }
  }
  const stalls: BQ02Stalls = {
    thresholdMultiplier: stallMultiplier,
    thresholdSec,
    gapsAboveThreshold,
    distinctStallPeriods,
  };

  const upperBound = Math.max(60, Math.ceil(3 * p95Sec));
  const histogram = buildHistogram(deltasSec, upperBound, binCount);

  return {
    observed,
    percentiles,
    stalls,
    histogram,
    anomalies,
  };
}

function nearestRank(sortedAsc: number[], percentile: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((percentile / 100) * sortedAsc.length);
  const idx = Math.min(Math.max(rank - 1, 0), sortedAsc.length - 1);
  return sortedAsc[idx] as number;
}

function formatSeconds(value: number): string {
  return `${Math.round(value)}s`;
}

function buildHistogram(
  deltasSec: number[],
  upperBound: number,
  binCount: number,
): HistogramBin[] {
  const safeBinCount = Math.max(1, Math.floor(binCount));
  const binWidth = upperBound / safeBinCount;
  const counts = new Array<number>(safeBinCount).fill(0);
  let overflowCount = 0;

  for (const delta of deltasSec) {
    if (delta > upperBound) {
      overflowCount += 1;
      continue;
    }
    const raw = Math.floor(delta / binWidth);
    const idx = Math.min(Math.max(raw, 0), safeBinCount - 1);
    counts[idx] = (counts[idx] ?? 0) + 1;
  }

  const bins: HistogramBin[] = [];
  for (let i = 0; i < safeBinCount; i++) {
    const lowerSec = i * binWidth;
    const upperSec = (i + 1) * binWidth;
    bins.push({
      lowerSec,
      upperSec,
      label: `${formatSeconds(lowerSec).replace("s", "")}–${formatSeconds(upperSec)}`,
      count: counts[i] ?? 0,
    });
  }
  bins.push({
    lowerSec: upperBound,
    upperSec: Number.POSITIVE_INFINITY,
    label: `≥ ${formatSeconds(upperBound)}`,
    count: overflowCount,
  });
  return bins;
}
