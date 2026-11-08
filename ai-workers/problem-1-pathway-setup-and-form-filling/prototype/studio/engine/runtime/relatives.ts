// B128 (QA-153, P-401): the relatives a form describes but who are not people on the case (resolver R4: a box about
// `subject_parent_1` reads `<subject>/parent_1`; the roles library: a parent is "described on forms only, never a person
// on the case"). A case asks the facts a form reads about them, on their own key, and stores them on an answer subject of
// their own (api/src/runtime.ts), so a parent's answer never lands on the person whose parent they are.
//
// B155 (QA-153, Section C; Lead 31's plan (A) on #1256): a sibling (`<subject>/sibling`) is a list, one entry per brother
// or sister: the release maps `subject_sibling` boxes by row (row n is the n-th entry). Its facts are asked as one
// repeating group on the sibling key, with "none apply", and kept on one answer subject per person (each sibling is a
// row on it), as the person's own groups are. Which facts are asked, how many rows the form holds and which row each box
// reads is the release's (its field maps): nothing here names a form or a combination (P-319).
/** The relations that stand for one person each (a parent). */
export const ONE_PERSON_RELATIONS = ["parent_1", "parent_2"] as const;
/** B155: the relations that stand for a list of people (one row each). */
export const LIST_RELATIONS = ["sibling"] as const;
/** The relations a case asks (resolver R4's relative keys). */
export const ASKED_RELATIONS = [...ONE_PERSON_RELATIONS, ...LIST_RELATIONS] as const;
export type Relation = (typeof ASKED_RELATIONS)[number];
/** A subject a section is confirmed for: a person's id, or a relative's key (`<person id>/parent_1`, `<person id>/sibling`).
 *  The API's Confirm section route extends contracts/runtime.ts ConfirmSection with it (an M3 change kept out of that M2
 *  file). */
export const SUBJECT_OR_RELATIVE = new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(/(${ASKED_RELATIONS.join("|")}))?$`, "i");

/** The person and the relation a relative's key names (`<person>/parent_1`), or null for anything else: a person, the
 *  case, the representative, or a key with more parts. */
export function relativeOf(about: string): { owner: string; relation: Relation } | null {
  const parts = about.split("/");
  if (parts.length !== 2 || !parts[0] || !(ASKED_RELATIONS as readonly string[]).includes(parts[1])) return null;
  return { owner: parts[0], relation: parts[1] as Relation };
}
export const isAskedRelative = (about: string) => relativeOf(about) !== null;
/** B155: a relation that is a list (one row per person), never one person. */
export const isListRelation = (relation: string) => (LIST_RELATIONS as readonly string[]).includes(relation);
/** B155: a relative's key that stands for a list (`<person>/sibling`). */
export const isListRelative = (about: string) => { const r = relativeOf(about); return !!r && isListRelation(r.relation); };
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
const ORDINAL: Record<(typeof ONE_PERSON_RELATIONS)[number], string> = { parent_1: "first parent", parent_2: "second parent" };
/** B155: the plain words for a list relation (resolver R4's key `sibling`, in words; no box name: IMM 5645's Section C
 *  boxes are named "Child"), as a list and as one of it. */
export const LIST_WORDS: Record<(typeof LIST_RELATIONS)[number], { list: string; title: string; one: string }> = { sibling: { list: "brothers and sisters", title: "Brothers and sisters", one: "a brother or sister" } };
/** The words of a list relation (call it only for one: isListRelation). */
export const listWords = (relation: Relation) => LIST_WORDS[relation as (typeof LIST_RELATIONS)[number]];
/** A relative named for people: "Sample Client W's mother", else "Sample Client W's first parent"; a list:
 *  "Sample Client W's brothers and sisters". */
export const relativeLabel = (ownerLabel: string, relation: Relation, boxPaths: string[]) =>
  `${ownerLabel}'s ${isListRelation(relation) ? listWords(relation).list : parentWord(boxPaths) ?? ORDINAL[relation as (typeof ONE_PERSON_RELATIONS)[number]]}`;
/** B155: why a list relative's form field is still empty, in words (never the section a placement happens to sit in,
 *  such as "Your parent 1"): "Sample Client W's brothers and sisters, entry 3". `row` is the form's row (0 first). */
export const listBoxWords = (ownerLabel: string, relation: Relation, row: number | null | undefined) => `${relativeLabel(ownerLabel, relation, [])}${row === null || row === undefined ? "" : `, entry ${row + 1}`}`;
