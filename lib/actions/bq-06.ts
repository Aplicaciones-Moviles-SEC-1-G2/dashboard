"use server";

import { unstable_cache } from "next/cache";

import { syntheticBQ06Raw } from "@/lib/fixtures/bq-06";
import { fetchRawBQ06 } from "@/lib/queries/bq-06";
import { transformBQ06 } from "@/lib/transforms/bq-06";
import type { BQ06ChartData } from "@/lib/types/bq-06";

// See BQ-03 for the full rationale; Firestore emits gRPC code 9 when the
// composite index it needs is still being built. Fall back to the
// synthetic fixture so the page always renders a populated chart.
function isMissingIndexError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === 9;
}

function buildSyntheticBQ06(): BQ06ChartData {
  const nowMs = Date.now();
  const raw = syntheticBQ06Raw(nowMs);
  const live = transformBQ06(raw, { nowMs });
  return { ...live, dataSource: "synthetic" };
}

async function loadBQ06Data(): Promise<BQ06ChartData> {
  try {
    const raw = await fetchRawBQ06();
    if (raw.exits.length === 0) {
      return buildSyntheticBQ06();
    }
    return transformBQ06(raw);
  } catch (err) {
    if (isMissingIndexError(err)) {
      console.warn(
        "[bq-06] Firestore composite index (type, timestamp) not yet deployed — see firestore.indexes.json; rendering synthetic fallback.",
      );
      return buildSyntheticBQ06();
    }
    throw err;
  }
}

const cachedGetBQ06Data = unstable_cache(loadBQ06Data, ["bq-06"], {
  revalidate: 300,
  tags: ["bq-06"],
});

export async function getBQ06Data(): Promise<BQ06ChartData> {
  return cachedGetBQ06Data();
}
