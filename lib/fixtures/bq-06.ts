import "server-only";
import { Timestamp } from "firebase-admin/firestore";

import type { VehicleRecordExit } from "@/lib/types/firestore";

const DAY_MS = 24 * 60 * 60 * 1000;

// Deterministic 32-bit LCG — the fixture must produce stable output for a
// given `nowMs` input so `unstable_cache` can hash it reliably.
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const REPEAT_OFFENDER_PLATES = ["AER-423", "BOS-789", "CDM-456"] as const;
const REGULAR_PLATES = [
  "XYZ-100",
  "ABC-200",
  "DEF-300",
  "GHI-400",
  "JKL-500",
  "MNO-600",
  "PQR-700",
  "STU-800",
  "VWX-900",
  "UVW-135",
  "LMN-246",
  "OPQ-357",
  "RST-468",
  "UVA-579",
] as const;
const EMAIL_DOMAINS = [
  "uniandes.edu.co",
  "uniandes.edu.co",
  "uniandes.edu.co",
  "gmail.com",
  "hotmail.com",
  "outlook.com",
] as const;

function buildExits(nowMs: number): VehicleRecordExit[] {
  const rng = seededRng(0xc0ffee);
  const exits: VehicleRecordExit[] = [];
  const days = 30;
  for (let d = 0; d < days; d++) {
    const dayStart = nowMs - (d + 1) * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const count = 10 + Math.floor(rng() * 6); // 10..15 exits/day
    const overstaysToday = Math.max(1, Math.floor(rng() * 4)); // 1..3
    // Ensure the same repeat-offender plate returns across many days so the
    // repeat-offender KPI has something to count.
    const repeatOffenderIdx = d % REPEAT_OFFENDER_PLATES.length;
    const repeatOffenderPlate = REPEAT_OFFENDER_PLATES[repeatOffenderIdx]!;
    for (let i = 0; i < count; i++) {
      const tMs = dayStart + rng() * (dayEnd - dayStart);
      const isOverstay = i < overstaysToday;
      // Every other day a repeat offender clocks an overstay.
      const useRepeatOffender = isOverstay && i === 0 && d % 2 === 0;
      const plate = useRepeatOffender
        ? repeatOffenderPlate
        : REGULAR_PLATES[Math.floor(rng() * REGULAR_PLATES.length)]!;
      const isRegistered = useRepeatOffender || rng() < 0.75;
      const durationHours = isOverstay
        ? 15 + rng() * 8 // 15..23h
        : 1 + rng() * 8; // 1..9h
      const domain = EMAIL_DOMAINS[Math.floor(rng() * EMAIL_DOMAINS.length)]!;
      const ownerHandle = `driver${100 + Math.floor(rng() * 400)}`;
      const ownerEmail = isRegistered ? `${ownerHandle}@${domain}` : null;
      exits.push({
        type: "exit",
        plate,
        timestamp: Timestamp.fromMillis(Math.floor(tMs)),
        floor: 1 + Math.floor(rng() * 3),
        spotNumber: 1 + Math.floor(rng() * 20),
        isRegistered,
        ownerEmail,
        ocrConfidence: Math.round((0.7 + rng() * 0.29) * 100) / 100,
        hitDailyCap: rng() < 0.02,
        photoURL: null,
        durationHours: Math.round(durationHours * 100) / 100,
      });
    }
  }
  return exits;
}

/**
 * Synthetic fallback for BQ-06. Mirrors the shape of
 * `fetchRawBQ06()` so the same `transformBQ06` runs against it.
 * `nowMs` controls the rolling 30-day window start; the output itself is
 * deterministic for a given `nowMs`.
 */
export function syntheticBQ06Raw(nowMs: number = Date.now()): {
  exits: VehicleRecordExit[];
  config: { openingHour: number; closingHour: number };
} {
  return {
    exits: buildExits(nowMs),
    config: { openingHour: 7, closingHour: 22 },
  };
}
