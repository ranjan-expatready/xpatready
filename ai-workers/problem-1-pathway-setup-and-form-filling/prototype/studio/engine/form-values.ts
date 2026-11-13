// The filler's value step (moved out of api/src/fill.ts writeForm unchanged, G4 / C5.7): from a form's coverage (which
// value each form field reads, and whether it is a confirmed fact) to the value each form field gets, in the form
// field's own format or code; signatures and the oath are never written. Pure (P-249 lift-ready): the caller passes the
// snapshot's map and the form's field list (inventory); no database, file, clock or vendor call. Shared by the real
// fill (writeForm, which then writes the PDF) and the answer-key runner (engine/answer-keys.ts), so a test checks
// exactly what a fill writes.
import { proseRecorded, recordedDerivation, runTransform, wordsInSteps } from "../../p5/transforms.ts";
import { codeAsksMore, codeForValue, hasCodes, labelForText, notOnFormValue, type ListValue, type OptionMap } from "./options.ts";
import { byAPerson, inFormFormat } from "./form-steps.ts";
import { NotWorkedOut } from "./not-worked-out.ts";
import type { BoxRow } from "./render.ts";
import type { Snapshot } from "./snapshot.ts";

/** One form field of the form's inventory (the parts this step reads). */
export type InventoryBox = { data_path?: string | null; som?: string | null; ui?: string; caption?: string | null; required?: boolean | null; max_chars?: number | null; options?: unknown; options_resolved?: [string, string][] | null };
export type Inventory = { fields: InventoryBox[]; groups?: unknown[] };
/** What happened to one form field: written (with the value), or why not. */
export type BoxResult = BoxRow & { result: "written" | "by a person" | "not written" | "by hand" | "not on this form" | "blank"; written?: string; why?: string; fix?: string };
type Entry = { data_path: string; fact?: string | null; transform?: string | null; option_map?: OptionMap | null };
type Def = { id: string; answer_list?: { values: ListValue[] } };

/** QA-392, QA-392b (C7.3): the Yes/No each "recorded" box of a form stands for, exactly as the PDF copy writes it: the copy's
 *  own value step's result for that box (`results`, from formValues on the same boxes the copy reads, after
 *  engine/runtime/forms.ts markNothingRecorded), read back through the box's own yes/no code (`yes_no_code:Y/N`,
 *  `check_code:…`). Keyed by data path. A box the copy does not write (left to a person, refused, blank, or written by an
 *  option map with no yes/no code) has none, so nothing is said that the PDF does not say. Pure. */
export function recordedYesNo(results: BoxResult[]): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const r of results) {
    if (r.result !== "written" || r.written === undefined || !(recordedDerivation(r.transform) || proseRecorded(r.transform))) continue;
    const code = String(r.transform).split(/;|->/).map((x) => /^(?:yes_no_code|check_code):([^/]+)\/(.+)$/.exec(x.trim())).filter(Boolean).pop();
    if (code && r.written === code[1]) out.set(r.box, true);
    else if (code && r.written === code[2]) out.set(r.box, false);
  }
  return out;
}

/** B81: what the officer reads of a copy's refused answers: whose they are and why, apart from what is written by hand. */
export function notOnFormLines(boxes: { fact: string | null; about_label?: string; result: string; why: string | null }[], labelOf: (fact: string) => string | undefined): { label: string; person: string | null; why: string }[] {
  return boxes.filter((b) => b.result === "not on this form").map((b) => ({ label: (b.fact && labelOf(b.fact)) || "A form field", person: b.about_label ?? null, why: b.why ?? "" }));
}

/** The value step of one form: `map` is the snapshot's field map of the PDF edition, `inv` its form field list. */
export function formValues(snapshot: Snapshot, map: { entries: Entry[] }, inv: Inventory, covBoxes: (BoxRow & { fix?: string })[]): { boxes: BoxResult[]; values: Record<string, string> } {
  const entryOf = new Map<string, Entry>(map.entries.map((e) => [e.data_path, e]));
  const listOf = new Map<string, ListValue[]>((snapshot.canonical_fields as Def[]).flatMap((f) => (f.answer_list ? [[f.id, f.answer_list.values] as [string, ListValue[]]] : [])));
  const box = new Map<string, InventoryBox>(inv.fields.filter((x) => x.data_path).map((x) => [x.data_path!, x]));
  const values: Record<string, string> = {};
  // F1 slice 2 (evidence lane F2, F3): a signature is never typed by the product; values go in the form's own format.
  const write = (path: string, v: string) => (values[path] = inFormFormat(box.get(path) ?? {}, v));
  // C7.2 cause 1: the derivations that compare two facts read the other one from the same person's confirmed facts.
  const confirmed = new Map<string, unknown>(covBoxes.filter((b) => b.coverage === "confirmed fact" && b.fact && (b.row === null || b.row === undefined)).map((b) => [`${b.about}|${b.fact}`, b.value]));
  // BK-23 (Lead 36 on #1698): and the facts a form field's "A equals B" step compares that no form field of this form reads
  // itself, confirmed for the same person (engine/runtime/forms.ts `compared`); a form field's own value comes first.
  for (const b of covBoxes) for (const [f, v] of Object.entries(b.compared ?? {})) if (!confirmed.has(`${b.about}|${f}`)) confirmed.set(`${b.about}|${f}`, v);
  // QA-403 (review M1 on #1588): the words this form's steps name for each fact, so a box that ticks by a word knows
  // every answer its fact can take, and any other answer goes by hand.
  const wordsOf = new Map<string, string[]>();
  for (const e of map.entries) if (e.fact) { const w = wordsInSteps(e.transform, e.fact); if (w.length) wordsOf.set(e.fact, [...(wordsOf.get(e.fact) ?? []), ...w]); }
  // F1 slice 2 and 2b (evidence lane F2, F6): a signature or the oath block is never written, whatever is mapped to it.
  const boxes = covBoxes.map((r): BoxResult => {
    const person = byAPerson(inv.fields, box.get(r.box) ?? { data_path: r.box });
    if (person) return { ...r, result: "by a person", why: person };
    // Review M1 on #1620 (QA-415): a fact the case works out but cannot for this person yet goes by hand, with its reason.
    // The reason travels as text on the row (a copy's rows are frozen as JSON first), or as the value itself in one process.
    const notOut = r.by_hand ?? (r.value instanceof NotWorkedOut ? r.value.why : undefined);
    if (notOut) return { ...r, result: "by hand", why: notOut };
    // C7.2 cause 3: a Yes/No "is anything recorded?" box is written "N" when a person confirmed that nothing applies.
    if (r.coverage !== "confirmed fact" && !r.nothing_recorded) return { ...r, result: "not written", why: r.fix ?? (r.coverage === "answered on screen" ? "answered on screen, not confirmed" : r.detail) };
    // A form field on an answer list takes its own code from its option map (the team's ENUM map, onMissing REFUSE).
    const e = entryOf.get(r.box), list = e?.fact ? listOf.get(e.fact) : undefined;
    // Break M5: the form prints two or more choices for this answer: a code saved earlier is a guess, so it is never written.
    const twoChoices = e?.option_map && list ? codeAsksMore(r.value, list, box.get(r.box) ?? {}, r.transform) : null;
    if (twoChoices) return { ...r, result: "by hand", why: `The form prints ${twoChoices.map((o) => `"${o.label}"`).join(" and ")} for this answer: the immigration expert decides which, so nothing is written and nothing is guessed.` };
    if (e?.option_map && list) { const code = codeForValue(r.value, e.option_map, list); if (code === null) { const not = notOnFormValue(r.value, e.option_map, list); return not ? { ...r, result: "not on this form", why: `The form has no choice for "${not.label}", so nothing is written and nothing is guessed: leave it blank or change the answer.` } : { ...r, result: "by hand", why: `"${r.value}" has no code in this form field's option map` }; } write(r.box, code); return { ...r, result: "written", written: values[r.box] }; }
    // A text form field (no codes in its transform and no choices of its own) writes the value's label, never its key.
    const own = box.get(r.box) ?? {};
    const text = list && !hasCodes(r.transform) && !(Array.isArray(own.options_resolved) && own.options_resolved.length);
    const o = runTransform(r.transform ?? "as_is", r.nothing_recorded ? null : text ? labelForText(r.value, list) : r.value, own, { fact: (k) => confirmed.get(`${r.about}|${k}`), nothingRecorded: !!r.nothing_recorded, ...(r.counted !== undefined ? { counted: r.counted, countedWhy: r.detail } : {}), ownFact: r.fact ?? undefined, words: r.fact ? wordsOf.get(r.fact) : undefined });
    if (o.ok) { write(r.box, o.value); return { ...r, result: "written", written: values[r.box], ...(r.nothing_recorded || r.counted !== undefined ? { why: r.detail } : {}) }; }
    return { ...r, result: "hand" in o ? "by hand" : "blank", why: o.reason };
  });
  return { boxes: sameAsLeavesRowEmpty(boxes, values, box), values };
}

/** The data path of the row a form field sits in: its own subform, and the wrapper of the same name if there is one
 *  (`…ResidentialAddressRow1[0].StreetNum[0].StreetNum[0]` → `…ResidentialAddressRow1[0]`). */
export function rowOfBox(path: string): string {
  const parts = path.split(".");
  const last = parts.pop()!, name = (s: string) => s.replace(/\[\d+\]$/, "");
  if (parts.length && name(parts[parts.length - 1]) === name(last)) parts.pop();
  return parts.join(".");
}

/** B99 (C10.1 row 12b; IMM 5257's own Validate in Adobe, 5 Nov rehearsal): a "Same as …?" form field worked out as
 *  "A equals B" and written as the same answer (Yes) means the form asks A's own row only when the answer is No. The
 *  form's Validate clears the Yes when that row holds anything ("Is the country from where you are applying the same…":
 *  `validateCWA`; "Is your residential address the same as your mailing address?": `validateResidentialAddress`), so a
 *  required box comes back empty and Validate fails. So every form field in the rows that A's own form fields sit in, after
 *  the "Same as" field in the form's order, is left empty, with the reason in words. A row that holds the "Same as" field
 *  itself is never emptied. Pure. */
export function sameAsLeavesRowEmpty(boxes: BoxResult[], values: Record<string, string>, inv: Map<string, InventoryBox>): BoxResult[] {
  const rows = new Map<string, string>(); // row data path → why
  // Review on #1123 (m3): only a row the form asks after its "Same as" question (in the form's own order, its field list)
  // is the one that question stands for; the side named first in "A equals B" is the AI's wording, never trusted alone.
  const order = new Map([...inv.keys()].map((k, i) => [k, i]));
  for (const b of boxes) {
    const m = /(?:^|;|->)\s*derived:([\w.]+) equals ([\w.]+)\s*(?=;|->)/.exec(b.transform ?? ""), yes = /yes_no_code:([^/;\s]+)\//.exec(b.transform ?? "");
    if (b.result !== "written" || !m || !yes || values[b.box] === undefined || values[b.box] !== inFormFormat(inv.get(b.box) ?? {}, yes[1])) continue;
    const caption = (inv.get(b.box)?.caption ?? "").replace(/^\s*Question\s+\d+(?:\s*[A-Z]\b\.?)?\s*/i, "").trim() || "Same as";
    for (const a of boxes) {
      if (a.fact !== m[1] || a.about !== b.about || a.box === b.box) continue;
      if (!(order.has(a.box) && order.has(b.box) && order.get(a.box)! > order.get(b.box)!)) continue;
      const row = rowOfBox(a.box);
      if (row && !b.box.startsWith(`${row}.`)) rows.set(row, `Not needed: "${caption}" is Yes, and the form asks this only when it is No (its own Validate clears the Yes otherwise).`);
    }
  }
  if (!rows.size) return boxes;
  return boxes.map((x) => {
    const row = [...rows.keys()].find((r) => x.box.startsWith(`${r}.`));
    if (!row || x.result !== "written") return x;
    delete values[x.box];
    return { ...x, result: "blank", written: undefined, why: rows.get(row) };
  });
}
