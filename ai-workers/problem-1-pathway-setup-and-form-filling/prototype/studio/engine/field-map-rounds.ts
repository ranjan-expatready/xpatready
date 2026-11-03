// G-CORE B4 (P-121; QA-176 Part B's code row): the field-map step's two rounds compared field by field. The draft round
// is the saved field-map run (api/src/sources.ts); the checker round is an independent run of field-map-check.v1.md
// through the shared step runner (api/src/rounds.ts), which reads the same form inventory and never the draft's answer.
// Agreed = the checker names the same field, with the same kind of answer, filling the same form fields for the same
// people; anything else is a disagreement kept with both readings (a person decides; no third round). Plus the two
// rules a field-map item can be checked by without AI: its key has the library's shape, and every form field it fills
// is on the form. Pure: no I/O.

/** One field as either round proposes it (engine/normalize.ts Item, the parts compared). */
export type MapField = { proposedKey: string; proposedType: string; boxes: { data_path: string; person: string | null; row: number | null }[] };
export type MapAgreement = { agreement: "agreed" | "differ"; check: MapField | null; why: string | null };
export type MapRule = { rule: string; passed: boolean; why: string | null };

const boxId = (b: MapField["boxes"][number]) => `${b.data_path}|${b.person ?? ""}|${b.row ?? ""}`;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** Each draft field's agreement with the checker round, by key; and the fields only the checker named. */
export function compareMaps(draft: MapField[], check: MapField[]): { byKey: Map<string, MapAgreement>; checkOnly: MapField[] } {
  const checkBy = new Map(check.map((c) => [c.proposedKey, c]));
  const byKey = new Map<string, MapAgreement>();
  for (const d of draft) {
    const c = checkBy.get(d.proposedKey);
    if (!c) { byKey.set(d.proposedKey, { agreement: "differ", check: null, why: "Only the draft round named this field; the checker round did not, so a person decides." }); continue; }
    const mine = new Set(d.boxes.map(boxId)), theirs = new Set(c.boxes.map(boxId));
    const onlyDraft = [...mine].filter((x) => !theirs.has(x)).length, onlyCheck = [...theirs].filter((x) => !mine.has(x)).length;
    const why: string[] = [];
    if (d.proposedType !== c.proposedType) why.push(`the draft reads it as ${d.proposedType} and the checker as ${c.proposedType}`);
    if (onlyDraft || onlyCheck) why.push(`the draft fills ${plural(mine.size, "form field")} with it and the checker ${plural(theirs.size, "form field")} (${onlyDraft} only in the draft, ${onlyCheck} only in the checker)`);
    byKey.set(d.proposedKey, why.length ? { agreement: "differ", check: c, why: `The two AI rounds read it differently: ${why.join("; ")}.` } : { agreement: "agreed", check: c, why: null });
  }
  const drafted = new Set(draft.map((d) => d.proposedKey));
  return { byKey, checkOnly: check.filter((c) => !drafted.has(c.proposedKey)) };
}

/** The library's key shape (the field-map prompts' own pattern). */
export const FIELD_KEY = /^[a-z][a-z_]*\.[a-z][a-z0-9_]*$/;
/** The rules a field-map item is checked by on both rounds (P-121): its key's shape, and its form fields on the form. */
export function mapRules(f: MapField, formPaths: Set<string>): MapRule[] {
  const missing = f.boxes.filter((b) => !formPaths.has(b.data_path));
  return [
    { rule: "key_shape", passed: FIELD_KEY.test(f.proposedKey), why: FIELD_KEY.test(f.proposedKey) ? null : `"${f.proposedKey}" does not have the library's key shape.` },
    { rule: "form_fields_on_the_form", passed: !missing.length && f.boxes.length > 0, why: !f.boxes.length ? "It fills no form field." : missing.length ? `${plural(missing.length, "form field")} it fills ${missing.length === 1 ? "is" : "are"} not on the form.` : null },
  ];
}
