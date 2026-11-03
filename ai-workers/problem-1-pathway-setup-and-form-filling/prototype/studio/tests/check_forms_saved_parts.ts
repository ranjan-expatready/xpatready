// C11.7 / C11.8 (P-108, P-138, P-227): Load sample and Saved use a form's saved PARTS, not only a whole-form saved answer.
// A form drafted in parts (A4) is saved part by part (IMM 5645: 4 parts from the C11.8 live run, #746). Saved now uses
// them when every part has a valid saved answer for exactly its inputs, assembled as a live draft in parts would be: no
// model call, the launcher never asked, US$0. A form with a part missing keeps waiting for Draft with AI, never half-filled,
// whether the part is missing when the plan is made or by the time the step runs.
// The missing part is induced with STUDIO_HIDE_SAVED_RUNS (honoured only on an isolated copy; the committed runs are never
// touched). The copy is started without the live switch, with the stand-in launcher; the check never sets a live switch.
// Run (usage line for run-suites.sh):
//   zsh studio/tools/isolated.sh forms_parts 4462 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_saved_parts.ts 4462 xr_studio_forms_parts
// Exit: 0 all pass · 1 a check failed · 2 setup missing (copy, sample, IMM 5645's saved parts).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { checkCopy, RUNS, sqlFor, stop } from "../acceptance/lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4462), DB = process.argv[3] ?? "xr_studio_forms_parts", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, "..");
const FAKE = "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs";
const VAR = join(STUDIO, "var", `isolated-${NAME}`), FAKE_LOG = join(VAR, "fake-launch.log");
const FORM = "IMM 5645 (01-2021)", HIDE = "imm5645e-p3of4";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const n = (q: string) => Number(sql(q));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");
const launcherCalls = () => (existsSync(FAKE_LOG) ? readFileSync(FAKE_LOG, "utf8").split("\n").filter(Boolean).length : 0);
const sharedLedger = () => createHash("sha256").update(existsSync(LEDGER_DIR) ? readdirSync(LEDGER_DIR).sort().map((f) => { try { return f + readFileSync(join(LEDGER_DIR, f), "utf8"); } catch { return f; } }).join("|") : "").digest("hex");
/** Restarts this copy (same database) with only the settings given here: never a live switch. */
const BLANK = { STUDIO_AI_LIVE: "", STUDIO_HOLD_QUEUE: "", STUDIO_FAKE_LAUNCHER: "", STUDIO_HIDE_SAVED_RUNS: "" };
const restart = async (...env: string[]) => {
  try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", `STUDIO_FAKE_LAUNCHER=${FAKE}`, ...env], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...BLANK } }); } catch { /* waited for below */ }
  for (let i = 0; i < 240; i++) { if ((await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).catch(() => null))?.status === 200) return; await sleep(500); }
  stop("the copy did not come back after a restart");
};
let induced = false;
const restore = () => { if (induced) { try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", `STUDIO_FAKE_LAUNCHER=${FAKE}`], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...BLANK } }); } catch { /* the runner stops the copy */ } } };
const load = async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", { sample: "six" });
  if (l.status >= 300) { restore(); stop(`the six did not load: ${l.status} ${words(l).slice(0, 160)}`); }
  return l.body;
};
const att = () => sql(`select id from source_attachment where file_name ilike 'imm5645%' order by id limit 1`);
const jobsOf = (id: string) => sql(`select mode || '/' || status from drafting_job where attachment_id='${id}' and kind='field_map' order by started_at`).split("\n").filter(Boolean);
const proposals = () => n(`select count(*) from proposal_item where form_edition='${FORM}' and origin='ai'`);

(async () => {
  await checkCopy(PORT, DB);
  const parts = readdirSync(RUNS).filter((f) => /^studio-fieldmap-imm5645e-p\dof4-[0-9a-f]{12}-live-/.test(f));
  if (parts.length !== 4) stop(`IMM 5645's four saved parts are not in p2/runs (found ${parts.length}); they come from the C11.8 live run (#746)`);
  const ai = (await call("GET", "/session")).body?.ai;
  if (ai?.live !== false || ai?.launcher !== "stand-in") stop(`start this copy without the live switch and with the stand-in launcher (see the run line); GET /session → ai: ${JSON.stringify(ai)}`);
  // The stand-in launcher answers and logs every call (review, Opus m4: without a scenario it stopped before logging, so
  // "never asked" could not fail): any stub pass or live call made by Saved shows in its log.
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the stand-in launcher was asked for a live call" } }));
  const shared0 = sharedLedger(), calls0 = launcherCalls();

  // ── Pass: every part saved
  let l = await load();
  let A = att();
  const jobs = jobsOf(A);
  const job = sql(`select coalesce(cost_usd, -1) || '|' || (detail->'a4'->'parts')::text from drafting_job where attachment_id='${A}' and kind='field_map' and mode='REPLAY'`).split("|");
  const partState = JSON.parse(job.slice(1).join("|") || "[]") as { status: string; saved: boolean; cost_usd: number }[];
  ok("C11.7 pass: Load sample uses IMM 5645's four saved parts: no form waits for Draft with AI", JSON.stringify(l.drafts?.waiting_for_draft_with_ai) === "[]", l.drafts);
  ok("C11.7 pass: IMM 5645 is one Saved step, completed at US$0, its four parts each from a saved answer", JSON.stringify(jobs) === JSON.stringify(["REPLAY/COMPLETED"]) && Number(job[0]) === 0 && partState.length === 4 && partState.every((p) => p.status === "done" && p.saved && p.cost_usd === 0), { jobs, cost: job[0], parts: partState });
  ok("C11.7 pass: its answer reaches the review queue as AI proposals, like any saved answer", proposals() > 0, proposals());
  const plan = (await call("POST", "/ai/plan", { scope: { kind: "source", ids: [A] }, mode: "REPLAY", draftAgain: true })).body;
  const t = plan?.targets?.[0];
  ok("P-227 pass: Saved on the form itself says it uses the saved answers of each of its 4 parts, US$0", t?.action === "reuse_saved_output" && /each of its 4 parts/.test(t.why) && t.a4?.parts?.length === 4 && plan?.totals?.worst_usd === 0, t && { action: t.action, why: t.why });
  ok("US$0: the launcher was never asked (no stub pass, no live call)", launcherCalls() === calls0, { calls: launcherCalls() - calls0 });
  const o = (await call("GET", `/attachments/${A}/draft-options`)).body;
  ok("P-227 pass (review, Opus Major 2): the form's own Draft with AI dialog is told all 4 parts are saved, so it offers Saved, not only Live", JSON.stringify(o?.saved_parts) === JSON.stringify({ parts: 4, saved: 4 }) && !(o?.saved_runs ?? []).some((r: { valid: boolean }) => r.valid), o?.saved_parts);

  // ── Fail (plan): a part missing when the plan is made
  induced = true;
  await restart(`STUDIO_HIDE_SAVED_RUNS=${HIDE}`);
  l = await load();
  A = att();
  ok("C11.7 fail: with one of the four parts missing, IMM 5645 waits for Draft with AI, named", JSON.stringify(l.drafts?.waiting_for_draft_with_ai) === JSON.stringify([FORM]), l.drafts);
  ok("C11.7 fail: never half-filled: no Saved step and no AI proposal for IMM 5645", jobsOf(A).length === 0 && proposals() === 0, { jobs: jobsOf(A), proposals: proposals() });
  const why = (await call("POST", "/ai/plan", { scope: { kind: "source", ids: [A] }, mode: "REPLAY", draftAgain: true })).body?.targets?.[0];
  ok("P-227 fail: Saved says in words that only 3 of its 4 parts have a saved answer", why?.action === "not_eligible" && /3 of its 4 parts only/.test(why.why) && /never half-filled/.test(why.why), why);
  const o3 = (await call("GET", `/attachments/${A}/draft-options`)).body;
  ok("P-227 fail: the form's own dialog is told only 3 of its 4 parts are saved (Saved stays closed there)", JSON.stringify(o3?.saved_parts) === JSON.stringify({ parts: 4, saved: 3 }), o3?.saved_parts);
  const q0 = n(`select count(*) from drafting_job`);
  const r = await call("POST", `/attachments/${A}/draft`, { mode: "replay", idempotencyKey: `parts-fail-${Date.now()}` });
  ok("P-227 fail: a Saved start for it is refused in those words; nothing is queued", r.status === 400 && /3 of its 4 parts only/.test(words(r)) && n(`select count(*) from drafting_job`) === q0, { status: r.status, m: words(r).slice(0, 160) });

  // ── Fail (runner): every part saved when the plan is made, one missing by the time the step runs
  await restart("STUDIO_HOLD_QUEUE=1");
  const s = await call("POST", `/attachments/${A}/draft`, { mode: "replay", idempotencyKey: `parts-held-${Date.now()}` });
  const J = s.body?.id as string | undefined;
  if (s.status !== 201 || !J) { restore(); stop(`the Saved step did not queue with every part present: ${s.status} ${words(s).slice(0, 160)}`); }
  await restart(`STUDIO_HIDE_SAVED_RUNS=${HIDE}`);
  let end = "";
  for (let i = 0; i < 240 && !["FAILED", "COMPLETED", "CANCELLED", "BLOCKED"].includes(end); i++) { end = sql(`select status from drafting_job where id='${J}'`); if (!["FAILED", "COMPLETED", "CANCELLED", "BLOCKED"].includes(end)) await sleep(500); }
  const msg = sql(`select coalesce(message, '') || '|' || coalesce(cost_usd, -1) from drafting_job where id='${J}'`).split("|");
  ok("C11.8 fail: a part missing by the time the step runs fails the step in words; nothing is applied, US$0", end === "FAILED" && /part 3: no saved AI answer/.test(msg[0]) && /Nothing was applied/.test(msg[0]) && Number(msg[1]) === 0 && proposals() === 0, { end, msg });
  ok("US$0: the launcher was still never asked", launcherCalls() === calls0, { calls: launcherCalls() - calls0 });

  await restart();
  induced = false;
  ok("US$0: the machine's shared spend ledger is byte for byte as it was", sharedLedger() === shared0);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  the check itself stopped:", e); restore(); process.exit(1); });
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => { restore(); process.exit(130); });
