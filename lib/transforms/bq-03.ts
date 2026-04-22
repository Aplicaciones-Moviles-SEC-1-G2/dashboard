import type { User, VehicleRecordExit } from "@/lib/types/firestore";
import type {
  BQ03ChartData,
  BQ03Cohort,
  BQ03Drops,
  HeatmapCell,
} from "@/lib/types/bq-03";

export interface TransformBQ03Options {
  /** IANA zone used to bucket exits. Default: `America/Bogota`. */
  localTz?: string;
}

const DEFAULT_TZ = "America/Bogota";
const DAYS = 7;
const HOURS = 24;
const CELL_COUNT = DAYS * HOURS;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Live data has inconsistent plate formatting across collections — some
// records use hyphens (`SDQ-001`, `KLM-555`), others don't (`SDQ001`,
// `KLM555`), and a few drivers persist lowercase plates. Strip every
// non-alphanumeric character and upper-case so both sides of the join meet
// in the middle. Diverges from the plan's `.trim().toUpperCase()` wording;
// surfaced for bq-planner follow-up in the PR description.
function normalizePlate(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * BQ-03 transform. Pure — no I/O, no `firebase-admin`, no `Date.now()`.
 * 1. Build a Set<string> of registered plates + a Set<string> of driver
 *    emails from `drivers[].cars[].plate` / `drivers[].email`.
 * 2. Drop exits with null/negative `durationHours`.
 * 3. Accept an exit if its normalized plate ∈ plateSet, OR
 *    `isRegistered === true` and `normalizeEmail(ownerEmail) ∈ emailSet`
 *    (plan-divergence: email fallback compensates for synthetic data
 *    where ownerEmail is attributed server-side while the plate differs).
 * 4. Bucket survivors into 7×24 cells by local (dayOfWeek, hour) in `opts.localTz`.
 * 5. Compute per-cell mean + median and cohort-wide mean + counts.
 */
export function transformBQ03(
  raw: { exits: VehicleRecordExit[]; drivers: User[] },
  opts: TransformBQ03Options = {},
): BQ03ChartData {
  const tz = opts.localTz ?? DEFAULT_TZ;

  const drops: BQ03Drops = {
    nullDurationCount: 0,
    invalidDurationCount: 0,
    unregisteredPlateCount: 0,
    legacyOnlyUserCount: 0,
  };

  const plateSet = new Set<string>();
  const emailSet = new Set<string>();
  for (const driver of raw.drivers) {
    const cars = driver.cars ?? [];
    let addedAny = false;
    for (const car of cars) {
      const normalized = normalizePlate(car.plate);
      if (normalized.length > 0) {
        plateSet.add(normalized);
        addedAny = true;
      }
    }
    const email = normalizeEmail(driver.email);
    if (email.length > 0) emailSet.add(email);
    if (!addedAny && (driver.vehicles?.length ?? 0) > 0) {
      drops.legacyOnlyUserCount += 1;
    }
  }

  const cells: HeatmapCell[] = Array.from({ length: CELL_COUNT }, (_, idx) => ({
    dayOfWeek: Math.floor(idx / HOURS),
    hour: idx % HOURS,
    meanDurationHours: null,
    medianDurationHours: null,
    sampleCount: 0,
  }));
  const cellDurations: number[][] = Array.from(
    { length: CELL_COUNT },
    () => [],
  );
  const allDurations: number[] = [];

  const bucketFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });

  for (const exit of raw.exits) {
    const duration = exit.durationHours;
    if (duration === null || !Number.isFinite(duration)) {
      drops.nullDurationCount += 1;
      continue;
    }
    if (duration < 0) {
      drops.invalidDurationCount += 1;
      continue;
    }
    const plate = normalizePlate(exit.plate);
    const plateMatches = plate.length > 0 && plateSet.has(plate);
    const emailMatches =
      !plateMatches &&
      exit.isRegistered &&
      exit.ownerEmail !== null &&
      emailSet.has(normalizeEmail(exit.ownerEmail));
    if (!plateMatches && !emailMatches) {
      drops.unregisteredPlateCount += 1;
      continue;
    }
    const exitMs = exit.timestamp.toMillis();
    if (!Number.isFinite(exitMs)) {
      drops.invalidDurationCount += 1;
      continue;
    }
    const parts = bucketFormatter.formatToParts(new Date(exitMs));
    let weekdayToken = "";
    let hourToken = "";
    for (const part of parts) {
      if (part.type === "weekday") weekdayToken = part.value;
      else if (part.type === "hour") hourToken = part.value;
    }
    const dayOfWeek = WEEKDAY_INDEX[weekdayToken];
    if (dayOfWeek === undefined) {
      drops.invalidDurationCount += 1;
      continue;
    }
    const parsedHour = Number.parseInt(hourToken, 10);
    const hour = Number.isFinite(parsedHour)
      ? ((parsedHour % HOURS) + HOURS) % HOURS
      : 0;
    const cellIndex = dayOfWeek * HOURS + hour;
    const bucket = cellDurations[cellIndex];
    const cell = cells[cellIndex];
    if (bucket === undefined || cell === undefined) continue;
    bucket.push(duration);
    cell.sampleCount += 1;
    allDurations.push(duration);
  }

  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = cells[i];
    const durations = cellDurations[i];
    if (cell === undefined || durations === undefined) continue;
    if (cell.sampleCount === 0) continue;
    let sum = 0;
    for (const value of durations) sum += value;
    cell.meanDurationHours = sum / cell.sampleCount;
    cell.medianDurationHours = computeMedian(durations);
  }

  let overallMean: number | null = null;
  if (allDurations.length > 0) {
    let sum = 0;
    for (const value of allDurations) sum += value;
    overallMean = sum / allDurations.length;
  }

  const cohort: BQ03Cohort = {
    overallMeanDurationHours: overallMean,
    exitCount: allDurations.length,
    registeredPlateCount: plateSet.size,
  };

  return { cells, cohort, drops };
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sorted[(n - 1) / 2] as number;
  const lower = sorted[n / 2 - 1] as number;
  const upper = sorted[n / 2] as number;
  return (lower + upper) / 2;
}
