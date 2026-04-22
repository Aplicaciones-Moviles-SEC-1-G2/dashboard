import "server-only";

import { getBQ01Data } from "@/lib/actions/bq-01";
import { getBQ02Data } from "@/lib/actions/bq-02";
import { getBQ03Data } from "@/lib/actions/bq-03";
import { getBQ04Data } from "@/lib/actions/bq-04";
import { getBQ05Data } from "@/lib/actions/bq-05";
import { getBQ06Data } from "@/lib/actions/bq-06";
import { getBQ07Data } from "@/lib/actions/bq-07";
import { getBQ08Data } from "@/lib/actions/bq-08";
import { getBQ09Data } from "@/lib/actions/bq-09";
import { getBQ10Data } from "@/lib/actions/bq-10";
import type { BqId } from "@/lib/types/bq";
import type { BQ01ChartData } from "@/lib/types/bq-01";
import type { BQ02ChartData } from "@/lib/types/bq-02";
import type { BQ03ChartData } from "@/lib/types/bq-03";
import type { BQ04ChartData } from "@/lib/types/bq-04";
import type { BQ05ChartData } from "@/lib/types/bq-05";
import type { BQ06ChartData } from "@/lib/types/bq-06";
import type { BQ07ChartData } from "@/lib/types/bq-07";
import type { BQ08ChartData } from "@/lib/types/bq-08";
import type { BQ09ChartData } from "@/lib/types/bq-09";
import type { BQ10ChartData } from "@/lib/types/bq-10";

/**
 * Discriminated payload returned by `loadBqPayload`. The page narrows on
 * `payload.id` to reach a typed `data`.
 */
export type BqPayload =
  | { id: "01"; data: BQ01ChartData }
  | { id: "02"; data: BQ02ChartData }
  | { id: "03"; data: BQ03ChartData }
  | { id: "04"; data: BQ04ChartData }
  | { id: "05"; data: BQ05ChartData }
  | { id: "06"; data: BQ06ChartData }
  | { id: "07"; data: BQ07ChartData }
  | { id: "08"; data: BQ08ChartData }
  | { id: "09"; data: BQ09ChartData }
  | { id: "10"; data: BQ10ChartData };

/**
 * Dispatch from a BQ id to its cached server action. Every active id in
 * `lib/bq-registry.ts` returns a non-null payload; the switch is exhaustive
 * and the BqId union makes it a type error to forget an id.
 */
export async function loadBqPayload(id: BqId): Promise<BqPayload> {
  switch (id) {
    case "01":
      return { id: "01", data: await getBQ01Data() };
    case "02":
      return { id: "02", data: await getBQ02Data() };
    case "03":
      return { id: "03", data: await getBQ03Data() };
    case "04":
      return { id: "04", data: await getBQ04Data() };
    case "05":
      return { id: "05", data: await getBQ05Data() };
    case "06":
      return { id: "06", data: await getBQ06Data() };
    case "07":
      return { id: "07", data: await getBQ07Data() };
    case "08":
      return { id: "08", data: await getBQ08Data() };
    case "09":
      return { id: "09", data: await getBQ09Data() };
    case "10":
      return { id: "10", data: await getBQ10Data() };
  }
}
