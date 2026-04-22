import type {
  ConfigParking,
  ParkingOccupancyHistory,
} from "@/lib/types/firestore";
import type {
  BQ01Anomalies,
  BQ01ChartData,
  HourBucket,
  SaturationEvent,
} from "@/lib/types/bq-01";

export interface TransformBQ01Options {
  /** IANA zone used to derive `HourBucket.hour`. Default: `America/Bogota`. */
  localTz?: string;
  /** Window bounds echoed back in `sampleWindow`. Defaults to min/max of the clean set. */
  sinceMs?: number;
  untilMs?: number;
}

interface CleanSnapshot {
  timestamp: number;
  availableSpots: number;
  occupancyClipped: number;
  hour: number;
}

interface RawRun {
  startMs: number;
  endMs: number;
  peakOccupancyPct: number;
}

const DEFAULT_TZ = "America/Bogota";

/**
 * BQ-01 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. Defensive filter of non-finite fields (malformedCount).
 * 2. Clip `occupancyPercentage` to [0,100] (neg/over-capacity counts).
 * 3. Derive local hour per snapshot via `Intl.DateTimeFormat`.
 * 4. Group into 24 hour-buckets with mean / max / sampleCount.
 * 5. Detect contiguous saturation runs; collapse runs shorter than 1 min into
 *    their successor; sum minutes per hour-bucket.
 */
export function transformBQ01(
  raw: { snapshots: ParkingOccupancyHistory[]; config: ConfigParking },
  opts: TransformBQ01Options = {},
): BQ01ChartData {
  const tz = opts.localTz ?? DEFAULT_TZ;
  const rawCapacity = raw.config.numberOfFloors * raw.config.spotsPerFloor;
  const capacity: number | null =
    Number.isFinite(rawCapacity) && rawCapacity > 0 ? rawCapacity : null;

  const anomalies: BQ01Anomalies = {
    malformedCount: 0,
    negativeOccupancyCount: 0,
    overCapacityCount: 0,
  };

  const hourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  });

  const clean: CleanSnapshot[] = [];
  for (const snap of raw.snapshots) {
    if (
      !Number.isFinite(snap.timestamp) ||
      !Number.isFinite(snap.availableSpots) ||
      !Number.isFinite(snap.totalSpots) ||
      !Number.isFinite(snap.occupancyPercentage)
    ) {
      anomalies.malformedCount += 1;
      continue;
    }
    if (snap.occupancyPercentage < 0) anomalies.negativeOccupancyCount += 1;
    if (snap.occupancyPercentage > 100) anomalies.overCapacityCount += 1;
    const occupancyClipped = Math.max(0, Math.min(100, snap.occupancyPercentage));
    const hourStr = hourFormatter.format(new Date(snap.timestamp));
    const parsedHour = Number.parseInt(hourStr, 10);
    const hour = Number.isFinite(parsedHour) ? ((parsedHour % 24) + 24) % 24 : 0;
    clean.push({
      timestamp: snap.timestamp,
      availableSpots: snap.availableSpots,
      occupancyClipped,
      hour,
    });
  }

  clean.sort((a, b) => a.timestamp - b.timestamp);

  const hourBuckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    meanOccupancyPct: 0,
    maxOccupancyPct: 0,
    saturationMinutes: 0,
    sampleCount: 0,
  }));
  const hourSums = new Array<number>(24).fill(0);

  for (const snap of clean) {
    const bucket = hourBuckets[snap.hour];
    if (!bucket) continue;
    hourSums[snap.hour] = (hourSums[snap.hour] ?? 0) + snap.occupancyClipped;
    bucket.sampleCount += 1;
    if (snap.occupancyClipped > bucket.maxOccupancyPct) {
      bucket.maxOccupancyPct = snap.occupancyClipped;
    }
  }
  for (const bucket of hourBuckets) {
    if (bucket.sampleCount > 0) {
      bucket.meanOccupancyPct = (hourSums[bucket.hour] ?? 0) / bucket.sampleCount;
    }
  }

  const rawRuns: RawRun[] = [];
  let current: RawRun | null = null;
  for (const snap of clean) {
    const isSat =
      capacity != null
        ? snap.availableSpots === 0 || snap.occupancyClipped >= 100
        : snap.availableSpots === 0;
    if (isSat) {
      if (current === null) {
        current = {
          startMs: snap.timestamp,
          endMs: snap.timestamp,
          peakOccupancyPct: snap.occupancyClipped,
        };
      } else {
        current.endMs = snap.timestamp;
        if (snap.occupancyClipped > current.peakOccupancyPct) {
          current.peakOccupancyPct = snap.occupancyClipped;
        }
      }
    } else if (current !== null) {
      rawRuns.push(current);
      current = null;
    }
  }
  if (current !== null) rawRuns.push(current);

  const saturationEvents: SaturationEvent[] = [];
  let pending: { startMs: number; peak: number } | null = null;
  for (const run of rawRuns) {
    const effectiveStart: number =
      pending !== null ? pending.startMs : run.startMs;
    const effectivePeak: number = Math.max(
      pending !== null ? pending.peak : 0,
      run.peakOccupancyPct,
    );
    const durationMinutes = (run.endMs - effectiveStart) / 60000;
    if (durationMinutes < 1) {
      pending = { startMs: effectiveStart, peak: effectivePeak };
      continue;
    }
    const startHourStr = hourFormatter.format(new Date(effectiveStart));
    const parsedStartHour = Number.parseInt(startHourStr, 10);
    const hour = Number.isFinite(parsedStartHour)
      ? ((parsedStartHour % 24) + 24) % 24
      : 0;
    saturationEvents.push({
      startMs: effectiveStart,
      endMs: run.endMs,
      durationMinutes,
      hour,
      peakOccupancyPct: effectivePeak,
    });
    pending = null;
  }

  for (const event of saturationEvents) {
    const bucket = hourBuckets[event.hour];
    if (bucket) bucket.saturationMinutes += event.durationMinutes;
  }

  const windowSinceMs =
    opts.sinceMs ?? (clean.length > 0 ? clean[0]!.timestamp : 0);
  const windowUntilMs =
    opts.untilMs ?? (clean.length > 0 ? clean[clean.length - 1]!.timestamp : 0);

  return {
    capacity,
    hourBuckets,
    saturationEvents,
    sampleWindow: {
      sinceMs: windowSinceMs,
      untilMs: windowUntilMs,
      snapshotCount: clean.length,
    },
    anomalies,
  };
}
