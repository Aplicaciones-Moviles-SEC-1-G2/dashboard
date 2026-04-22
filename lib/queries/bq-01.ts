import "server-only";
import type { DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type ConfigParking,
  type ParkingOccupancyHistory,
} from "@/lib/types/firestore";

export interface FetchRawBQ01Result {
  snapshots: ParkingOccupancyHistory[];
  config: ConfigParking;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseOccupancySnapshot(raw: DocumentData): ParkingOccupancyHistory {
  return {
    timestamp: toNumber(raw.timestamp),
    hour: toNumber(raw.hour),
    dayOfWeek: toNumber(raw.dayOfWeek),
    availableSpots: toNumber(raw.availableSpots),
    totalSpots: toNumber(raw.totalSpots),
    occupancyPercentage: toNumber(raw.occupancyPercentage),
  };
}

function parseConfigParking(raw: DocumentData | null): ConfigParking {
  if (!raw) {
    return {
      parkingName: "",
      openingHour: 0,
      closingHour: 0,
      hourlyRate: 0,
      numberOfFloors: 0,
      spotsPerFloor: 0,
      queueLength: 0,
      ocrConfidenceThreshold: 0,
    };
  }
  return {
    parkingName: toString(raw.parkingName),
    openingHour: toNumber(raw.openingHour),
    closingHour: toNumber(raw.closingHour),
    hourlyRate: toNumber(raw.hourlyRate),
    numberOfFloors: toNumber(raw.numberOfFloors),
    spotsPerFloor: toNumber(raw.spotsPerFloor),
    queueLength: toNumber(raw.queueLength),
    ocrConfidenceThreshold: toNumber(raw.ocrConfidenceThreshold),
  };
}

/**
 * BQ-01 raw Firestore read. Issues Query A (occupancy history, bounded
 * 14-day window) and Query B (config/parking) in parallel. No aggregation —
 * C3-compliant `.where / .orderBy / .limit / .get` only.
 */
export async function fetchRawBQ01(
  sinceMs: number,
  untilMs: number,
): Promise<FetchRawBQ01Result> {
  const db = getAdminDb();

  const historyQuery = db
    .collection(FIRESTORE_COLLECTIONS.parkingOccupancyHistory)
    .where("timestamp", ">=", sinceMs)
    .where("timestamp", "<", untilMs)
    .orderBy("timestamp", "asc")
    .limit(5000);

  const configRef = db.collection(FIRESTORE_COLLECTIONS.config).doc("parking");

  const [historySnap, configSnap] = await Promise.all([
    historyQuery.get(),
    configRef.get(),
  ]);

  const snapshots: ParkingOccupancyHistory[] = historySnap.docs.map((doc) =>
    parseOccupancySnapshot(doc.data()),
  );

  const configData = configSnap.exists ? (configSnap.data() ?? null) : null;
  const config = parseConfigParking(configData);

  return { snapshots, config };
}
