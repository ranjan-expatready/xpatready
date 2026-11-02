// C4.7 walked like a content publisher in a real browser (forms lane): on Work permit, family's Questionnaires tab, the
// Pre-qualification view offers "Draft pre-qualification picks". P-227: exactly two ways, Live and Saved. With no Saved
// result, Saved is greyed with why and a failed Live run offers nothing; with a Saved result (two rounds written here into
// p2/runs, removed after), a failed Live run offers "Use Saved (US$0)", which replays at US$0 into To review; each pick
// reads in words with its reason and IRCC's sentence; Accept ticks the question, Reject (remove) needs a reason and ticks
// nothing. Restarted without the live switch and with nothing saved, the dialog says nothing can start, tied to Draft.
// axe and no sideways scroll on each state at 1440, 1024 and 400 px. Live runs only on the stand-in launcher (P-192):
// NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c47b 4462 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_forms_c47_pqr_picks_browser.cjs 4462 xr_studio_forms_c47b
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4462), DB = process.argv[3] ?? "xr_studio_forms_c47b", NAME = DB.replace(/^xr_studio_/, "");
const BASE = `http://localhost:${PORT}`;
const STUDIO = path.resolve(__dirname, ".."), ROOT = path.resolve(__dirname, "..", "..", ".."), REPO = path.resolve(ROOT, "..", "..");
const RUNS = path.join(ROOT, "prototype", "p2", "runs"), PROMPTS = path.join(ROOT, "prototype", "p2", "prompts"), VAR = path.join(STUDIO, "var", `isolated-${NAME}`);
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "c47"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sha = (b) => createHash("sha256").update(b).digest("hex");
const KEYS = /\b[a-z_]+\.[a-z_]+\b/;
const QUOTE = "You must show the officer that you are eligible under Canada’s Immigration law and that you will be in Canada for a temporary stay.";
const WHY_DOB = "The officer tests age to decide eligibility (Sample).";
let fail = 0, pass = 0; const written = [];
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const failing = { stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the service did not answer (stand-in)" } };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  // Waits fail loudly when they time out (no catch after a wait).
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin") && !document.querySelector("[data-pqr-set] .animate-pulse"), null, { timeout: 30000 }); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    for (const [w, h] of [[1440, 900], [1024, 768], [400, 800]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`) });
      const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      step(`axe ${w} px: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
      if (w < 1440) step(`${w} px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    }
    await p.setViewportSize({ width: 1440, height: 900 });
  };


  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const l = await api("/demo/load", { method: "POST", data: {} });
  if (l.status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  fs.mkdirSync(VAR, { recursive: true });
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ jobs: { "studio-pqr-picks-check": failing, "studio-pqr-picks": failing } }));
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const go = async () => { await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(); };
  const chip = () => p.locator('[data-source-chip="pqr"]');
  const dlg = p.getByRole("dialog", { name: "Draft pre-qualification picks" });
  const start = () => dlg.locator("[data-pqr-start]");
  const open = async () => { await p.getByRole("button", { name: "Draft pre-qualification picks" }).click(); await dlg.waitFor(); await dlg.locator('[data-plan-loaded="true"]').waitFor(); await settle(); };

  await go(); await chip().click(); await settle();
  step("C4.7 pass: the Pre-qualification view offers Draft pre-qualification picks to the author", await p.getByRole("button", { name: "Draft pre-qualification picks" }).isVisible());
  await open();
  const modes = await dlg.locator("[data-pqr-mode]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-pqr-mode")));
  step("C4.7 S pass (P-227): exactly two ways are offered, Live and Saved", JSON.stringify(modes) === JSON.stringify(["live", "replay"]), modes.join(","));
  step("C4.7 S fail (P-227): no third way (rules only, stub) is shown to a person", !/Rules only|stub/i.test(await dlg.locator("fieldset").innerText()));
  step("C4.7 S fail: with nothing saved, Saved is greyed with the reason in words", await dlg.locator('[data-pqr-mode="replay"] input').isDisabled() && /none yet[\s\S]*No saved AI answer/.test(await dlg.locator('[data-pqr-mode="replay"]').innerText()));
  await dlg.locator("[data-pqr-cost]").waitFor();
  step("C4.7 P pass: Live is chosen and its worst case shows before anything runs", (await start().getAttribute("data-mode")) === "live" && /At most US\$\d/.test(await dlg.locator("[data-pqr-cost]").innerText()), await dlg.locator("[data-pqr-cost]").innerText());
  await state("plan-live-none-saved");
  await start().click(); await dlg.locator("[data-pqr-result]").waitFor();
  step("C4.7 F fail: a failed Live run with no Saved result says so and offers nothing", /did not run/.test(await dlg.locator("[data-pqr-note]").innerText()) && !(await dlg.locator("[data-pqr-use-saved]").count()) && !(await dlg.locator("[data-pqr-open-review]").count()), await dlg.locator("[data-pqr-note]").innerText());
  await state("live-failed-none-saved");
  await dlg.getByRole("button", { name: "Done" }).click();

  // Two saved rounds for this combination's guide (what Track A records): both pick date of birth and criminal history.
  const plan = await api(`/combinations/${wp}/pqr-picks/plan`, { method: "POST", data: { mode: "replay" } });
  const guide = plan.body.guide.file, inputs = [{ file: guide, sha256: sha(fs.readFileSync(path.join(ROOT, guide))) }];
  const pick = (asks, why) => ({ role: "principal", asks, quote: QUOTE, why });
  const save = (check, picks) => {
    const f = path.join(RUNS, `studio-pqr-picks${check ? "-check" : ""}-c47b-test-live-20261102t120000000z-${check ? "c" : "d"}${Date.now().toString(36)}.json`);
    fs.mkdirSync(RUNS, { recursive: true }); written.push(f);
    fs.writeFileSync(f, JSON.stringify({ caller: "live", contract_valid: true, launch_evidence: { template_sha256: sha(fs.readFileSync(path.join(PROMPTS, check ? "pqr-picks-check.v1.md" : "pqr-picks.v1.md"))) }, drafting_run: { status: "completed", inputs: { official_files: inputs, combination: "wp.family" }, usage: { cost_usd: 0.4 } }, raw_output: JSON.stringify({ picks, unresolved: [] }) }));
  };
  save(false, [pick("Date of birth", WHY_DOB), pick("Criminal history", "The guide makes admissibility a condition (Sample).")]);
  save(true, [pick("Date of birth", WHY_DOB), pick("Criminal history", "Admissibility is tested (Sample).")]);

  await open();
  step("C4.7 S pass: with a Saved result, Saved is open and chosen first, at US$0", !(await dlg.locator('[data-pqr-mode="replay"] input').isDisabled()) && (await start().getAttribute("data-mode")) === "replay" && /US\$0/.test(await dlg.locator("[data-pqr-cost]").innerText()));
  await dlg.locator('[data-pqr-mode="live"] input').check(); await dlg.locator("[data-pqr-cost]").waitFor(); await settle();
  await start().click(); await dlg.locator("[data-pqr-result]").waitFor();
  step("C4.7 F pass (P-227): a failed Live run offers Use Saved (US$0) because a Saved result exists", await dlg.locator("[data-pqr-use-saved]").isVisible() && /use Saved \(US\$0\)/.test(await dlg.locator("[data-pqr-note]").innerText()), await dlg.locator("[data-pqr-note]").innerText());
  await state("live-failed-offers-saved");
  await dlg.locator("[data-pqr-use-saved]").click(); await dlg.locator("[data-pqr-cost]").waitFor(); await settle();
  step("C4.7 F pass: Use Saved goes back to the plan on Saved: the guide it reads, its AI steps and US$0", (await start().getAttribute("data-mode")) === "replay" && /Reads Guide 5487/.test(await dlg.innerText()) && /US\$0/.test(await dlg.locator("[data-pqr-cost]").innerText()) && (await dlg.locator("ol li").count()) === 4);
  await state("plan-saved");
  await start().click(); await dlg.locator("[data-pqr-counts]").waitFor();
  step("C4.7 pass: Saved puts the picks on To review with the counts per band, at US$0", /Ready to accept 2 · .* · Saved, US\$0/.test(await dlg.locator("[data-pqr-counts]").innerText()), await dlg.locator("[data-pqr-counts]").innerText());
  await state("saved-result");
  await dlg.locator("[data-pqr-open-review]").click();
  await p.waitForURL(/\/review\/proposals\?group=combination/); await p.locator("[data-band]").first().waitFor(); await settle();
  const rows = p.locator('[data-band="ready"] tbody tr');
  const titles = await rows.locator("td:nth-child(2) .font-medium").allInnerTexts();
  step("C4.7 To review pass: each pick reads \"Ask in pre-qualification: … (person)\"", titles.length === 2 && titles.every((t) => /^Ask in pre-qualification: .+ \(.+\)$/.test(t)), titles.join(" | "));
  step("C4.7 To review fail: no field or role key is shown to a person", titles.every((t) => !KEYS.test(t) && !/\bprincipal\b/.test(t)));
  await state("to-review-picks");
  const dob = titles.find((t) => /birth/i.test(t)), other = titles.find((t) => t !== dob);
  await rows.filter({ hasText: dob }).getByRole("button", { name: `Open ${dob}` }).click();
  let side = p.getByRole("dialog"); await side.waitFor(); await settle();
  const sideText = await side.innerText();
  step("C4.7 pass (P-76): the pick shows its reason and IRCC's sentence, found in the guide", sideText.includes(WHY_DOB) && sideText.includes(QUOTE) && /found in the file/.test(sideText), sideText.slice(0, 200));
  await state("pick-side-panel");
  await side.getByRole("button", { name: "Accept", exact: true }).click();
  await p.waitForFunction((t) => ![...document.querySelectorAll('[data-band="ready"] tbody tr td:nth-child(2) .font-medium')].some((x) => x.textContent === t), dob, { timeout: 30000 });
  step("C4.7 Q1 pass: Accept ticks the question as a draft, origin AI", sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification and status='DRAFT' and origin='AI_PROPOSAL'`) === "1");
  await rows.filter({ hasText: other }).getByRole("button", { name: `Open ${other}` }).click();
  side = p.getByRole("dialog"); await side.waitFor(); await settle();
  const reject = side.getByRole("button", { name: "Reject", exact: true });
  step("C4.7 Q2 fail: removing a pick needs a reason (Reject stays off without one)", await reject.isDisabled());
  await side.getByLabel(/^Reason/).fill("Not a deciding question for this program (Sample).");
  await reject.click();
  await p.waitForFunction((t) => ![...document.querySelectorAll('[data-band="ready"] tbody tr td:nth-child(2) .font-medium')].some((x) => x.textContent === t), other, { timeout: 30000 });
  step("C4.7 Q2 pass: a removed pick keeps its reason and ticks nothing", sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='pqr_pick' and status='rejected'`) === "1" && sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification`) === "1");
  await go();
  step("C4.7 Q1 pass: back on the Questionnaires tab, Pre-qualification counts 1", /Pre-qualification 1/.test(await chip().innerText()), await chip().innerText());

  // The demo's own state: no live switch and nothing saved: the dialog says nothing can start, tied to Draft.
  for (const f of written.splice(0)) fs.rmSync(f, { force: true });
  let said = "";
  try { execFileSync("zsh", [path.join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart"], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { said = String(e?.stderr ?? e).slice(-400); }
  let up = false; for (let i = 0; i < 240 && !up; i++) { up = await fetch(`${BASE}/api/session`, { headers: { "x-actor": "user-A" } }).then((x) => x.status === 200, () => false); if (!up) await new Promise((res) => setTimeout(res, 500)); }
  if (!up) throw new Error(`the copy did not come back after the restart: ${said}`);
  await go(); await chip().click(); await settle(); await open();
  step("C4.7 S fail: Live greyed while the switch is off, with the reason", await dlg.locator('[data-pqr-mode="live"] input').isDisabled() && /not open[\s\S]*tech lead's Go/.test(await dlg.locator('[data-pqr-mode="live"]').innerText()));
  step("C4.7 S fail: neither way open: Nothing can start says why, and Draft is off and points to it", /Nothing can start/.test(await dlg.locator("[data-pqr-none]").innerText()) && await start().isDisabled() && (await start().getAttribute("aria-describedby")) === "pqr-none");
  await state("nothing-can-start");
  step("no page error or console error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  for (const f of written) fs.rmSync(f, { force: true });
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); for (const f of written) fs.rmSync(f, { force: true }); process.exit(1); });
