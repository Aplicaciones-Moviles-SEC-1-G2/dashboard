"use server";

import { unstable_cache } from "next/cache";

import { fetchRawBQ04 } from "@/lib/queries/bq-04";
import { transformBQ04 } from "@/lib/transforms/bq-04";
import type { BQ04ChartData } from "@/lib/types/bq-04";

async function loadBQ04Data(): Promise<BQ04ChartData> {
  const raw = await fetchRawBQ04();
  return transformBQ04(raw);
}

const cachedGetBQ04Data = unstable_cache(loadBQ04Data, ["bq-04"], {
  revalidate: 300,
  tags: ["bq-04"],
});

export async function getBQ04Data(): Promise<BQ04ChartData> {
  return cachedGetBQ04Data();
}
