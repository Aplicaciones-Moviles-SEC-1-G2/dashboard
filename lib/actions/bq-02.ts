"use server";

import { unstable_cache } from "next/cache";

import { fetchRawBQ02 } from "@/lib/queries/bq-02";
import { transformBQ02 } from "@/lib/transforms/bq-02";
import type { BQ02ChartData } from "@/lib/types/bq-02";

async function loadBQ02Data(): Promise<BQ02ChartData> {
  const raw = await fetchRawBQ02();
  return transformBQ02(raw);
}

const cachedGetBQ02Data = unstable_cache(loadBQ02Data, ["bq-02"], {
  revalidate: 300,
  tags: ["bq-02"],
});

export async function getBQ02Data(): Promise<BQ02ChartData> {
  return cachedGetBQ02Data();
}
