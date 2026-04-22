import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { BqMetadata } from "@/lib/types/bq";

/**
 * Reads a BQ plan file from disk at request time (Server Component only —
 * the file system is obviously not available in the browser). The path in
 * `BqMetadata.planFile` is relative to the repo root.
 */
export async function loadPlanMarkdown(bq: BqMetadata): Promise<string> {
  const absolutePath = path.join(process.cwd(), bq.planFile);
  const raw = await readFile(absolutePath, "utf8");
  const parsed = matter(raw);
  return parsed.content;
}
