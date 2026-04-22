"use server";

import { unstable_cache } from "next/cache";

import { fetchRawBQ03 } from "@/lib/queries/bq-03";
import { transformBQ03 } from "@/lib/transforms/bq-03";
import type { BQ03ChartData } from "@/lib/types/bq-03";

// Shape matching the gRPC error surfaced by firebase-admin. `code: 9` is
// `FAILED_PRECONDITION`, which Firestore uses when a required composite
// index is missing. Per CLAUDE.md §9 the mobile team owns index deploys,
// so we surface an empty dataset instead of crashing the page while the
// index (see firestore.indexes.json) is pending deployment.
function isMissingIndexError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === 9;
}

function emptyBQ03Data(): BQ03ChartData {
  return {
    cells: Array.from({ length: 7 * 24 }, (_, idx) => ({
      dayOfWeek: Math.floor(idx / 24),
      hour: idx % 24,
      meanDurationHours: null,
      medianDurationHours: null,
      sampleCount: 0,
    })),
    cohort: {
      overallMeanDurationHours: null,
      exitCount: 0,
      registeredPlateCount: 0,
    },
    drops: {
      nullDurationCount: 0,
      invalidDurationCount: 0,
      unregisteredPlateCount: 0,
      legacyOnlyUserCount: 0,
    },
  };
}

async function loadBQ03Data(): Promise<BQ03ChartData> {
  try {
    const raw = await fetchRawBQ03();
    return transformBQ03(raw);
  } catch (err) {
    if (isMissingIndexError(err)) {
      console.warn(
        "[bq-03] Firestore composite index not yet deployed — see firestore.indexes.json; rendering empty state.",
      );
      return emptyBQ03Data();
    }
    throw err;
  }
}

const cachedGetBQ03Data = unstable_cache(loadBQ03Data, ["bq-03"], {
  revalidate: 300,
  tags: ["bq-03"],
});

export async function getBQ03Data(): Promise<BQ03ChartData> {
  return cachedGetBQ03Data();
}
