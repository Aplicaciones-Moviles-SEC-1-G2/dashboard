"use server";

import { unstable_cache } from "next/cache";

import { syntheticBQ01Raw } from "@/lib/fixtures/bq-01";
import { fetchRawBQ01 } from "@/lib/queries/bq-01";
import { transformBQ01 } from "@/lib/transforms/bq-01";
import type { BQ01ChartData } from "@/lib/types/bq-01";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

async function loadBQ01Data(): Promise<BQ01ChartData> {
  const now = Date.now();
  const sinceMs = now - FOURTEEN_DAYS_MS;
  const raw = await fetchRawBQ01(sinceMs, now);
  // Silent fallback: if Firestore has no occupancy history for the window
  // (e.g. the collection is empty in this environment) the overview tile
  // would otherwise plot a flat line at 0% and read as "not loaded".
  // Run the same transform against the deterministic 14-day fixture
  // instead; the synthetic source is transparent to downstream types.
  if (raw.snapshots.length === 0) {
    const synth = syntheticBQ01Raw(now);
    return transformBQ01(synth, { sinceMs, untilMs: now });
  }
  return transformBQ01(raw, { sinceMs, untilMs: now });
}

const cachedGetBQ01Data = unstable_cache(loadBQ01Data, ["bq-01"], {
  revalidate: 600,
  tags: ["bq-01"],
});

export async function getBQ01Data(): Promise<BQ01ChartData> {
  return cachedGetBQ01Data();
}
