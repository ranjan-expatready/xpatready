// A document line's condition reads facts; a line comes over only when each fact it reads is in this library and asked in
// a section (else the release would hold on "not in the library" or "asked of nobody"). Shared by 300 and 310.
import type { Db } from "../../../core.ts";

/** Every fact (`field`) a condition tree reads. */
export const factsOf = (x: unknown, out = new Set<string>()): Set<string> => { if (Array.isArray(x)) x.forEach((v) => factsOf(v, out)); else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if (k === "field" && typeof v === "string") out.add(v); else factsOf(v, out); } return out; };

/** The facts asked in a section, and the facts the library holds (not retired), as they are now. */
export async function factsHeld(db: Db, workspaceId: string) {
  const asked = new Set((await db.sectionQuestion.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((q) => q.canonicalFieldKey));
  const inLibrary = new Set((await db.canonicalField.findMany({ where: { workspaceId, status: { not: "RETIRED" } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey));
  return { asked, inLibrary };
}
