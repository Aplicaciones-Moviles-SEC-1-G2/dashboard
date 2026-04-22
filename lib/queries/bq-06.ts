import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type ConfigParking,
  type VehicleRecordExit,
} from "@/lib/types/firestore";

export interface FetchRawBQ06Result {
  exits: VehicleRecordExit[];
  config: Pick<ConfigParking, "openingHour" | "closingHour">;
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
 * BQ-06 raw Firestore read. Query A — `vehicleRecords` filtered on
 * `type == "exit"` with `orderBy(timestamp DESC).limit(5000)`, using the
 * existing `(type, timestamp)` composite index. Query B — the single
 * `config/parking` doc for the operating-hours envelope. C3-compliant.
 */
export async function fetchRawBQ06(): Promise<FetchRawBQ06Result> {
  const db = getAdminDb();

  const exitsQuery = db
    .collection(FIRESTORE_COLLECTIONS.vehicleRecords)
    .where("type", "==", "exit")
    .orderBy("timestamp", "desc")
    .limit(EXITS_LIMIT);

  const configRef = db.collection(FIRESTORE_COLLECTIONS.config).doc("parking");

  const [exitsSnap, configSnap] = await Promise.all([
    exitsQuery.get(),
    configRef.get(),
  ]);

  const exits: VehicleRecordExit[] = [];
  for (const doc of exitsSnap.docs) {
    const raw = doc.data();
    if (isExitRecord(raw)) exits.push(parseExit(raw));
  }

  const configRaw = configSnap.exists ? configSnap.data() : null;
  const openingHour = configRaw ? toNumber(configRaw.openingHour) : 0;
  const closingHour = configRaw ? toNumber(configRaw.closingHour) : 0;

  return {
    exits,
    config: { openingHour, closingHour },
  };
}
