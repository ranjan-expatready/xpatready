// G-CORE B4 (P-121; QA-176 Part B's code row): the field-map step's two rounds compared field by field. The draft round
// is the saved field-map run (api/src/sources.ts); the checker round is an independent run of field-map-check.v1.md
// through the shared step runner (api/src/rounds.ts), which reads the same form inventory and never the draft's answer.
// Agreed = the checker names the same field, with the same kind of answer, filling the same form fields for the same
// people; anything else is a disagreement kept with both readings (a person decides; no third round). Plus the two
// rules a field-map item can be checked by without AI: its key has the library's shape, and every form field it fills
// is on the form; with the form's words also (QA-191) its quote, its kind of answer and no form field filled twice. Pure: no I/O.

import { stepsNotRun } from "../../p5/transforms.ts";

/** One field as either round proposes it (engine/normalize.ts Item, the parts compared). BK-22: a box's transformation
 *  and caption, when the round gave them, let the rules check that the filler can run each step. */
export type MapField = { proposedKey: string; proposedType: string; boxes: { data_path: string; person: string | null; row: number | null; transform?: string | null; caption?: string | null }[] };
/** BK-22 (#1695 C1): the rule a field-map item fails when a form field it fills uses a step the form filler cannot run. */
export const STEPS_RULE = "steps_the_filler_runs";
/** BK-22: the form fields of an item whose transformation has a step the filler cannot run, and those steps. Pure. */
export function unrunnable(f: MapField): { box: string; steps: string[] }[] {
  return f.boxes.map((b) => ({ box: b.caption?.trim() || b.data_path.split(".").slice(-2).join("."), steps: stepsNotRun(b.transform, f.proposedKey) })).filter((x) => x.steps.length);
}
/** BK-22: the rule's words: how many form fields, which steps (the first two), and what happens if it is accepted. At
 *  most RULE_WHY_MAX characters, the review queue's limit for a rule's words (a longer one refused the whole draft). */
export const RULE_WHY_MAX = 300;
export function unrunnableWhy(bad: { box: string; steps: string[] }[]): string | null {
  if (!bad.length) return null;
  const steps = [...new Set(bad.flatMap((x) => x.steps))], cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
  const named = `${steps.slice(0, 2).map((x) => `"${cut(x, 60)}"`).join(", ")}${steps.length > 2 ? ", …" : ""}`;
  const say = (where: string) => `The form filler cannot run ${steps.length === 1 ? "a step" : `${steps.length} steps`} (${named}) of ${plural(bad.length, "form field")}${where}: filled as drafted, ${bad.length === 1 ? "it is" : "they are"} left to write by hand on every case.`;
  const full = say(` (first: "${cut(bad[0].box, 50)}")`);
  return full.length <= RULE_WHY_MAX ? full : cut(say(""), RULE_WHY_MAX);
}
export type MapAgreement = { agreement: "agreed" | "differ"; check: MapField | null; why: string | null };
export type MapRule = { rule: string; passed: boolean; why: string | null };

export const boxId = (b: MapField["boxes"][number]) => `${b.data_path}|${b.person ?? ""}|${b.row ?? ""}`;
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
/** The words of a form a quote is checked against (its fields' captions, headings and tooltips), squashed, one printed
 *  text per line (Devin on #728: a quote never runs from one caption into the next). */
export const squashWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** QA-191 review m1: a box's printed choices count too (the inventory's options: [label, value] pairs, or labels). */
const optionLabels = (o: unknown): string[] => (Array.isArray(o) ? o.map((x) => (Array.isArray(x) ? String(x[0] ?? "") : typeof x === "string" ? x : String((x as { label?: unknown })?.label ?? ""))) : []);
export function formWords(fields: { caption?: string | null; heading?: string | null; tooltip?: string | null; options?: unknown; options_resolved?: unknown }[]): string {
  // Devin on #728: a choice list referenced by the box is printed too (options_resolved), even when options is empty.
  const texts = fields.flatMap((f) => [f.caption, f.heading, f.tooltip, ...optionLabels(f.options), ...optionLabels(f.options_resolved)]);
  return [...new Set(texts.map((t) => squashWords(t ?? "")).filter(Boolean))].join("\n");
}
/** Whether the words a reading quoted are printed on the form: whole words, squashed so case and punctuation do not
 *  matter (QA-191 review M1: a part of a word, "na" inside "name", is not a quote of the form). */
export const quoteOnForm = (quote: string | null | undefined, words: string) => { const q = quote ? squashWords(quote) : ""; return q.length > 0 && words.split("\n").some((t) => ` ${t} `.includes(` ${q} `)); };

/** QA-191 (P-121: "the rules check (quote found in its source, coverage, references, duplicates, type and options) runs on
 *  both"): with `more`, three rules besides the two shape rules: the quote is printed on the form, the kind of answer is
 *  one the library knows, and no form field it fills is filled by another field of the same round. */
export function mapRules(f: MapField, formPaths: Set<string>, more?: { quote: string | null | undefined; words: string; claimedTwice: Set<string>; valueTypes: Set<string>; round?: "draft" | "checker" }): MapRule[] {
  const missing = f.boxes.filter((b) => !formPaths.has(b.data_path));
  const twice = more ? f.boxes.filter((b) => more.claimedTwice.has(boxId(b))) : [];
  // BK-22: only the draft round's steps are applied and filled; the checker round's spelling of them is never run.
  const notRun = more && more.round !== "checker" ? unrunnableWhy(unrunnable(f)) : null;
  const extra: MapRule[] = more ? [
    { rule: "quote_on_the_form", passed: quoteOnForm(more.quote, more.words), why: quoteOnForm(more.quote, more.words) ? null : more.quote ? `The words ${more.round === "checker" ? "the checker round" : "the AI"} quoted ("${more.quote.slice(0, 120)}") are not printed on this form.` : `${more.round === "checker" ? "The checker round" : "The AI"} quoted no words of the form.` },
    { rule: "kind_of_answer_known", passed: more.valueTypes.has(f.proposedType), why: more.valueTypes.has(f.proposedType) ? null : `"${f.proposedType}" is not a kind of answer the library knows.` },
    { rule: "no_form_field_twice", passed: !twice.length, why: twice.length ? `${plural(twice.length, "form field")} it fills ${twice.length === 1 ? "is" : "are"} filled by another field too (${twice.slice(0, 3).map((b) => b.data_path.split(".").slice(-2).join(".")).join(", ")}).` : null },
    // BK-22 (#1695 C1): Field map review flags a step the filler cannot run before the map is accepted: the item is a
    // Check (P-121), never High, so it is decided on its own and its card says which steps and form fields.
    ...(more.round !== "checker" ? [{ rule: STEPS_RULE, passed: !notRun, why: notRun }] : []),
  ] : [];
  return [
    { rule: "key_shape", passed: FIELD_KEY.test(f.proposedKey), why: FIELD_KEY.test(f.proposedKey) ? null : `"${f.proposedKey}" does not have the library's key shape.` },
    { rule: "form_fields_on_the_form", passed: !missing.length && f.boxes.length > 0, why: !f.boxes.length ? "It fills no form field." : missing.length ? `${plural(missing.length, "form field")} it fills ${missing.length === 1 ? "is" : "are"} not on the form.` : null },
    ...extra,
  ];
}

/** QA-191: the form fields (with person and row) that more than one field of a round fills. */
export function claimedTwice(fields: MapField[]): Set<string> {
  const n = new Map<string, number>();
  for (const f of fields) for (const id of new Set(f.boxes.map(boxId))) n.set(id, (n.get(id) ?? 0) + 1);
  return new Set([...n].filter(([, c]) => c > 1).map(([id]) => id));
}
