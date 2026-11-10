// C8.3 (B144; tech lead's Q1 on #1247, Lead 31; SA-01B SA-1B-221): the program's review items for one filing's
// combination, through ONE port. Scaffolding (P-33): today a Sample data file, samples/review-items.json (Unconfirmed:
// expert); the follow-up row reads SA-1B-221's REVIEW_ITEM lines from the release the case is pinned to instead, and
// only this file changes. Never blocking: the items are ticked or confirmed unticked once (BR-2, BR-4).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProgramItem } from "../../engine/runtime/review.ts";

const FILE = join(import.meta.dirname, "..", "..", "samples", "review-items.json");
type Items = { combinations: Record<string, { key: string; wording: string }[]> };
let cache: Items | null = null;
const items = (): Items => (cache ??= JSON.parse(readFileSync(FILE, "utf8")) as Items);

/** The review items of a combination as the case's pinned release has them. `release` is part of the port so the
 *  configured line kind can read its own version; the Sample file has one list per combination key. */
export function reviewItemsOf(release: { id: string; version: number }, combinationKey: string): ProgramItem[] {
  void release;
  return (items().combinations[combinationKey] ?? []).map((x) => ({ key: x.key, wording: x.wording }));
}
