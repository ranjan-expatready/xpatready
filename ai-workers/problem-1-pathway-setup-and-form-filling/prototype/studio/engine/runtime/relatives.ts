// B128 (QA-153, P-401): the relatives a form describes but who are not people on the case (resolver R4: a box about
// `subject_parent_1` reads `<subject>/parent_1`; the roles library: a parent is "described on forms only, never a person
// on the case"). A case asks the facts a form reads about them, on their own key, and stores them on an answer subject of
// their own (api/src/runtime.ts), so a parent's answer never lands on the person whose parent they are.
//
// Only one-person relations are asked: a parent is one person. A sibling (`<subject>/sibling`) is a list, one row per
// brother or sister, and a list needs its own "none apply" and rows: not asked here yet (B128's PR, question for the
// tech lead). Which facts are asked, in which section, with which words, is the release's (its placements and field
// maps): nothing here names a form or a combination (P-319).

/** The relations a case asks one by one (resolver R4's relative keys that stand for one person). */
export const ASKED_RELATIONS = ["parent_1", "parent_2"] as const;
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
