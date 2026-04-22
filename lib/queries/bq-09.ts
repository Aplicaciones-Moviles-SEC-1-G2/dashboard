import "server-only";
import type { DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  FIRESTORE_COLLECTIONS,
  type AnalyticsFacilityDemandPattern,
} from "@/lib/types/firestore";

// BQ-09-only; the `facilities` collection is not part of the active
// inventory and is scoped to this plan. Declared inline so it does not leak
// into `lib/types/firestore.ts`.
export interface FacilityDoc {
  name: string;
  capacity: number;
}

export interface FetchRawBQ09Result {
  cells: AnalyticsFacilityDemandPattern[];
  facility: FacilityDoc | null;
}

const CELL_LIMIT = 200;
const FACILITIES_COLLECTION = "facilities";

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseCell(raw: DocumentData): AnalyticsFacilityDemandPattern {
  return {
    facilityId: toString(raw.facilityId),
    dayOfWeek: toNumber(raw.dayOfWeek),
    hour: toNumber(raw.hour),
    avgOccupancyPct: toNumber(raw.avgOccupancyPct),
    utilizationScore: toNumber(raw.utilizationScore),
  };
}

function parseFacility(raw: DocumentData | null): FacilityDoc | null {
  if (!raw) return null;
  const nameRaw = toString(raw.name);
  const capacityRaw = toNumber(raw.capacity);
  return {
    name: nameRaw,
    capacity: Number.isFinite(capacityRaw) ? capacityRaw : 0,
  };
}

/**
 * BQ-09 raw Firestore read. Query A — facility demand matrix from
 * `analytics_facility_demand_pattern` filtered by `facilityId`. Query B —
 * optional metadata from `facilities/{facilityId}` (may be absent during
 * multi-facility rollout). C3-compliant.
 */
export async function fetchRawBQ09(
  facilityId: string,
): Promise<FetchRawBQ09Result> {
  const db = getAdminDb();

  const cellsQuery = db
    .collection(FIRESTORE_COLLECTIONS.analyticsFacilityDemandPattern)
    .where("facilityId", "==", facilityId)
    .limit(CELL_LIMIT);
  const facilityRef = db.collection(FACILITIES_COLLECTION).doc(facilityId);

  const [cellsSnap, facilitySnap] = await Promise.all([
    cellsQuery.get(),
    facilityRef.get(),
  ]);

  const cells = cellsSnap.docs.map((doc) => parseCell(doc.data()));
  const facility = parseFacility(
    facilitySnap.exists ? (facilitySnap.data() ?? null) : null,
  );
  return { cells, facility };
}
