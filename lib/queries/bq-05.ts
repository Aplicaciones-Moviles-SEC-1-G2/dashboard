import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type VehicleRecordExit,
} from "@/lib/types/firestore";

export interface FetchRawBQ05Result {
  registeredExits: VehicleRecordExit[];
}

const EXITS_LIMIT = 5000;

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function toBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
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

function isExitRecord(raw: DocumentData): boolean {
  return raw.type === "exit" && typeof raw.durationHours === "number";
}

function parseExit(raw: DocumentData): VehicleRecordExit {
  return {
    type: "exit",
    plate: toString(raw.plate),
    timestamp: toTimestamp(raw.timestamp),
    floor: toNumber(raw.floor),
    spotNumber: toNumber(raw.spotNumber),
    isRegistered: toBoolean(raw.isRegistered),
    ownerEmail: toNullableString(raw.ownerEmail),
    ocrConfidence: toNumber(raw.ocrConfidence),
    hitDailyCap: toBoolean(raw.hitDailyCap),
    photoURL: toNullableString(raw.photoURL),
    durationHours: toNumber(raw.durationHours),
  };
}

/**
 * BQ-05 raw Firestore read. Filters `vehicleRecords` by
 * `(isRegistered == true, type == "exit")` and caps at 5000. Requires the
 * composite index `(isRegistered ASC, type ASC)` declared in
 * `firestore.indexes.json`. C3-compliant — `.where / .where / .limit / .get`
 * only, no aggregation.
 */
export async function fetchRawBQ05(): Promise<FetchRawBQ05Result> {
  const db = getAdminDb();

  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.vehicleRecords)
    .where("isRegistered", "==", true)
    .where("type", "==", "exit")
    .limit(EXITS_LIMIT)
    .get();

  const registeredExits: VehicleRecordExit[] = [];
  for (const doc of snap.docs) {
    const raw = doc.data();
    if (isExitRecord(raw)) registeredExits.push(parseExit(raw));
  }
  return { registeredExits };
}
