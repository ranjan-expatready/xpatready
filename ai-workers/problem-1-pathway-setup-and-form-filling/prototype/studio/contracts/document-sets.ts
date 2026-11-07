// C6.15 (row B137; SA-1B-19, SA-1B-20; requirement row B3): document substitute sets. Shared by the API, the engine and
// the web app. A library document type holds named sets; each set is "any one of" (one accepted member meets the line;
// member 1 is the standard, members 2, 3, … the alternatives in the order the client sees them, each with "when
// acceptable" wording) or "all of" (every member is needed). The first set is named "Standard". A combination's document
// line picks one set by name (none picked: "Standard"); it never adds, removes or reorders members. Sets change only as
// a library change: the author proposes the whole list with a reason, a second person approves it on To review, and it
// goes out with the next release (as "the facts a document supplies", C4.5). Information only: a set never blocks anyone;
// the case officer decides whether an alternative is acceptable. Sample until the immigration expert confirms.
import { z } from "zod";

export const SETS_KIND = "document_sets", SETS_ACTION = "SET_SETS";
export const STANDARD = "Standard";
export const SET_MODES = ["any_one", "all_together"] as const;
export type SetMode = (typeof SET_MODES)[number];
export const MODE_WORDS: Record<SetMode, string> = { any_one: "Any one of", all_together: "All of" };
/** At most this many sets per type and members per set (a checklist line a person can read). */
export const MAX_SETS = 6, MAX_MEMBERS = 8;

/** Format characters removed, spaces folded (as contracts/document-supplies.ts). */
const clean = (s: string) => s.normalize("NFC").replace(/[\p{Cf}ᅟᅠㅤﾠ]/gu, "").replace(/\s+/g, " ").trim();
const text = (max: number, need: string, long: string) => z.string({ error: need }).transform(clean).refine((s) => /[\p{L}\p{N}]/u.test(s), need).refine((s) => s.length <= max, long);

const Member = z.object({
  key: z.string({ error: "Choose a document type for each member." }).trim().min(1, "Choose a document type for each member.").max(200),
  /** SA-1B-19 rule 3: an alternative's "when acceptable", in the client's words (English) and, optionally, staff's. */
  whenClient: text(300, "Write when it is acceptable, in the client's words.", "Keep the client's words under 300 characters.").optional().nullable(),
  whenStaff: text(300, "Write when it is acceptable, in staff's words.", "Keep staff's words under 300 characters.").optional().nullable(),
}).strict();
const DocSet = z.object({
  name: text(60, "Give the set a name.", "Keep the set's name under 60 characters."),
  mode: z.enum(SET_MODES, { message: "Choose \"Any one of\" or \"All of\" for each set." }),
  members: z.array(Member, { error: "List the set's members." }).min(1, "A set needs at least one member.").max(MAX_MEMBERS, `At most ${MAX_MEMBERS} members per set.`),
}).strict();

/** POST /library/document-types/:key/sets: the whole new list of sets (empty: the type is its own only member again). */
export const SetsBody = z.object({
  sets: z.array(DocSet, { error: "List the sets (or none)." }).max(MAX_SETS, `At most ${MAX_SETS} sets per document type.`),
  reason: z.string({ error: "Write at least 5 letters or digits: why it changes for every combination." }).transform(clean)
    .refine((s) => s.replace(/[^\p{L}\p{N}]/gu, "").length >= 5, "Write at least 5 letters or digits: why it changes for every combination.").refine((s) => s.length <= 300, "Keep the reason under 300 characters."),
}).strict();
export type SetsInput = z.infer<typeof SetsBody>;

/** As the library stores a set (document_type.sets) and the release carries it, members named. */
export type StoredMember = { key: string; whenClient?: string | null; whenStaff?: string | null };
export type StoredSet = { name: string; mode: SetMode; members: StoredMember[] };
/** PUT /combinations/:id/requirements/:lineage/set: the set the line picks (null or "Standard": the standard set). */
export const PickSetBody = z.object({
  setName: z.string({ error: "Choose a set." }).transform(clean).refine((s) => s.length <= 60, "Keep the set's name under 60 characters.").nullable(),
  baseRevision: z.string().optional(),
}).strict();

/** SA-1B-19 rules 1 to 6 on a proposed list, given the owning type and what the library knows of each member. Returns
 *  the first problem in words (the member named), or null. `types`: key → { name, status, ownsSets }. */
export function setsProblem(owner: string, sets: StoredSet[], types: Map<string, { name: string; status: string; ownsSets: boolean }>): string | null {
  if (!sets.length) return null;
  if (sets[0].name !== STANDARD) return `The first set is named "${STANDARD}" (it is the one a line uses when it picks none).`;
  const names = new Set<string>();
  for (const s of sets) {
    const n = s.name.toLowerCase();
    if (names.has(n)) return `Two sets are named "${s.name}": give each set its own name.`;
    names.add(n);
    const seen = new Set<string>();
    for (const [i, m] of s.members.entries()) {
      const t = types.get(m.key);
      if (!t) return `"${m.key}" in the set "${s.name}" is not a document type in the library.`;
      if (t.status === "RETIRED") return `${t.name} in the set "${s.name}" is retired: choose a document type in use.`;
      if (seen.has(m.key)) return `${t.name} is listed twice in the set "${s.name}": a type is listed once per set.`;
      seen.add(m.key);
      if (m.key !== owner && t.ownsSets) return `${t.name} has substitute sets of its own, so it cannot be a member of another type's set (no sets inside sets).`;
      const when = !!(m.whenClient || m.whenStaff);
      if (s.mode === "all_together" && when) return `In an "All of" set every member is needed, so ${t.name} has no "when acceptable" words: take them out, or make the set "Any one of".`;
      if (s.mode === "any_one" && i === 0 && when) return `${t.name} is the standard of the set "${s.name}" (its first member), so it has no "when acceptable" words.`;
      if (s.mode === "any_one" && i > 0 && !m.whenClient) return `Add the client wording for ${t.name}.`;
    }
  }
  return null;
}
