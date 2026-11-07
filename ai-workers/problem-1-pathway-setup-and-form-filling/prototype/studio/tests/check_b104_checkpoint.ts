// B104 (P-351; review M1 on #1084): the configured checkpoint carries journey J7 Stage 1's parts on Visitor visa's release
// 1 (and what the newest release keeps of them, since #1085 makes release 2), set by the step in api/src/checkpoint-stage-one.ts from samples/checkpoint-stage-one.json: who signs IMM 5257, IMM
// 5707 and IMM 5476, the IRCC account (APR Portal), and the eligibility gates with the officer's judgement lines. Release 1 is read from its
// own row (sql); the newest release through the author's and the case officer's own routes; it fails if the step is not called. Also: the forms the data
// leaves unset stay unset, no other combination is touched, nothing was refused, and the log is in plain words. The
// step's refusal paths are checked offline (tests/check_b104_stage_one.ts). Live AI off; no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_b104 4436 start && tsx studio/tests/check_b104_checkpoint.ts 4436 xr_studio_runtime_b104
import { stageOneOf } from "../api/src/checkpoint-stage-one-data.ts";
import { AUTHOR, OFFICER, PORT, call, needVisitorVisa, openCase, sql } from "../acceptance/lib/m3.ts";

if (PORT === 4400) { console.error("never the demo (:4400)"); process.exit(2); }
let failed = 0;
const ok = (label: string, cond: boolean, detail: unknown = "") => { if (!cond) failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}${cond ? "" : ` — ${JSON.stringify(detail).slice(0, 400)}`}`); };

(async () => {
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  const load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
  if (reset.status >= 300 || load.status >= 300) { console.error("STOP  the configured checkpoint did not load", reset.status, load.status, load.body?.detail ?? load.body?.message); process.exit(2); }
  const log = (load.body.log as string[]).filter((l) => /J7 Stage 1/.test(l));
  ok("B104-L1 pass: the load says Visitor visa's Stage 1 parts were set, refusing none", log.length === 1 && /vv\.single/.test(log[0]) && !/refused/.test(log[0]), log);
  ok("B104-L2 pass: the log is in plain words, no engine keys (review m1)", log.length === 1 && /a parent, for a minor/.test(log[0]) && /APR Portal/.test(log[0]) && !/parent_for_minor|APR_PORTAL|person_and_representative/.test(log[0]), log);

  const vv = needVisitorVisa();
  const want = stageOneOf("vv.single")!;

  // Release 1 is the one the step prepares (it runs before release 1 is made). Since #1085 (B97, C10.1 row 9) the
  // checkpoint also makes release 2 of Visitor visa (IMM 5257 Online, so IMM 5645 replaces IMM 5707), so release 1 is
  // read from its own row, and the newest release, the one Review and release and every new case read, is checked for
  // what it carries over (review round 3, M1).
  type Form = { form_number: string; signed_by?: string | null; status?: string };
  const formsOf = (list: Form[] | undefined) => new Map((list ?? []).map((f) => [f.form_number, f.signed_by ?? null]));
  const r1raw = sql(`select snapshot->'forms' from config_release where combination_id = '${vv}' and version = 1`);
  const r1 = formsOf(r1raw ? (JSON.parse(r1raw) as Form[]) : undefined);
  ok("B104-L3 pass: release 1 names who signs IMM 5257 (a parent for a minor), IMM 5707 (the person), IMM 5476 (the person and the representative)",
    r1.size > 0 && want.signers!.every((s) => r1.get(s.form) === s.signedBy), Object.fromEntries(r1));
  ok("B104-L4 fail: the forms the data leaves unset (IMM 5257 SCH1, IMM 5409, IMM 5475, IRM 0002) have no signer in release 1",
    ["IMM 5257 SCH1", "IMM 5409", "IMM 5475", "IRM 0002"].every((f) => r1.has(f) && r1.get(f) === null), Object.fromEntries(r1));
  const pub = (await call("GET", `/combinations/${vv}/config?mode=published`, undefined, AUTHOR)).body?.snapshot;
  const now = formsOf(pub?.forms as Form[] | undefined);
  const carried = want.signers!.filter((s) => now.has(s.form));
  ok("B104-L3b pass: the newest release keeps the signer of each of those forms it still files (read through Review and release's route)",
    carried.length >= 2 && carried.every((s) => now.get(s.form) === s.signedBy), Object.fromEntries(now));
  const elig = (await call("GET", `/combinations/${vv}/eligibility-gates`, undefined, AUTHOR)).body;
  ok("B104-L5 pass: the newest release carries the 2 eligibility gates and the 4 officer's judgement lines, saved by the author",
    (elig?.released?.release ?? 0) >= 1 && elig.released.gates?.length === 2 && elig.released.judgement?.length === 4 && elig.savedBy === "Configuration author", { released: elig?.released?.release, gates: elig?.released?.gates?.length, judgement: elig?.released?.judgement?.length, savedBy: elig?.savedBy });
  const r1gates = sql(`select coalesce(jsonb_array_length(snapshot->'eligibility'->'gates'), 0) || '|' || coalesce(jsonb_array_length(snapshot->'eligibility'->'judgement'), 0) from config_release where combination_id = '${vv}' and version = 1`);
  ok("B104-L5b pass: release 1 itself carries the 2 gates and the 4 judgement lines", r1gates === "2|4", r1gates);
  const ch = (await call("GET", `/combinations/${vv}/channels`, undefined, AUTHOR)).body;
  ok("B104-L6 pass: Visitor visa files through the APR Portal (the Forms tab's account)", ch?.account === "APR_PORTAL", ch?.account);

  // Nothing else is touched: no other combination of the checkpoint gets an account, a signer or gates from this step.
  const others = (sql(`select combination_key || '|' || coalesce(portal_key, '-') || '|' || coalesce(eligibility->>'version', '0') from combination where combination_key <> 'vv.single'`) ?? "").split("\n").filter(Boolean);
  ok("B104-L7 fail: no other combination gets eligibility gates from the checkpoint (P-319: only what the data names)", others.length > 0 && others.every((x) => x.endsWith("|0")), others);

  // The next step a person takes: a case opened on the newest release reads the account and runs a case check (on main: 409).
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: null }]);
  const prep = (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, c.officer)).body;
  ok("B104-L8 pass: a case opened on the newest release is filed through the APR Portal", prep?.portal === "APR_PORTAL", { case: c.id, portal: prep?.portal });
  const run = await call("POST", `/runtime/cases/${c.id}/assessments`, { person: c.subjects["Sample Client A"] }, c.officer ?? OFFICER);
  ok("B104-L9 pass: its eligibility check runs (not refused 409 for a release with no rules)", run.status < 300 && /POSSIBLY_ELIGIBLE/.test(JSON.stringify(run.body)), { status: run.status, detail: run.body?.detail });

  console.log(failed ? `\n${failed} failed` : "\nall passed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("STOP", e); process.exit(2); });
