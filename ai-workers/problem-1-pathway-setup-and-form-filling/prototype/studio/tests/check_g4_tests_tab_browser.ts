// G4 (C5.7) part 2 slice 1, walked like a person in a real browser: on the Visitor visa combination the new Tests tab
// lists the IMM 5257 map and the eligibility rules; the E1 family's key reads Draft · Sample and Not run; the author
// presses Run and sees Passed, then opens the lines; a key that leaves a box out reads Failed (1 of …) and its lines put
// the failure first, naming the box; the author cannot sign (greyed, with the reason), the expert signs and it reads
// Signed. axe on each state, 1024 px without sideways scroll, screenshots in screens/G4-answer-keys/screenshots/.
// Sample data; US$0; no AI.
//   zsh studio/tools/isolated.sh forms_g4t 4459 start && tsx studio/tests/check_g4_tests_tab_browser.ts 4459 xr_studio_forms_g4t
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import type { Res } from "./runtime/api.ts";
import { e1Keys, sample } from "./g4_e1_key.ts";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
const PORT = Number(process.argv[2] ?? 4459), DB = process.argv[3] ?? "xr_studio_forms_g4t";
const BASE = `http://localhost:${PORT}`;
const STUDIO = path.resolve(__dirname, "..");
const ROOT = path.resolve(STUDIO, "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "G4-answer-keys", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name: string, ok: unknown, detail?: unknown) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  if (!sql(`select count(*) from combination where combination_key = 'vv.single'`).startsWith("1"))
    execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: "ignore" });
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  if (!vv) { console.error("STOP  setup_visitor_visa.ts did not release the Visitor visa"); process.exit(2); }
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth: string, init: { method?: string; actor?: string; data?: unknown } = {}): Promise<Res> => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (actor: string) => { await p.evaluate((a: string) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); await p.reload(); };
  // Waits fail loudly when they time out (no catch after a wait).
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !/Loading the/.test(document.body.innerText), null, { timeout: 30000 }); };
  let n = 0;
  const state = async (name: string) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).include('[role="tabpanel"]').withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // The family and its key, as check_g4_answer_keys.ts writes them (E1's checked values with the amended boxes).
  const run = Date.now().toString(36);
  await p.goto(BASE);
  const fam = await api("/answer-keys/families", { method: "POST", data: { ...sample, key: `e1t-${run}` } });
  step("setup: the E1 family is written (Sample)", fam.status === 201, fam.status);
  const items = (await api(`/combinations/${vv}/answer-keys`)).body.items as { item_ref: string; edition: string | null }[];
  const exp = e1Keys(items.find((i) => i.item_ref === "IMM 5257")!.edition!).key;
  const k = await api(`/combinations/${vv}/answer-keys`, { method: "POST", actor: "user-C", data: { family_id: fam.body.id, item_kind: "field_map", item_ref: "IMM 5257", expected: exp } });
  step("setup: the expert enters the key for IMM 5257", k.status === 201, JSON.stringify(k.body).slice(0, 200));

  await as("user-A");
  await p.goto(`${BASE}/c/${vv}/tests`);
  await settle();
  const tab = p.getByRole("tab", { name: /^Tests/ });
  step("C5.7: the combination has a Tests tab, selected at /tests", (await tab.getAttribute("aria-selected")) === "true");
  const panel = p.getByRole("tabpanel");
  await panel.getByRole("region", { name: "IMM 5257 field map" }).waitFor({ timeout: 30000 }); // fails loudly on time-out
  step("C5.7: the tab lists the IMM 5257 field map with its edition", await panel.getByRole("region", { name: "IMM 5257 field map" }).isVisible() && /IMM 5257 \(09-2023\)/.test(await panel.innerText()));
  const row = panel.locator(`[data-key="${k.body.id}"]`);
  step("C5.7 BR-1, BR-5: the new key reads Draft · Sample and Not run", /Draft · Sample/.test(await row.innerText()) && /Not run/.test(await row.innerText()), await row.innerText());
  await state("not-run");

  const signBtn = row.getByRole("button", { name: "Sign" });
  step("C5.7 BR-7 fail: the author's Sign is greyed and says why", (await signBtn.isDisabled()) && /Only the immigration expert/.test((await signBtn.getAttribute("title")) ?? ""));
  await row.getByRole("button", { name: "Run" }).click();
  await p.waitForFunction((id: string) => /Passed|Failed/.test(document.querySelector(`[data-key="${id}"]`)?.textContent ?? ""), k.body.id, { timeout: 60000 });
  await settle();
  step("C5.7 BR-3, BR-4: Run reads Passed and opens the lines, every one a pass", /Passed/.test(await row.innerText()) && (await row.locator('[data-line="fail"]').count()) === 0 && (await row.locator('[data-line="pass"]').count()) >= 50, await row.locator('[data-line]').count());
  await state("passed-lines");

  // A key with one box left out: Failed (1 of …), the failure first and named.
  const less = JSON.parse(JSON.stringify(exp)); delete less.people.mother["form1[0].Page1[0].PersonalDetails[0].DOBYear[0]"];
  const fam2 = await api("/answer-keys/families", { method: "POST", data: { ...sample, key: `e1u-${run}`, label: "E1 household, one box left out (Sample)" } });
  const k2 = await api(`/combinations/${vv}/answer-keys`, { method: "POST", actor: "user-C", data: { family_id: fam2.body.id, item_kind: "field_map", item_ref: "IMM 5257", expected: less } });
  await p.reload(); await settle();
  const row2 = panel.locator(`[data-key="${k2.body.id}"]`);
  await row2.getByRole("button", { name: "Run" }).click();
  await p.waitForFunction((id: string) => /Failed/.test(document.querySelector(`[data-key="${id}"]`)?.textContent ?? ""), k2.body.id, { timeout: 60000 });
  await settle();
  const first = row2.locator("[data-line]").first();
  step("C5.7 BR-4 fail: a key with a box left out reads Failed (1 of …) and its first line is that box, with the reason", /Failed \(1 of \d+\)/.test(await row2.innerText()) && (await first.getAttribute("data-line")) === "fail" && /Date of birth: YYYY/.test(await first.innerText()) && /written, not expected/.test(await first.innerText()), await first.innerText());
  await state("failed-lines");

  await as("user-C"); await p.goto(`${BASE}/c/${vv}/tests`); await settle();
  await panel.locator(`[data-key="${k.body.id}"]`).getByRole("button", { name: "Sign" }).click();
  await p.waitForFunction((id: string) => /Signed/.test(document.querySelector(`[data-key="${id}"]`)?.textContent ?? ""), k.body.id, { timeout: 30000 });
  step("C5.7 BR-7: the expert signs; the key reads Signed and the Sign button is gone", /Signed/.test(await panel.locator(`[data-key="${k.body.id}"]`).innerText()) && (await panel.locator(`[data-key="${k.body.id}"]`).getByRole("button", { name: "Sign" }).count()) === 0);
  await state("signed");
  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
