import "server-only";
import type { DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type AnalyticsAvailabilityByBucket,
  type ConfigParking,
  type ParkingSpot,
} from "@/lib/types/firestore";

export interface FetchRawBQ07Result {
  spots: ParkingSpot[];
  config: ConfigParking;
  bucket: AnalyticsAvailabilityByBucket | null;
}

const SPOTS_LIMIT = 200;

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function toBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseSpot(raw: DocumentData): ParkingSpot {
  return {
    number: toNumber(raw.number),
    floor: toNumber(raw.floor),
    isAvailable: toBoolean(raw.isAvailable),
    currentPlate: toString(raw.currentPlate),
  };
}

function parseConfig(raw: DocumentData | null): ConfigParking {
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

function parseBucket(
  raw: DocumentData | null,
): AnalyticsAvailabilityByBucket | null {
  if (!raw) return null;
  return {
    dayOfWeek: toNumber(raw.dayOfWeek),
    hour: toNumber(raw.hour),
    pFreeSpotGt0: toNumber(raw.pFreeSpotGt0),
    sampleSize: toNumber(raw.sampleSize),
  };
}

/**
 * BQ-07 raw Firestore read. Query A — live `parkingSpots` (headroom above
 * observed capacity). Query B — `config/parking` for capacity. Query C —
 * `analytics_availability_by_bucket/{bucketId}` (may be absent while the
 * rollup Cloud Function is being spun up). All three run in parallel.
 * C3-compliant — `.limit / .get` + two doc `.get()`s only.
 */
export async function fetchRawBQ07(
  bucketId: string,
): Promise<FetchRawBQ07Result> {
  const db = getAdminDb();

  const spotsQuery = db
    .collection(FIRESTORE_COLLECTIONS.parkingSpots)
    .limit(SPOTS_LIMIT);
  const configRef = db.collection(FIRESTORE_COLLECTIONS.config).doc("parking");
  const bucketRef = db
    .collection(FIRESTORE_COLLECTIONS.analyticsAvailabilityByBucket)
    .doc(bucketId);

  const [spotsSnap, configSnap, bucketSnap] = await Promise.all([
    spotsQuery.get(),
    configRef.get(),
    bucketRef.get(),
  ]);

  const spots = spotsSnap.docs.map((doc) => parseSpot(doc.data()));
  const config = parseConfig(configSnap.exists ? (configSnap.data() ?? null) : null);
  const bucket = parseBucket(bucketSnap.exists ? (bucketSnap.data() ?? null) : null);

  return { spots, config, bucket };
}
