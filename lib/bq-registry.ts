import { ACTIVE_BQ_IDS, type BqMetadata } from "@/lib/types/bq";

/**
 * Canonical registry of the 10 active BQs after the 2026-04-21 renumber.
 * New IDs BQ-01..BQ-10 replace the former sparse Q3/Q4/Q11/Q12/Q14/Q15–Q19
 * set; `originalId` preserves the pre-migration label so archived plans and
 * `business_questions.md` stay cross-referable. The canonical mapping lives
 * in `plans/11_id_migration.md`; the ordering here mirrors
 * `plans/01_ranked_roadmap.md` (GREEN by Difficulty ASC, then YELLOW by
 * Difficulty ASC, tiebroken by original Q-id).
 *
 * Per-BQ `revalidateSeconds` values come from `plans/10_dashboard_design_spec.md` §6.3.
 *
 * Archived RED BQs (Q1, Q2, Q5, Q6, Q7, Q8, Q9, Q10, Q13) are intentionally
 * absent; the sidebar, overview grid, command palette, and
 * `/bq/[id]/not-found` all iterate this registry so they never see them.
 */
export const BQ_REGISTRY: readonly BqMetadata[] = [
  {
    id: "01",
    originalId: "Q12",
    displayNumber: 1,
    typeSection: 4,
    status: "GREEN",
    shortTitle: "Peak occupancy moments at SD",
    question:
      "What are the specific moments of the day where the parking capacity of the SD building gets fully occupied? We can monetize this by selling advertising of other nearby parkings.",
    route: "/bq/01",
    actionSymbol: "getBQ01Data",
    planFile: "plans/bq-01-peak-occupancy-moments.md",
    revalidateSeconds: 600,
  },
  {
    id: "02",
    originalId: "Q15",
    displayNumber: 2,
    typeSection: 1,
    status: "GREEN",
    shortTitle: "Occupancy snapshot cadence",
    question:
      "For the `parking_occupancy_history` pipeline, what is the distribution of elapsed time between consecutive snapshots, and how frequently does this gap exceed the typical cadence (indicating a stalled or degraded ingestion pipeline)?",
    route: "/bq/02",
    actionSymbol: "getBQ02Data",
    planFile: "plans/bq-02-occupancy-snapshot-cadence.md",
    revalidateSeconds: 300,
  },
  {
    id: "03",
    originalId: "Q16",
    displayNumber: 3,
    typeSection: 2,
    status: "GREEN",
    shortTitle: "Registered-user stay duration heatmap",
    question:
      "For users whose plate is registered in their `users.cars` entry, what are the mean and median parking durations broken down by day-of-week and hour-of-arrival bucket, so the app can offer a personalised \"expected stay\" hint at the moment they park?",
    route: "/bq/03",
    actionSymbol: "getBQ03Data",
    planFile: "plans/bq-03-registered-user-stay-duration.md",
    revalidateSeconds: 300,
  },
  {
    id: "04",
    originalId: "Q17",
    displayNumber: 4,
    typeSection: 3,
    status: "GREEN",
    shortTitle: "OCR confidence vs threshold",
    question:
      "What is the distribution of `vehicleRecords.ocrConfidence` scores, and what proportion of barrier events fall below the operator-configured `config.parking.ocrConfidenceThreshold` — indicating how frequently the OCR \"feature\" dips below the trust line the system was designed around?",
    route: "/bq/04",
    actionSymbol: "getBQ04Data",
    planFile: "plans/bq-04-ocr-confidence-vs-threshold.md",
    revalidateSeconds: 300,
  },
  {
    id: "05",
    originalId: "Q18",
    displayNumber: 5,
    typeSection: 4,
    status: "GREEN",
    shortTitle: "Parking usage by email domain",
    question:
      "Among registered vehicle events, how does parking usage split by the email domain of `ownerEmail` (e.g. `uniandes.edu.co` vs. other domains), measured by event count and total occupied hours? Useful for partnership/billing conversations with the university versus external user segments.",
    route: "/bq/05",
    actionSymbol: "getBQ05Data",
    planFile: "plans/bq-05-email-domain-usage-share.md",
    revalidateSeconds: 300,
  },
  {
    id: "06",
    originalId: "Q19",
    displayNumber: 6,
    typeSection: 5,
    status: "GREEN",
    shortTitle: "Overstay incidence (registered vs unregistered)",
    question:
      "How many parking sessions exceed the operating-hours envelope defined by `config.parking.openingHour`–`closingHour` (either `durationHours` larger than the envelope or an exit timestamp past closing), and what fraction of those overstays come from registered vs. unregistered users?",
    route: "/bq/06",
    actionSymbol: "getBQ06Data",
    planFile: "plans/bq-06-overstay-incidence.md",
    revalidateSeconds: 300,
  },
  {
    id: "07",
    originalId: "Q3",
    displayNumber: 7,
    typeSection: 2,
    status: "YELLOW",
    shortTitle: "P(spot in 10 min) proxy",
    question:
      "Based on current occupancy rates and historical patterns, what is the probability that a user departing now will secure a parking spot within 10 minutes of arrival at SD building?",
    route: "/bq/07",
    actionSymbol: "getBQ07Data",
    planFile: "plans/bq-07-spot-probability-10min.md",
    revalidateSeconds: 300,
  },
  {
    id: "08",
    originalId: "Q4",
    displayNumber: 8,
    typeSection: 2,
    status: "YELLOW",
    shortTitle: "Optimal morning departure window",
    question:
      "For users who frequently arrive between 7:00-9:00 AM, what is the optimal departure time window that maximizes their likelihood of finding available parking without excessive waiting?",
    route: "/bq/08",
    actionSymbol: "getBQ08Data",
    planFile: "plans/bq-08-optimal-departure-window.md",
    revalidateSeconds: 900,
  },
  {
    id: "09",
    originalId: "Q11",
    displayNumber: 9,
    typeSection: 4,
    status: "YELLOW",
    shortTitle: "Monetizable peak demand patterns (SD-only)",
    question:
      "What are the peak demand patterns and capacity utilization rates across all university parking facilities that could be monetized by selling anonymized parking behavior insights?",
    route: "/bq/09",
    actionSymbol: "getBQ09Data",
    planFile: "plans/bq-09-monetizable-peak-demand.md",
    revalidateSeconds: 7200,
  },
  {
    id: "10",
    originalId: "Q14",
    displayNumber: 10,
    typeSection: 5,
    status: "YELLOW",
    shortTitle: "Availability / queue accuracy",
    question:
      "Are the users receiving an accurate number of available spots and cars in the queue all the time?",
    route: "/bq/10",
    actionSymbol: "getBQ10Data",
    planFile: "plans/bq-10-availability-and-queue-accuracy.md",
    revalidateSeconds: 300,
  },
] as const;

// Invariant: registry size must equal the active-id list. Runs at module
// load (server + build) so a mismatch fails the build loudly instead of
// silently diverging from `plans/01_ranked_roadmap.md` or
// `plans/11_id_migration.md`.
if (BQ_REGISTRY.length !== ACTIVE_BQ_IDS.length) {
  throw new Error(
    `BQ_REGISTRY has ${BQ_REGISTRY.length} entries; ACTIVE_BQ_IDS has ${ACTIVE_BQ_IDS.length}. ` +
      "Check plans/01_ranked_roadmap.md — archived BQ ids must not appear here.",
  );
}
for (const id of ACTIVE_BQ_IDS) {
  if (!BQ_REGISTRY.some((bq) => bq.id === id)) {
    throw new Error(`BQ_REGISTRY is missing an entry for BQ-${id}.`);
  }
}

export function findBq(id: string): BqMetadata | undefined {
  return BQ_REGISTRY.find((bq) => bq.id === id);
}

export function findBqByOriginalId(originalId: string): BqMetadata | undefined {
  return BQ_REGISTRY.find((bq) => bq.originalId === originalId);
}

export const TYPE_SECTION_LABELS: Record<number, string> = {
  1: "Type 1 — App's Telemetry",
  2: "Type 2 — Direct User Experience Improvement",
  3: "Type 3 — Features Analysis",
  4: "Type 4 — Benefits from Data",
  5: "Type 5 — Multiple Types",
};

export function groupByTypeSection(
  entries: readonly BqMetadata[] = BQ_REGISTRY,
): ReadonlyArray<{ section: 1 | 2 | 3 | 4 | 5; label: string; items: BqMetadata[] }> {
  const sections: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
  return sections.map((section) => ({
    section,
    label: TYPE_SECTION_LABELS[section] ?? `Type ${section}`,
    items: entries
      .filter((bq) => bq.typeSection === section)
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  }));
}

export function getBqByRoute(pathname: string): BqMetadata | undefined {
  const match = pathname.match(/^\/bq\/([^/]+)/);
  if (!match) return undefined;
  const id = match[1];
  return id ? findBq(id) : undefined;
}

export type { BqMetadata };
