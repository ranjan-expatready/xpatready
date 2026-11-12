// BK-15 (R-e, P-486; BK-13 dry run gap C5): fees per family member as data. Guide 5269: "Family members must complete
// their own application forms."; each person pays for the document they apply for: the student a study permit, a child
// who studies a study permit (their line adds it), any other child a visitor visa, a spouse or partner a work permit with
// the open work permit holder fee; biometrics per person up to the family maximum. All from samples/fee-table.json
// (sp.outside fees_by_role) and the release's lines; the engine names no pathway or form (P-319, P-425, B164). Pure, US$0.
//   tsx studio/tests/check_bk15_fees_by_role.ts
import { deriveFilings, FEE_TABLE, rulesFrom, type FeeTable } from "../engine/runtime/filings.ts";
import { filingPlan } from "../engine/filing-modes.ts";
import { addedFilingProblems } from "../engine/validate.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import type { CaseFilings } from "../contracts/runtime.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { recorder } from "./runtime/api.ts";
import { readFileSync } from "node:fs";

const { ok, summary } = recorder();
type D = Extract<CaseFilings, { derived: true }>;
const P = (id: string, role: Participant["role"], label: string, applies = true): Participant => ({ subjectId: id, role, label, applies });
const student = P("s", "principal", "Student A"), spouse = P("p", "spouse_or_partner", "Spouse A"), kidS = P("k1", "child", "Child S"), kidV = P("k2", "child", "Child V");
const fam = [student, spouse, kidS, kidV];
// The release's modes (samples/wave1.json sp.outside: every family member files their own) and the line a studying child adds.
const wave1 = readFileSync(new URL("../samples/wave1.json", import.meta.url), "utf8");
const spLine = JSON.parse(wave1.match(/"key": "sp\.outside"[\s\S]*?"participants": (\[[^\]]*\])/)![1]) as { role: string; filingMode?: string }[];
const modes = new Map(spLine.filter((l) => l.filingMode).map((l) => [l.role, l.filingMode as "files_own"]));
const adds0 = (JSON.parse(readFileSync(new URL("../samples/conditional-filings.json", import.meta.url), "utf8"))["sp.outside"].addsFiling) as { filing: string; fee: string[] };
const adds = new Map([[kidS.subjectId, { filing: adds0.filing, fee: adds0.fee }]]);
const ages = new Map<string, number | null>([["s", 30], ["p", 31], ["k1", 15], ["k2", 9]]);
const sum = (d: D, filter: (l: D["fees"][number]) => boolean = () => true) => d.fees.filter(filter).reduce((s, l) => s + l.amount_cents, 0);
const linesOf = (d: D, subject: string) => d.fees.filter((l) => l.person === subject).map((l) => l.line).sort();
const labelOf = (d: D, subject: string) => d.filings.find((f) => f.owner?.subject === subject)?.label;

ok("BK-15 setup: the release's Study permit lines all file their own (the seeded on_principal is gone), with a spouse or partner line",
  modes.get("child") === "files_own" && modes.get("spouse_or_partner") === "files_own" && !/on_principal/.test(JSON.stringify(spLine)), spLine);
ok("BK-15 setup: the studying child's added filing names its own fee lines (data)", adds0.filing === "Study permit" && JSON.stringify(adds0.fee) === JSON.stringify(["study_permit", "biometrics"]), adds0);

const d = deriveFilings("sp.outside", fam, undefined, { modes, adds, ages, label: "Study permit (outside Canada)" }) as D;
ok("BK-15 pass: one filing per person, each named by the document they apply for", d.derived && d.filings.length === 4 && labelOf(d, "s") === "Study permit (outside Canada): Student A" && labelOf(d, "p") === "Work permit: Spouse A" && labelOf(d, "k1") === "Study permit: Child S" && labelOf(d, "k2") === "Visitor visa: Child V", d.derived ? d.filings.map((f) => f.label) : d);
ok("BK-15 pass: the fees are worked out, in one family group", d.fees_worked_out && d.groups.length === 1 && d.groups[0].filings.length === 4, d.fees_why);
ok("BK-15 pass: the student pays the study permit and biometrics", JSON.stringify(linesOf(d, "s")) === JSON.stringify(["biometrics", "study_permit"]) && sum(d, (l) => l.person === "s" && l.line === "study_permit") === 150_00);
ok("BK-15 pass: the spouse pays the work permit and the open work permit holder fee (CAD 155 + CAD 100) and biometrics", JSON.stringify(linesOf(d, "p")) === JSON.stringify(["biometrics", "open_work_permit_holder", "work_permit"]) && sum(d, (l) => l.person === "p" && l.line !== "biometrics") === 255_00, linesOf(d, "p"));
ok("BK-15 pass: the child who studies pays the study permit (CAD 150) on their own filing", JSON.stringify(linesOf(d, "k1")) === JSON.stringify(["biometrics", "study_permit"]) && sum(d, (l) => l.person === "k1" && l.line === "study_permit") === 150_00, linesOf(d, "k1"));
ok("BK-15 pass: the child who does not study pays the visitor visa (CAD 100), never the study permit", JSON.stringify(linesOf(d, "k2")) === JSON.stringify(["biometrics", "visitor_visa"]) && sum(d, (l) => l.person === "k2" && l.line === "visitor_visa") === 100_00, linesOf(d, "k2"));
ok("BK-15 fail (C5): nobody but the student and the studying child is charged a study permit (CAD 300 in all, not 600)", sum(d, (l) => l.line === "study_permit") === 300_00 && !d.fees.some((l) => l.line === "study_permit" && (l.person === "p" || l.person === "k2")));
ok("BK-15 fail: nobody but the spouse is charged a work permit or the open work permit holder fee", d.fees.filter((l) => l.line === "work_permit" || l.line === "open_work_permit_holder").every((l) => l.person === "p"));
ok("BK-15 fail: nobody but the child who does not study is charged a visitor visa", d.fees.filter((l) => l.line === "visitor_visa").every((l) => l.person === "k2"));
const bio = d.groups[0].totals.find((t) => t.line === "biometrics");
ok("BK-15 pass: biometrics per person up to the family maximum: the child of 9 is exempt (under 14), the other three are capped at CAD 170", !!bio && bio.total_cents === 170_00 && bio.cap_applied && d.fees.some((l) => l.person === "k2" && l.line === "biometrics" && l.exempt && l.amount_cents === 0), bio);
ok("BK-15 pass: the family's total, from data: CAD 150 + 255 + 150 + 100 + 170 = CAD 825", d.groups[0].total_cents === 825_00 && sum(d) === 825_00, d.groups[0].total_cents);
ok("BK-15 pass: the case says what stays Sample (the spouse's open work permit eligibility, a visa-exempt child, the Québec CAQ)", /open work permit/.test(d.basis) && /visa-exempt/.test(d.basis) && /CAQ/.test(d.basis) && /Sample/.test(d.basis), d.basis);

// A child whose studying rule does not hold (or is not answered) files a visitor visa; a single student pays CAD 235.
const noStudy = deriveFilings("sp.outside", fam, undefined, { modes, ages }) as D;
ok("BK-15 fail: without the studying rule holding, a child is never priced a study permit (both children file visitor visas)", noStudy.fees_worked_out && labelOf(noStudy, "k1") === "Visitor visa: Child S" && !noStudy.fees.some((l) => l.line === "study_permit" && l.person.startsWith("k")) && noStudy.groups[0].total_cents === 775_00, noStudy.groups[0]?.total_cents);
const one = deriveFilings("sp.outside", [student], undefined, { modes, ages }) as D;
ok("BK-15 pass: a single student pays CAD 150 + CAD 85 = CAD 235", one.fees_worked_out && one.groups[0].total_cents === 235_00, one.groups[0]?.total_cents);

// Visitor visa unchanged: no fees by role, every person pays the visitor visa line, labels as before.
const vv = deriveFilings("vv.single", [P("a", "principal", "Client A"), P("b", "spouse_or_partner", "Client B"), P("c", "child", "Client C")], undefined, { ages: new Map([["a", 40], ["b", 40], ["c", 10]]) }) as D;
ok("BK-15 pass: Visitor visa is unchanged (no fees by role): three visitor visas CAD 300 + biometrics CAD 170, labels \"Visitor visa: <person>\"", !rulesFrom(FEE_TABLE, "vv.single")?.byRole && vv.groups[0].total_cents === 470_00 && vv.filings.every((f) => f.label.startsWith("Visitor visa: ")), vv.groups[0]?.total_cents);

// The data guard: fees by role are read only when sound, else the combination is not derived (never guessed).
const withRow = (row: unknown): FeeTable => ({ ...FEE_TABLE, combinations: { ...FEE_TABLE.combinations, "sp.outside": { ...FEE_TABLE.combinations["sp.outside"], fees_by_role: row } } } as unknown as FeeTable);
const by = FEE_TABLE.combinations["sp.outside"].fees_by_role!;
ok("BK-15 pass: the shipped fees by role are read", rulesFrom(FEE_TABLE, "sp.outside")?.byRole?.get("child")?.filing === "Visitor visa");
ok("BK-15 fail: a role's line not among the combination's lines is refused (not derived)", rulesFrom(withRow({ ...by, child: { filing: "Visitor visa", lines: ["pr_adult"] } }), "sp.outside") === undefined);
ok("BK-15 fail: a role that never applies (representative) is refused", rulesFrom(withRow({ ...by, representative: { lines: ["biometrics"] } }), "sp.outside") === undefined);
ok("BK-15 fail: a role with no lines, a line twice, or a blank filing name is refused", [{ lines: [] }, { lines: ["biometrics", "biometrics"] }, { filing: " ", lines: ["biometrics"] }].every((v) => rulesFrom(withRow({ ...by, child: v }), "sp.outside") === undefined));
// A role on the case with no fee lines of its own: nothing is charged, in words (BR-10), never a total leaving them out.
const { child: _c, ...noChild } = by;
const gap = deriveFilings("sp.outside", fam, (k) => rulesFrom(withRow(noChild), k), { modes, ages }) as D;
ok("BK-15 fail (BR-10): a child whose role names no fee lines leaves the case unpriced, in words naming them", !gap.fees_worked_out && gap.fees.length === 0 && /no fee lines for a child/.test(gap.fees_why ?? "") && /Child S/.test(gap.fees_why ?? ""), gap.fees_why);
ok("BK-15 pass: with the child's line adding a study permit that names its lines, that child is priced even so", (deriveFilings("sp.outside", [student, kidS], (k) => rulesFrom(withRow(noChild), k), { modes, ages, adds }) as D).fees_worked_out);

// The plan (engine/filing-modes.ts): an added filing is made instead of the person's own; never for the principal's line.
const plan = filingPlan([{ subject: "s", role: "principal", label: "S", travelling: true }, { subject: "k", role: "child", label: "K", travelling: true, adds: "Study permit" }], () => "files_own");
ok("BK-15 pass: on a line that files its own, the added filing replaces it (one application per person)", plan.filings.length === 2 && plan.filings[1].added === "Study permit");
const away = filingPlan([{ subject: "s", role: "principal", label: "S", travelling: true }, { subject: "k", role: "child", label: "K", travelling: false, adds: "Study permit" }], () => "files_own");
ok("BK-15 fail: a person not travelling files nothing, added or own", away.filings.length === 1 && away.notFiling.length === 1);

// Break M2 (BR-10): a child whose "6 months or more" is not answered yet: which application they make is not known, so
// nothing is charged, in words, and their filing is not named as a visitor visa.
const pending = new Map([[kidS.subjectId, { filing: adds0.filing, fee: adds0.fee, waits: "the child will study in Canada for 6 months or more" }]]);
const wait = deriveFilings("sp.outside", fam, undefined, { modes, ages, adds: pending }) as D;
ok("BK-15 fail (break M2): an unanswered rule leaves the case unpriced, in words naming the person and the question", !wait.fees_worked_out && wait.fees.length === 0 && /Waits for Child S's answer: whether the child will study in Canada for 6 months or more/.test(wait.fees_why ?? ""), wait.fees_why);
ok("BK-15 fail (break M2): their filing is not named as a document yet (\"Application to be decided\"), never \"Visitor visa\"", labelOf(wait, "k1") === "Application to be decided: Child S", labelOf(wait, "k1"));
ok("BK-15 pass (break M2): answered, the same family is priced again (CAD 825)", (deriveFilings("sp.outside", fam, undefined, { modes, ages, adds }) as D).groups[0].total_cents === 825_00);

// Break M5: a role's fee line must reach that role (a line limited to other roles never charges it).
const narrowed = { ...FEE_TABLE, lines: FEE_TABLE.lines.map((l) => (l.key === "visitor_visa" ? { ...l, roles: ["principal"] } : l)) } as FeeTable;
ok("BK-15 fail (break M5): fees by role naming a line limited to other roles is refused (not derived)", rulesFrom(narrowed, "sp.outside") === undefined);
ok("BK-15 pass (break M5): the shipped lines reach their roles", !!rulesFrom(FEE_TABLE, "sp.outside"));

// Break M1 and m6: the release's checks read the fees by role.
const FACT = "person.studies_six_months_or_more", TYPES = new Map([[FACT, "yes_no"]]);
const rel = (child: Record<string, unknown>, extra: Record<string, unknown>[] = []) => addedFilingProblems({ combination: { key: "sp.outside", participants: [{ role: "principal", filingMode: "files_own" }, ...extra, { role: "child", label: "Child", filingMode: "files_own", ...child }] }, placements: [{ fact: FACT, repeats: "per_person" }] } as unknown as Snapshot, TYPES, new Set(), new Set([FACT]), new Set());
const ADD = { filing: "Study permit", condition: { op: "eq", field: FACT, value: true, subjectKind: "PERSON" }, conditionPlain: "the child will study 6 months or more" };
ok("BK-15 pass (break M1): the studying child's study permit naming the study permit and biometrics raises nothing (no advice to name another document's fees)", rel({ addsFiling: { ...ADD, fee: ["study_permit", "biometrics"] } }).length === 0, rel({ addsFiling: { ...ADD, fee: ["study_permit", "biometrics"] } }).map((x) => x.message));
const short = rel({ addsFiling: { ...ADD, fee: ["study_permit"] } });
ok("BK-15 fail (break M1): leaving out biometrics (an IRCC step every role pays) is warned, naming only it", short.length === 1 && short[0].level === "warning" && /"Biometrics fee" \(biometrics\)/.test(short[0].message) && !/work_permit|visitor_visa|open_work_permit_holder/.test(short[0].message), short.map((x) => x.message));
ok("BK-15 pass (break m6): every applying line of the shipped release has its role's fee lines: no warning", !rel({ addsFiling: { ...ADD, fee: ["study_permit", "biometrics"] } }, [{ role: "spouse_or_partner", filingMode: "files_own" }]).some((x) => /names no fee lines/.test(x.message)));
const noSpouse = { ...FEE_TABLE, combinations: { ...FEE_TABLE.combinations, "sp.outside": { ...FEE_TABLE.combinations["sp.outside"], fees_by_role: noChild } } } as unknown as FeeTable;
const m6 = addedFilingProblems({ combination: { key: "sp.outside", participants: [{ role: "principal", filingMode: "files_own" }, { role: "child", label: "Child", filingMode: "files_own" }] }, placements: [] } as unknown as Snapshot, TYPES, new Set(), new Set(), new Set(), noSpouse);
ok("BK-15 fail (break m6): an applying line whose role has no fee lines is warned at release", m6.some((x) => x.level === "warning" && /names no fee lines for a child/.test(x.message)), m6.map((x) => x.message));

// Review M3: a release that still puts a child on the principal's application (on_principal): with fees by role each
// person's fees follow their own application, so nothing is charged, in words, never a visitor visa on the student's.
const onP = deriveFilings("sp.outside", [student, kidV], undefined, { modes: new Map([...modes, ["child", "on_principal" as never]]), ages }) as D;
ok("BK-15 fail (review M3): a child on the student's application is not priced by their role's lines; the case says why", !onP.fees_worked_out && onP.fees.length === 0 && /Child V is on Student A's application/.test(onP.fees_why ?? "") && /files their own application/.test(onP.fees_why ?? ""), onP.fees_why);
ok("BK-15 pass (review M3): the same child filing their own is priced (visitor visa)", (deriveFilings("sp.outside", [student, kidV], undefined, { modes, ages }) as D).fees.some((l) => l.person === "k2" && l.line === "visitor_visa"));

// Review m6: the two guards no other line proves: never on the principal's line at release; a co-filing person stays co-filed.
ok("BK-15 fail (review m6): at release, a filing added on the principal's line is refused", addedFilingProblems({ combination: { key: "sp.outside", participants: [{ role: "principal", filingMode: "files_own", addsFiling: { ...ADD, fee: ["study_permit", "biometrics"] } }] }, placements: [{ fact: FACT, repeats: "per_person" }] } as unknown as Snapshot, TYPES, new Set(), new Set([FACT]), new Set()).some((x) => x.level === "error" && /combination's own application/.test(x.message)));
const co = filingPlan([{ subject: "s", role: "principal", label: "S", travelling: true }, { subject: "z", role: "sponsor", label: "Z", travelling: true, adds: "Study permit" }], (r) => (r === "sponsor" ? "co_files" : "files_own"));
ok("BK-15 fail (review m6): a co-filing person's added filing never replaces their co-filed application", co.filings.length === 2 && co.filings[1].kind === "co_filed" && !co.filings[1].added, co.filings);

process.exit(summary() ? 1 : 0);
