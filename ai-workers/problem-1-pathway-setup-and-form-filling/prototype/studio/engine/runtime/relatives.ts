// B128 (QA-153, P-401): the relatives a form describes but who are not people on the case (resolver R4: a box about
// `subject_parent_1` reads `<subject>/parent_1`; the roles library: a parent is "described on forms only, never a person
// on the case"). A case asks the facts a form reads about them, on their own key, and stores them on an answer subject of
// their own (api/src/runtime.ts), so a parent's answer never lands on the person whose parent they are.
//
// Only one-person relations are asked: a parent is one person. A sibling (`<subject>/sibling`) is a list, one row per
// brother or sister, and a list needs its own "none apply" and rows: not asked here yet (B128's PR, question for the
// tech lead). Which facts are asked, in which section, with which words, is the release's (its placements and field
// maps): nothing here names a form or a combination (P-319).
import { ASKED_RELATIONS } from "../../contracts/runtime.ts";
export { ASKED_RELATIONS };
export type Relation = (typeof ASKED_RELATIONS)[number];

/** The person and the relation a relative's key names (`<person>/parent_1`), or null for anything else: a person, the
 *  case, the representative, a sibling (a list), or a key with more parts. */
export function relativeOf(about: string): { owner: string; relation: Relation } | null {
  const parts = about.split("/");
  if (parts.length !== 2 || !parts[0] || !(ASKED_RELATIONS as readonly string[]).includes(parts[1])) return null;
  return { owner: parts[0], relation: parts[1] as Relation };
}
export const isAskedRelative = (about: string) => relativeOf(about) !== null;
/** The key a relative's answers are read under, as the resolver names it. */
export const relativeKey = (owner: string, relation: Relation) => `${owner}/${relation}`;

/** Review Major 1 (#1256): which parent a relative is, in the words of the boxes the person's forms write it into (the
 *  form fields' own names in the release's field maps, IRCC's words): "mother" or "father" when every box that names one
 *  names the same, else null. Never a constant: one form's first parent is the mother, another form's the father, and a
 *  form can say only "parent 1". A word inside another ("grandmother") does not count. */
export function parentWord(boxPaths: string[]): "mother" | "father" | null {
  const named = new Set(boxPaths.flatMap((p) => [...p.matchAll(/(?:^|[^a-z])(mother|father)/gi)].map((m) => m[1].toLowerCase() as "mother" | "father")));
  return named.size === 1 ? [...named][0] : null;
}
const ORDINAL: Record<Relation, string> = { parent_1: "first parent", parent_2: "second parent" };
/** A relative named for people: "Sample Client W's mother", else "Sample Client W's first parent". */
export const relativeLabel = (ownerLabel: string, relation: Relation, boxPaths: string[]) => `${ownerLabel}'s ${parentWord(boxPaths) ?? ORDINAL[relation]}`;
