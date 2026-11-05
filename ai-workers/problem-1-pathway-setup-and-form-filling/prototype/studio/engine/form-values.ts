// The filler's value step (moved out of api/src/fill.ts writeForm unchanged, G4 / C5.7): from a form's coverage (which
// value each form field reads, and whether it is a confirmed fact) to the value each form field gets, in the form
// field's own format or code; signatures and the oath are never written. Pure (P-249 lift-ready): the caller passes the
// snapshot's map and the form's field list (inventory); no database, file, clock or vendor call. Shared by the real
// fill (writeForm, which then writes the PDF) and the answer-key runner (engine/answer-keys.ts), so a test checks
// exactly what a fill writes.
import { runTransform } from "../../p5/transforms.ts";
import { codeForValue, hasCodes, labelForText, notOnFormValue, type ListValue, type OptionMap } from "./options.ts";
import { byAPerson, inFormFormat } from "./form-steps.ts";
import type { BoxRow } from "./render.ts";
import type { Snapshot } from "./snapshot.ts";

/** One form field of the form's inventory (the parts this step reads). */
export type InventoryBox = { data_path?: string | null; som?: string | null; ui?: string; caption?: string | null; required?: boolean | null; max_chars?: number | null; options?: unknown; options_resolved?: [string, string][] | null };
export type Inventory = { fields: InventoryBox[]; groups?: unknown[] };
/** What happened to one form field: written (with the value), or why not. */
export type BoxResult = BoxRow & { result: "written" | "by a person" | "not written" | "by hand" | "not on this form" | "blank"; written?: string; why?: string; fix?: string };
type Entry = { data_path: string; fact?: string | null; option_map?: OptionMap | null };
type Def = { id: string; answer_list?: { values: ListValue[] } };

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
  // F1 slice 2 and 2b (evidence lane F2, F6): a signature or the oath block is never written, whatever is mapped to it.
  const boxes = covBoxes.map((r): BoxResult => {
    const person = byAPerson(inv.fields, box.get(r.box) ?? { data_path: r.box });
    if (person) return { ...r, result: "by a person", why: person };
    // C7.2 cause 3: a Yes/No "is anything recorded?" box is written "N" when a person confirmed that nothing applies.
    if (r.coverage !== "confirmed fact" && !r.nothing_recorded) return { ...r, result: "not written", why: r.fix ?? (r.coverage === "answered on screen" ? "answered on screen, not confirmed" : r.detail) };
    // A form field on an answer list takes its own code from its option map (the team's ENUM map, onMissing REFUSE).
    const e = entryOf.get(r.box), list = e?.fact ? listOf.get(e.fact) : undefined;
    if (e?.option_map && list) { const code = codeForValue(r.value, e.option_map, list); if (code === null) { const not = notOnFormValue(r.value, e.option_map, list); return not ? { ...r, result: "not on this form", why: `The form has no choice for "${not.label}", so nothing is written and nothing is guessed: leave it blank or change the answer.` } : { ...r, result: "by hand", why: `"${r.value}" has no code in this form field's option map` }; } write(r.box, code); return { ...r, result: "written", written: values[r.box] }; }
    // A text form field (no codes in its transform and no choices of its own) writes the value's label, never its key.
    const own = box.get(r.box) ?? {};
    const text = list && !hasCodes(r.transform) && !(Array.isArray(own.options_resolved) && own.options_resolved.length);
    const o = runTransform(r.transform ?? "as_is", r.nothing_recorded ? null : text ? labelForText(r.value, list) : r.value, own, { fact: (k) => confirmed.get(`${r.about}|${k}`), nothingRecorded: !!r.nothing_recorded });
    if (o.ok) { write(r.box, o.value); return { ...r, result: "written", written: values[r.box], ...(r.nothing_recorded ? { why: r.detail } : {}) }; }
    return { ...r, result: "hand" in o ? "by hand" : "blank", why: o.reason };
  });
  return { boxes, values };
}
