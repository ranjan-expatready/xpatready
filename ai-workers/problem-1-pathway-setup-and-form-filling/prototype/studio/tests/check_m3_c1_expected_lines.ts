// Row C1 of the M3 sprint plan (tech lead's ruling R1 with its correction, 6 Nov): the check of acceptance/lib/m3.ts's
// expectedLines. What a pack expects for each person comes from the release the case is pinned to, as configured, and
// the cited rules; never from the product's own /prepare answer. The expected answer for both data sets is held here
// as constants worked out by hand from the configuration, not from the helper:
//   * the fixture (tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts S2-S4): adults three forms
//     (IMM 5257 a PDF upload with a typed name, IMM 5707 Online, IMM 5476 signed by hand and scanned), a child one;
//   * release 2 of the configured checkpoint (Demo › Load the configured checkpoint): its seven form lines as the
//     configuration dump of 6 Nov reads them (product/screens/M3-plan/packs-2026-11-06.md, "What the checkpoint's Visitor
//     visa holds", on the M3 plan's branch, PR #1167), with what rows A1 (#1084) and A2 (#1072) set on them since (7 Nov):
//     who signs (samples/checkpoint-stage-one.json, "signers": IMM 5257 a parent for a minor, IMM 5476 the person and the
//     representative) and who files IMM 5476 (api/src/form-setup.ts VV_FORM_RULES: the principal, a partner, a child from
//     18); the four answer-only lines' facts from the same VV_FORM_RULES; and what row A3 (#1198) sets inside release 2's
//     draft ("release_two" in the same file): IMM 5645 signed by the person, IMM 5645 and Schedule 1 a typed name.
// Part 1 feeds both configurations to the helper without a server. Part 2 reads each live, on this copy: the fixture
// first, then Demo › Reset and Load the configured checkpoint, each through a case opened by the helper; on the
// checkpoint it also fills the case the packs' way and checks the helper's UCI fix (a UCI the release's own checks
// accept: since B107 nothing is left to confirm, worked out by hand at C1-9). Sample data, live AI off, no model call (US$0). It fails on a main
// without row C1 (no expectedLines).
//   zsh studio/tools/isolated.sh rt_c1 4479 start && tsx studio/tests/check_m3_c1_expected_lines.ts 4479 xr_studio_rt_c1
import { spawnSync } from "node:child_process";
import { request } from "node:http";
import { join } from "node:path";
import * as m3 from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const { AUTHOR, DB, FAMILY, PORT, fillEverything, needVisitorVisa, openCase, prepare, sql } = m3;
// Read through the namespace, so a main without row C1 gives FAIL lines, not a crash at import.
const helper = m3 as unknown as Record<string, unknown>;
type Line = { form: string; channel: string; signature: string; signers: string[]; online: boolean; barcode: boolean; barcodePdf: boolean; family: boolean; handSigned: boolean; waitsOn: string[] | null };
type Exp = Record<string, { forms: Line[]; waiting: Line[] }>;
type Snap = { form_number: string; who: string; status: string; condition?: unknown; channel?: string; signature?: string; min_age?: number; signed_by?: string; form_kind?: string };
const expectedLines = helper.expectedLines as ((r: unknown, p: m3.Person[]) => Exp) | undefined;
const releaseLines = helper.releaseLines as ((f: Snap[]) => unknown[]) | undefined;
const expectedFor = helper.expectedFor as ((caseId: string) => Promise<Exp | null>) | undefined;
ok("C1-0 acceptance/lib/m3.ts exports expectedLines, releaseLines and expectedFor (row C1)", typeof expectedLines === "function" && typeof releaseLines === "function" && typeof expectedFor === "function");

// ---- The two configurations, as configured (the released snapshot's form lines; defaults left out as the snapshot does). ----
const eq = (field: string, value: unknown, subjectKind = "EACH_APPLICANT") => ({ subjectKind, op: "eq", field, value });
/** The fixture, from setup_vv_m3.ts: S2 IMM 5476 each applicant 18 or older, signed by the person and the representative;
 *  S3 IMM 5707 18 or older signed by the person, IMM 5257 a parent signs for a minor; S4 the channels and signatures. */
const FIXTURE_LINES: Snap[] = [
  { form_number: "IMM 5257", who: "each_applicant", status: "always", signature: "TYPED_NAME", signed_by: "parent_for_minor" },
  { form_number: "IMM 5707", who: "each_applicant", status: "always", channel: "ONLINE", signature: "TYPED_NAME", min_age: 18, signed_by: "person" },
  { form_number: "IMM 5476", who: "each_applicant", status: "always", signature: "HAND_SCANNED", min_age: 18, signed_by: "person_and_representative" },
];
/** Release 2 of the checkpoint, from the dump (newest version per lineage; IMM 5707 retired): "IMM 5257 v2 PUBLISHED
 *  who=each_applicant ch=ONLINE sig=NONE", "IMM 5257 SCH1 who=principal_partner_adult_children ch=PDF_UPLOAD minAge=18",
 *  "IMM 5645 who=each_applicant ch=PDF_UPLOAD minAge=18", and IMM 5409, IMM 5475, IMM 5476 (sig=HAND_SCANNED), IRM 0002
 *  attach=ANSWER_CONDITIONAL. Since 7 Nov (A1, A2 merged): IMM 5257 signed "parent_for_minor" and IMM 5476
 *  "person_and_representative" (checkpoint-stage-one.json, VV-R09, VV-R10); IMM 5476 filed by the principal, a partner and
 *  a child from 18 (VV_FORM_RULES, VV-R10). Row A3 (#1198; checkpoint-stage-one.json "release_two"): IMM 5645 signed by
 *  "person", and IMM 5645 and SCH1 signed with a typed name (Sample, FQ-2). SCH1, IMM 5409, IMM 5475, IRM 0002 keep no
 *  signer ("signers_not_set" there). The conditions are VV_FORM_RULES'. */
const RELEASE2_LINES: Snap[] = [
  { form_number: "IMM 5257", who: "each_applicant", status: "always", channel: "ONLINE", signed_by: "parent_for_minor" },
  { form_number: "IMM 5257 SCH1", who: "principal_partner_adult_children", status: "always", signature: "TYPED_NAME", min_age: 18 },
  { form_number: "IMM 5645", who: "each_applicant", status: "always", signature: "TYPED_NAME", min_age: 18, signed_by: "person" },
  { form_number: "IMM 5409", who: "each_applicant", status: "conditional", condition: eq("person.marital_status", "common_law") },
  { form_number: "IMM 5475", who: "each_applicant", status: "conditional", condition: eq("case.authorizes_release_to_designated_individual", true, "CASE") },
  { form_number: "IMM 5476", who: "principal_partner_adult_children", status: "conditional", condition: eq("case.uses_representative", true, "CASE"), signature: "HAND_SCANNED", min_age: 18, signed_by: "person_and_representative" },
  { form_number: "IRM 0002", who: "each_applicant", status: "conditional", condition: eq("person.gender_identifier_differs_from_documents", true) },
];

// ---- The expected answer, worked out by hand (FAMILY: Client A 40, Spouse A 38, Child A1 10, Child A2 15). ----
// One line in words: form, channel/signature, signers, kinds. Compared as sorted lists, so counts are exact.
const L = (form: string, channel: string, signature: string, signers: string, kinds = "", waits = "") => `${form} ${channel}/${signature} by ${signers}${kinds ? ` [${kinds}]` : ""}${waits ? ` waits ${waits}` : ""}`;
const words = (l: Line) => L(l.form, l.channel, l.signature, l.signers.join("+"), [l.online && "online", l.barcode && "barcode", l.barcodePdf && "barcode pdf", l.family && "family", l.handSigned && "hand-signed"].filter(Boolean).join(","), (l.waitsOn ?? []).join(","));
const FIXTURE_ADULT = [L("IMM 5257", "PDF_UPLOAD", "TYPED_NAME", "person", "barcode,barcode pdf"), L("IMM 5707", "ONLINE", "TYPED_NAME", "person", "online,family"), L("IMM 5476", "PDF_UPLOAD", "HAND_SCANNED", "person+representative", "hand-signed")];
const FIXTURE_CHILD = [L("IMM 5257", "PDF_UPLOAD", "TYPED_NAME", "parent", "barcode,barcode pdf")];
// Release 2, by hand: every person waits for IMM 5409, IMM 5475 and IRM 0002 (each applicant, an answer decides); IMM 5476
// waits for the adults only (principal and partner always; the children are 10 and 15, under its 18), signed by the person
// and the representative. Adults fill IMM 5257 (signed by the person, 18 or older), Schedule 1 and IMM 5645 (both from
// 18, both a typed name since row A3; IMM 5645 signed by the person); each child fills IMM 5257 only, signed by a parent
// (under 18).
const R2_WAIT_ALL = [L("IMM 5409", "PDF_UPLOAD", "NONE", "person", "", "person.marital_status"), L("IMM 5475", "PDF_UPLOAD", "NONE", "person", "", "case.authorizes_release_to_designated_individual"),
  L("IRM 0002", "PDF_UPLOAD", "NONE", "person", "", "person.gender_identifier_differs_from_documents")];
const R2_WAIT_ADULT = [...R2_WAIT_ALL, L("IMM 5476", "PDF_UPLOAD", "HAND_SCANNED", "person+representative", "hand-signed", "case.uses_representative")];
const R2_ADULT = [L("IMM 5257", "ONLINE", "NONE", "person", "online,barcode"), L("IMM 5257 SCH1", "PDF_UPLOAD", "TYPED_NAME", "person"), L("IMM 5645", "PDF_UPLOAD", "TYPED_NAME", "person", "family")];
const R2_CHILD = [L("IMM 5257", "ONLINE", "NONE", "parent", "online,barcode")];
const WANT = {
  fixture: { "Sample Client A": [FIXTURE_ADULT, []], "Sample Spouse A": [FIXTURE_ADULT, []], "Sample Child A1": [FIXTURE_CHILD, []], "Sample Child A2": [FIXTURE_CHILD, []] },
  release2: { "Sample Client A": [R2_ADULT, R2_WAIT_ADULT], "Sample Spouse A": [R2_ADULT, R2_WAIT_ADULT], "Sample Child A1": [R2_CHILD, R2_WAIT_ALL], "Sample Child A2": [R2_CHILD, R2_WAIT_ALL] },
} as const;
const sorted = (x: readonly string[]) => [...x].sort();
/** The differences between the helper's answer and the hand-worked one, per person (empty when equal). */
function diff(got: Exp | null | undefined, want: Record<string, readonly (readonly string[])[]>): string[] {
  if (!got) return ["no answer"];
  const out: string[] = [];
  if (sorted(Object.keys(got)).join("|") !== sorted(Object.keys(want)).join("|")) out.push(`people ${Object.keys(got).join(", ")}`);
  for (const [name, [forms, waiting]] of Object.entries(want)) {
    const g = got[name];
    const gf = sorted((g?.forms ?? []).map(words)), gw = sorted((g?.waiting ?? []).map(words));
    if (gf.join("|") !== sorted(forms).join("|")) out.push(`${name} forms: ${gf.join("; ")}`);
    if (gw.join("|") !== sorted(waiting).join("|")) out.push(`${name} waiting: ${gw.join("; ")}`);
  }
  return out;
}
const release = (lines: Snap[]) => ({ combinationId: "", version: 0, sha256: "", portal: null, lines: releaseLines!(lines) });

// ---- Part 1: the configurations above, no server. ----
if (expectedLines && releaseLines) {
  let d = diff(expectedLines(release(FIXTURE_LINES), FAMILY), WANT.fixture);
  ok("C1-1 fixture: adults three forms (IMM 5257 barcode PDF, IMM 5707 Online family form, IMM 5476 hand-signed), each child one (IMM 5257, a parent signs), nothing waits", !d.length, d);
  d = diff(expectedLines(release(RELEASE2_LINES), FAMILY), WANT.release2);
  ok("C1-2 release 2: adults IMM 5257 Online, Schedule 1 and IMM 5645 (family form); children IMM 5257 only, signed by a parent; IMM 5409, IMM 5475, IRM 0002 wait for every person, IMM 5476 (person and representative) for the adults only", !d.length, d);
  const minorPrincipal = expectedLines(release(RELEASE2_LINES), [{ role: "principal", name: "Sample Teen", dob: m3.yearsAgo(16) }])["Sample Teen"];
  ok("C1-3 release 2: a principal of 16 still fills Schedule 1 (the age gates dependent children only) and no IMM 5645 (from 18)", sorted((minorPrincipal?.forms ?? []).map((l) => l.form)).join("|") === "IMM 5257|IMM 5257 SCH1", minorPrincipal?.forms.map((l) => l.form));
  const away = expectedLines(release(FIXTURE_LINES), [...FAMILY.slice(0, 1), { role: "spouse_or_partner", name: "Sample Spouse A", dob: m3.yearsAgo(38), applies: false }])["Sample Spouse A"];
  ok("C1-4 a person on the case who is not travelling (applies: false) is expected no form", away?.forms.length === 0 && away.waiting.length === 0, away);
  // VV-R09 as the resolver reads it: a child whose age is not known stays a minor (a parent signs); a principal under 18
  // has no parent on the case, so signs their own.
  const kids = expectedLines(release(FIXTURE_LINES), [{ role: "principal", name: "Sample Teen", dob: m3.yearsAgo(16) }, { role: "child", name: "Sample Child X", dob: null }]);
  const signer = (n: string) => kids[n]?.forms.find((l) => l.form === "IMM 5257")?.signers.join("+");
  ok("C1-4b IMM 5257 signed \"a parent for a minor\": a child with no date of birth is signed by a parent; a principal of 16 signs their own", signer("Sample Child X") === "parent" && signer("Sample Teen") === "person", { child: signer("Sample Child X"), principal: signer("Sample Teen") });
}

// ---- Part 2: each data set live on this copy, through a case the helper opens. ----
const studio = join(import.meta.dirname, ".."), tsx = join(studio, "node_modules", ".bin", "tsx");
const releases = () => { try { return Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`)); } catch { return 0; } };
const setup = (file: string) => spawnSync(tsx, ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { cwd: join(studio, ".."), stdio: "ignore", timeout: 900_000 });
/** Demo › Reset and Demo › Load (node:http: the load can outlast fetch's header wait), as the author. */
const post = (path: string, body: unknown) => new Promise<number>((done) => {
  const data = JSON.stringify(body);
  const rq = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method: "POST", timeout: 1_200_000, headers: { "content-type": "application/json", "x-actor": AUTHOR, "content-length": Buffer.byteLength(data) } }, (r) => { r.resume(); r.on("end", () => done(r.statusCode ?? 0)); });
  rq.on("timeout", () => rq.destroy(new Error("timeout"))); rq.on("error", () => done(0)); rq.end(data);
});
if (expectedFor) {
  if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
  if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts");
  ok("C1-5 setup: the copy has the fixture's Visitor visa release 2 (the pack's setup)", releases() === 2, releases());
  let c = await openCase(needVisitorVisa());
  let d = diff(await expectedFor(c.id), WANT.fixture);
  ok("C1-6 fixture, live: expectedLines of a family case on its pinned release (GET /combinations/:id/config?mode=published, checked against the case's pin) equals the hand-worked answer", !d.length, d);

  const reset = await post("/demo/reset", { confirm: "RESET" }), load = reset < 300 ? await post("/demo/load", { sample: "configured" }) : 0;
  ok("C1-7 Demo › Reset, then Load the configured checkpoint", reset < 300 && load < 300, [reset, load]);
  c = await openCase(needVisitorVisa());
  d = diff(await expectedFor(c.id), WANT.release2);
  ok("C1-8 checkpoint, live: a new family case opens on release 2 and expectedLines equals the hand-worked answer (seven lines for adults, four for children)", !d.length, d);
  // The helper's UCI fix, on the same case filled the packs' way (C7.7-9's own reading of stage 1). Worked by hand since
  // A2 (7 Nov): the case team answers "uses a representative" Yes, so the adults' IMM 5476 applies. Its released map,
  // IMM 5476 (11-2021), reads 22 facts about the representative (REP_FACTS); the firm record fills five of them
  // (engine/runtime/team.ts: the names; the membership ID, licensing body and firm name). Row B107 (#1231, QA-300) changes
  // this, worked by hand from its two sources: the firm record also fills question 7's office block (address 7, phone 2,
  // e-mail 1: engine/runtime/team.ts representativeContact), and IMM 5476 (11-2021)'s own gates leave the other boxes
  // unasked for a CICC representative (samples/form-field-gates.json: the law society's province, part (i)'s category and
  // "other", the student-at-law's two facts, the fax's two). Before B107, 17 were left that no route accepted. Now none
  // is: stage 1 is 0 for every filing, and every form that applies is ready.
  const REP_FACTS = ["person.family_name", "person.given_names", "representative.membership_id", "representative.licensing_body", "representative.licensing_province", "representative.uncompensated_other_description",
    "representative.uncompensated_category", "person.address_city", "person.address_country", "person.email", "person.fax_country_code", "person.fax_number", "representative.supervising_lawyer_name",
    "representative.supervising_lawyer_membership_id", "representative.organization_name", "person.phone_country_code", "person.phone_number", "person.address_postal_code", "person.address_province_state",
    "person.address_street_name", "person.address_street_number", "person.address_apt_unit"];
  const FROM_FIRM = ["person.family_name", "person.given_names", "representative.membership_id", "representative.licensing_body", "representative.organization_name",
    "person.address_apt_unit", "person.address_street_number", "person.address_street_name", "person.address_city", "person.address_province_state", "person.address_postal_code", "person.address_country",
    "person.phone_country_code", "person.phone_number", "person.email"];
  const GATED_FOR_CICC = ["representative.licensing_province", "representative.uncompensated_category", "representative.uncompensated_other_description", "representative.supervising_lawyer_name",
    "representative.supervising_lawyer_membership_id", "person.fax_country_code", "person.fax_number"];
  const LEFT = REP_FACTS.filter((f) => !FROM_FIRM.includes(f) && !GATED_FOR_CICC.includes(f)).sort();
  const STAGE1: Record<string, number> = { "Sample Client A": LEFT.length, "Sample Spouse A": LEFT.length, "Sample Child A1": 0, "Sample Child A2": 0 };
  await fillEverything(c.id);
  const p = (await prepare(c.id)).p, nameOf = new Map(Object.entries(c.subjects).map(([n, s]) => [s, n]));
  const stage1 = ((await m3.call("GET", `/runtime/cases/${c.id}/prepare`, undefined, m3.officerOf(c.id))).body?.stage1 ?? []) as { filing: string; to_confirm: number }[];
  const byName = Object.fromEntries(stage1.map((x) => [nameOf.get(p?.filings.find((f) => f.id === x.filing)?.applicants[0]?.subject ?? "") ?? x.filing, x.to_confirm]));
  ok(`C1-9 checkpoint: filled the packs' way, stage 1 is 0 to confirm for every filing (since B107 the firm record or IMM 5476's own gates settle all 22 representative facts; the UCI was the one other fact left)`,
    REP_FACTS.length === 22 && FROM_FIRM.length + GATED_FOR_CICC.length === 22 && LEFT.length === 0 && Object.keys(STAGE1).every((n) => byName[n] === STAGE1[n]) && stage1.length === 4, byName);
  const forms = ((await m3.call("GET", `/runtime/cases/${c.id}/forms`, undefined, m3.officerOf(c.id))).body?.forms ?? []) as { form?: string; code?: string; person: string; applies: boolean; readiness: { ready: boolean; missing: { about: string; fact: string }[] } }[];
  const notReady = forms.filter((f) => f.applies && !f.readiness.ready);
  ok("C1-9b checkpoint: every form that applies is ready, the adults' IMM 5476 included (B107: nothing about the representative is left to answer)", notReady.length === 0, notReady.map((f) => `${f.form ?? f.code}/${f.person}: ${f.readiness.missing.map((m) => m.fact).join(", ")}`));
  const uciWarns = ((await prepare(c.id)).p?.readiness ?? []).flatMap((r) => r.warns).filter((w) => w.code === "fact_problem" && /Unique Client Identifier/.test(w.words));
  ok("C1-10 no \"fact with a problem\" warning on the UCI: the helper's Sample UCI is one the release's own checks accept", uciWarns.length === 0, uciWarns.map((w) => w.words.slice(0, 120)));
}
process.exitCode = summary() ? 1 : 0;
