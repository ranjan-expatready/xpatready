// QA-91 (C11.12, P-110): Who can be › Fill from the guide › AI now, walked in a real browser: Fill shows the shared run
// card with its step and Stop while AI runs, then the proposal with the guide's words; nothing is saved. The copy runs
// the fake launcher, its live switch STUDIO_AI_LIVE paired with it (P-192) and no other; the check stops unless the server really runs it. Axe (WCAG 2.2
// AA) and no sideways scroll at 1440 and 1024; screenshots in screens/W1-combination-workspace/screenshots/qa91/. US$0.
//   zsh studio/tools/isolated.sh runtime_qa91b 4434 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_qa91_who_can_be_run_browser.cjs 4434 xr_studio_runtime_qa91b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4434), DB = process.argv[3] ?? "xr_studio_runtime_qa91b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const VAR = path.join(__dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
const SHOTS = path.join(ROOT, "product", "screens", "W1-combination-workspace", "screenshots", "qa91"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  // Spend guard (30 Oct incident): the server on this port must run the fake launcher, resolved as the server does.
  const pid = execFileSync("lsof", ["-ti", `tcp:${PORT}`, "-sTCP:LISTEN"], { encoding: "utf8" }).trim().split("\n")[0];
  const env = pid ? execFileSync("ps", ["-E", "-ww", "-p", pid, "-o", "command="], { encoding: "utf8" }) : "";
  const fake = env.match(/STUDIO_FAKE_LAUNCHER=(\S+)/)?.[1];
  const real = path.join(ROOT, "..", "..", ""), fixture = path.join(__dirname, "fixtures", "fake-launch.mjs");
  const otherLive = [...env.matchAll(/\b(\w+_LIVE)=approved\b/g)].map((m) => m[1]).filter((k) => k !== "STUDIO_AI_LIVE");
  if (!fake || otherLive.length || !/\bSTUDIO_AI_LIVE=approved\b/.test(env) || fs.realpathSync(path.resolve(real, fake)) !== fs.realpathSync(fixture)) { console.error(`STOP  the server on :${PORT} must run the fake launcher with STUDIO_AI_LIVE and no other live switch (P-192): otherwise this check would make paid AI calls or test nothing.`); process.exit(2); }
  step("spend guard: the server runs the fake launcher, STUDIO_AI_LIVE paired with it and no other live switch", true, fake);

  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const state = async (name) => {
    await p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${name}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const people0 = sql(`select participants::text from combination where id='${vv}'`);
  const guide = JSON.parse(fs.readFileSync(path.join(ROOT, "prototype", "p1", "inventory", "guide-5256.text.inventory.json"), "utf8")).text;
  const sentence = guide.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).find((s) => /\b(you|applicant)\b/i.test(s) && /\bappl(y|ication)\b/i.test(s) && s.length > 20 && s.length < 400);
  const record = { caller: "live", contract_valid: true, drafting_run: { status: "completed", usage: { cost_usd: 0 } }, raw_output: JSON.stringify({ people: [{ role: "principal", min: 1, max: 1, applies: true, quote: sentence, why: null }], unresolved: [] }) };
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ jobs: { "studio-who-can-be-check": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record } }, "studio-who-can-be-": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, sleep_ms: 4000, record } } } }));

  await p.goto(`${BASE}/c/${vv}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const who = p.locator("[data-who-can-be]");
  await who.getByRole("button", { name: "Show and edit" }).click();
  await who.getByRole("button", { name: "Fill from the guide" }).click();
  const fill = p.getByRole("dialog"); await fill.locator("[data-people-cost]").waitFor({ timeout: 30000 }).catch(() => {});
  await p.waitForFunction(() => !document.querySelector('[data-fill-mode="live"] input')?.disabled, null, { timeout: 10000 }).catch(() => {});
  await fill.getByLabel(/AI now/).check(); await p.waitForTimeout(800);
  await fill.getByRole("button", { name: "Fill" }).click();
  const card = fill.locator("[data-people-run] [data-run-status]");
  await card.waitFor({ timeout: 15000 }).catch(() => {});
  await p.waitForFunction(() => /Step 2 of 4/.test(document.querySelector("[data-people-run] [data-run-line]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  const line = await fill.locator("[data-people-run] [data-run-line]").innerText().catch(() => "");
  step("C11.12 QA-91 pass: Fill in AI now shows the run card in the dialog: the step in words and Stop", /Step 2 of 4/.test(line) && await fill.getByRole("button", { name: /^Stop/ }).count() === 1, line);
  await state("01-who-can-be-ai-now-run-card");
  await fill.locator("[data-people-proposal]").waitFor({ timeout: 30000 }).catch(() => {});
  const prop = await fill.locator("[data-people-proposal]").innerText().catch(() => "");
  step("C11.12 QA-91 pass: when the run is done, the dialog shows the proposal with the guide's words, and Use these lines", /proposed from Guide 5256/.test(prop) && prop.includes(sentence.slice(0, 40)) && await fill.getByRole("button", { name: "Use these lines" }).isEnabled(), prop.replace(/\n/g, " ").slice(0, 200));
  await state("02-who-can-be-ai-now-proposal");
  step("C11.12 QA-91: nothing is saved until a person uses the lines and saves", sql(`select participants::text from combination where id='${vv}'`) === people0);
  await fill.getByRole("button", { name: "Back" }).click();
  step("no page error or console error on the way", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
