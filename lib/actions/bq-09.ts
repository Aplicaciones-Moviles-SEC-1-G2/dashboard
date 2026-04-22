"use server";

import { unstable_cache } from "next/cache";

import { syntheticBQ09Raw } from "@/lib/fixtures/bq-09";
import { fetchRawBQ09 } from "@/lib/queries/bq-09";
import { transformBQ09 } from "@/lib/transforms/bq-09";
import type { BQ09ChartData } from "@/lib/types/bq-09";

const DEFAULT_FACILITY = "SD";

function buildSyntheticBQ09(facilityId: string): BQ09ChartData {
  const raw = syntheticBQ09Raw(facilityId);
  const live = transformBQ09(raw, { facilityId });
  return { ...live, dataSource: "synthetic" };
}

async function loadBQ09Data(facilityId: string): Promise<BQ09ChartData> {
  const raw = await fetchRawBQ09(facilityId);
  if (raw.cells.length === 0) {
    return buildSyntheticBQ09(facilityId);
  }
  return transformBQ09(raw, { facilityId });
}

const cachedGetBQ09Data = unstable_cache(loadBQ09Data, ["bq-09"], {
  revalidate: 7200,
  tags: ["bq-09"],
});

export async function getBQ09Data(
  facilityId: string = DEFAULT_FACILITY,
): Promise<BQ09ChartData> {
  return cachedGetBQ09Data(facilityId);
}
