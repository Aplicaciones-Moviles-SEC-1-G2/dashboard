import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type User,
  type UserCar,
  type VehicleRecordExit,
} from "@/lib/types/firestore";

export interface FetchRawBQ03Result {
  exits: VehicleRecordExit[];
  drivers: User[];
}

const EXITS_LIMIT = 5000;
const DRIVERS_LIMIT = 500;

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

function parseCarEntry(value: unknown): UserCar | null {
  if (value === null || typeof value !== "object") return null;
  const obj = value as { name?: unknown; plate?: unknown };
  if (typeof obj.plate !== "string") return null;
  return {
    name: typeof obj.name === "string" ? obj.name : "",
    plate: obj.plate,
  };
}

function parseCars(value: unknown): UserCar[] {
  if (!Array.isArray(value)) return [];
  const out: UserCar[] = [];
  for (const entry of value) {
    const car = parseCarEntry(entry);
    if (car) out.push(car);
  }
  return out;
}

function parseVehiclesLegacy(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") out.push(entry);
  }
  return out;
}

function parseDriverRole(value: unknown): "driver" | "manager" {
  return value === "manager" ? "manager" : "driver";
}

function parseDriver(raw: DocumentData): User {
  const vehicles = parseVehiclesLegacy(raw.vehicles);
  const user: User = {
    name: toString(raw.name),
    email: toString(raw.email),
    role: parseDriverRole(raw.role),
    createdAt: toTimestamp(raw.createdAt),
    cars: parseCars(raw.cars),
  };
  if (typeof raw.phone === "string") user.phone = raw.phone;
  if (vehicles !== undefined) user.vehicles = vehicles;
  return user;
}

/**
 * BQ-03 raw Firestore read. Issues Query A (recent exit-type vehicleRecords,
 * bounded) and Query B (driver roster) in parallel. Exit rows guarded by a
 * `type === 'exit' && typeof durationHours === 'number'` type-guard to narrow
 * `VehicleRecord` to `VehicleRecordExit`. C3-compliant: `.where / .orderBy /
 * .limit / .get` only; no aggregation.
 */
export async function fetchRawBQ03(): Promise<FetchRawBQ03Result> {
  const db = getAdminDb();

  // Intentionally no `.orderBy('timestamp', ...)`: the heatmap aggregates by
  // (dayOfWeek, hour) across the whole window, so chronological order is
  // irrelevant. Dropping the sort also removes the composite-index
  // requirement — Firestore serves this off the auto-created single-field
  // `type` index. Diverges from the plan's pseudo-code; surfaced for
  // bq-planner follow-up.
  const exitsQuery = db
    .collection(FIRESTORE_COLLECTIONS.vehicleRecords)
    .where("type", "==", "exit")
    .limit(EXITS_LIMIT);

  const driversQuery = db
    .collection(FIRESTORE_COLLECTIONS.users)
    .where("role", "==", "driver")
    .limit(DRIVERS_LIMIT);

  const [exitsSnap, driversSnap] = await Promise.all([
    exitsQuery.get(),
    driversQuery.get(),
  ]);

  const exits: VehicleRecordExit[] = [];
  for (const doc of exitsSnap.docs) {
    const raw = doc.data();
    if (isExitRecord(raw)) exits.push(parseExit(raw));
  }

  const drivers: User[] = driversSnap.docs.map((doc) => parseDriver(doc.data()));

  return { exits, drivers };
}
