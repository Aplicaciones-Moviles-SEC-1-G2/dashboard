import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type ServiceAccountCredential = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function decodeServiceAccount(value: string): ServiceAccountCredential {
  const json = Buffer.from(value, "base64").toString("utf8");
  const parsed: unknown = JSON.parse(json);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { project_id?: unknown }).project_id !== "string" ||
    typeof (parsed as { client_email?: unknown }).client_email !== "string" ||
    typeof (parsed as { private_key?: unknown }).private_key !== "string"
  ) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not a valid service-account JSON");
  }
  const record = parsed as ServiceAccountCredential;
  return {
    project_id: record.project_id,
    client_email: record.client_email,
    private_key: record.private_key,
  };
}

function initAdmin(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!key || !projectId) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID — check .env.local",
    );
  }
  const sa = decodeServiceAccount(key);
  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key.replace(/\\n/g, "\n"),
    }),
    projectId,
  });
}

let cachedDb: Firestore | undefined;

export function getAdminDb(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(initAdmin());
  }
  return cachedDb;
}

// Convenience export for queries that prefer the Firestore handle directly.
// Queries live in lib/queries/bq-<id>.ts — nothing else imports firebase-admin.
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const db = getAdminDb();
    const value = Reflect.get(db, prop) as unknown;
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(db) : value;
  },
});
