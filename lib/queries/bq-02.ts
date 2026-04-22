import "server-only";
import type { DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/types/firestore";

export interface FetchRawBQ02Result {
  snapshots: Array<{ timestamp: number }>;
}

const DEFAULT_LIMIT = 5000;

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function parseTimestampOnly(raw: DocumentData): { timestamp: number } {
  return { timestamp: toNumber(raw.timestamp) };
}

/**
 * BQ-02 raw Firestore read. Query A: latest N snapshots from
 * `parking_occupancy_history`, ordered by `timestamp` DESC, projected to
 * `{timestamp}` only. C3-compliant — no aggregation, no `.count()`.
 */
export async function fetchRawBQ02(limit?: number): Promise<FetchRawBQ02Result> {
  const db = getAdminDb();
  const cap = limit ?? DEFAULT_LIMIT;

  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.parkingOccupancyHistory)
    .orderBy("timestamp", "desc")
    .limit(cap)
    .get();

  const snapshots = snap.docs.map((doc) => parseTimestampOnly(doc.data()));
  return { snapshots };
}
