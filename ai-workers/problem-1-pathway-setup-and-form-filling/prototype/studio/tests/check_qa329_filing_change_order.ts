// QA-329 (Bug, Major, C6.13; qa's gate A walk on main 1a2823c53, product/qa/reports/2026-11-09-gate-a-walks/walk-c92-c613.md):
// after a person is added to a case, every filing change was refused 409 "Changed since you looked" though nothing had
// changed. Cause, proven here: api/src/filing-changes.ts's check under the case lock compared JSON.stringify of the
// people read twice, once in the case's order (`order`) and once unordered; a JSON object keeps its keys in insertion
// order, so the same people read in a different physical order gave a different string. The walk's state is made on
// purpose: a child is added ("Add child (travelling)", the C6.12 route), then the table is rewritten in the order of its
// subject index (CLUSTER on this test copy only; an UPDATE to the same values stays in place and reorders nothing), so an
// unordered read meets the people in another order than the case's `order`, as the walk's case did.
// Checks: Remove filing and Make principal apply on that case; a real change made after a preview is still refused with
// 409 and writes nothing; a fresh preview then applies. Sample people, live AI off, no model call (US$0).
//   zsh studio/tools/isolated.sh rt_q329 4436 start && tsx studio/tests/check_qa329_filing_change_order.ts 4436 xr_studio_rt_q329
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { DB, FAMILY, PORT, call, needVisitorVisa, openCase, sql } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const releases = () => { try { return Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`)); } catch { return 0; } };
const studio = join(import.meta.dirname, ".."), tsx = join(studio, "node_modules", ".bin", "tsx");
const setup = (file: string) => spawnSync(tsx, ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { cwd: join(studio, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts");
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());

const vv = needVisitorVisa();
const c = await openCase(vv, FAMILY);
const officer = c.officer;
const [S, K1, K2] = ["Sample Spouse A", "Sample Child A1", "Sample Child A2"].map((n) => c.subjects[n]);
const added = await call("POST", `/runtime/cases/${c.id}/people`, { role: "child", displayName: "Sample Child A3", applies: true }, officer);
const K3 = sql(`select subject_id from case_participant where case_id='${c.id}' and role='child' order by "order" desc limit 1`) ?? "";
ok("setup: \"Add child (travelling)\" adds Sample Child A3 to the case (the C6.12 route)", [200, 201].includes(added.status) && !!K3 && ![K1, K2].includes(K3), { status: added.status, K3 });

/** The walk's state: the rows stored in the subject index's order, so an unordered read differs from the case's order
 *  (`order`). Nothing a person sees changes; CLUSTER rewrites only where the rows sit. */
const reorder = () => { sql(`cluster case_participant using case_participant_subject_id_key`); sql(`analyze case_participant`); };
const unordered = () => (sql(`select string_agg(subject_id::text, ',') from (select subject_id from case_participant where case_id='${c.id}' and role <> 'case') x`) ?? "").split(",");
const ordered = () => (sql(`select string_agg(subject_id::text, ',' order by "order") from case_participant where case_id='${c.id}' and role <> 'case'`) ?? "").split(",");
const changes = () => Number(sql(`select count(*) from filing_change where case_id='${c.id}'`) ?? -1);
const change = async (kind: string, subject: string, basis?: string) => {
  const b = basis ?? (await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind, subject, preview: true }, officer)).body?.basis;
  return call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind, subject, basis: b, reason: "QA-329 check on a test copy (Sample)" }, officer);
};

reorder();
ok("setup: the people read without an order come back in a different order than the case's own (the state qa's walk met)", unordered().join() !== ordered().join(), { unordered: unordered(), ordered: ordered() });

// 1 · Remove filing on the case where a child was added.
let n0 = changes();
let r = await change("remove_filing", K3);
ok("QA-329 fail-first: on a case where \"Add child (travelling)\" was used, Remove filing (the added child) applies (200), nothing having changed since the preview", r.status === 200 && r.body?.done === true && changes() === n0 + 1, { status: r.status, body: r.body?.title ?? r.body?.words });

// 2 · Make principal on the same case, its rows read out of order again.
reorder();
n0 = changes();
r = await change("make_principal", S);
ok("QA-329 fail-first: on the same case, Make principal (the spouse) applies (200)", r.status === 200 && r.body?.done === true && changes() === n0 + 1 && sql(`select role from case_participant where subject_id='${S}'`) === "principal", { status: r.status, body: r.body?.title ?? r.body?.words });

// 3 · A real change made after a preview is still refused, and writes nothing.
reorder();
const stale = (await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: K1, preview: true }, officer)).body?.basis;
const meanwhile = await change("remove_filing", K2);
n0 = changes();
const applies1 = sql(`select applies from case_participant where subject_id='${K1}'`);
r = await change("remove_filing", K1, stale);
ok("QA-329 pass (BR-8 kept): a real change made after the preview (another filing removed) still refuses the apply with 409 \"Changed since you looked\", and nothing is written",
  meanwhile.status === 200 && r.status === 409 && /Changed since you looked/.test(String(r.body?.title)) && changes() === n0 && sql(`select applies from case_participant where subject_id='${K1}'`) === applies1, { meanwhile: meanwhile.status, status: r.status, title: r.body?.title });
r = await change("remove_filing", K1);
ok("QA-329 pass: after looking again (a fresh preview), the same change applies (200)", r.status === 200 && changes() === n0 + 1, { status: r.status, body: r.body?.title ?? r.body?.words });

process.exitCode = summary() ? 1 : 0;
