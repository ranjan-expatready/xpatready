// D1 (P-226; C11.7, C10.1): Demo › Reset to the six, POST /demo/reset-to-six {confirm:"RESET"}: in one request it
// empties all configuration as Reset does, then loads exactly the six P-148 combinations as Load sample "six" does.
// Saved AI results survive: after it the six's saved field-map answers replay (drafts.replayed >= 6, proposals waiting)
// and the committed files under p1/inventory, p2/jobs, p2/runs and p5/reader/runs are unchanged (QA-145's approach).
// Refusals: wrong or missing confirm 400, a person without the author duty 403, a second call while one runs 409.
// The blank Reset stays blank. A pass and a fail per rule. Replays only, no live AI call (US$0).
//   zsh studio/tools/isolated.sh rt_d1 4431 start && tsx studio/tests/check_d1_reset_to_six.ts 4431 xr_studio_rt_d1
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_rt_d1";
const PROTOTYPE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WAVE1 = join(PROTOTYPE, "studio", "samples", "wave1.json");
/** Committed saved AI results and their inputs (AGENTS rule 1: a clean clone). */
const WATCHED = [join(PROTOTYPE, "p1", "inventory"), join(PROTOTYPE, "p2", "jobs"), join(PROTOTYPE, "p2", "runs"), join(PROTOTYPE, "p5", "reader", "runs")];
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
/** Every file under the watched folders: path → size, modification time and checksum. */
const snapshot = () => {
  const out = new Map<string, string>();
  const walk = (d: string) => { if (!existsSync(d)) return; for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else { const s = statSync(p); out.set(p.slice(PROTOTYPE.length + 1), `${s.size}|${s.mtimeMs}|${createHash("sha256").update(readFileSync(p)).digest("hex")}`); } } };
  for (const d of WATCHED) walk(d);
  return out;
};
const diff = (a: Map<string, string>, b: Map<string, string>) => ({ added: [...b.keys()].filter((k) => !a.has(k)), changed: [...b.keys()].filter((k) => a.has(k) && a.get(k) !== b.get(k)), removed: [...a.keys()].filter((k) => !b.has(k)) });
const clean = (d: ReturnType<typeof diff>) => d.added.length + d.changed.length + d.removed.length === 0;
/** Configuration rows of the current workspace, by kind (what P-226 says goes). */
const config = () => {
  const ws = sql(`select id from workspace limit 1`);
  const c = (t: string) => n(`select count(*) from ${t} where workspace_id='${ws}'`);
  return { ws, combinations: c("combination"), fields: c("canonical_field"), sections: c("logical_section"), questions: c("section_question"), documentTypes: c("document_type"), checks: c("check_def"), rules: c("predicate"), releases: c("config_release") + c("pack_version"), cases: c("runtime_case"), workspaces: n(`select count(*) from workspace`) };
};
const orphans = () => sql(`select table_name from information_schema.columns where table_schema='public' and column_name='workspace_id' and table_name <> 'workspace' order by 1`).split("\n").filter(Boolean)
  .map((t) => [t, n(`select count(*) from "${t}" where workspace_id not in (select id from workspace)`)] as const).filter(([, k]) => k > 0);

(async () => {
  const files0 = snapshot();
  if (files0.size === 0) { console.error("STOP  no committed saved AI results found under", WATCHED); process.exit(2); }
  // A fully configured start: the suites' fixture holds a released configuration, library fields, sections,
  // document types, rules and checks, and a seventh combination (Super visa) that is not one of the six.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const fx = await call("POST", "/demo/load", {});
  if (fx.status >= 300) { console.error("STOP  the fixture did not load", fx.body); process.exit(2); }
  const before = config();
  ok("setup: the start is configured (a release, library fields, sections, document types, rules, a Super visa)", before.releases > 0 && before.fields > 0 && before.sections > 0 && before.documentTypes > 0 && before.rules > 0 && n(`select count(*) from combination where label='Super visa'`) === 1, before);

  // Refusals first: nothing changes.
  const missing = await call("POST", "/demo/reset-to-six", {});
  const wrong = await call("POST", "/demo/reset-to-six", { confirm: "reset" });
  ok("D1 fail: a missing or wrong confirmation (not exactly RESET) is refused 400 with words, nothing changed", missing.status === 400 && wrong.status === 400 && /Type RESET/.test(String(wrong.body?.message)) && config().ws === before.ws && config().combinations === before.combinations, [missing.status, wrong.status, wrong.body?.message]);
  const client = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, "user-P");
  const officer = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, "user-O");
  const approver = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, "user-B");
  const nobody = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, "someone");
  ok("D1 fail: the same permission as Reset: a client, a case officer and the Approver are refused 403, nobody 401; nothing changed", client.status === 403 && officer.status === 403 && approver.status === 403 && nobody.status === 401 && config().ws === before.ws, [client.status, officer.status, approver.status, nobody.status]);
  const plainLoad = await call("POST", "/demo/load", { sample: "six" });
  ok("D1 fail: Load sample alone on a configured workspace is refused (409): the reset part is what makes the six load", plainLoad.status === 409, plainLoad.body?.message);

  // The one action, twice at once: one runs, the other is told to wait.
  const ledger0 = ledger();
  const [a, b] = await Promise.all([call("POST", "/demo/reset-to-six", { confirm: "RESET" }), call("POST", "/demo/reset-to-six", { confirm: "RESET" })]);
  const okOne = [a, b].filter((r) => r.status < 300), refused = [a, b].filter((r) => r.status === 409);
  ok("D1 fail: a second Reset to the six while one runs is refused 409 with words (a double click runs once)", okOne.length === 1 && refused.length === 1 && /already running/.test(String(refused[0]?.body?.message)), [a.status, b.status, refused[0]?.body?.message]);
  const r = okOne[0]!;
  const after = config();
  ok("C10.1 pass (P-226): Reset to the six empties all configuration first: the old workspace is gone and no table keeps a row of it", r.body?.reset?.removed_rows > 0 && after.ws !== before.ws && after.workspaces === 1 && orphans().length === 0, { removed: r.body?.reset?.removed_rows, orphans: orphans() });
  ok("C10.1 pass (P-226): no library field, section, question, document type, rule, check, release or case is left; the Super visa is gone", after.fields === 0 && after.sections === 0 && after.questions === 0 && after.documentTypes === 0 && after.rules === 0 && after.checks === 0 && after.releases === 0 && after.cases === 0 && n(`select count(*) from combination where label='Super visa'`) === 0, after);
  const combos = r.body?.combinations ?? [];
  ok("C11.7 pass (P-226, P-148): then exactly the six combinations are loaded, 3 Pathways, the six's labels", after.combinations === 6 && combos.length === 6 && n(`select count(*) from program_def where workspace_id='${after.ws}' and node_kind='PATHWAY'`) === 3 && ["Visitor visa", "Outside Canada", "With an LMIA – inside Canada", "Express Entry stream", "Spouse or common-law partner", "High-wage position"].every((l) => combos.some((c: { label: string }) => c.label.endsWith(` › ${l}`))), combos.map((c: { label: string }) => c.label));
  const want = combos.reduce((s: number, c: { files: number }) => s + c.files, 0);
  ok("C11.7 pass (P-226): with their official PDFs through the form intake, one attachment per file on each combination", want >= 30 && n(`select count(*) from source_attachment where workspace_id='${after.ws}'`) === want, { want, have: n(`select count(*) from source_attachment where workspace_id='${after.ws}'`) });

  // Saved AI results survive and replay.
  const waiting = n(`select count(*) from proposal_item where workspace_id='${after.ws}' and status='waiting' and origin='ai'`);
  ok("P-226 pass: a saved AI result recorded before the reset replays after it: >= 6 saved field-map answers, proposals waiting", r.body?.drafts?.replayed >= 6 && r.body?.drafts?.status === "COMPLETED" && waiting > 0 && waiting === r.body?.drafts?.proposals_waiting, r.body?.drafts);
  ok("P-226 pass: the replays are saved answers (mode REPLAY), no live run, US$0: the spend ledger unchanged", n(`select count(*) from drafting_job where workspace_id='${after.ws}' and kind='field_map' and mode='REPLAY' and status='COMPLETED'`) === r.body?.drafts?.replayed && n(`select count(*) from ai_batch where workspace_id='${after.ws}' and mode='LIVE'`) === 0 && ledger() === ledger0, { ledger: [ledger0, ledger()] });
  ok("P-226 pass: Reset's own fingerprints of the saved AI results and other kept evidence are byte-identical before and after", r.body?.reset?.preserved_unchanged === true && (r.body?.reset?.preserved ?? []).some((p: { label: string; files: number }) => /AI run records/.test(p.label) && p.files > 0), r.body?.reset?.preserved?.map((p: { label: string; files: number }) => `${p.label}: ${p.files}`));
  let d = diff(files0, snapshot());
  ok("P-226 pass (QA-145): the committed files under p1/inventory, p2/jobs, p2/runs and p5/reader/runs are unchanged", clean(d), d);
  // Fail-guard: the same comparison finds a file that is added (planted, then removed).
  const planted = join(PROTOTYPE, "p2", "jobs", `d1-planted-${process.pid}.json`);
  writeFileSync(planted, "{}");
  d = diff(files0, snapshot());
  rmSync(planted);
  ok("P-226 fail-guard: a file added under the saved AI results is found and named", d.added.length === 1 && d.added[0].endsWith(`d1-planted-${process.pid}.json`), d.added);
  const again = await call("POST", "/demo/load", { sample: "six" });
  ok("C11.7 fail: after Reset to the six, Load sample is refused (409), nothing doubled", again.status === 409 && config().combinations === 6, again.body?.message);

  // A failure midway leaves a clear state: the sample file is unreadable, so the load part stops before any row.
  renameSync(WAVE1, `${WAVE1}.d1-away`);
  let mid: Awaited<ReturnType<typeof call>>;
  try { mid = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }); } finally { renameSync(`${WAVE1}.d1-away`, WAVE1); }
  const midState = config();
  ok("D1 fail: a failure in the load part says so (500, the configuration emptied, choose Reset to the six again) and leaves the workspace empty", mid.status === 500 && /emptied/.test(String(mid.body?.message)) && /Reset to the six again/.test(String(mid.body?.message)) && midState.combinations === 0 && midState.fields === 0 && n(`select count(*) from program_def where workspace_id='${midState.ws}'`) === 0, [mid.status, mid.body?.message]);
  const retry = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  ok("D1 pass: choosing Reset to the six again after that failure gives exactly the six with their saved answers replayed", retry.status < 300 && config().combinations === 6 && retry.body?.drafts?.replayed >= 6, [retry.status, retry.body?.drafts?.replayed]);

  // The blank-everything Reset stays as it is.
  const blank = await call("POST", "/demo/reset", { confirm: "RESET" });
  const empty = config();
  ok("C10.1 pass (P-226, P-108): the blank Reset still empties everything and loads nothing", blank.status < 300 && blank.body?.remaining_rows === 0 && empty.combinations === 0 && n(`select count(*) from program_def`) === 0 && blank.body?.preserved_unchanged === true, { status: blank.status, remaining: blank.body?.remaining_rows });
  const blankWrong = await call("POST", "/demo/reset", { confirm: "RESET-TO-SIX" });
  ok("C10.1 fail: the blank Reset still refuses a wrong confirmation (400)", blankWrong.status === 400, blankWrong.status);
  d = diff(files0, snapshot());
  ok("P-226 pass: after every reset in this suite the committed saved AI results are exactly as committed", clean(d), d);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
