import type { Timestamp } from "firebase-admin/firestore";

// ──────────────────────────────────────────────────────────────────────────
// Raw Firestore document shapes. Mirrors plans/00_firestore_inventory.md
// field-for-field. No fields invented; no fields renamed.
// ──────────────────────────────────────────────────────────────────────────

/** `config/parking` — singleton runtime config consumed by iOS + Kotlin clients. */
export interface ConfigParking {
  parkingName: string;
  openingHour: number; // int, 24h
  closingHour: number; // int, 24h
  hourlyRate: number; // int, currency unspecified (COP?)
  numberOfFloors: number; // int
  spotsPerFloor: number; // int — implied total = numberOfFloors × spotsPerFloor
  queueLength: number; // OQ-CFG-1 — static threshold or live counter?
  ocrConfidenceThreshold: number; // float, 0..1
}

/** `parkingSpots/{uuid}` — per-spot live state mirror. */
export interface ParkingSpot {
  number: number; // int, spot number on its floor
  floor: number; // int, 1..3 observed
  isAvailable: boolean;
  currentPlate: string; // empty string when no vehicle; not null
}

/**
 * `parking_occupancy_history/{autoId}` — periodic occupancy snapshots.
 * NOTE: `timestamp` is epoch ms, NOT a Firestore Timestamp. Disjoint from
 * `vehicleRecords.timestamp`.
 */
export interface ParkingOccupancyHistory {
  timestamp: number; // int (ms epoch)
  hour: number; // int, 0..23, local-time bucket (tz unspecified)
  dayOfWeek: number; // int — OQ-OH-1 (1..7 vs 0..6)
  availableSpots: number; // int — can exceed totalSpots in synthetic data
  totalSpots: number; // int — observed: 60, 80, 121 (OQ-OH-4)
  occupancyPercentage: number; // float — negatives present (OQ-OH-3)
}

/** One entry of `users.cars[]`. */
export interface UserCar {
  name: string;
  plate: string;
}

/** `users/{authUid}` — profile keyed by Firebase Auth UID. */
export interface User {
  name: string;
  email: string;
  phone?: string; // optional; absent on some docs
  role: "driver" | "manager"; // OQ-USR-2 — other values may exist
  createdAt: Timestamp; // Firestore Timestamp (NOT epoch ms)
  cars: UserCar[]; // can be empty
  /** legacy — OQ-USR-1; prefer cars */
  vehicles?: string[];
}

/** Discriminated vehicleRecord — entry has null durationHours; exit has a number. */
export type VehicleRecord = VehicleRecordEntry | VehicleRecordExit;

interface VehicleRecordBase {
  plate: string;
  timestamp: Timestamp; // Firestore Timestamp (NOT epoch ms)
  floor: number;
  spotNumber: number;
  isRegistered: boolean;
  ownerEmail: string | null; // null when isRegistered == false
  ocrConfidence: number; // 0..1
  hitDailyCap: boolean;
  photoURL: string | null; // OQ-VR-1 — always null in sampled data
}

export interface VehicleRecordEntry extends VehicleRecordBase {
  type: "entry";
  durationHours: null; // null on entries
}

export interface VehicleRecordExit extends VehicleRecordBase {
  type: "exit";
  durationHours: number; // populated on exits (OQ-VR-2: can be absent if pairing fails)
}

// ──────────────────────────────────────────────────────────────────────────
// Optional additive rollup docs — only referenced if a BQ's own plan file
// declares them. Never invented at query time.
// ──────────────────────────────────────────────────────────────────────────

/** `analytics_availability_by_bucket/{dayOfWeek}_{hour}` — Q3. */
export interface AnalyticsAvailabilityByBucket {
  dayOfWeek: number;
  hour: number;
  pFreeSpotGt0: number; // 0..1
  sampleSize: number;
}

/** `analytics_morning_arrival_curve/{dayOfWeek}_{hhmm5}` — Q4. */
export interface AnalyticsMorningArrivalCurve {
  dayOfWeek: number;
  hhmm5: string; // 5-minute bucket, e.g. "0705"
  pSpotsAvailable: number; // 0..1
}

/** `analytics_facility_demand_pattern/{facilityId}_{dayOfWeek}_{hour}` — Q11. */
export interface AnalyticsFacilityDemandPattern {
  facilityId: string;
  dayOfWeek: number;
  hour: number;
  avgOccupancyPct: number;
  utilizationScore: number;
}

/** `analytics_availability_drift` rollup docs — Q14. */
export interface AnalyticsAvailabilityDrift {
  timestamp: number; // ms epoch
  reportedAvailable: number;
  reconstructedAvailable: number;
  signedError: number;
  absError: number;
}

/** Registry of known top-level collection paths referenced by queries. */
export const FIRESTORE_COLLECTIONS = {
  config: "config",
  parkingSpots: "parkingSpots",
  parkingOccupancyHistory: "parking_occupancy_history",
  users: "users",
  vehicleRecords: "vehicleRecords",
  analyticsAvailabilityByBucket: "analytics_availability_by_bucket",
  analyticsMorningArrivalCurve: "analytics_morning_arrival_curve",
  analyticsFacilityDemandPattern: "analytics_facility_demand_pattern",
  analyticsAvailabilityDrift: "analytics_availability_drift",
} as const;

export type FirestoreCollectionKey = keyof typeof FIRESTORE_COLLECTIONS;
