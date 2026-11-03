// C7.5 part 1 Review findings (runtime lane, M3-E; BR-19; AG-11-69, -70, -71): the routes on an isolated copy with the
// Visitor visa released twice (as check_c82_filing_record_api.ts). It runs pack 4's acceptance/C7.5.test.ts and requires
// its part 1 steps (C7.5-1…4, C7.5-10…14) to pass; C7.5-5…9 and -15 (the replayed AI review) are part 2 and are not
// required here. Then each rule of the finding's life with a passing and a failing case: who may read and act (a client
// 403, another firm's officer 404), waive (CRITICAL only, the representative of record), dismiss (never a CRITICAL one),
// one move per finding (409), a dismissed finding stays dismissed for the same facts and a changed fact is a new
// finding, two reads at once make one finding, hand-added findings checked, audit lines without values or reasons.
// No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c75 4435 start && tsx studio/tests/check_c75_findings_api.ts 4435 xr_studio_runtime_c75
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";
import * as m3 from "../acceptance/lib/m3.ts"; // pack 4's helpers (open a case, answer, confirm), on this same copy

const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_c75";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..");
const tsx = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(PORT), DB], { encoding: "utf8", timeout: 900_000 });
const releases = () => Number(sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") ?? 0);
type F = { id: string; filing: string | null; subject: string; person: string; form: string | null; field: string | null; severity: string; source: string; state: string; quote: string; rule: string | null; state_by: string | null; state_at: string | null; state_reason: string | null };
const PART1 = ["C7.5-1 ", "C7.5-2 ", "C7.5-3 ", "C7.5-4 ", "C7.5-10 ", "C7.5-11 ", "C7.5-12 ", "C7.5-13 ", "C7.5-14 "];

(async () => {
  if (releases() === 0) ok("setup: release 1 of the Visitor visa", tsx("tests/runtime/setup_visitor_visa.ts").status === 0 && releases() === 1);
  if (releases() === 1) { tsx("acceptance/lib/setup_vv_m3.ts"); ok("setup: release 2 (pack 4 setup)", releases() === 2); }

  const spend0 = sql("select count(*) from ai_batch");
  // Pack 4's own test: its part 1 lines must pass (the replayed AI review lines are part 2).
  const pack = tsx("acceptance/C7.5.test.ts");
  for (const step of PART1) { const line = pack.stdout.split("\n").find((l) => l.includes(` ${step}`)); ok(`C7.5 pack ${step.trim()} passes`, !!line && line.startsWith("PASS"), line ?? pack.stdout.slice(-400)); }

  const f = await m3.firms(), officer = f.officer ?? m3.OFFICER, rep = f.rep;
  const vv = m3.needVisitorVisa();
  const c = await m3.openCase(vv, [{ role: "principal", name: "Sample Client A", dob: "1986-04-13" }, { role: "child", name: "Sample Child A1", dob: m3.yearsAgo(10) }], { representative: rep, caseOfficers: [officer] });
  const [P, K] = [c.subjects["Sample Client A"], c.subjects["Sample Child A1"]];
  const list = async (q = "", actor = officer) => { const r = await call("GET", `/runtime/cases/${c.id}/findings${q}`, undefined, actor); return { r, fs: (r.body?.findings ?? []) as F[] }; };
  let { r, fs } = await list();
  ok("C7.5 a new case with no facts that disagree has no findings, and the counts say so", r.status === 200 && fs.length === 0 && r.body?.counts?.open === 0, r.body);
  ok("C7.5 AI off: the page says the AI review comes next, the rules still run (AG-11-71)", r.body?.ai?.available === false && /rules/i.test(r.body?.ai?.words ?? ""));

  // Who: a client 403 on every route, another firm's officer "not found".
  ok("C7.5 fail: a client cannot add a finding (403)", (await call("POST", `/runtime/cases/${c.id}/findings`, { subject: P, severity: "MINOR", note: "From a client" }, m3.CLIENT)).status === 403);
  ok("C7.5 fail: another firm's officer does not find the case (404)", (await call("GET", `/runtime/cases/${c.id}/findings`, undefined, m3.FIRM_READERS.solo)).status === 404);
  ok("C7.5 fail: a configuration person reaches no case (403)", (await call("GET", `/runtime/cases/${c.id}/findings`, undefined, m3.AUTHOR)).status === 403);
  ok("C7.5 fail: an unknown filter is refused in words (400)", (await list("?source=robots")).r.status === 400);

  // The visit and the child's passport disagree: one finding on the child, filed on the child's filing, on IMM 5257.
  await m3.answer(c.id, c.caseSubject, "case.intended_stay_from", "2030-03-01"); await m3.answer(c.id, c.caseSubject, "case.intended_stay_to", "2030-04-15");
  await m3.answer(c.id, K, "person.passport_expiry_date", "2030-04-01");
  await m3.prepare(c.id);
  ({ r, fs } = await list());
  const kid = fs.find((x) => x.subject === K);
  ok("C7.5 a rule finding is about the person whose fact disagrees, quotes both facts and names the rule in words", fs.length === 1 && !!kid && kid.person === "Sample Child A1" && kid.field === "person.passport_expiry_date" && /Apr 1, 2030.*Apr 15, 2030/.test(kid.quote) && /valid/.test(kid.rule ?? ""), fs);
  ok("C7.5 the rule finding names the form the fact fills (IMM 5257)", kid?.form === "IMM 5257", kid?.form);

  // Two reads at once make one finding (the partial unique index).
  await m3.answer(c.id, c.caseSubject, "case.intended_stay_to", "2030-02-01"); // the visit now ends before it starts (and the child's passport is fine)
  const both = await Promise.all([list(), list(), list()]);
  ({ fs } = await list());
  const stay = fs.filter((x) => x.state === "open" && x.field === "case.intended_stay_to");
  ok("C7.5 three reads at once: one open finding for the visit's dates, never three", both.every((b) => b.r.status === 200) && stay.length === 1, fs.map((x) => [x.field, x.state]));
  ok("C7.5 the child's passport finding resolved itself when the visit moved (by the rules)", fs.find((x) => x.id === kid?.id)?.state === "resolved" && fs.find((x) => x.id === kid?.id)?.state_by === "rules");
  ok("C7.5 a case-fact finding sits on the principal's filing", !!stay[0]?.filing && stay[0].filing === sql(`select f.id from filing f join filing_applicant a on a.filing_id=f.id where f.case_id='${c.id}' and a.subject_id='${P}' and f.active limit 1`), stay[0]?.filing);

  // Dismiss: needs a reason; stays dismissed for the same facts; a changed fact is a new finding.
  ok("C7.5 fail: dismiss without a reason (400)", (await call("POST", `/runtime/findings/${stay[0]?.id}/dismiss`, {}, officer)).status === 400);
  r = await call("POST", `/runtime/findings/${stay[0]?.id}/dismiss`, { reason: "The client confirmed the dates (Sample)" }, officer);
  ok("C7.5 dismissed with a reason, who and when (200)", r.status === 200 && r.body?.state === "dismissed" && r.body?.state_by === officer && !!r.body?.state_at && r.body?.state_reason === "The client confirmed the dates (Sample)", r.body);
  ({ fs } = await list("?state=open"));
  ok("C7.5 the dismissed finding does not come back on the next read (same facts)", !fs.some((x) => x.field === "case.intended_stay_to"), fs);
  ok("C7.5 fail: a dismissed finding is not moved again (409)", (await call("POST", `/runtime/findings/${stay[0]?.id}/acknowledge`, { reason: "Again" }, officer)).status === 409);
  await m3.answer(c.id, c.caseSubject, "case.intended_stay_to", "2030-02-10");
  ({ fs } = await list());
  ok("C7.5 a changed fact that still disagrees is a new Open finding; the dismissed one stays dismissed", fs.filter((x) => x.field === "case.intended_stay_to" && x.state === "open").length === 1 && fs.find((x) => x.id === stay[0]?.id)?.state === "dismissed", fs.map((x) => [x.field, x.state]));

  // Hand-added findings: checked; CRITICAL waived only by the representative of record, never dismissed.
  ok("C7.5 fail: a hand-added finding needs a severity from the team's list (400)", (await call("POST", `/runtime/cases/${c.id}/findings`, { subject: P, severity: "HUGE", note: "Photo (Sample)" }, officer)).status === 400);
  ok("C7.5 fail: a hand-added finding is about a person on this case (422)", (await call("POST", `/runtime/cases/${c.id}/findings`, { subject: "00000000-0000-4000-8000-000000000000", severity: "MINOR", note: "Photo (Sample)" }, officer)).status === 422);
  r = await call("POST", `/runtime/cases/${c.id}/findings`, { subject: P, severity: "CRITICAL", note: "Signature missing on the family form (Sample)", form: "IMM 5645" }, officer);
  const crit = r.body as F;
  ok("C7.5 staff add a CRITICAL finding by hand (201, source manual, open)", r.status === 201 && crit.source === "manual" && crit.state === "open" && crit.form === "IMM 5645", r.body);
  ok("C7.5 fail: a CRITICAL finding is not dismissed (422)", (await call("POST", `/runtime/findings/${crit.id}/dismiss`, { reason: "Not relevant" }, officer)).status === 422);
  ok("C7.5 fail: the case officer who is not the representative of record cannot waive it (403)", !rep || rep === officer || (await call("POST", `/runtime/findings/${crit.id}/waive`, { reason: "Checked by phone" }, officer)).status === 403);
  ok("C7.5 fail: the representative's waive needs a reason (400)", !!rep && (await call("POST", `/runtime/findings/${crit.id}/waive`, {}, rep)).status === 400);
  r = await call("POST", `/runtime/findings/${crit.id}/waive`, { reason: "Signed copy received by courier (Sample)" }, rep ?? "");
  ok("C7.5 the representative of record waives the CRITICAL finding with a reason (200)", r.status === 200 && r.body?.state === "waived" && r.body?.state_by === rep, r.body);

  // Acknowledge once only: a second acknowledge is refused, nothing overwritten.
  r = await call("POST", `/runtime/cases/${c.id}/findings`, { subject: K, severity: "MINOR", note: "Photo to retake (Sample)" }, officer);
  const minor = r.body as F;
  const two = await Promise.all([1, 2].map((n) => call("POST", `/runtime/findings/${minor.id}/acknowledge`, { reason: `Seen ${n} (Sample)` }, officer)));
  ok("C7.5 two acknowledges at once: one 200, one 409, one reason kept", two.filter((x) => x.status === 200).length === 1 && two.filter((x) => x.status === 409).length === 1 && Number(sql(`select count(*) from review_finding where id='${minor.id}' and state='acknowledged'`)) === 1, two.map((x) => x.status));
  ok("C7.5 fail: no such finding (404), a malformed id (404)", (await call("POST", `/runtime/findings/00000000-0000-4000-8000-000000000000/acknowledge`, { reason: "x y z" }, officer)).status === 404 && (await call("POST", `/runtime/findings/nope/acknowledge`, { reason: "x y z" }, officer)).status === 404);
  ok("C7.5 fail: another firm's officer cannot move a finding (404)", (await call("POST", `/runtime/findings/${minor.id}/acknowledge`, { reason: "From another firm" }, m3.FIRM_READERS.solo)).status === 404);

  // STANDARDS §5: audit lines name the case and the finding, never a fact's value or a typed reason.
  const audit = sql(`select string_agg(summary || ' ' || coalesce(detail::text,''), ' | ') from audit_event where entity='case' and entity_key='${c.id}' and action in ('acknowledged','waived','dismissed','added')`) ?? "";
  ok("C7.5 audit lines for each move and hand-added finding, without values or reasons", /acknowledged a MINOR/.test(audit) && /waived a CRITICAL/.test(audit) && /dismissed a MAJOR Rules finding/.test(audit) && !/2030|courier|Sample\)|Photo/.test(audit), audit.slice(0, 300));
  ok("C7.5 no model call anywhere (US$0)", spend0 !== null && sql("select count(*) from ai_batch") === spend0);

  process.exitCode = summary() ? 1 : 0;
})();
