// C6.12, C11.6 checks (M3-B, runtime lane): the pure rules behind a Visitor visa case's "Prepare application" view:
// ages and the biometrics exemption (VV-R15), fees per submission group after a split (BR-16, BR-18), the release's
// filing mode per role (M3-0), the items each filer gets (forms, documents, the biometrics step), a form item's channel
// and signature, a channel change inside what IRCC accepts (VV-R02, VV-R10, FQ-3) and the view's version. Each rule has
// a passing and a failing case. No database, no server, no model call (US$0). Values Sample until the expert confirms.
//   tsx studio/tests/check_vv_prepare.ts
import { ageCheck, ageOn, BIOMETRICS_EXEMPT_SOURCE, deriveFilings, type FeeRule } from "../engine/runtime/filings.ts";
import { channelChange, channelOf, prepareVersion, wantedItems } from "../engine/runtime/prepare.ts";
import type { CaseFilings } from "../contracts/runtime.ts";
import type { Participant } from "../engine/runtime/case.ts";
import type { AcceptRecord } from "../engine/channels.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
type D = Extract<CaseFilings, { derived: true }>;
const person = (i: number, role: Participant["role"], applies = true): Participant => ({ subjectId: `s-${i}`, role, label: `Client ${String.fromCharCode(65 + i)}`, applies });
const fam = [person(0, "principal"), person(1, "spouse_or_partner"), person(2, "child"), person(3, "child")];
const ages = (...a: (number | null)[]) => new Map(a.map((x, i) => [`s-${i}`, x]));
const d = (people: Participant[], opts: Parameters<typeof deriveFilings>[3] = {}) => deriveFilings("vv.single", people, undefined, opts) as D;
const sum = (r: D, line: string, filings?: string[]) => r.fees.filter((f) => f.line === line && !f.waiting && (!filings || filings.includes(f.filing))).reduce((s, f) => s + f.amount_cents, 0);
const today = new Date("2026-11-01T12:00:00Z");

// Ages in whole years, on today's date.
ok("C6.12 age: the day of the 14th birthday is 14", ageOn("2012-11-01", today) === 14);
ok("C6.12 age (fail): the day before the 14th birthday is 13", ageOn("2012-11-02", today) === 13);
ok("C6.12 age (fail): no date, or one not written as a date, is unknown (null), never 0", ageOn(null, today) === null && ageOn("2012-13", today) === null);

// VV-R15: biometrics none under 14 or over 79 ("over 79" read as 80 or older, FQ-7).
const BIO: FeeRule = { key: "biometrics", label: "Biometrics fee", perPersonCents: 85_00, familyMaxCents: 170_00, familyFrom: 2, source: BIOMETRICS_EXEMPT_SOURCE, exempt: { underAge: 14, overAge: 79, source: BIOMETRICS_EXEMPT_SOURCE } };
ok("C6.12 VV-R15: 14 and 79 give biometrics", "pays" in ageCheck(BIO, 14) && (ageCheck(BIO, 14) as { pays: boolean }).pays && (ageCheck(BIO, 79) as { pays: boolean }).pays);
ok("C6.12 VV-R15 (fail): 13 and 80 do not, each with IRCC's words", [13, 80].every((a) => { const c = ageCheck(BIO, a) as { pays: boolean; why?: string }; return c.pays === false && /IRCC: "a(n applicant| child) (over|under) the age of/.test(c.why ?? ""); }));
ok("C6.12 G15: no date of birth yet waits for it", "waits" in ageCheck(BIO, null));

// Fees with ages: a family of four (40, 38, 10, 15) pays visa CAD 400, biometrics CAD 170 for three.
{
  const r = d(fam, { ages: ages(40, 38, 10, 15) });
  ok("C6.12 VV-R13/14/15: four people, the child of 10 exempt: visa CAD 400, biometrics CAD 170", sum(r, "visitor_visa") === 400_00 && sum(r, "biometrics") === 170_00 && r.fees.some((f) => f.filing === "filing-s-2" && f.line === "biometrics" && f.exempt && /Under 14/.test(f.why)));
  const noAges = d(fam);
  ok("C6.12 (fail): without ages (the #283 view) every person is charged: biometrics still CAD 170, nobody exempt by age", sum(noAges, "biometrics") === 170_00 && !noAges.fees.some((f) => /Under 14/.test(f.why)));
  const one = d([person(0, "principal"), person(1, "child")], { ages: ages(40, 10) });
  ok("C6.12 (fail): with only one person giving biometrics there is no family rate: CAD 85", sum(one, "biometrics") === 85_00);
  const waiting = d([person(0, "principal"), person(1, "child")], { ages: ages(40, null) });
  const w = waiting.fees.find((f) => f.filing === "filing-s-1" && f.line === "biometrics");
  ok("C6.12 G15: a child with no date of birth: a biometrics line that waits for it, not exempt, not counted", !!w && w.waiting === "person.date_of_birth" && !w.exempt && sum(waiting, "biometrics") === 85_00);
}
// BR-16: a split filing is priced on its own; the family maximum stays with the rest.
{
  const six = [...fam, person(4, "child"), person(5, "child")];
  const a = ages(40, 38, 10, 15, 6, 3);
  const together = d(six, { ages: a });
  ok("C6.12 BR-18: six together: visa CAD 500 once, on the principal's filing; five lines exempt with the reason", sum(together, "visitor_visa") === 500_00 && together.fees.filter((f) => f.line === "visitor_visa" && !f.exempt).every((f) => f.filing === "filing-s-0") && together.fees.filter((f) => f.line === "visitor_visa" && f.exempt).length === 5);
  const split = d(six, { ages: a, groupOf: (s) => (s === "s-3" ? "g-own" : "g-fam"), groupKind: (g) => (g === "g-own" ? "separate" : "family") });
  const rest = split.groups.find((g) => g.id === "g-fam")!.filings;
  ok("C6.12 BR-16: after splitting the child of 15 out: two groups; visa 500 + 100; biometrics 170 + 85", split.groups.length === 2 && sum(split, "visitor_visa", rest) === 500_00 && sum(split, "visitor_visa", ["filing-s-3"]) === 100_00 && sum(split, "biometrics", rest) === 170_00 && sum(split, "biometrics", ["filing-s-3"]) === 85_00);
  ok("C6.12 BR-16 (fail): a group of one cannot be split, and a split group says it is separate", split.groups.find((g) => g.id === "g-own")!.splittable === false && split.groups.find((g) => g.id === "g-own")!.kind === "separate");
}
// M3-0: the release's filing mode per role; a role it leaves out uses the built-in default.
{
  const r = d(fam, { modes: new Map([["child", "on_principal"]]) });
  ok("C6.12 M3-0: the release says a child is on the principal's filing: the child's filing says so", r.filings.find((f) => f.applicants[0].role === "child")!.mode === "on_principal");
  ok("C6.12 M3-0 (fail): a role the release leaves out keeps the default, files_own", r.filings.find((f) => f.applicants[0].role === "principal")!.mode === "files_own");
  ok("C6.12 P-209: a person not travelling has no filing, in words", d([person(0, "principal"), person(1, "child", false)]).not_filing[0]?.why.includes("Not travelling"));
}

// Items per filer (C7.7 slice used by C6.12): forms that apply, the checklist's documents, the biometrics step.
{
  const forms = [
    { form: "IMM 5257", person: "s-0", applies: true as const }, { form: "IMM 5707", person: "s-0", applies: true as const },
    { form: "IMM 5257", person: "s-2", applies: true as const }, { form: "IMM 5707", person: "s-2", applies: false as const },
    { form: "IMM 5476", person: "s-3", applies: "cannot_tell" as const, missing: ["person.date_of_birth"] }, { form: "Checklist", person: "s-0", form_kind: "document", applies: true as const },
  ];
  const docs = new Map([["s-0", [{ document: { key: "passport", name: "Passport" }, document_type: "Passport or travel document", label: "Passport" }, { document: { key: "passport", name: "Passport" }, document_type: "Passport or travel document", label: "Passport" }]]]);
  const items = wantedItems(["s-0", "s-2", "s-3"], forms, docs, BIO, ages(40, null, 10, null));
  const of = (s: string, k: string) => items.filter((i) => i.subject === s && i.kind === k);
  ok("C7.7 items: the principal has IMM 5257 and IMM 5707, a passport once, and the biometrics step after filing", of("s-0", "form").map((i) => i.key).join() === "IMM 5257,IMM 5707" && of("s-0", "document").length === 1 && of("s-0", "step")[0]?.neededBefore === "after_filing");
  ok("C7.7 items (fail): a form that does not apply and a document-kind line are never items; the child of 10 has no biometrics step", !of("s-2", "form").some((i) => i.key === "IMM 5707") && !items.some((i) => i.key === "Checklist") && of("s-2", "step").length === 0);
  ok("C7.7 items (review m2): with no date of birth the biometrics step is kept, waiting for it", of("s-3", "step")[0]?.applies === "cannot_tell" && of("s-3", "step")[0]?.missing?.[0] === "person.date_of_birth");
  ok("C7.7 items: a form that cannot be told yet is kept, saying what it waits for; nobody else's filing gets it", of("s-3", "form")[0]?.applies === "cannot_tell" && of("s-3", "form")[0]?.missing?.[0] === "person.date_of_birth" && !items.some((i) => i.subject === "s-1"));
}

// C11.6: a form item's channel and signature.
{
  const R5476: AcceptRecord[] = [{ account: "ANY", channels: ["PDF_UPLOAD"], basis: "SAMPLE", quote: "Upload this form along with your online application" }];
  const R5257: AcceptRecord[] = [{ account: "APR_PORTAL", channels: ["PDF_UPLOAD", "PAPER"], basis: "SAMPLE", quote: null }];
  const c = channelOf({ form_number: "IMM 5476", channel: "PDF_UPLOAD", signature: "HAND_SCANNED" }, R5476, "APR_PORTAL", null);
  ok("C11.6: the item starts on its line's channel, lists what IRCC accepts, signed by hand and scanned", c.channel === "PDF_UPLOAD" && c.accepts.join() === "PDF_UPLOAD" && c.signature === "HAND_SCANNED");
  const p = channelOf({ form_number: "IMM 5257", channel: "PDF_UPLOAD", signature: "TYPED_NAME" }, R5257, "APR_PORTAL", "PAPER");
  ok("C11.6: the signature follows edition × channel: a typed name does not fit Paper, so Paper is signed by pen", p.channel === "PAPER" && p.line_channel === "PDF_UPLOAD" && p.signature !== "TYPED_NAME");
  const none = channelOf(undefined, undefined, "APR_PORTAL", null);
  ok("C11.6 (fail): no record of what IRCC accepts offers Online, PDF upload and Paper (Sample), never Not needed", none.accepts.join() === "ONLINE,PDF_UPLOAD,PAPER");

  const online = channelChange("IMM 5476", "ONLINE", null, R5476, "APR_PORTAL");
  ok("C11.6 VV-R10 (fail): Online on IMM 5476 is refused (422) with IRCC's own line", !online.ok && online.status === 422 && /Upload this form along with your online application/.test(online.detail));
  const fax = channelChange("IMM 5257", "FAX", null, R5257, "APR_PORTAL");
  ok("C11.6 (fail): an unknown channel is a 400 naming the four", !fax.ok && fax.status === 400 && /Online, PDF upload, Paper or Not needed/.test(fax.detail));
  const arr = channelChange("IMM 5257", ["PAPER"], null, R5257, "APR_PORTAL");
  ok("C11.6 (break m3, fail): a channel sent as a list asks for one channel as text", !arr.ok && arr.status === 400 && /one way to file, as text/.test(arr.detail));
  const paperNoReason = channelChange("IMM 5257", "PAPER", "  ", R5257, "APR_PORTAL");
  ok("C11.6 VV-R02, FQ-3 (fail): Paper through an IRCC account without a reason is a 400 on the reason", !paperNoReason.ok && paperNoReason.status === 400 && paperNoReason.field === "reason" && /accommodation/.test(paperNoReason.detail));
  const paper = channelChange("IMM 5257", "PAPER", "Cannot apply online (Sample)", R5257, "APR_PORTAL");
  ok("C11.6 VV-R02, FQ-3: Paper with a written reason, accepted for IMM 5257, is allowed", paper.ok && paper.channel === "PAPER");
  ok("C11.6: with no IRCC account (paper filing) Paper needs no reason", channelChange("IMM 5257", "PAPER", null, undefined, "PAPER").ok);
  const nn = channelChange("IMM 5257", "NOT_NEEDED", null, R5257, "APR_PORTAL");
  ok("C11.6 C-4 (fail): Not needed without the account's own record is refused (422)", !nn.ok && nn.status === 422);
}

// The view's version: any group, filing move or channel change gives a new one.
{
  const g = [{ id: "g1", filings: ["f1", "f2"] }], i = [{ id: "i1", channel: null, version: 1 }];
  ok("C6.12: the same groups and items give the same version, in any order", prepareVersion(g, i) === prepareVersion([{ id: "g1", filings: ["f2", "f1"] }], i));
  ok("C6.12 (fail): a split or a channel change gives a new version", prepareVersion(g, i) !== prepareVersion([{ id: "g1", filings: ["f1"] }, { id: "g2", filings: ["f2"] }], i) && prepareVersion(g, i) !== prepareVersion(g, [{ id: "i1", channel: "PAPER", version: 2 }]));
}

process.exitCode = summary() ? 1 : 0;
