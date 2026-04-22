"use server";

import { unstable_cache } from "next/cache";

import { fetchRawBQ05 } from "@/lib/queries/bq-05";
import { transformBQ05 } from "@/lib/transforms/bq-05";
import type { BQ05ChartData } from "@/lib/types/bq-05";

// Firestore surfaces `FAILED_PRECONDITION` (gRPC code 9) when a required
// composite index is missing. The `(isRegistered, type)` composite index is
// owned by the mobile team's deploy workflow (CLAUDE.md §9); render an empty
// dataset until it lands instead of crashing the page.
function isMissingIndexError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === 9;
}

function emptyBQ05Data(): BQ05ChartData {
  return {
    rows: [],
    unknownRow: null,
    totals: { totalRegisteredHours: 0, totalRegisteredEvents: 0 },
    kpis: { universityDomainKey: "uniandes.edu.co", universityHoursShare: null },
    drops: { unknownOwnerCount: 0, nullDurationCount: 0 },
  };
}

async function loadBQ05Data(): Promise<BQ05ChartData> {
  try {
    const raw = await fetchRawBQ05();
    return transformBQ05(raw);
  } catch (err) {
    if (isMissingIndexError(err)) {
      console.warn(
        "[bq-05] Firestore composite index (isRegistered, type) not yet deployed — see firestore.indexes.json; rendering empty state.",
      );
      return emptyBQ05Data();
    }
    throw err;
  }
}

const cachedGetBQ05Data = unstable_cache(loadBQ05Data, ["bq-05"], {
  revalidate: 300,
  tags: ["bq-05"],
});

export async function getBQ05Data(): Promise<BQ05ChartData> {
  return cachedGetBQ05Data();
}
