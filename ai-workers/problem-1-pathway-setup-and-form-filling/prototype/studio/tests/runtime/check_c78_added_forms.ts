// C7.8 (B141) unit checks of engine/runtime/added-forms.ts and its readiness line, pure (no database, no server, US$0):
// withAdditions gives one line per added form, for that person only (never a role), with its frozen map; the release's
// fingerprint is untouched; kindOf (F1), refusalOf (BR-2, F3) and the hand_filled_copy line (F2) say what the concept says.
//   tsx studio/tests/runtime/check_c78_added_forms.ts
import { additionsOf, additionsOfStage, frozenHash, kindOf, refusalOf, stableJson, withAdditions, type Addition, type Frozen } from "../../engine/runtime/added-forms.ts";
import { subjectsFor } from "../../engine/resolver.ts";
import { filingReadiness, type FormItem } from "../../engine/runtime/readiness.ts";
import { snapshotHash, type Snapshot } from "../../engine/snapshot.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const base = { contract_version: "combination-config/v0", combination: { key: "x.sample", label: "Sample", program: "Sample", pathway: null, participants: [], source_basis: "Sample", basis_note: null }, mode: "published",
  canonical_fields: [{ id: "person.family_name", meaning: "Family name" }], sections: [], placements: [], forms: [{ form_number: "IMM 1111", who: "each_applicant", status: "always" }], field_maps: [], document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [], row_versions: {} } as unknown as Snapshot;
const frozen: Frozen = { title: "Sample form", edition: "IMM 9999 (01-2026)", official_file: "imm9999e.pdf", form_sha256: "a".repeat(64), inventory_file: null,
  entries: [{ data_path: "f[0].Name[0]", outcome: "mapped", fact: "person.family_name", person: "form_subject" }, { data_path: "f[0].Eye[0]", outcome: "mapped", fact: "person.eye_colour", person: "form_subject" }],
  fields: [{ id: "person.family_name", meaning: "Family name (library)" }, { id: "person.eye_colour", meaning: "Eye colour" }] };
const one = (x: Partial<Addition>): Addition => ({ id: "a1", filing: "F1", subject: "P1", form: "IMM 9999", kind: "fills", frozen, channel: "PDF_UPLOAD", signature: "HAND_SCANNED", signed_by: null, added_by: "user-O", added_at: "2026-11-09T10:00:00.000Z", reason: null, ...x });
const people = [{ id: "P1", role: "principal", label: "Client A", applies: true }, { id: "S1", role: "spouse_or_partner", label: "Partner", applies: true }] as never;

const s = withAdditions(base, [one({})]);
const line = (s.forms as { form_number: string; who: string; signature?: string; signed_by?: string }[]).find((l) => l.form_number === "IMM 9999");
ok("C7.8 unit pass: withAdditions adds one line for the added form, for that person only (never a role)", !!line && subjectsFor(people, line.who).join() === "P1" && (s.forms as unknown[]).length === 2);
ok("C7.8 unit pass: a form that fills carries its frozen map; a fact the release lacks gets its definition, one the release has keeps the release's", (s.field_maps as { form_number: string }[]).some((m) => m.form_number === "IMM 9999")
  && (s.canonical_fields as { id: string; meaning: string }[]).find((f) => f.id === "person.family_name")?.meaning === "Family name" && (s.canonical_fields as { id: string }[]).some((f) => f.id === "person.eye_colour"));
ok("C7.8 unit pass: the release snapshot is not changed and its fingerprint holds (withAdditions copies)", snapshotHash(base) === snapshotHash(JSON.parse(JSON.stringify(base))) && (base.forms as unknown[]).length === 1 && withAdditions(base, []) === base);
const b = withAdditions(base, [one({ kind: "blank" })]);
ok("C7.8 unit pass: a blank form adds its line but no field map or fact definitions (nothing is filled)", (b.forms as unknown[]).length === 2 && !(b.field_maps as unknown[]).length && (b.canonical_fields as unknown[]).length === 1);
const two = withAdditions(base, [one({}), one({ id: "a2", subject: "S1", added_at: "2026-11-09T11:00:00.000Z" })]);
const l2 = (two.forms as { form_number: string; who: string }[]).filter((l) => l.form_number === "IMM 9999");
ok("C7.8 unit pass: the same form added for two people is one line naming both (a lookup by form number never mixes two lines)", l2.length === 1 && subjectsFor(people, l2[0].who).sort().join() === "P1,S1");
ok("C7.8 unit pass: a signature switched off is \"none\" signed (no signature waited for); on by default, the person or a parent for a minor", (withAdditions(base, [one({ signature: "NONE" })]).forms as { form_number: string; signed_by?: string; signature?: string }[]).find((l) => l.form_number === "IMM 9999")?.signed_by === "none" && line?.signed_by === "parent_for_minor" && line?.signature === "HAND_SCANNED");

const moved = { ...base, forms: [...base.forms, { form_number: "IMM 9999", who: "each_applicant", status: "conditional" }] } as unknown as Snapshot;
ok("C7.8 unit pass (F3): once the case's release holds the form itself (a move to a release that adds it), the release's line is the form and the addition is not joined", withAdditions(moved, [one({})]) === moved);
ok("C7.8 unit pass (F1): fills only with published rows and a passed trial", kindOf({ publishedRows: 3, trialPassed: true, trialWhy: null }).kind === "fills");
ok("C7.8 unit fail (F1): mapped but no passed trial, or no rows, is a blank official PDF with its reason", kindOf({ publishedRows: 3, trialPassed: false, trialWhy: "x" }).kind === "blank" && /not proven/.test(kindOf({ publishedRows: 3, trialPassed: false, trialWhy: "x" }).why ?? "") && /no published field map/.test(kindOf({ publishedRows: 0, trialPassed: false, trialWhy: null }).why ?? ""));
const base4 = { form: "IMM 9999", formKind: "data_form", hasEdition: true, kind: "fills" as const, barcode: false, releaseLine: null, heldByRelease: false, addedBy: null };
ok("C7.8 unit pass (BR-2): an ordinary library form is addable", refusalOf(base4) === null);
ok("C7.8 unit fail (F3): a release form is refused with the answer that decides it", refusalOf({ ...base4, heldByRelease: true, releaseLine: { condition: "the client uses a representative", now: "it does not apply on the answers given" } })?.words.includes("now: it does not apply") === true);
ok("C7.8 unit fail (BR-2, M5): already added 409; a guide 422; a blank barcode form 422", refusalOf({ ...base4, addedBy: { by: "user-O", at: "2026-11-09" } })?.status === 409 && refusalOf({ ...base4, formKind: "guide" })?.status === 422 && refusalOf({ ...base4, kind: "blank", barcode: true })?.code === "barcode_blank" && refusalOf({ ...base4, barcode: true }) === null);

const row = (x: Record<string, unknown>) => ({ id: "a1", filingId: "F1", subjectId: "P1", formKey: "IMM 9999", kind: "fills", frozen: JSON.parse(stableJson(frozen)), frozenSha256: frozenHash(frozen), channel: "PDF_UPLOAD", signature: "HAND_SCANNED", signedBy: null, addedBy: "user-O", addedAt: new Date(), reason: null, removedAt: null, ...x });
ok("C7.8 unit pass: a stored row is read whatever order its keys come back in (jsonb sorts them)", additionsOf([row({})]).length === 1);
ok("C7.8 unit fail: a removed row, or one whose frozen form no longer matches its fingerprint, is never joined", additionsOf([row({ removedAt: new Date() }), row({ frozen: { ...frozen, title: "changed" } })]).length === 0);
// C6.17 × C7.8 (review of #1262 m1): a copy joins only the additions of its own stage (the stage of its release's combination).
{
  const f2 = { ...frozen, edition: "Sample edition 2" };
  const s1 = { ...row({ id: "s1", filingId: "F1", addedAt: new Date("2026-11-01T00:00:00Z") }), filing: { stage: { combinationId: "C1" } } };
  const s2 = { ...row({ id: "s2", filingId: "F2", frozen: JSON.parse(stableJson(f2)), frozenSha256: frozenHash(f2), addedAt: new Date("2026-11-02T00:00:00Z") }), filing: { stage: { combinationId: "C2" } } };
  const lineOf = (rows: typeof s1[], comb: string) => (withAdditions(base as unknown as Snapshot, additionsOf(additionsOfStage(rows, comb))).forms as { form_number: string; added?: { id: string; edition: string }[] }[]).find((l) => l.form_number === "IMM 9999");
  const two = lineOf([s1, s2], "C2"), one = lineOf([s1, s2], "C1");
  ok("C6.17 × C7.8 unit pass: a copy of the next stage's release joins that stage's addition only (its own frozen edition)", two?.added?.length === 1 && two.added[0].id === "s2" && two.added[0].edition === "Sample edition 2", two?.added);
  ok("C6.17 × C7.8 unit fail: a copy of the ended stage's release (queued before Start next stage) never joins the next stage's addition", one?.added?.length === 1 && one.added[0].id === "s1", one?.added);
  const all = (withAdditions(base as unknown as Snapshot, additionsOf([s1, s2])).forms as { form_number: string; added?: { id: string }[] }[]).find((l) => l.form_number === "IMM 9999");
  ok("C6.17 × C7.8 unit fail: with no filter the next stage's line would be stage 1's addition (the oldest), so the filter is needed", all?.added?.[0].id === "s1", all?.added?.map((x) => x.id));
}

const blankItem: FormItem = { item: "i1", form: "IMM 9999", subject: "P1", person: "Client A", channel: "PDF_UPLOAD", readiness: { ready: false, missing: [{ fact: "x", label: "X", about: "Client A", reason: "not answered" }] } as never, needsValidate: false, validatedCurrent: false, signature: "HAND_SCANNED", signed: false, copy: { state: "none", key: "r" }, blank: { completed: false, key: "a1" } };
const r1 = filingReadiness({ filing: "F1", forms: [blankItem], reviewed: true, today: "2026-11-09" });
ok("C7.8 unit pass (F2): a blank added form with no completed copy is one CRITICAL \"Filled by hand: upload the completed copy\" line, and no fact, copy or signature line", r1.warns.filter((w) => w.item === "i1").map((w) => `${w.code}:${w.severity}`).join() === "hand_filled_copy:critical");
const r2 = filingReadiness({ filing: "F1", forms: [{ ...blankItem, blank: { completed: true, key: "a1" } }], reviewed: true, today: "2026-11-09" });
ok("C7.8 unit pass (F2): uploading the completed copy clears it", !r2.warns.some((w) => w.item === "i1") && r2.ready);
const r3 = filingReadiness({ filing: "F1", forms: [{ ...blankItem, blank: null }], reviewed: true, today: "2026-11-09" });
ok("C7.8 unit fail: a form that is not an added blank never gets the line", !r3.warns.some((w) => w.code === "hand_filled_copy"));
process.exitCode = summary() ? 1 : 0;
