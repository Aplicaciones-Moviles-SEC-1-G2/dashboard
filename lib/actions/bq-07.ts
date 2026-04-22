"use server";

import { unstable_cache } from "next/cache";

import { syntheticBQ07Raw } from "@/lib/fixtures/bq-07";
import { fetchRawBQ07 } from "@/lib/queries/bq-07";
import { deriveLocalDayAndHour } from "@/lib/time";
import { transformBQ07 } from "@/lib/transforms/bq-07";
import type { BQ07ChartData } from "@/lib/types/bq-07";

function buildSyntheticBQ07(dayOfWeek: number, hour: number): BQ07ChartData {
  const bucketId = `${dayOfWeek}_${String(hour).padStart(2, "0")}`;
  const raw = syntheticBQ07Raw(dayOfWeek, hour);
  const live = transformBQ07(raw, { bucketId, dayOfWeek, hour });
  return { ...live, dataSource: "synthetic" };
}

async function loadBQ07Data(): Promise<BQ07ChartData> {
  const now = new Date();
  const { dayOfWeek, hour } = deriveLocalDayAndHour(now);
  const bucketId = `${dayOfWeek}_${String(hour).padStart(2, "0")}`;
  const raw = await fetchRawBQ07(bucketId);
  // Full fallback only when the live state is entirely empty — if we have
  // any real spots (or a real bucket doc) we prefer the live reading.
  if (raw.spots.length === 0 && raw.bucket === null) {
    return buildSyntheticBQ07(dayOfWeek, hour);
  }
  return transformBQ07(raw, { bucketId, dayOfWeek, hour });
}

const cachedGetBQ07Data = unstable_cache(loadBQ07Data, ["bq-07"], {
  revalidate: 300,
  tags: ["bq-07"],
});

export async function getBQ07Data(): Promise<BQ07ChartData> {
  return cachedGetBQ07Data();
}
