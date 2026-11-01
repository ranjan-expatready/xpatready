// C6.12 API checks (M3-B, runtime lane): GET /api/runtime/cases/:id/filings on a released Visitor visa, on an isolated
// copy where setup_visitor_visa.ts released it. Derived on every read from the case's people: who files, the one
// submission group, the fee lines with the family maximums and their source; who may read them. Each rule has a passing
// and a failing case. No model call (US$0). Amounts Sample until the immigration expert confirms (P-171).
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
//   tsx studio/tests/runtime/check_vv_filings_api.ts 4430 xr_studio_runtime_r1
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4430), DB = process.argv[3] ?? "xr_studio_runtime_r1";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A";
const run = Date.now().toString(36);

(async () => {
  const vv = sql("select id from combination where combination_key='vv.single'");
  let r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `M3B-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  ok("setup: a Visitor visa case opens", r.status === 201 || r.status === 200, r.body?.detail);
  const caseId: string = r.body?.id;
  const filings = (who = OFFICER) => call("GET", `/runtime/cases/${caseId}/filings`, undefined, who);

  r = await filings();
  ok("C6.12 pass: one person → one Visitor visa filing, CAD 100 and biometrics CAD 85, from the pinned release", r.status === 200 && r.body.derived === true && r.body.filings.length === 1 && r.body.groups[0].totalCents === 185_00 && r.body.release_version >= 1 && r.body.combination === "vv.single", r.body);
  ok("C6.12: the case row is never a filing", !r.body.filings.some((f: { role: string }) => f.role === "case") && !r.body.notFiling.some((f: { role: string }) => f.role === "case"));
  ok("C6.12 P-170: the fee lines carry the IRCC fee list URL, its words and the date read", r.body.groups[0].fees.every((f: { source: { url: string; quote: string; read: string } }) => /ircc\.canada\.ca/.test(f.source.url) && /same time and place/.test(f.source.quote) && f.source.read === "2026-10-29"));

  // Grow the family to six: the CAD 500 maximum applies.
  const spouse = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse A" }, OFFICER)).body?.subject_id as string;
  for (let i = 1; i <= 4; i++) await call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: `Sample Child ${i}` }, OFFICER);
  r = await filings();
  const vvFee = (b: { groups: { fees: { key: string; totalCents: number; capApplied: boolean }[] }[] }) => b.groups[0].fees.find((f) => f.key === "visitor_visa")!;
  ok("C6.12 pass: six people in one submission group → six filings, the family maximum CAD 500 (not CAD 600) and biometrics CAD 170", r.status === 200 && r.body.filings.length === 6 && r.body.groups.length === 1 && r.body.groups[0].filings.length === 6 && vvFee(r.body).totalCents === 500_00 && vvFee(r.body).capApplied && r.body.groups[0].totalCents === 670_00, r.body.groups?.[0]);

  // The spouse stops travelling: no filing, no fee, five left (CAD 500 is the plain total, no cap claimed).
  r = await call("PATCH", `/runtime/cases/${caseId}/people/${spouse}`, { applies: false }, OFFICER);
  ok("setup: the spouse is marked not travelling", r.status === 200, r.body?.detail);
  r = await filings();
  ok("C6.12 fail: a person not applying has no filing and no fee, and the reason says so", r.body.filings.length === 5 && r.body.notFiling.length === 1 && r.body.notFiling[0].subjectId === spouse && /no filing and no fee/.test(r.body.notFiling[0].why) && vvFee(r.body).totalCents === 500_00 && !vvFee(r.body).capApplied, r.body.notFiling);

  // Who may read it.
  r = await filings(CLIENT);
  ok("C6.12 fail: the client cannot read the filings and fees (403)", r.status === 403, r.body?.detail);
  r = await filings(AUTHOR);
  ok("C6.12 fail: a configuration person cannot read a case's fees (403)", r.status === 403, r.body?.detail);
  r = await call("GET", `/runtime/cases/00000000-0000-4000-8000-000000000000/filings`, undefined, OFFICER);
  ok("C6.12 fail: an unknown case is not found (404)", r.status === 404, r.body?.detail);
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
