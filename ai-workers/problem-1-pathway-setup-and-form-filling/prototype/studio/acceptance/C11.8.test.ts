// Acceptance C11.8 (P-227, P-175, P-194): every AI step offers exactly Live or Saved; a paid result committed to
// p2/runs is usable as Saved, replayed through the same steps at US$0; live AI is off unless the server switch is on.
// Written 4 Nov from qa's night re-test (`qa/reports/2026-11-03-night-retest.md`, main 83f846a52): Forms › IMM 5645 ›
// Draft with AI said Saved "No saved AI answer for this form yet" although #746 committed its four saved parts. The cause:
// IMM 5645 is drafted in parts (A4), so it has one saved answer per part and no whole-form one, and before #762 only a
// whole-form answer was matched (edition, form key and checksum were never the cause). This pack proves the fix on
// both setups, and sweeps every paid answer committed to p2/runs the same way.
//   * Setups: the six (Demo › Load sample, P-148) and the suites' fixture (POST /demo/load {}), on which IMM 5645 is
//     added to Visitor visa through the form intake and read, as a person does.
//   * Sweep: every form on the setup that has a committed, completed live answer (whole, or every part of one split) is
//     offered as Saved by its own dialog's options and by the plan, at US$0 (P-227).
//   * IMM 5645: the dialog in a browser at 1440 px offers Saved, selected, "Use Saved (US$0)"; a Saved start replays its
//     four parts, done at US$0, the launcher never asked; a Live start is refused (409) before anything is queued.
//   * Fail: one part's saved answer missing (induced with STUDIO_HIDE_SAVED_RUNS, isolated copy only): Saved is closed,
//     with the reason in words, in the dialog and at the door; never half-filled.
//   * IMM 1344 (the other form saved in parts, 26 Oct): with its whole-form answers hidden, its five parts alone are
//     offered as Saved.
// The copy runs without the live switch, with the stand-in launcher; nothing is sent to a model (US$0). SHOTS=<dir> also
// saves the 1440 px screenshots of the dialog (the PR's walk).
// Run (usage line):
//   zsh studio/tools/isolated.sh accept_c118 4452 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/acceptance/C11.8.test.ts 4452 xr_studio_accept_c118
// Exit: 0 all pass · 1 a check failed · 2 setup missing.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "playwright";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { walker } from "./lib/browser.ts";
import { checkCopy, RUNS, sqlFor, stop } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_accept_c118", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", "..");
const FAKE = "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs";
const VAR = join(STUDIO, "var", `isolated-${NAME}`), FAKE_LOG = join(VAR, "fake-launch.log");
const SHOTS = process.env.SHOTS ?? "";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const n = (q: string) => Number(sql(q));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const launcherCalls = () => (existsSync(FAKE_LOG) ? readFileSync(FAKE_LOG, "utf8").split("\n").filter(Boolean).length : 0);
const sharedLedger = () => sha(existsSync(LEDGER_DIR) ? readdirSync(LEDGER_DIR).sort().map((f) => { try { return f + readFileSync(join(LEDGER_DIR, f), "utf8"); } catch { return f; } }).join("|") : "");

/** Restarts this copy (same database) with only the settings given here: never a live switch. */
const BLANK = { STUDIO_AI_LIVE: "", STUDIO_HOLD_QUEUE: "", STUDIO_FAKE_LAUNCHER: "", STUDIO_HIDE_SAVED_RUNS: "" };
let induced = false;
const restartRaw = (...env: string[]) => { try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", `STUDIO_FAKE_LAUNCHER=${FAKE}`, ...env], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...BLANK } }); } catch { /* waited for below */ } };
const restart = async (...env: string[]) => {
  induced = env.length > 0;
  restartRaw(...env);
  for (let i = 0; i < 240; i++) { if ((await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).catch(() => null))?.status === 200) return; await sleep(500); }
  stop("the copy did not come back after a restart");
};
const restore = () => { if (induced) restartRaw(); };

/** A committed run counts as a paid answer when it completed with a valid, untruncated output for today's inventory. */
const completed = (f: string, invSha: string | null) => {
  const again = join(RUNS, f.replace(/\.json$/, ".reconverted.json"));
  const r = JSON.parse(readFileSync(existsSync(again) ? again : join(RUNS, f), "utf8"));
  return r.contract_valid === true && !!r.raw_output && !r.output_errors && /^completed/.test(r.drafting_run?.status ?? "") && (!invSha || r.drafting_run?.inputs?.official_files?.[0]?.sha256 === invSha);
};
/** What p2/runs holds for one form's field-map job, read from the files themselves (not from the server). */
function committed(jobId: string, invSha: string | null) {
  const files = readdirSync(RUNS).filter((f) => f.endsWith(".json") && !f.includes(".reconverted"));
  const whole = files.filter((f) => f.startsWith(`${jobId}-live-`) && completed(f, invSha));
  const split = new Map<number, Set<number>>();
  for (const f of files) {
    const m = new RegExp(`^${jobId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-p(\\d+)of(\\d+)-[0-9a-f]{12}-live-`).exec(f);
    if (m && completed(f, null)) { const of = Number(m[2]); if (!split.has(of)) split.set(of, new Set()); split.get(of)!.add(Number(m[1])); }
  }
  const allParts = [...split].some(([of, got]) => got.size === of);
  return { whole: whole.length, allParts };
}

/** Every form of this setup with a committed paid answer is offered as Saved by its dialog and by the plan (P-227). */
async function sweep(setup: string) {
  const forms = sql(`select id || '|' || file_name || '|' || coalesce(inventory_file, '') from source_attachment where status in ('READ', 'DRAFTED') order by file_name, id`).split("\n").filter(Boolean).map((l) => { const [id, file, inv] = l.split("|"); return { id, file, inv }; });
  const missed: string[] = [], seen: string[] = [];
  for (const f of forms) {
    const o = (await call("GET", `/attachments/${f.id}/draft-options`)).body;
    if (!o?.job_id) continue;
    const invSha = f.inv && existsSync(join(SOLUTION, f.inv)) ? sha(readFileSync(join(SOLUTION, f.inv))) : null;
    const c = committed(o.job_id, invSha);
    if (!c.whole && !c.allParts) continue;
    seen.push(f.file);
    const runs = (o.saved_runs ?? []) as { valid?: boolean; recheckable?: boolean }[];
    const dialog = runs.some((r) => r.valid || r.recheckable) || (o.saved_parts && o.saved_parts.parts > 0 && o.saved_parts.saved === o.saved_parts.parts);
    const t = (await call("POST", "/ai/plan", { scope: { kind: "source", ids: [f.id] }, mode: "REPLAY", draftAgain: true })).body?.targets?.[0];
    // A form shared with another combination and being mapped there is skipped by the plan with that reason (one
    // mapping per form at a time); its own dialog still offers Saved.
    const planOk = (t?.action === "reuse_saved_output" && (t?.worst_usd ?? 0) === 0) || (t?.action === "skip" && /^Being mapped in /.test(t?.why ?? ""));
    if (!dialog || !planOk) missed.push(`${f.file}: dialog ${dialog ? "Saved" : "no Saved"}, plan ${t?.action} (${String(t?.why ?? "").slice(0, 80)})`);
  }
  ok(`C11.8 pass (P-227, ${setup}): every form with a paid answer committed to p2/runs (whole, or every part) is offered as Saved by its dialog and the plan, US$0 (${seen.length} forms: ${[...new Set(seen)].join(", ")})`, seen.length > 0 && missed.length === 0, missed);
  return seen;
}

const att5645 = () => sql(`select id from source_attachment where file_name ilike 'imm5645%' order by id limit 1`);
const comboOf = (a: string) => sql(`select combination_id from source_attachment where id='${a}'`);
const proposals5645 = () => n(`select count(*) from proposal_item where form_edition like 'IMM 5645 (%' and origin='ai'`);

/** The form's own Draft with AI dialog, as a person opens it (the button, or the ?draft= link a failed Live run gives). */
async function dialog(page: Page, a: string, via: "button" | "link", shot: string) {
  const combo = comboOf(a);
  await page.goto(`/c/${combo}/forms${via === "link" ? `?draft=${a}` : ""}`);
  if (via === "button") {
    const row = page.locator("tr, li, [data-attachment]").filter({ hasText: /IMM 5645/ }).first();
    await row.getByRole("button", { name: /Draft with AI/ }).click({ timeout: 30_000 });
  }
  const start = page.locator("[data-draft-start]");
  await start.waitFor({ timeout: 30_000 });
  await page.locator('[data-draft-start][data-options-loaded="true"]').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(300); // the mode settles to Saved once the options are in
  const box = page.getByRole("dialog");
  const saved = box.locator("label").filter({ hasText: /^Saved/ }).locator('input[type="radio"]');
  const r = { text: (await box.innerText()).replace(/\s+/g, " "), mode: await start.getAttribute("data-mode"), ready: await start.getAttribute("data-start-ready"), disabled: await start.isDisabled(), savedEnabled: await saved.isEnabled(), savedChecked: await saved.isChecked(), label: (await start.innerText()).trim() };
  if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${shot}.png`) }); }
  return r;
}

async function imm5645(setup: string, via: "button" | "link") {
  const A = att5645();
  if (!A) { ok(`C11.8 (${setup}): IMM 5645 is on the setup`, false); return; }
  const o = (await call("GET", `/attachments/${A}/draft-options`)).body;
  ok(`C11.8 pass (P-227, ${setup}): IMM 5645's dialog options say all 4 parts have a saved answer`, JSON.stringify(o?.saved_parts) === JSON.stringify({ parts: 4, saved: 4 }), o?.saved_parts);
  const w = await walker(`http://localhost:${PORT}`);
  try {
    const page = await w.open("user-A", 1440);
    const d = await dialog(page, A, via, `${setup}-imm5645-draft-with-ai-1440`);
    ok(`C11.8 pass (P-227, ${setup}, 1440 px): Forms › IMM 5645 › Draft with AI offers Saved, selected, "Use Saved (US$0)" enabled, and never "No saved AI answer"`, d.savedEnabled && d.savedChecked && d.mode === "replay" && !d.disabled && d.ready === "true" && /Use Saved \(US\$0\)/.test(d.label) && /each of its 4 parts/.test(d.text) && !/No saved AI answer for this form yet/.test(d.text), d);
    ok(`C11.8 (P-227, ${setup}): the dialog offers exactly Live and Saved (no third way, no priced Saved)`, /\bLive\b/.test(d.text) && /\bSaved\b/.test(d.text) && !/\bstub\b/i.test(d.text), d.text.slice(0, 300));
    ok(`C11.8 (${setup}): no page error in the walk`, w.errors.length === 0, w.errors);
  } finally { await w.close(); }

  // Saved replays the four parts through the same steps: done, US$0, the launcher never asked.
  const calls0 = launcherCalls(), shared0 = sharedLedger();
  const s = await call("POST", `/attachments/${A}/draft`, { mode: "replay", idempotencyKey: `c118-saved-${setup}-${Date.now()}` });
  const J = s.body?.id as string | undefined;
  let end = "";
  for (let i = 0; J && i < 240 && !["FAILED", "COMPLETED", "CANCELLED", "BLOCKED", "APPLIED"].includes(end); i++) { end = sql(`select status from drafting_job where id='${J}'`); if (!["FAILED", "COMPLETED", "CANCELLED", "BLOCKED", "APPLIED"].includes(end)) await sleep(500); }
  const row = J ? sql(`select coalesce(cost_usd, -1) || '|' || coalesce(message, '') || '|' || coalesce((detail->'a4'->'parts')::text, '[]') from drafting_job where id='${J}'`).split("|") : [];
  const parts = JSON.parse(row.slice(2).join("|") || "[]") as { status: string; saved: boolean; cost_usd: number }[];
  ok(`C11.8 pass (P-227, ${setup}): Use Saved (US$0) replays IMM 5645's 4 parts, each from its saved answer, done at US$0`, s.status === 201 && end === "COMPLETED" && Number(row[0]) === 0 && parts.length === 4 && parts.every((p) => p.status === "done" && p.saved && p.cost_usd === 0) && /Saved AI answers of its 4 parts/.test(row[1]) && /US\$0/.test(row[1]), { status: s.status, m: words(s).slice(0, 120), end, row: row.slice(0, 2) });
  ok(`C11.8 (US$0, ${setup}): the launcher was never asked and the shared ledger is unchanged`, launcherCalls() === calls0 && sharedLedger() === shared0, { calls: launcherCalls() - calls0 });
  ok(`C11.8 (${setup}): its answer reaches review as AI proposals, like any saved answer`, proposals5645() > 0, proposals5645());
}

/** One part's saved answer missing: Saved is closed with the reason, in the dialog and at the door; nothing half-filled. */
async function partMissing(setup: string, via: "button" | "link", load: () => Promise<void>) {
  await restart("STUDIO_HIDE_SAVED_RUNS=imm5645e-p2of4");
  await load();
  const A = att5645();
  const o = (await call("GET", `/attachments/${A}/draft-options`)).body;
  ok(`C11.8 fail (P-227, ${setup}): with part 2's saved answer missing, IMM 5645's dialog is told 3 of 4 parts`, JSON.stringify(o?.saved_parts) === JSON.stringify({ parts: 4, saved: 3 }), o?.saved_parts);
  if (via === "link") ok(`C11.8 fail (${setup}): Load sample leaves IMM 5645 waiting, with no Saved step and no AI proposal`, n(`select count(*) from drafting_job where attachment_id='${A}' and kind='field_map'`) === 0 && proposals5645() === 0);
  const w = await walker(`http://localhost:${PORT}`);
  try {
    const page = await w.open("user-A", 1440);
    const d = await dialog(page, A, "button", `${setup}-imm5645-part-missing-1440`);
    ok(`C11.8 fail (P-227, ${setup}, 1440 px): the dialog keeps Saved closed and says only 3 of its 4 parts are saved, so it is never half-filled`, !d.savedEnabled && /3 of its 4 parts only/.test(d.text) && !(d.mode === "replay" && !d.disabled), d);
  } finally { await w.close(); }
  const q0 = n(`select count(*) from drafting_job`);
  const r = await call("POST", `/attachments/${A}/draft`, { mode: "replay", idempotencyKey: `c118-miss-${setup}-${Date.now()}` });
  ok(`C11.8 fail (P-227, ${setup}): a Saved start is refused in those words; nothing is queued`, r.status === 400 && /3 of its 4 parts only/.test(words(r)) && n(`select count(*) from drafting_job`) === q0, { status: r.status, m: words(r).slice(0, 160) });
  // Live is refused at the door while the switch is off (P-175): with a part unsaved it would call a model. (With every
  // part saved, a Live start makes no model call: each part uses its saved answer at US$0, P-194.)
  const shared0 = sharedLedger(), q1 = n(`select count(*) from drafting_job`);
  const live = await call("POST", `/attachments/${A}/draft`, { mode: "live", idempotencyKey: `c118-live-${setup}-${Date.now()}` });
  ok(`C11.8 fail (P-175, ${setup}): a Live start that would call the model (part 2 unsaved) is refused (409) in words while live AI is off; nothing is queued`, live.status === 409 && /live AI is off|switched off|off on this copy/i.test(words(live)) && n(`select count(*) from drafting_job`) === q1 && sharedLedger() === shared0, { status: live.status, m: words(live).slice(0, 160) });
  await restart();
}

const loadSix = async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", { sample: "six" });
  if (l.status >= 300) { restore(); stop(`the six did not load: ${l.status} ${words(l).slice(0, 160)}`); }
};
const loadFixture = async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { restore(); stop(`the fixture did not load: ${l.status} ${words(l).slice(0, 160)}`); }
  const vv = sql(`select id from combination where label = 'Visitor visa' and retired_at is null order by id limit 1`);
  if (!vv) { restore(); stop("the fixture has no Visitor visa"); }
  const add = await call("POST", `/combinations/${vv}/attachments/sample`, { officialFile: "imm5645e.pdf" });
  const A = add.body?.attachmentId as string | undefined;
  if (add.status >= 300 || !A) { restore(); stop(`IMM 5645 was not added to Visitor visa: ${add.status} ${words(add).slice(0, 160)}`); }
  const rd = await call("POST", `/attachments/${A}/read`);
  if (rd.status >= 300) { restore(); stop(`IMM 5645 was not read: ${rd.status} ${words(rd).slice(0, 160)}`); }
};

(async () => {
  await checkCopy(PORT, DB);
  const parts = readdirSync(RUNS).filter((f) => /^studio-fieldmap-imm5645e-p\dof4-[0-9a-f]{12}-live-/.test(f));
  if (parts.length !== 4) stop(`IMM 5645's four saved parts are not in p2/runs (found ${parts.length}); they come from the C11.8 live run (#746)`);
  const ai = (await call("GET", "/session")).body?.ai;
  if (ai?.live !== false || ai?.launcher !== "stand-in") stop(`start this copy without the live switch and with the stand-in launcher (see the run line); GET /session → ai: ${JSON.stringify(ai)}`);
  ok("C11.8 (P-175): live AI is off on this copy (no server switch)", ai.live === false);
  // The stand-in launcher logs every call; a live call through it fails, so any call made by Saved shows in its log.
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the stand-in launcher was asked for a live call" } }));
  const shared0 = sharedLedger();

  // ── The six (P-148), as Demo › Load sample gives them: IMM 5645 already drafted from its saved parts.
  await loadSix();
  const six = await sweep("the six");
  ok("C11.8 (the six): the sweep covers both forms saved in parts, IMM 5645 (#746) and IMM 1344", six.includes("imm5645e.pdf") && six.includes("imm1344e.pdf"), six);
  await imm5645("six", "link");
  // IMM 1344 is the other form committed in parts (26 Oct): its parts alone are usable as Saved.
  await restart("STUDIO_HIDE_SAVED_RUNS=imm1344e-live-");
  const B = sql(`select id from source_attachment where file_name ilike 'imm1344%' order by id limit 1`);
  const ob = (await call("GET", `/attachments/${B}/draft-options`)).body;
  const tb = (await call("POST", "/ai/plan", { scope: { kind: "source", ids: [B] }, mode: "REPLAY", draftAgain: true })).body?.targets?.[0];
  ok("C11.8 pass (P-227, the six): IMM 1344's five committed parts alone are offered as Saved (its whole-form answers hidden), US$0", JSON.stringify(ob?.saved_parts) === JSON.stringify({ parts: 5, saved: 5 }) && tb?.action === "reuse_saved_output" && /each of its 5 parts/.test(tb?.why ?? "") && (tb?.worst_usd ?? 0) === 0, { parts: ob?.saved_parts, action: tb?.action, why: tb?.why });
  await restart();
  await partMissing("six", "link", loadSix);

  // ── The suites' fixture: IMM 5645 added to Visitor visa through the intake and read, then Draft with AI.
  await loadFixture();
  const fx = await sweep("the fixture");
  ok("C11.8 (the fixture): the sweep covers IMM 5645", fx.includes("imm5645e.pdf"), fx);
  await imm5645("fixture", "button");
  await partMissing("fixture", "button", loadFixture);

  ok("C11.8 (US$0): the machine's shared spend ledger is byte for byte as it was", sharedLedger() === shared0);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  the check itself stopped:", e); restore(); process.exit(1); });
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => { restore(); process.exit(130); });
