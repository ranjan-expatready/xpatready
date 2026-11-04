// Converts a field-map model output into the portable contract (field-map-entry.v0). Rules, no AI.
// Two rules found on the first live run (20 Oct 2026):
//  * The form edition is a fact of the official file, taken from the official manifest, never from the
//    model. The inventories carry no edition, and every live draft said so rather than invent one; the
//    model's own reading is kept beside the record (edition_note) when it differs. A previous edition's manifest
//    label describes the file ("IMM 5476 previous edition (file dated 19 Nov 2021, 3 pages)") rather than print it,
//    so the printed edition the caller knows (the job's own, read from the file without AI) is used then (QA-207).
//  * A mapped entry whose only evidence is shorter than two characters (for example the caption "*")
//    does not identify its box: it becomes `unresolved`, keeping the proposal in the reason, so a person
//    reviews it. Nothing is dropped and nothing is invented.
// Since the Lead's AI check (A1, 23 Oct 2026) every entry is checked on its own: an entry that breaks the field naming
// rule (contracts/fact-key.ts) or the entry contract becomes "unresolved" with the reason, for a person, and every
// other entry is kept. Before, one bad name in 233 entries made the whole run invalid and nothing was applied.
import { Ajv } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { factKeyProblem } from "../contracts/fact-key.ts";
import { OFFICIAL, PROTOTYPE, SOLUTION } from "./policy.ts";

const ajv = new Ajv({ allErrors: true, strict: false });
const entryValid = ajv.compile(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", "field-map-entry.v0.schema.json"), "utf8")));

export type NeedsPerson = { entry: number; data_path: string; proposed: string; reason: string };

/** The AI's own output with each entry checked on its own (the same output shape, so every reader uses it): a mapped
 *  entry whose field name breaks the naming rule, or that names no field, becomes unresolved with the reason; a
 *  proposed library field with a bad name is set aside. Rules, no AI; the same input always gives the same result. */
export function checkFieldMapOutput(parsed: any): { output: any; needs_person: NeedsPerson[]; set_aside_fields: { id: string; reason: string }[] } {
  const needs: NeedsPerson[] = [];
  const setAside = (parsed.canonical_fields ?? []).flatMap((c: any) => { const p = factKeyProblem(c.id); return p ? [{ id: String(c.id), reason: p }] : []; });
  const entries = (parsed.entries ?? []).map((e: any, i: number) => {
    if (e.outcome !== "mapped") return e;
    const problem = factKeyProblem(e.fact);
    if (!problem) return e;
    const reason = `The AI mapped this box to ${e.fact ? `a field named ${problem}` : "no field name"}. A person names the field for this box (AI proposal: ${e.person}, ${e.fact ?? "no name"}).`;
    needs.push({ entry: i, data_path: e.data_path, proposed: String(e.fact ?? ""), reason });
    return { ...e, outcome: "unresolved", fact: null, unresolved_reason: reason };
  });
  const bad = new Set(setAside.map((x: { id: string }) => x.id));
  return { output: { ...parsed, canonical_fields: (parsed.canonical_fields ?? []).filter((c: any) => !bad.has(String(c.id))), entries }, needs_person: needs, set_aside_fields: setAside };
}

const editionOf = (officialFile: string): string | undefined =>
  (JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")).items as { path: string; edition?: string }[])
    .find((i) => `official-sources/ircc/${i.path}` === officialFile)?.edition;

/** A printed form edition, the contract's own pattern (field-map-entry.v0 form_edition). */
export const PRINTED_EDITION = /^(IMM|IRM) [0-9A-Z ]+ \([0-9]{2}-[0-9]{4}\)$/;

/** knownEdition: the printed edition the caller knows: for a form approved in the product (P-80), the edition its
 *  checked approval names; else the job's known printed edition (launch.ts). The manifest's label wins when it is a
 *  printed edition; a descriptive one (a previous edition's) gives way to the known one. */
export function convertFieldMap(parsed: any, inventoryFile: string, knownEdition?: string) {
  const inv = JSON.parse(readFileSync(join(SOLUTION, inventoryFile), "utf8")).summary as { file: string; sha256: string };
  const label = editionOf(inv.file);
  const known = knownEdition && PRINTED_EDITION.test(knownEdition) ? knownEdition : undefined;
  const edition = (label && PRINTED_EDITION.test(label) ? label : undefined) ?? known ?? label;
  if (!edition) throw new Error(`no edition for ${inv.file} in the official manifest`);
  const weak: string[] = [];
  const checked = checkFieldMapOutput(parsed);
  const needs = [...checked.needs_person];
  const shaped = checked.output.entries.map((e: any) => {
    const quote = String(e.evidence_quote ?? "").trim();
    const weakMapped = e.outcome === "mapped" && quote.length < 2;
    if (weakMapped) weak.push(e.data_path);
    const outcome = weakMapped ? "unresolved" : e.outcome;
    return {
      form_edition: edition, form_sha256: inv.sha256, data_path: e.data_path, outcome, confidence: e.confidence,
      ...(outcome === "mapped" ? { person: e.person, fact: e.fact } : {}),
      ...(e.transform ? { transform: e.transform } : {}), ...(e.row !== null && e.row !== undefined ? { row: e.row } : {}), ...(e.condition ? { condition: e.condition } : {}),
      ...(outcome !== "mapped" ? { unresolved_reason: weakMapped ? `drafted as mapped (${e.person}, ${e.fact}) but its only evidence is "${quote}", which does not identify the box; a person reviews it` : e.unresolved_reason ?? "" } : {}),
      ...(quote.length >= 2 ? { evidence: { file_sha256: inv.sha256, quote } } : {}),
    };
  });
  // Any other entry the contract refuses goes to a person on its own, with the reason; the rest are kept.
  const entries = shaped.map((e: any, i: number) => {
    if (entryValid(e)) return e;
    const why = (entryValid.errors ?? []).map((x) => `${x.instancePath || "entry"} ${x.message}`).join("; ");
    const reason = `The AI entry for this box did not meet the entry contract (${why}). A person maps this box.`;
    needs.push({ entry: i, data_path: e.data_path, proposed: String(e.fact ?? e.outcome), reason });
    return { form_edition: e.form_edition, form_sha256: e.form_sha256, data_path: e.data_path, outcome: "unresolved", unresolved_reason: reason, ...(e.evidence ? { evidence: e.evidence } : {}) };
  });
  const status = entries.some((e: any) => e.outcome === "unresolved") ? "completed_with_unresolved" : "completed";
  const editionNote = parsed.form_edition === edition ? null : { manifest: edition, drafted: parsed.form_edition };
  return { entries, status, weak_evidence: weak, edition_note: editionNote, needs_person: needs, set_aside_fields: checked.set_aside_fields };
}
