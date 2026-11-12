// QA-415 (P-486, P-489; C7.1, C6.2): each person's kind of application is worked out from that person's own filing,
// never asked. Pure checks, each rule a pass and a fail: the data (samples/application-kinds.json) and the engine
// (engine/runtime/application-kind.ts) on made-up combinations ("x.any", "x.other": no pathway is named), the case's
// known facts (knownOf), the questionnaire (never asked, in either view) and the field's scope (one person's fact), and
// the forms' own tick steps on the worked-out words (p5/transforms.ts). No database, no server, no model call (US$0).
//   tsx studio/tests/check_qa415_application_kind.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { factKey } from "../contracts/resolver.ts";
import { runTransform, wordsInSteps } from "../../p5/transforms.ts";
import { APPLICATION_TYPE, APPLICATION_TYPE_SOURCE, applicationKindsOf, KIND_TABLE, NotWorkedOut, type KindTable } from "../engine/runtime/application-kind.ts";
import { formValues } from "../engine/form-values.ts";
import { knownOf, type Participant } from "../engine/runtime/case.ts";
import { FEE_TABLE, type FeeTable } from "../engine/runtime/filings.ts";
import { scopeRefusal } from "../engine/field-scope.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..");

// (1) The data: every word is IMM 5645's or IMM 5476's own, each source quoted with its page and date (P-170).
const raw = JSON.parse(readFileSync(join(STUDIO, "samples", "application-kinds.json"), "utf8")) as KindTable & { sources: { page: string; quote: string }[]; status: string };
const FORM_WORDS = ["Visitor", "Worker", "Student", "Permanent residence"];
const words = [...Object.values(raw.filings), ...Object.values(raw.combinations)];
ok("QA-415 pass: the table's words are the forms' own (IMM 5645: Visitor, Worker, Student; IMM 5476: permanent residence)", words.length > 0 && words.every((w) => FORM_WORDS.includes(w)), words);
ok("QA-415 pass: each source names its page with a date and quotes IRCC's words; the whole is labelled Sample until the expert confirms",
  raw.sources.length >= 3 && raw.sources.every((x) => /\d{4}/.test(x.page) && x.quote.length > 20) && /Sample, Unconfirmed: expert/.test(raw.status));
ok("QA-415 pass: IMM 5645's own words are quoted, and its instructions say each applying person completes their own", raw.sources.some((x) => x.quote === "Type of application: Visitor Worker Student Other") && raw.sources.some((x) => /completed by each person, 18 years of age or older, applying for a Temporary Resident Visa, a study or work permit/.test(x.quote)));
ok("QA-415 pass: every combination whose release maps the fact has its word (each combination with forms that ask it)", ["vv.single", "sp.outside", "wp.lmia_inside", "fs.spouse", "pnp.express_entry"].every((k) => typeof raw.combinations[k] === "string"));
// Every filing a role or a line names in the shipped data has its word, so a family member's filing is never left without one.
const roleFilings = Object.values((FEE_TABLE.combinations ?? {}) as Record<string, { fees_by_role?: Record<string, { filing?: string }> }>).flatMap((c) => Object.values(c.fees_by_role ?? {}).flatMap((r) => (r.filing ? [r.filing] : [])));
const lineFilings = Object.values(JSON.parse(readFileSync(join(STUDIO, "samples", "conditional-filings.json"), "utf8")) as Record<string, { addsFiling?: { filing?: string } }>).flatMap((x) => (x?.addsFiling?.filing ? [x.addsFiling.filing] : []));
ok("QA-415 pass: every filing a role (fee table) or a line (conditional filings) names has its word", [...roleFilings, ...lineFilings].length > 0 && [...roleFilings, ...lineFilings].every((f) => typeof raw.filings[f] === "string"), { roleFilings, lineFilings });

// (2) The engine on made-up combinations.
const src = { page: "Made-up fee page", quote: "made up", read: "2026-11-12" };
const FEES = { as_of: "2026-11-12", read: "2026-11-12", status: "Sample", lines: [
  { key: "main", label: "Main fee", status: "Sample", basis: "per_application", per_person_cad: 150, source: src },
  { key: "other", label: "Other document fee", status: "Sample", basis: "per_application", per_person_cad: 155, source: src },
  { key: "visit", label: "Visit fee", status: "Sample", basis: "per_application", per_person_cad: 100, source: src },
], combinations: {
  "x.any": { label: "Any combination", lines: ["main", "other", "visit"], modes: { principal: "files_own", spouse_or_partner: "files_own", child: "files_own" },
    fees_by_role: { principal: { lines: ["main"] }, spouse_or_partner: { filing: "Other document", lines: ["other"] }, child: { filing: "Visit document", lines: ["visit"] } } },
} } as unknown as FeeTable;
const TABLE: KindTable = { filings: { "Other document": "Worker", "Visit document": "Visitor", "Main document": "Student" }, combinations: { "x.any": "Student", "x.other": "Visitor" } };
const RULE = { op: "eq", field: "person.studies_long", value: true, subjectKind: "PERSON" };
const ADDS = { filing: "Main document", condition: RULE, conditionPlain: "the child studies for a long time", sourceQuote: "Made-up words (not an IRCC value)." };
const line = (role: string, extra: Record<string, unknown> = {}) => ({ role, min: role === "principal" ? 1 : 0, max: role === "principal" ? 1 : 3, applies: role !== "representative", ...extra });
const snap = (key: string, participants: unknown[]) => ({ combination: { key, label: "Release label", participants }, derived_fields: [], canonical_fields: [], placements: [] }) as unknown as Snapshot;
const p = (id: string, role: string, applies = true): Participant => ({ subjectId: id, role, label: `Sample ${id}`, applies } as Participant);
const CASE = { subjectId: "K", role: "case", label: "Case", applies: true } as Participant;
/** Review M1 (#1620): the reason a person's kind is not worked out, when it is not (a NotWorkedOut), else null. */
const notOut = (v: unknown) => (v instanceof NotWorkedOut ? v.why : null);
const FAMILY = [CASE, p("P", "principal"), p("S", "spouse_or_partner"), p("C1", "child"), p("C2", "child")];
const studies = (ids: Record<string, boolean>) => new Map<string, unknown>(Object.entries(ids).map(([id, v]) => [factKey(id, "person.studies_long"), { value: v, status: "confirmed" }]));
const FAMILY_LINES = [line("principal", { filingMode: "files_own" }), line("spouse_or_partner", { filingMode: "files_own" }), line("child", { filingMode: "files_own", addsFiling: ADDS })];
{
  const k = applicationKindsOf(snap("x.any", FAMILY_LINES), studies({ C1: true, C2: false }) as never, FAMILY, TABLE, FEES);
  ok("QA-415 pass: the principal's own filing is the combination's: its word (Student)", k.get("P") === "Student", [...k]);
  ok("QA-415 pass: the spouse's filing is the one their role makes (fees by role): Worker, never the principal's Student", k.get("S") === "Worker", [...k]);
  ok("QA-415 pass: a child whose line adds a filing (rule holds) has that filing's word (Student)", k.get("C1") === "Student", [...k]);
  ok("QA-415 pass: a child whose rule does not hold has their role's filing (Visitor)", k.get("C2") === "Visitor", [...k]);
  ok("QA-415 fail: the case itself has no kind (only people applying)", !k.has("K"));
  const waiting = applicationKindsOf(snap("x.any", FAMILY_LINES), studies({ C2: false }) as never, FAMILY, TABLE, FEES);
  ok("QA-415 fail (review M1): a child whose rule is not answered yet gets no word: by hand, naming the question it waits for (never a guess)", /waits for an answer: whether the child studies for a long time/.test(notOut(waiting.get("C1")) ?? "") && waiting.get("C2") === "Visitor" && waiting.get("S") === "Worker", [...waiting]);
}
{
  // A person on the principal's application has its kind; a person not applying or declared only has none.
  const people = [CASE, p("P", "principal"), p("C1", "child"), p("C2", "child", false), p("S", "spouse_or_partner", false)];
  const k = applicationKindsOf(snap("x.other", [line("principal", { filingMode: "files_own" }), line("child", { filingMode: "on_principal" }), line("spouse_or_partner", { filingMode: "declared_only", applies: false })]), new Map() as never, people, TABLE, FEES);
  ok("QA-415 pass: a child on the principal's application has its kind (Visitor, the combination's own word)", k.get("P") === "Visitor" && k.get("C1") === "Visitor", [...k]);
  ok("QA-415 fail: a person not travelling or declared only (not applying) has no kind", !k.has("C2") && !k.has("S"), [...k]);
}
{
  // Review M2 (#1620): a child on the principal's application whose own rule waits gets no kind (never the principal's).
  const people = [CASE, p("P", "principal"), p("C1", "child"), p("C2", "child")];
  const lines = [line("principal", { filingMode: "files_own" }), line("child", { filingMode: "on_principal", addsFiling: ADDS })];
  const k = applicationKindsOf(snap("x.other", lines), studies({ C2: false }) as never, people, TABLE, FEES);
  ok("QA-415 fail (review M2): a child on the principal's application whose own rule is not answered never gets the principal's kind: by hand, naming the question", k.get("P") === "Visitor" && /Sample C1's application waits for an answer: whether the child studies for a long time/.test(notOut(k.get("C1")) ?? "") && k.get("C2") === "Visitor", [...k]);
  const yes = applicationKindsOf(snap("x.other", lines), studies({ C1: true, C2: false }) as never, people, TABLE, FEES);
  ok("QA-415 pass (review M2): answered Yes, that child files the added filing and has its word (Student); answered No, the principal's (Visitor)", yes.get("C1") === "Student" && yes.get("C2") === "Visitor" && yes.get("P") === "Visitor", [...yes]);
}
{
  // A co-filed application (a sponsor's own undertaking) has no kind; the principal's is the combination's.
  const people = [CASE, p("P", "principal"), p("Z", "sponsor")];
  const k = applicationKindsOf(snap("x.other", [line("principal", { filingMode: "files_own" }), line("sponsor", { filingMode: "co_files", applies: false })]), new Map() as never, people, TABLE, FEES);
  ok("QA-415 fail: the sponsor's co-filed application gets no kind; the principal's does", k.get("P") === "Visitor" && !k.has("Z"), [...k]);
}
{
  // Not in the table, or a broken entry: no value (the form field goes by hand with its reason), never another word.
  const k = applicationKindsOf(snap("x.unknown", [line("principal", { filingMode: "files_own" })]), new Map() as never, [CASE, p("P", "principal")], TABLE, FEES);
  ok("QA-415 fail (review M1): a combination the table does not name gives no word: by hand, saying the product has none for it", k.size === 1 && /has no kind of application for this combination's application yet: write it by hand/.test(notOut(k.get("P")) ?? ""), [...k]);
  const broken = { filings: { "Other document": 7, "Visit document": " " }, combinations: { "x.any": "Student" } } as unknown as KindTable;
  const b = applicationKindsOf(snap("x.any", FAMILY_LINES), studies({ C1: false, C2: false }) as never, FAMILY, broken, FEES);
  ok("QA-415 fail (review M1): a filing whose word is not words (a number, blank) goes by hand, naming the filing; the others keep theirs", b.get("P") === "Student" && /"Other document" application/.test(notOut(b.get("S")) ?? "") && /"Visit document" application/.test(notOut(b.get("C1")) ?? "") && /"Visit document"/.test(notOut(b.get("C2")) ?? ""), [...b]);
  const typo = applicationKindsOf(snap("x.any", FAMILY_LINES), studies({ C1: true, C2: false }) as never, FAMILY, { ...TABLE, filings: { ...TABLE.filings, "Main document": undefined as never, "main document": "Student" } }, FEES);
  ok("QA-415 fail (review M1): an added filing's name is matched exactly; a name the table spells otherwise goes by hand, never a near word", /"Main document" application/.test(notOut(typo.get("C1")) ?? ""), [...typo]);
  const proto = { filings: {}, combinations: JSON.parse('{"__proto__": "Visitor"}') } as KindTable;
  const own = applicationKindsOf(snap("constructor", [line("principal", { filingMode: "files_own" })]), new Map() as never, [CASE, p("P", "principal")], proto, FEES);
  ok("QA-415 fail: only the table's own entries are read (\"constructor\", \"__proto__\" are no combination): by hand, never an inherited word", notOut(own.get("P")) !== null, [...own]);
  const none = applicationKindsOf(snap("x.other", [line("principal")]), new Map() as never, [CASE, p("P", "principal"), p("Q", "child", false)], TABLE, FEES);
  ok("QA-415 fail (review M1): no release modes and no fee row: nothing is filed, so the person applying goes by hand (one not travelling gets nothing)", /works out no filing for anyone yet/.test(notOut(none.get("P")) ?? "") && !none.has("Q") && !none.has("K"), [...none]);
}
ok("QA-415 pass: the shipped table is the data file", JSON.stringify(KIND_TABLE.filings) === JSON.stringify(raw.filings) && JSON.stringify(KIND_TABLE.combinations) === JSON.stringify(raw.combinations));

// (3) The case's facts: knownOf writes each person's word as confirmed, from the filing, never from an answer.
{
  const s = snap("vv.single", [line("principal", { filingMode: "files_own" }), line("spouse_or_partner", { filingMode: "files_own" }), line("child", { filingMode: "files_own" })]);
  const people = [CASE, p("P", "principal"), p("S", "spouse_or_partner"), p("C1", "child")];
  const answer = { id: "a1", subjectId: "K", field: "case.application_type", value: "student", channel: "agent", actor: "user-O", rowKey: null, confirmedAt: new Date(), confirmedBy: "user-O" };
  const { known } = knownOf(s, people, [answer] as never, [], new Date());
  const v = (id: string) => known.get(factKey(id, APPLICATION_TYPE)) as { value: unknown; status: string; source: string } | undefined;
  ok("QA-415 pass: on Visitor visa every person applying has Visitor, confirmed, worked out from their filing", ["P", "S", "C1"].every((id) => v(id)?.value === "Visitor" && v(id)?.status === "confirmed" && v(id)?.source === APPLICATION_TYPE_SOURCE), ["P", "S", "C1"].map(v));
  ok("QA-415 fail: an old case-level answer (\"student\") is never read for a person", ["P", "S", "C1"].every((id) => v(id)?.value !== "student"));
}

// (4) The field is one person's fact: a published field that tries to be the case's is refused (QA-400's guard).
{
  const facts = (key: string) => ({ key, published: false, placements: [], representativeBox: false });
  const r = scopeRefusal(facts(APPLICATION_TYPE), "household");
  ok("QA-415 fail: the field cannot become the household's (one answer for everyone): refused as one person's fact (QA-400's guard)", r?.status === 422, r);
  ok("QA-415 pass: a field not on the list may still be the household's (the guard names only the person's own facts)", scopeRefusal(facts("person.any_other_fact"), "household") === null);
}

// (5) The forms' own steps on the worked-out words: IMM 5645's ticks and IMM 5476's text (the maps read the person's fact).
{
  const box = { ui: "checkButton" };
  const IS = (w: string) => `derived:checked_if_application_type_is_${w}:1/0`, OTHER = "derived:checked_if_application_type_not_visitor_worker_or_student:1/0";
  const W = [IS("visitor"), IS("worker"), IS("student"), OTHER].flatMap((t) => wordsInSteps(t, APPLICATION_TYPE));
  const tick = (t: string, v: string) => { const o = runTransform(t, v, box, { ownFact: APPLICATION_TYPE, words: W } as never); return "value" in o ? o.value : "by hand"; };
  ok("QA-415 pass: Worker ticks only IMM 5645's Worker box; Student only Student; Visitor only Visitor", tick(IS("worker"), "Worker") === "1" && tick(IS("student"), "Worker") === "0" && tick(IS("visitor"), "Worker") === "0" && tick(OTHER, "Worker") === "0"
    && tick(IS("student"), "Student") === "1" && tick(IS("worker"), "Student") === "0" && tick(IS("visitor"), "Visitor") === "1" && tick(OTHER, "Visitor") === "0");
  ok("QA-415 fail: \"Permanent residence\" (two words) never ticks a box of IMM 5645: by hand, with its reason", [IS("visitor"), IS("worker"), IS("student"), OTHER].every((t) => tick(t, "Permanent residence") === "by hand"));
  const text = runTransform("as_is (plain-language application type text)", "Worker", {}, { ownFact: APPLICATION_TYPE });
  ok("QA-415 pass: IMM 5476's type of application writes the person's word as it is (Worker)", "value" in text && text.value === "Worker", text);
}

// (6) The filler (engine/form-values.ts): a box whose value is not worked out goes by hand with the reason, never blank.
{
  const snapF = { canonical_fields: [{ id: APPLICATION_TYPE, value_type: "text" }] } as never;
  const map = { entries: [{ data_path: "F[0].application[0]", fact: APPLICATION_TYPE, transform: "as_is (plain-language application type text)" }] };
  const inv = { fields: [{ data_path: "F[0].application[0]" }] };
  const row = (value: unknown) => ({ box: "F[0].application[0]", caption: "Type of application", fact: APPLICATION_TYPE, meaning: null, about: "P", about_label: "Sample P", row: null, coverage: "confirmed fact" as const, detail: "", value, transform: map.entries[0].transform });
  const out = formValues(snapF, map, inv, [row(new NotWorkedOut("Sample P's application waits for an answer."))]);
  ok("QA-415 fail (review M1): a box whose kind is not worked out is by hand with its reason, and nothing is written", out.boxes[0].result === "by hand" && out.boxes[0].why === "Sample P's application waits for an answer." && !out.values["F[0].application[0]"], out.boxes[0]);
  // A copy freezes its rows as JSON before it is filled (api/src/fill-case.ts): the reason must survive that, as text.
  const frozen = JSON.parse(JSON.stringify([{ ...row(null), by_hand: "Sample P's application waits for an answer." }]));
  const thawed = formValues(snapF, map, inv, frozen);
  ok("QA-415 fail (review M1, on a frozen copy): the row's reason survives JSON and the box is by hand with it", thawed.boxes[0].result === "by hand" && thawed.boxes[0].why === "Sample P's application waits for an answer.", thawed.boxes[0]);
  const ok2 = formValues(snapF, map, inv, [row("Worker")]);
  ok("QA-415 pass: a worked-out word is written as it is", ok2.boxes[0].result === "written" && ok2.values["F[0].application[0]"] === "Worker", ok2.boxes[0]);
  ok("QA-415 pass (review M1): not worked out is no value when stored or compared (null in JSON, empty as text)", JSON.stringify({ v: new NotWorkedOut("x") }) === '{"v":null}' && String(new NotWorkedOut("x")) === "");
}

process.exit(summary() ? 1 : 0);
