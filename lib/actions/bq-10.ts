"use server";

import { unstable_cache } from "next/cache";

import { syntheticBQ10Raw } from "@/lib/fixtures/bq-10";
import { fetchRawBQ10 } from "@/lib/queries/bq-10";
import { transformBQ10 } from "@/lib/transforms/bq-10";
import type { BQ10ChartData } from "@/lib/types/bq-10";

const WINDOW_MS = 24 * 60 * 60 * 1000;

function buildSyntheticBQ10(sinceMs: number, untilMs: number): BQ10ChartData {
  const raw = syntheticBQ10Raw(sinceMs, untilMs);
  const live = transformBQ10(raw, { sinceMs, untilMs });
  return { ...live, dataSource: "synthetic" };
}

async function loadBQ10Data(): Promise<BQ10ChartData> {
  const now = Date.now();
  const sinceMs = now - WINDOW_MS;
  const raw = await fetchRawBQ10(sinceMs, now);
  if (raw.drift.length === 0) {
    return buildSyntheticBQ10(sinceMs, now);
  }
  return transformBQ10(raw, { sinceMs, untilMs: now });
}

const cachedGetBQ10Data = unstable_cache(loadBQ10Data, ["bq-10"], {
  revalidate: 300,
  tags: ["bq-10"],
});

export async function getBQ10Data(): Promise<BQ10ChartData> {
  return cachedGetBQ10Data();
}
