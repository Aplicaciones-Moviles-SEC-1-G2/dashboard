// Dashboard-facing shapes. Anything the server action hands to a client
// component must be here. Firestore Timestamps are normalized to number ms
// so React components never import `firebase-admin`.

export type DomainTimestampMs = number;

export interface DomainUser {
  id: string;
  name: string;
  email: string;
  role: "driver" | "manager" | string;
  createdAt: DomainTimestampMs;
  plates: string[]; // flattened from users.cars[]
}

export type DomainVehicleRecord =
  | {
      id: string;
      plate: string;
      type: "entry";
      timestamp: DomainTimestampMs;
      floor: number;
      spotNumber: number;
      isRegistered: boolean;
      ownerEmail: string | null;
      ocrConfidence: number;
      durationHours: null;
      hitDailyCap: boolean;
    }
  | {
      id: string;
      plate: string;
      type: "exit";
      timestamp: DomainTimestampMs;
      floor: number;
      spotNumber: number;
      isRegistered: boolean;
      ownerEmail: string | null;
      ocrConfidence: number;
      durationHours: number;
      hitDailyCap: boolean;
    };

export interface DomainOccupancySample {
  id: string;
  timestamp: DomainTimestampMs;
  availableSpots: number;
  totalSpots: number;
  occupancyPercentage: number; // clipped at 0 by convention (OQ-OH-3)
}
