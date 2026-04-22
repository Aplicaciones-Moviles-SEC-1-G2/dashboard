import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type ConfigParking,
  type VehicleRecord,
} from "@/lib/types/firestore";

export interface FetchRawBQ04Result {
  records: Array<
    Pick<VehicleRecord, "ocrConfidence" | "timestamp" | "type">
  >;
  config: Pick<ConfigParking, "ocrConfidenceThreshold">;
}

const RECORDS_LIMIT = 5000;

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function toTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) return value;
  if (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return value as Timestamp;
  }
  return Timestamp.fromMillis(0);
}

function narrowType(value: unknown): "entry" | "exit" {
  return value === "exit" ? "exit" : "entry";
}

function projectRecord(
  raw: DocumentData,
): Pick<VehicleRecord, "ocrConfidence" | "timestamp" | "type"> {
  return {
    ocrConfidence: toNumber(raw.ocrConfidence),
    timestamp: toTimestamp(raw.timestamp),
    type: narrowType(raw.type),
  } as Pick<VehicleRecord, "ocrConfidence" | "timestamp" | "type">;
}

/**
 * BQ-04 raw Firestore read. Query A — `vehicleRecords` ordered by timestamp
 * DESC and capped at 5000 for a bounded scan. Query B — the single
 * `config/parking` doc for the operator threshold. Fired in parallel. The
 * response is narrowed to the three fields this BQ consumes so the cached
 * payload stays small. C3-compliant — `.orderBy / .limit / .get` only, no
 * aggregation.
 */
export async function fetchRawBQ04(): Promise<FetchRawBQ04Result> {
  const db = getAdminDb();

  const recordsQuery = db
    .collection(FIRESTORE_COLLECTIONS.vehicleRecords)
    .orderBy("timestamp", "desc")
    .limit(RECORDS_LIMIT);

  const configRef = db.collection(FIRESTORE_COLLECTIONS.config).doc("parking");

  const [recordsSnap, configSnap] = await Promise.all([
    recordsQuery.get(),
    configRef.get(),
  ]);

  const records = recordsSnap.docs.map((doc) => projectRecord(doc.data()));
  const configRaw = configSnap.exists ? configSnap.data() : null;
  const threshold = configRaw ? toNumber(configRaw.ocrConfidenceThreshold) : 0;

  return {
    records,
    config: { ocrConfidenceThreshold: threshold },
  };
}
