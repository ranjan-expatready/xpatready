// D2 part 4 (P-227, forms lane): when a Live field-map run fails and a saved result exists for the form, the run card's
// next step is "Use Saved (US$0)", opening that form's Draft dialog on Saved. A Saved run that fails never offers Saved
// again. The failure is the test-only switch STUDIO_FAULT_SOURCE (the form is stopped before any launcher is called), and
// the live switch is paired with the stand-in launcher on the usage line (P-192): no model call, US$0.
//   zsh studio/tools/isolated.sh forms_d2p4 4459 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs STUDIO_FAULT_SOURCE=imm5257e.pdf && tsx studio/tests/check_forms_d2_live_fails_offer_saved.ts 4459 xr_studio_forms_d2p4
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const PORT = Number(process.argv[2] ?? 4459), DB = process.argv[3] ?? "xr_studio_forms_d2p4", BASE = `http://localhost:${PORT}`;
type J = Record<string, any>;
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<{ status: number; body: J }> => {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: J = {}; try { j = JSON.parse(t); } catch { j = { text: t }; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const words = (r: { body: J }) => String(r.body?.detail ?? r.body?.message ?? "");

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load", {})).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const vv = sql(`select id from combination where combination_key='vv.single'`);
  const att = sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  if ((await call("POST", `/attachments/${att}/read`)).status >= 300) { console.error("STOP  IMM 5257 could not be read"); process.exit(2); }
  const saved = (await call("GET", `/attachments/${att}/draft-options`)).body?.saved_runs?.filter((r: J) => r.valid).length ?? 0;
  ok("setup: Visitor visa's IMM 5257 has a valid saved result (Saved can be offered) and is not in the library (so it is drafted, not reused)", saved > 0 && sql(`select status from source_attachment where id='${att}'`) !== "IN_LIBRARY", saved);
  const spentBefore = sql("select coalesce(sum(cost_usd),0) from drafting_job");

  const runOf = async (mode: "LIVE" | "REPLAY") => {
    const scope = { kind: "source", ids: [att] };
    const plan = (await call("POST", "/ai/plan", { scope, mode, draftAgain: true })).body;
    const r = await call("POST", "/ai/batches", { scope, mode, draftAgain: true, planSha256: plan.plan_sha256, idempotencyKey: `d2p4-${mode}-${Date.now()}`, ...(plan.cost_check?.override_needed ? { override: true } : {}) });
    const id = r.body?.id ?? r.body?.batchId ?? r.body?.batch?.id;
    if (!id) return { r, view: null as J | null };
    let view: J = {};
    for (let i = 0; i < 120; i++) { view = (await call("GET", `/runs/${id}`)).body; if (!["queued", "running", "stopping"].includes(view.status)) break; await new Promise((res) => setTimeout(res, 500)); }
    return { r, view };
  };

  // Pass: a Live run that fails (induced) offers Saved.
  const live = await runOf("LIVE");
  ok("D2 P-227 pass: a failed Live run's next step is \"Use Saved (US$0)\", opening that form's Draft dialog", live.view?.error?.next?.label === "Use Saved (US$0)" && live.view?.error?.next?.href === `/c/${vv}/forms?draft=${att}`, [live.r.status, words(live.r), live.view?.status, live.view?.error]);
  // Fail: a Saved run that fails does not offer Saved again.
  const replay = await runOf("REPLAY");
  ok("D2 P-227 fail: a failed Saved run does not offer Saved again (its own next step stays)", !!replay.view?.error && replay.view.error.next?.label !== "Use Saved (US$0)", [replay.r.status, words(replay.r), replay.view?.error]);
  ok("D2: no model call, US$0 (the fault stops the form before any launcher)", sql("select coalesce(sum(cost_usd),0) from drafting_job") === spentBefore);

  // Browser: the link opens the form's Draft dialog, on Saved.
  const href = live.view?.error?.next?.href;
  if (href) {
    const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) }); const p = await b.newPage();
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await p.goto(`${BASE}${href}`);
    const dlg = p.getByRole("dialog", { name: /^Draft the field map of IMM 5257/ });
    const shown = await dlg.waitFor({ timeout: 30_000 }).then(() => true, () => false);
    const onSaved = shown && (await dlg.locator('[data-draft-start][data-options-loaded="true"]').waitFor({ timeout: 30_000 }).then(() => true, () => false)) && (await dlg.locator("[data-draft-start]").getAttribute("data-mode")) === "replay";
    ok("D2 P-227 pass (browser): \"Use Saved (US$0)\" opens IMM 5257's Draft dialog with Saved chosen", onSaved, { shown, mode: shown ? await dlg.locator("[data-draft-start]").getAttribute("data-mode") : null });
    await b.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
