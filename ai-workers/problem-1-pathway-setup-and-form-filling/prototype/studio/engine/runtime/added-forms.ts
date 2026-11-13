// C7.8 Add a library form to one filing (screens lane, B141; SA-1B-177 FilingFormAddition, SA-1B-102 rule 5; P-406).
// Pure: no database, no clock. Three things, each in one place so another answer to the founder's questions is a small
// change here (P-390, reversible):
//   * kindOf (F1): "Fills from the case" only with PUBLISHED map rows AND a passed fill trial for that edition and map;
//     otherwise "Blank official PDF", with the reason (P-65 (a), SA-1B-177 r2).
//   * refusalOf (BR-2, F3): what cannot be added, in words: a form the case's release holds for this person (whether or not
//     it applies now: the release's rule stays the one truth), one already added for this person, a guide or checklist,
//     and a blank barcode form (it could never clear Validate, M5).
//   * withAdditions (M1): the one join point. The release snapshot plus one form line per addition, keyed to that person
//     on that filing ("person:<id>", engine/resolver.ts ONE_PERSON, never a role), with its frozen field map (fills only)
//     and the definitions of the facts that map reads. Every reader of the case's snapshot (fill, prepare, readiness,
//     signing, out-of-date) sees the added form through it, so nothing added by hand escapes a check (C7.6, C8.1, C9.2).
//     The release's own fingerprint is never recomputed from it (Runtime.releaseSnapshotOf).
// F2 (a blank added form with no completed copy is a CRITICAL line on Ready to file) is engine/runtime/readiness.ts's
// `hand_filled_copy`, its own code, for added blank forms only.
import { createHash } from "node:crypto";
import type { Snapshot } from "../snapshot.ts";
import { onePerson } from "../resolver.ts";

export type AddedKind = "fills" | "blank";
export const KIND_WORDS: Record<AddedKind, string> = { fills: "Fills from the case", blank: "Blank official PDF" };
export const ADDED_TAG = "Added by the case officer";
/** A date as people read it ("9 Nov 2026"), never ISO (review M3 on #1248). */
export const dayWords = (at: string) => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** One map row as the snapshot carries it (engine/snapshot.ts field_maps[].entries). */
export type FrozenEntry = { data_path: string; outcome: string; fact?: string | null; person?: string | null; row?: number | null; [k: string]: unknown };
/** What is frozen when a form is added (BR-4): the edition, its official file, its published map rows (fills only), and
 *  the definitions of the facts those rows read (so a value is checked by its own type and a box with no fact on file is
 *  named "Not on file", never "not in the library"). */
export type Frozen = {
  title: string; edition: string; official_file: string | null; form_sha256: string | null; inventory_file: string | null;
  entries: FrozenEntry[]; fields: { id: string; [k: string]: unknown }[];
};
/** A live addition as the case reads it (a removed one is never joined). */
export type Addition = {
  id: string; filing: string; subject: string; form: string; kind: AddedKind; frozen: Frozen;
  channel: "PDF_UPLOAD" | "PAPER"; signature: "HAND_SCANNED" | "PEN" | "NONE"; signed_by: string | null;
  added_by: string; added_at: string; reason: string | null;
};

/** The same JSON text whatever order an object's keys come back in (PostgreSQL's jsonb stores them sorted). */
export const stableJson = (v: unknown): string => Array.isArray(v) ? `[${v.map(stableJson).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v as object).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`).join(",")}}` : JSON.stringify(v ?? null);
/** The fingerprint of what is frozen (stored with it; a changed row is never read as the frozen form). */
export const frozenHash = (f: Frozen) => createHash("sha256").update(stableJson(f)).digest("hex");

/** F1 (one place): the kind of a library form for this edition. */
export function kindOf(x: { publishedRows: number; trialPassed: boolean; trialWhy: string | null }): { kind: AddedKind; why: string | null } {
  if (x.publishedRows > 0 && x.trialPassed) return { kind: "fills", why: null };
  if (x.publishedRows === 0) return { kind: "blank", why: "It has no published field map, so nothing on it can be filled from the case." };
  // The trial register's own words speak of a copy "for checking only"; a blank form has no copy, so only the reason is said.
  void x.trialWhy;
  return { kind: "blank", why: "Its filling is not proven yet for this edition: no fill trial has passed for it." };
}

export type Refusal = { status: 409 | 422; code: "on_release" | "already_added" | "barcode_blank" | "not_a_form" | "no_edition"; words: string };
/** BR-2 and F3 (one place): why this form cannot be added for this person, or null. `releaseLine` is the release's own
 *  line for the form when it holds one for this person, with its condition in words and the answer now. */
export function refusalOf(x: {
  form: string; formKind: string | null; hasEdition: boolean; kind: AddedKind; barcode: boolean;
  releaseLine: { condition: string | null; now: string | null } | null; heldByRelease: boolean;
  addedBy: { by: string; at: string } | null;
}): Refusal | null {
  if (x.formKind === "guide" || x.formKind === "document" || x.formKind === "checklist") return { status: 422, code: "not_a_form", words: `${x.form} is a guide or checklist, not a form: it is never added to a filing.` };
  if (!x.hasEdition) return { status: 422, code: "no_edition", words: `${x.form} has no current edition in the firm's library: add one in Library › Forms first.` };
  if (x.heldByRelease) return { status: 409, code: "on_release", words: x.releaseLine?.condition && x.releaseLine.condition !== "always"
    ? `${x.form} is part of this application's forms: it applies when ${x.releaseLine.condition.replace(/[.\s]+$/, "")}${x.releaseLine.now ? ` (now: ${x.releaseLine.now})` : ""}, so it is not added by hand.`
    : x.releaseLine && x.releaseLine.condition !== "always"
      ? `${x.form} is part of this application's forms: an answer decides whether it applies${x.releaseLine.now ? ` (now: ${x.releaseLine.now})` : ""}, so it is not added by hand.`
      : `${x.form} is part of this application's forms${x.releaseLine?.now ? ` (for this person: ${x.releaseLine.now})` : ""}, so it is not added by hand.` };
  if (x.addedBy) return { status: 409, code: "already_added", words: `${x.form} is already added to this filing for this person by ${x.addedBy.by} on ${dayWords(x.addedBy.at)}.` };
  if (x.kind === "blank" && x.barcode) return { status: 422, code: "barcode_blank", words: `${x.form} makes a barcode page: only a copy the product fills can be validated, and its filling is not proven yet, so it cannot be added as a blank form.` };
  return null;
}

/** M1: the one join point. The release snapshot plus each live addition's form line (for that person only) and, for a
 *  form that fills, its frozen field map and fact definitions. With no additions the release snapshot itself. */
export function withAdditions<S extends Pick<Snapshot, "forms" | "field_maps" | "canonical_fields">>(s: S, additionsIn: Addition[]): S {
  // F3 (the release's rule stays the one truth): once the case's release holds the form itself (after a move to a release
  // that adds it), the release's line is the form and the addition is not joined (it stays stored, BR-8).
  const held = new Set([...(s.forms as { form_number: string }[]), ...(s.field_maps as { form_number: string }[])].map((f) => f.form_number));
  const additions = additionsIn.filter((a) => !held.has(a.form));
  if (!additions.length) return s;
  // One line per form on the case: a form added for several people is one line whose "who" names each of them (the
  // second addition copies the first's frozen form, channel and signature, form-additions.ts), so a lookup by form number
  // never mixes two lines.
  const byForm = new Map<string, Addition[]>();
  for (const a of [...additions].sort((x, y) => x.added_at.localeCompare(y.added_at) || x.id.localeCompare(y.id))) byForm.set(a.form, [...(byForm.get(a.form) ?? []), a]);
  const lines = [...byForm.values()].map((as) => {
    const a = as[0];
    return {
      form_number: a.form, title: a.frozen.title, form_kind: "data_form", who: as.map((x) => onePerson(x.subject)).join(","), status: "always", condition: null,
      condition_plain: `${ADDED_TAG}: not part of the combination`,
      ...(a.channel !== "PDF_UPLOAD" ? { channel: a.channel } : {}), ...(a.signature !== "NONE" ? { signature: a.signature } : {}),
      signed_by: a.signature === "NONE" ? "none" : a.signed_by ?? "parent_for_minor",
      added: as.map((x) => ({ id: x.id, subject: x.subject, filing: x.filing, kind: x.kind, by: x.added_by, at: x.added_at, reason: x.reason, edition: x.frozen.edition, official_file: x.frozen.official_file, form_sha256: x.frozen.form_sha256 })),
    };
  });
  const maps = [...byForm.values()].map((as) => as[0]).filter((a) => a.kind === "fills" && a.frozen.entries.length).map((a) => ({
    form_number: a.form, form_edition: a.frozen.edition, official_file: a.frozen.official_file, form_sha256: a.frozen.form_sha256, inventory_file: a.frozen.inventory_file, entries: a.frozen.entries, added: true,
  }));
  const have = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id));
  const fields = new Map<string, { id: string }>();
  for (const a of byForm.values()) for (const f of a[0].kind === "fills" ? a[0].frozen.fields : []) if (!have.has(f.id) && !fields.has(f.id)) fields.set(f.id, f);
  return { ...s, forms: [...s.forms, ...lines], field_maps: [...s.field_maps, ...maps], canonical_fields: [...s.canonical_fields, ...fields.values()] };
}

/** The added-form record of a line for one person (null: a release line, or not added for that person). */
export type AddedRecord = { id: string; subject: string; filing: string; kind: AddedKind; by: string; at: string; reason: string | null; edition: string; official_file: string | null; form_sha256: string | null };
export const addedFor = (line: { added?: AddedRecord[] } | undefined, subject: string): AddedRecord | null => line?.added?.find((x) => x.subject === subject) ?? null;
/** The added-form record of a form for one person, read from every line of the snapshot (never only the first line with
 *  that number: breaker B1 on #1248). Null: a release form for this person. */
export const addedOn = (s: { forms: unknown[] }, form: string, subject: string): AddedRecord | null => {
  for (const l of s.forms as { form_number: string; added?: AddedRecord[] }[]) if (l.form_number === form) { const a = addedFor(l, subject); if (a) return a; }
  return null;
};
/** Breaker M2: a completed copy counts for an addition only if it was uploaded after that addition was made (a form
 *  removed and added again starts with no completed copy, whatever its item held before). */
export const completedSince = <T extends { uploadedAt: Date }>(scans: T[], added: { at: string }): T | null =>
  scans.filter((x) => x.uploadedAt.getTime() >= Date.parse(added.at)).sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0] ?? null;

/** A stored filing_form_addition row (prisma/schema/filings.prisma FilingFormAddition) as the case reads it; a row whose frozen form
 *  does not match its fingerprint is never joined (it was changed underneath; the trigger refuses that, this is the
 *  second guard), nor is a removed one. */
export type AdditionRow = { id: string; filingId: string; subjectId: string; formKey: string; kind: string; frozen: unknown; frozenSha256: string; channel: string; signature: string; signedBy: string | null; addedBy: string; addedAt: Date; reason: string | null; removedAt: Date | null };
/** C6.17 (review of #1262 M3, m1): the additions a copy of one stage's release joins: those on filings of the stage whose
 *  combination the release is of (a case reads one stage per combination; a copy has no stage column of its own). A copy
 *  queued on a stage that ended before it ran still joins that stage's additions, never the next stage's. */
export const additionsOfStage = <R extends { filing: { stage: { combinationId: string } } }>(rows: R[], combinationId: string): R[] =>
  rows.filter((r) => r.filing.stage.combinationId === combinationId);
export function additionsOf(rows: AdditionRow[]): Addition[] {
  return rows.filter((r) => !r.removedAt && (r.kind === "fills" || r.kind === "blank") && frozenHash(r.frozen as Frozen) === r.frozenSha256).map((r) => ({
    id: r.id, filing: r.filingId, subject: r.subjectId, form: r.formKey, kind: r.kind as AddedKind, frozen: r.frozen as Frozen,
    channel: r.channel === "PAPER" ? "PAPER" : "PDF_UPLOAD", signature: r.signature === "NONE" ? "NONE" : r.signature === "PEN" ? "PEN" : "HAND_SCANNED", signed_by: r.signedBy,
    added_by: r.addedBy, added_at: r.addedAt.toISOString(), reason: r.reason,
  }));
}
