"use server";

import { unstable_cache } from "next/cache";

import { syntheticBQ08Raw } from "@/lib/fixtures/bq-08";
import { fetchRawBQ08 } from "@/lib/queries/bq-08";
import { deriveLocalDayOfWeek } from "@/lib/time";
import { transformBQ08 } from "@/lib/transforms/bq-08";
import type { BQ08ChartData } from "@/lib/types/bq-08";

// Firestore surfaces `FAILED_PRECONDITION` (gRPC code 9) when the
// composite index `(dayOfWeek, hhmm5)` has not yet been deployed.
function isMissingIndexError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === 9;
}

function buildSyntheticBQ08(dayOfWeek: number): BQ08ChartData {
  const raw = syntheticBQ08Raw(dayOfWeek);
  const live = transformBQ08(raw, { dayOfWeek });
  return { ...live, dataSource: "synthetic" };
}

async function loadBQ08Data(dayOfWeek: number): Promise<BQ08ChartData> {
  try {
    const raw = await fetchRawBQ08(dayOfWeek);
    if (raw.buckets.length === 0) {
      return buildSyntheticBQ08(dayOfWeek);
    }
    return transformBQ08(raw, { dayOfWeek });
  } catch (err) {
    if (isMissingIndexError(err)) {
      console.warn(
        "[bq-08] Firestore composite index (dayOfWeek, hhmm5) not yet deployed — see firestore.indexes.json; rendering synthetic fallback.",
      );
      return buildSyntheticBQ08(dayOfWeek);
    }
    throw err;
  }
}

const cachedGetBQ08Data = unstable_cache(loadBQ08Data, ["bq-08"], {
  revalidate: 900,
  tags: ["bq-08"],
});

export async function getBQ08Data(): Promise<BQ08ChartData> {
  const dayOfWeek = deriveLocalDayOfWeek(new Date());
  return cachedGetBQ08Data(dayOfWeek);
}
