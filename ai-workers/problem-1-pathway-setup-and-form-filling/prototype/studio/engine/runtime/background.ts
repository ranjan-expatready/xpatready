// C6.18 officer entry for background answers (row B140, L-SA10; P-244 amends P-97 and C4.9). Pure, no I/O.
// A background answer is the client's, but staff may record one taken by phone or in person. It is marked "Officer"
// with who and when (its channel and source), it never counts as confirmed, and the officer's "Confirm section" does
// not confirm it: before signing, the client sees and re-confirms each one (or changes it, which makes it their own).
// Declarations stay client-only (P-97, P-130; refused in api/src/runtime.ts). A blank is never defaulted: nothing here
// makes an answer; an unconfirmed answer is never written on a form (P-72, engine/runtime/forms.ts).
//
// Which facts are background answers comes from data, never from a list of keys here (P-319):
//   1. a placement in a section the library marks client-only (P-97: background and declarations, `client_only`);
//   2. a fact the release maps to a form field inside the form's own "BACKGROUND INFORMATION" block, by the form's own
//      reading (IRCC-F08: IMM 5257 page 3 "Background Information All questions in this section must be answered…",
//      compliance-trace.md; the same reading C3.8 uses), from the heading to the consent and signature block.
import type { Snapshot } from "../snapshot.ts";
import type { ReadField } from "../form-completeness.ts";

/** The channel of a client's re-confirmation of an answer an officer recorded (its source names the officer's answer). */
export const CLIENT_RECONFIRM = "client_reconfirm";
/** The channel of an answer staff saved on the Agent view. */
export const OFFICER_ENTRY = "agent_view";

/** Every form field inside the form's own Background information block (questions, their details boxes), by data path,
 *  in the reading's order: from the "BACKGROUND INFORMATION" heading to the consent and signature block. A form with no
 *  such heading has none. Wider than C3.8's `backgroundQuestions` (yes/no questions only): a details box is a background
 *  answer too. */
export function backgroundBlock(fields: readonly ReadField[]): Set<string> {
  const out = new Set<string>();
  const start = fields.findIndex((f) => (f.heading ?? "").trim().toUpperCase() === "BACKGROUND INFORMATION");
  if (start < 0) return out;
  for (const f of fields.slice(start)) {
    if (/^(Consent|Signature|ButtonsFooter)/.test((f.section ?? "").split(".")[1] ?? "")) break; // the declaration starts
    if (f.data_path) out.add(f.data_path);
  }
  return out;
}

type MapEntry = { fact?: string | null; data_path?: string | null; outcome?: string | null };
type FieldMap = { inventory_file?: string | null; entries?: MapEntry[] };
type Placement = { fact: string; client_only?: boolean };
type FieldDef = { id: string; value_type?: string };

/** The facts of a release that are background answers (see the header), never a declaration. `blockOf` reads one form
 *  edition's Background block from its reading (null when the reading cannot be read: that form adds nothing). */
export function backgroundFacts(s: Snapshot, blockOf: (inventoryFile: string) => Set<string> | null): Set<string> {
  const declaration = new Set((s.canonical_fields as FieldDef[]).filter((f) => f.value_type === "declaration").map((f) => f.id));
  const out = new Set((s.placements as Placement[]).filter((p) => p.client_only).map((p) => p.fact));
  for (const m of (s.field_maps ?? []) as FieldMap[]) {
    const block = m.inventory_file ? blockOf(m.inventory_file) : null;
    if (!block?.size) continue;
    for (const e of m.entries ?? []) if (e.fact && e.data_path && block.has(e.data_path)) out.add(e.fact);
  }
  for (const d of declaration) out.delete(d);
  return out;
}

/** The parts of a stored answer this rule reads. */
type Stored = { field: string; channel: string; origin?: { channel: string } | null };

/** True when this current answer is a background answer an officer recorded that the client has not re-confirmed yet:
 *  saved on the Agent view, or the officer's "Confirm section" of such an answer (an answer confirmed that way before
 *  P-244 was built still waits for the client). The client's re-confirmation, or their own answer, ends it. */
export function awaitsClient(a: Stored, background: ReadonlySet<string>): boolean {
  if (!background.has(a.field)) return false;
  return a.channel === OFFICER_ENTRY || (a.channel === "confirm_section" && a.origin?.channel === OFFICER_ENTRY);
}
