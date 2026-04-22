import "server-only";
import type { DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type AnalyticsAvailabilityDrift,
} from "@/lib/types/firestore";

export interface FetchRawBQ10Result {
  drift: AnalyticsAvailabilityDrift[];
}

const DRIFT_LIMIT = 1500;

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function parseDrift(raw: DocumentData): AnalyticsAvailabilityDrift {
  return {
    timestamp: toNumber(raw.timestamp),
    reportedAvailable: toNumber(raw.reportedAvailable),
    reconstructedAvailable: toNumber(raw.reconstructedAvailable),
    signedError: toNumber(raw.signedError),
    absError: toNumber(raw.absError),
  };
}

/**
 * BQ-10 raw Firestore read. Query A — `analytics_availability_drift`
 * ascending across the rolling window bounds. Single-field index on
 * `timestamp` (auto-indexed). C3-compliant.
 */
export async function fetchRawBQ10(
  sinceMs: number,
  untilMs: number,
): Promise<FetchRawBQ10Result> {
  const db = getAdminDb();

  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.analyticsAvailabilityDrift)
    .where("timestamp", ">=", sinceMs)
    .where("timestamp", "<", untilMs)
    .orderBy("timestamp", "asc")
    .limit(DRIFT_LIMIT)
    .get();

  const drift = snap.docs.map((doc) => parseDrift(doc.data()));
  return { drift };
}
