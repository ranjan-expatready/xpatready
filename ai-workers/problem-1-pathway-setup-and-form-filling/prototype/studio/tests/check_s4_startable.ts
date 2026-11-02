// S4 (BACKLOG; SA-1B-90): a case opens only on a startable release. Opening a case on a combination that Immigration
// programs shows as Not ready (released, but with missing items) is refused 409 with those missing items, in the
// catalogue's own words; a Live (READY) combination opens as before. The Not ready state is made the way a person can
// cause it: a library field the release reads is retired, so one of its rules no longer resolves (the validator's
// "not in the library"). No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_s4 4437 start && tsx studio/tests/check_s4_startable.ts 4437 xr_studio_runtime_s4
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_runtime_s4";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O";
const studio = join(import.meta.dirname, "..");

(async () => {
  if (sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") === "0") {
    const r = spawnSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { encoding: "utf8", timeout: 600_000, maxBuffer: 1 << 26 });
    ok("setup: the Visitor visa released on this copy (setup_visitor_visa.ts)", r.status === 0, r.stderr?.slice(-200));
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const FIELD = "case.funds_available_cad"; // read by the release's form fields and its check VV_FUNDS_ABOVE_ZERO
  const was = sql(`select status from canonical_field where canonical_field_key='${FIELD}'`);
  // A retire or restore in the app writes an audit row, which is what refreshes the catalogue's cache; the SQL below
  // stands in for the library screen, so it writes one too.
  const audited = (what: string) => sql(`insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), workspace_id, 'user-A', 'updated', 'field', '${FIELD}', 'S4 check: ${what} ${FIELD}' from canonical_field where canonical_field_key='${FIELD}'`);
  const row = async () => {
    const d = (await call("GET", "/catalogue", undefined, "user-A")).body;
    return (d?.rows ?? []).find((x: { combinationId: string }) => x.combinationId === vv) as { status: string; missing: { code: string; text: string }[] } | undefined;
  };
  const open = (ref: string) => call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: "user-P", principal: { displayName: "Sample Client S4" }, representative: "user-R", caseOfficers: [OFFICER] }, OFFICER);
  const cases = () => Number(sql(`select count(*) from runtime_case where combination_id='${vv}'`));

  let r0 = await row();
  let r = await open(`S4-${Date.now().toString(36)}-a`);
  ok("S4 pass: on a Live (READY) combination a case opens as before (201)", r0?.status === "READY" && r.status === 201, { status: r0?.status, open: r.status });

  // A library field the release reads is retired: one of its rules no longer resolves, so it is Not ready.
  sql(`update canonical_field set status='RETIRED' where canonical_field_key='${FIELD}'`); audited("retired");
  r0 = await row();
  const before = cases();
  r = await open(`S4-${Date.now().toString(36)}-b`);
  const missing = (r.body?.missing ?? []) as { code: string; text: string }[];
  ok("S4 fail: the same combination, now Not ready in Immigration programs, refuses a new case (409 \"Not ready for cases\"); no case is written", r0?.status === "NOT_READY" && r.status === 409 && r.body?.title === "Not ready for cases" && cases() === before, { status: r0?.status, open: r.status, title: r.body?.title });
  ok("S4 fail: the missing item says what is wrong (the rule reading the retired field)", missing.some((m) => m.code === "rule_problem" && m.text.includes(FIELD)), missing.map((m) => m.code));
  ok("S4 fail: the refusal lists the missing items in the catalogue's own words, the same lines, in its detail too", missing.length > 0 && missing.length === (r0?.missing ?? []).length && missing.every((m, i) => m.text === r0!.missing[i].text && (r.body?.detail ?? "").includes(m.text)), { refusal: missing.map((m) => m.text), catalogue: r0?.missing?.map((m) => m.text) });
  ok("S4 fail: the refusal names the combination and says it is released but not ready", /"Visitor visa" is released but not ready for cases/.test(r.body?.detail ?? ""), r.body?.detail);

  // Cases already open keep working on their pinned release (only new cases are refused).
  const existing = sql(`select id from runtime_case where combination_id='${vv}' order by created_at limit 1`);
  ok("S4 pass: a case already open on it still reads (only opening is refused)", (await call("GET", `/runtime/cases/${existing}`, undefined, OFFICER)).status === 200);

  // The field is restored: Live again, and a case opens.
  sql(`update canonical_field set status='${was}' where canonical_field_key='${FIELD}'`); audited("restored");
  r0 = await row();
  r = await open(`S4-${Date.now().toString(36)}-c`);
  ok("S4 pass: once the cause is gone the combination is Live again and a case opens (201)", r0?.status === "READY" && r.status === 201, { status: r0?.status, open: r.status });
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { ok("S4: the check ran to its end", false, (e as Error).message); process.exitCode = 1; });
