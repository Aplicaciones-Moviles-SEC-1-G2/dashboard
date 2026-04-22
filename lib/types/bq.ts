export type BqTypeSection = 1 | 2 | 3 | 4 | 5;
export type BqStatus = "GREEN" | "YELLOW";

/**
 * The 10 active BQ ids after the 2026-04-21 renumber (`plans/11_id_migration.md`).
 * Zero-padded 2-char strings `"01".."10"`. Originals (`Q3, Q4, Q11, Q12, Q14,
 * Q15, Q16, Q17, Q18, Q19`) are tracked as `originalId` on each registry entry
 * so archived plans and the business-questions source file stay cross-referable.
 * Any `/bq/[id]` route that doesn't match one of these must 404 via the
 * registry lookup — including old sparse ids like "12" or "15".
 */
export type BqId =
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08"
  | "09"
  | "10";

export const ACTIVE_BQ_IDS: readonly BqId[] = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
] as const;

/**
 * Original Q<N> identifier from `business_questions.md`. Kept alongside the
 * new `BqId` so archived plan lookups and stakeholder cross-references don't
 * need a separate lookup table.
 */
export type OriginalBqId =
  | "Q3"
  | "Q4"
  | "Q11"
  | "Q12"
  | "Q14"
  | "Q15"
  | "Q16"
  | "Q17"
  | "Q18"
  | "Q19";

export interface BqMetadata {
  readonly id: BqId;
  readonly originalId: OriginalBqId;
  /** 1..10 display index, assigned in registry order. Matches the numeric part of `id`. */
  readonly displayNumber: number;
  readonly typeSection: BqTypeSection;
  readonly status: BqStatus;
  readonly shortTitle: string;
  readonly question: string;
  readonly route: `/bq/${BqId}`;
  readonly actionSymbol: `getBQ${string}Data`;
  readonly planFile: string;
  /** Revalidate window for the primary cached action, in seconds. */
  readonly revalidateSeconds: number;
}

export function isActiveBqId(value: string): value is BqId {
  return (ACTIVE_BQ_IDS as readonly string[]).includes(value);
}
