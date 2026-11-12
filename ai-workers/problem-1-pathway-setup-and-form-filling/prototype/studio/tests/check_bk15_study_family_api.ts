// BK-15 (R-e, P-486; BK-13 dry run gap C5), end to end on the configured checkpoint: a Study permit (outside Canada)
// family of four (student, spouse, a child who will study 6 months or more, a child who will not) opened by the case
// officer through the product's routes shows one filing per person, named by the document each applies for, each
// person's fee lines and one total, all from data (samples/fee-table.json sp.outside fees_by_role, the release's lines
// from samples/wave1.json, the child's added study permit from samples/conditional-filings.json). Visitor visa's fees are
// unchanged. Loads the configured checkpoint itself (about 2 minutes; saved AI answers only, US$0, live AI off).
//   zsh studio/tools/isolated.sh bk15 4454 start && tsx studio/tests/check_bk15_study_family_api.ts 4454 xr_studio_bk15
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || PORT === 4400 || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port of an isolated copy, never 4400> <its database>"); process.exit(2); }
const BREW = "/opt/homebrew/opt/postgresql@18/bin/psql", PSQL = process.env.PSQL || (existsSync(BREW) ? BREW : "psql");
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const OFFICER = "user-O", AUTHOR = "user-A";
const call = async (method: string, path: string, body?: unknown, actor = OFFICER) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
type Fee = { subject: string; key: string; amount_cents: number; exempt: boolean };
type Prep = { derived: boolean; fees_worked_out: boolean; fees_why: string | null; basis: string; filings: { label: string; owner?: { subject: string } }[]; groups: { total_cents: number | null }[]; fees: Fee[] };

// A copy that already holds the configured checkpoint (a re-run) is used as it is; a blank copy loads it.
const has = sql(`select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='sp.outside'`) !== "0";
const loaded = has ? { status: 200, body: null } : await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
if (loaded.status >= 300) { console.log("FAIL  the configured checkpoint did not load", loaded.status, JSON.stringify(loaded.body).slice(0, 300)); process.exit(1); }
const combo = (key: string) => sql(`select id from combination where combination_key='${key}'`);
const lines = (key: string) => JSON.parse(sql(`select r.snapshot->'combination'->'participants' from config_release r join combination c on c.id=r.combination_id where c.combination_key='${key}' order by r.version desc limit 1`) || "[]") as { role: string; filingMode?: string; addsFiling?: { filing: string; fee?: string[] } }[];
const sp = lines("sp.outside");
ok("BK-15 setup: the Study permit's release has every family member file their own (no on_principal), with a spouse or partner line",
  ["principal", "spouse_or_partner", "child"].every((r) => sp.find((l) => l.role === r)?.filingMode === "files_own") && !sp.some((l) => l.filingMode === "on_principal"), sp.map((l) => [l.role, l.filingMode]));
ok("BK-15 setup: the child's line adds a study permit when they will study 6 months or more, naming its fee lines (saved through the product's route on a line that files its own)",
  JSON.stringify(sp.find((l) => l.role === "child")?.addsFiling?.fee) === JSON.stringify(["study_permit", "biometrics"]) && sp.find((l) => l.role === "child")?.addsFiling?.filing === "Study permit", sp.find((l) => l.role === "child"));

// The family, opened and answered by the case officer through the routes a person uses.
const family = async (key: string, ref: string) => {
  const open = await call("POST", "/runtime/cases", { combinationId: combo(key), reference: `${ref}-${Date.now()}`, clientActor: "user-Q", principal: { displayName: "Sample Applicant A" } });
  const id: string = open.body?.id;
  const add = async (role: string, name: string) => (await call("POST", `/runtime/cases/${id}/people`, { role, displayName: name })).body?.subject_id as string;
  const S = await add("spouse_or_partner", "Sample Spouse A"), K1 = await add("child", "Sample Child S"), K2 = await add("child", "Sample Child V");
  const A = ((await call("GET", `/runtime/cases/${id}`)).body.people as { role: string; subject_id: string }[]).find((x) => x.role === "principal")!.subject_id;
  // Ages on the application date: 30, 31, 15, 9 (the child of 9 is under biometrics' 14).
  for (const [s, dob] of [[A, "1996-03-01"], [S, "1995-05-01"], [K1, "2011-02-01"], [K2, "2017-02-01"]]) await call("PUT", `/runtime/cases/${id}/answers/${s}/person.date_of_birth`, { value: dob, expectedId: null });
  return { id, A, S, K1, K2, prep: async () => (await call("GET", `/runtime/cases/${id}/prepare`)).body as Prep, status: open.status };
};
const f = await family("sp.outside", "BK15");
// Child V will not study 6 months or more (answered No); Child S is left unanswered for now.
const vNo = (await call("PUT", `/runtime/cases/${f.id}/answers/${f.K2}/person.studies_six_months_or_more`, { value: false, expectedId: null })).status;
// Break M2 (BR-10): before Child S's "6 months or more" is answered, which application they make is not known: no fee.
const before = await f.prep();
ok("BK-15 fail (break M2): unanswered, the case charges nothing and says it waits for Child S's answer; their filing is not named a visitor visa",
  !before.fees_worked_out && before.fees.length === 0 && /Waits for Sample Child S's answer/.test(before.fees_why ?? "") && before.filings.find((x) => x.owner?.subject === f.K1)?.label === "Application to be decided: Sample Child S", { why: before.fees_why, labels: before.filings.map((x) => x.label) });
const studies = (await call("PUT", `/runtime/cases/${f.id}/answers/${f.K1}/person.studies_six_months_or_more`, { value: true, expectedId: null })).body?.answer?.id;
ok("BK-15 setup: a Study permit family of four is opened; Child V's \"6 months or more\" answered No, then Child S's Yes", f.status === 201 && !!f.K2 && vNo === 200 && !!studies);
let p = await f.prep();
const label = (s: string) => p.filings.find((x) => x.owner?.subject === s)?.label;
const linesOf = (s: string) => p.fees.filter((x) => x.subject === s).map((x) => x.key).sort().join(",");
const cents = (s: string, line: string) => p.fees.filter((x) => x.subject === s && x.key === line).reduce((n, x) => n + x.amount_cents, 0);
ok("BK-15 pass: one filing per person, each named by the document they apply for", p.derived && p.filings.length === 4 && /^Study permit \(outside Canada\): /.test(label(f.A) ?? "") && label(f.S) === "Work permit: Sample Spouse A" && label(f.K1) === "Study permit: Sample Child S" && label(f.K2) === "Visitor visa: Sample Child V", p.filings.map((x) => x.label));
ok("BK-15 pass: the fees are worked out, with one total for the family", p.fees_worked_out && p.groups.length === 1 && p.groups[0].total_cents === 825_00, { why: p.fees_why, total: p.groups.map((g) => g.total_cents) });
ok("BK-15 pass: the student pays the study permit (CAD 150) and biometrics", linesOf(f.A) === "biometrics,study_permit" && cents(f.A, "study_permit") === 150_00, linesOf(f.A));
ok("BK-15 pass: the spouse pays the work permit (CAD 155), the open work permit holder fee (CAD 100) and biometrics", linesOf(f.S) === "biometrics,open_work_permit_holder,work_permit" && cents(f.S, "work_permit") === 155_00 && cents(f.S, "open_work_permit_holder") === 100_00, linesOf(f.S));
ok("BK-15 pass: the child who studies pays the study permit (CAD 150) on their own filing", linesOf(f.K1) === "biometrics,study_permit" && cents(f.K1, "study_permit") === 150_00, linesOf(f.K1));
ok("BK-15 pass: the child who does not study pays the visitor visa (CAD 100); exempt from biometrics at 9", linesOf(f.K2) === "biometrics,visitor_visa" && cents(f.K2, "visitor_visa") === 100_00 && p.fees.some((x) => x.subject === f.K2 && x.key === "biometrics" && x.exempt && x.amount_cents === 0), p.fees.filter((x) => x.subject === f.K2));
ok("BK-15 fail (C5): the child who does not study and the spouse are never charged a study permit", p.fees.filter((x) => x.key === "study_permit").length === 2 && !p.fees.some((x) => x.key === "study_permit" && (x.subject === f.K2 || x.subject === f.S)));
ok("BK-15 fail: only the spouse is charged a work permit or the open work permit holder fee; only the child who does not study a visitor visa",
  p.fees.filter((x) => x.key === "work_permit" || x.key === "open_work_permit_holder").length === 2 && p.fees.filter((x) => x.key === "work_permit" || x.key === "open_work_permit_holder").every((x) => x.subject === f.S)
  && p.fees.filter((x) => x.key === "visitor_visa").length === 1 && p.fees.filter((x) => x.key === "visitor_visa").every((x) => x.subject === f.K2));
ok("BK-15 pass: the case says what stays Sample (open work permit eligibility, a visa-exempt child, the Québec CAQ), with no file path nor decision code of its own", /open work permit/.test(p.basis) && /visa-exempt/.test(p.basis) && /CAQ/.test(p.basis) && !/samples\/|\.json|P-486/.test(p.basis), p.basis);

// The child stops studying (answered No): their filing becomes a visitor visa, never a study permit.
await call("PUT", `/runtime/cases/${f.id}/answers/${f.K1}/person.studies_six_months_or_more`, { value: false, expectedId: studies });
p = await f.prep();
ok("BK-15 fail: answered No, Child S files a visitor visa (CAD 100), never a study permit; the total follows (CAD 775)", label(f.K1) === "Visitor visa: Sample Child S" && p.fees.some((x) => x.subject === f.K1 && x.key === "visitor_visa") && !p.fees.some((x) => x.subject === f.K1 && x.key === "study_permit") && p.groups[0].total_cents === 775_00, { label: label(f.K1), total: p.groups[0]?.total_cents });

// Visitor visa unchanged: the same family pays four visitor visas and biometrics capped, labels as before.
const v = await family("vv.single", "BK15VV");
p = await v.prep();
ok("BK-15 pass: Visitor visa is unchanged: four visitor visas (CAD 400) and biometrics capped (CAD 170), each filing \"Visitor visa: <person>\"",
  p.fees_worked_out && p.filings.length === 4 && p.filings.every((x) => /^Visitor visa: /.test(x.label)) && p.groups[0].total_cents === 570_00 && p.fees.length > 0 && !p.fees.some((x) => x.key !== "visitor_visa" && x.key !== "biometrics"), { total: p.groups[0]?.total_cents, labels: p.filings.map((x) => x.label) });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
