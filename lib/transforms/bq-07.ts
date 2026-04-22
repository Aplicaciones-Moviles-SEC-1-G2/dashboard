import type {
  AnalyticsAvailabilityByBucket,
  ConfigParking,
  ParkingSpot,
} from "@/lib/types/firestore";
import type {
  BQ07Anomalies,
  BQ07BucketInfo,
  BQ07ChartData,
  BQ07Disclaimers,
  BQ07Tier,
} from "@/lib/types/bq-07";

export interface TransformBQ07Options {
  /** Required for transform purity — passed by the server action. */
  bucketId: string;
  dayOfWeek: number;
  hour: number;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function tierFor(probability: number): BQ07Tier {
  if (probability >= 0.7) return "green";
  if (probability >= 0.4) return "yellow";
  return "red";
}

/**
 * BQ-07 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. `capacity = numberOfFloors × spotsPerFloor` (config is authoritative).
 * 2. `freeSpotsNow = spots.filter(isAvailable).length`, clamped to capacity.
 * 3. `liveFreeShare = freeSpotsNow / capacity`.
 * 4. If bucket doc present, blend `0.5 × pFreeSpotGt0Prior + 0.5 ×
 *    liveFreeShare`; else fall back to `liveFreeShare` and flag disclaimer.
 * 5. Map probability → tier `green|yellow|red`.
 */
export function transformBQ07(
  raw: {
    spots: ParkingSpot[];
    config: ConfigParking;
    bucket: AnalyticsAvailabilityByBucket | null;
  },
  opts: TransformBQ07Options,
): BQ07ChartData {
  const numberOfFloors = Number.isFinite(raw.config.numberOfFloors)
    ? raw.config.numberOfFloors
    : 0;
  const spotsPerFloor = Number.isFinite(raw.config.spotsPerFloor)
    ? raw.config.spotsPerFloor
    : 0;
  const capacityRaw = numberOfFloors * spotsPerFloor;
  const capacity = Number.isFinite(capacityRaw) && capacityRaw > 0 ? capacityRaw : 0;

  let freeSpotsNow = 0;
  for (const spot of raw.spots) {
    if (spot.isAvailable === true) freeSpotsNow += 1;
  }
  if (capacity > 0 && freeSpotsNow > capacity) freeSpotsNow = capacity;

  const liveFreeShare =
    capacity === 0 ? 0 : clamp01(freeSpotsNow / capacity);

  const anomalies: BQ07Anomalies = { bucketClamped: false };
  let pFreeSpotGt0Prior: number | null = null;
  if (raw.bucket !== null) {
    const prior = raw.bucket.pFreeSpotGt0;
    if (!Number.isFinite(prior) || prior < 0 || prior > 1) {
      anomalies.bucketClamped = true;
    }
    pFreeSpotGt0Prior = clamp01(prior);
  }

  const disclaimers: BQ07Disclaimers = {
    noRealTripData: true,
    bucketMissing: raw.bucket === null,
    liveStateEmpty: raw.spots.length === 0,
  };

  const proxyProbability = clamp01(
    pFreeSpotGt0Prior === null
      ? liveFreeShare
      : 0.5 * pFreeSpotGt0Prior + 0.5 * liveFreeShare,
  );
  const tier = tierFor(proxyProbability);

  const bucket: BQ07BucketInfo = {
    id: opts.bucketId,
    dayOfWeek: opts.dayOfWeek,
    hour: opts.hour,
    pFreeSpotGt0: pFreeSpotGt0Prior,
    sampleSize:
      raw.bucket !== null && Number.isFinite(raw.bucket.sampleSize)
        ? raw.bucket.sampleSize
        : 0,
  };

  return {
    capacity,
    freeSpotsNow,
    liveFreeShare,
    bucket,
    proxyProbability,
    tier,
    disclaimers,
    anomalies,
    dataSource: "live",
  };
}
