import "server-only";
import type { DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type AnalyticsMorningArrivalCurve,
} from "@/lib/types/firestore";

export interface FetchRawBQ08Result {
  buckets: AnalyticsMorningArrivalCurve[];
}

const BUCKET_LIMIT = 60;

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseBucket(raw: DocumentData): AnalyticsMorningArrivalCurve {
  return {
    dayOfWeek: toNumber(raw.dayOfWeek),
    hhmm5: toString(raw.hhmm5),
    pSpotsAvailable: toNumber(raw.pSpotsAvailable),
  };
}

/**
 * BQ-08 raw Firestore read. Query A — `analytics_morning_arrival_curve`
 * filtered to the requested dayOfWeek + morning hhmm5 window
 * `[0630, 0930]`. Requires the `(dayOfWeek ASC, hhmm5 ASC)` composite index
 * declared in `firestore.indexes.json`. C3-compliant.
 */
export async function fetchRawBQ08(
  dayOfWeek: number,
): Promise<FetchRawBQ08Result> {
  const db = getAdminDb();

  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.analyticsMorningArrivalCurve)
    .where("dayOfWeek", "==", dayOfWeek)
    .where("hhmm5", ">=", "0630")
    .where("hhmm5", "<=", "0930")
    .orderBy("hhmm5", "asc")
    .limit(BUCKET_LIMIT)
    .get();

  const buckets = snap.docs.map((doc) => parseBucket(doc.data()));
  return { buckets };
}
