import { deriveLocalDayAndHour, DEFAULT_TZ } from "@/lib/time";
import type { VehicleRecordExit } from "@/lib/types/firestore";
import type {
  BQ06ChartData,
  BQ06DailyOverstayBucket,
  BQ06Drops,
  BQ06Envelope,
  BQ06Overall,
  BQ06RepeatOffenders,
} from "@/lib/types/bq-06";

export interface TransformBQ06Options {
  localTz?: string;
  /** Rolling window length in days. Default: 30. */
  dayWindow?: number;
  /** Defaults to `Date.now()` — transforms stay pure by injecting this. */
  nowMs?: number;
}

const DEFAULT_DAY_WINDOW = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DailyAccumulator {
  registeredOverstays: number;
  unregisteredOverstays: number;
}

function normalizePlate(plate: string): string {
  return plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * BQ-06 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`
 * (the `nowMs` option keeps the function deterministic for tests).
 * 1. Compute `envelopeHours = closingHour - openingHour`; flag invalid when ≤ 0.
 * 2. Pre-seed `dailyBuckets` for each date in the rolling window.
 * 3. For each exit within the window: derive local (date, hour), flag
 *    overstay when `durationHours > envelopeHours` OR `localHour >= closingHour`.
 * 4. Bucket overstays by `(date, isRegistered)`; track repeat-offender plates.
 */
export function transformBQ06(
  raw: {
    exits: VehicleRecordExit[];
    config: { openingHour: number; closingHour: number };
  },
  opts: TransformBQ06Options = {},
): BQ06ChartData {
  const tz = opts.localTz ?? DEFAULT_TZ;
  const dayWindow = opts.dayWindow ?? DEFAULT_DAY_WINDOW;
  const nowMs = opts.nowMs ?? Date.now();
  const windowStartMs = nowMs - dayWindow * MS_PER_DAY;

  const openingHour = raw.config.openingHour;
  const closingHour = raw.config.closingHour;
  const envelopeHoursRaw = closingHour - openingHour;
  const envelopeInvalid = !(
    Number.isFinite(envelopeHoursRaw) && envelopeHoursRaw > 0
  );
  const envelopeHours = envelopeInvalid ? 0 : envelopeHoursRaw;

  const envelope: BQ06Envelope = {
    openingHour,
    closingHour,
    envelopeHours: envelopeInvalid ? 0 : envelopeHours,
    invalid: envelopeInvalid,
  };

  const dailyMap = new Map<string, DailyAccumulator>();
  // Pre-seed the window so the chart shows continuous days.
  for (let offset = 0; offset < dayWindow; offset++) {
    const when = new Date(windowStartMs + offset * MS_PER_DAY);
    const { localDate } = deriveLocalDayAndHour(when, tz);
    if (localDate.length === 0) continue;
    if (!dailyMap.has(localDate)) {
      dailyMap.set(localDate, {
        registeredOverstays: 0,
        unregisteredOverstays: 0,
      });
    }
  }

  const drops: BQ06Drops = { nullDurationCount: 0 };
  const registeredPlateOverstays = new Map<string, number>();
  let totalExits = 0;
  let totalOverstays = 0;

  for (const exit of raw.exits) {
    const ms = exit.timestamp.toMillis();
    if (!Number.isFinite(ms) || ms < windowStartMs || ms > nowMs) continue;

    const { localDate, hour: localHour } = deriveLocalDayAndHour(new Date(ms), tz);
    totalExits += 1;

    const durRaw = exit.durationHours;
    const dur =
      typeof durRaw === "number" && Number.isFinite(durRaw) && durRaw >= 0
        ? durRaw
        : null;
    if (dur === null) drops.nullDurationCount += 1;

    const overDuration = !envelopeInvalid && dur !== null && dur > envelopeHours;
    const overClosing =
      Number.isFinite(closingHour) && localHour >= closingHour;
    const isOverstay = overDuration || overClosing;

    if (!isOverstay) continue;
    totalOverstays += 1;

    const bucket = dailyMap.get(localDate) ?? {
      registeredOverstays: 0,
      unregisteredOverstays: 0,
    };
    if (exit.isRegistered) bucket.registeredOverstays += 1;
    else bucket.unregisteredOverstays += 1;
    dailyMap.set(localDate, bucket);

    if (exit.isRegistered) {
      const plateKey = normalizePlate(exit.plate);
      if (plateKey.length > 0) {
        registeredPlateOverstays.set(
          plateKey,
          (registeredPlateOverstays.get(plateKey) ?? 0) + 1,
        );
      }
    }
  }

  const dailyBuckets: BQ06DailyOverstayBucket[] = Array.from(dailyMap.entries())
    .map(([date, acc]) => ({
      date,
      registeredOverstays: acc.registeredOverstays,
      unregisteredOverstays: acc.unregisteredOverstays,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const overstayShare = totalExits === 0 ? 0 : totalOverstays / totalExits;
  const overall: BQ06Overall = { totalExits, totalOverstays, overstayShare };

  let registeredOverstaysTotal = 0;
  let repeatOffenderOverstays = 0;
  for (const count of registeredPlateOverstays.values()) {
    registeredOverstaysTotal += count;
    if (count >= 2) repeatOffenderOverstays += count;
  }
  const repeatOffenderShare: BQ06RepeatOffenders["repeatOffenderShare"] =
    registeredOverstaysTotal === 0
      ? null
      : repeatOffenderOverstays / registeredOverstaysTotal;
  const repeatOffenders: BQ06RepeatOffenders = {
    registeredOverstaysTotal,
    repeatOffenderOverstays,
    repeatOffenderShare,
  };

  return {
    envelope,
    dailyBuckets,
    overall,
    repeatOffenders,
    drops,
    dataSource: "live",
  };
}
