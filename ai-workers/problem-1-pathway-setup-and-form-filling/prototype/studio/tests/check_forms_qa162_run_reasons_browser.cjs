// QA-162 (C4.11 step 5, 4 Nov; P-227): on Visitor visa configured as the runtime lane does it (setup_visitor_visa.ts),
// Questionnaires › Draft questions and documents › Saved (US$0) › Draft: the run card shows, under step 5, every saved
// condition left out with its reason and what a person can do, never only a count ("See the N reasons", folded, keyboard
// and axe clean). A step that did not finish never shows its details. US$0: Saved replays only, live AI off.
//   zsh studio/tools/isolated.sh forms_qa162r 4466 start && node studio/tests/check_forms_qa162_run_reasons_browser.cjs 4466 xr_studio_forms_qa162r
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4466), DB = process.argv[3] ?? "xr_studio_forms_qa162r";
const BASE = `http://localhost:${PORT}`;
const STUDIO = path.join(__dirname, "..");
const PSQL = fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 300)}` : ""}`); };

(async () => {
  // Setup: Visitor visa configured and released as the runtime lane does it (US$0).
  execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const vv = sql(`select id from combination where combination_key='vv.single'`);
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" })).newPage();
  const spent0 = Number(sql("select coalesce(sum(cost_usd),0) from drafting_job") || 0);
  try {
    await p.goto(`${BASE}/c/${vv}/questionnaires`);
    await p.locator("[data-qd-draft]").click({ timeout: 30_000 });
    await p.locator("[data-qd-steps]").waitFor({ timeout: 30_000 });
    step("C4.11 pass (QA-162): the dialog offers Saved at US$0 with its 7 steps; Live is not open", (await p.locator("[data-qd-steps] li").count()) === 7 && /US\$0/.test(await p.locator("[data-qd-cost]").innerText()) && /not open/i.test(await p.locator('[data-qd-mode="live"]').innerText()));
    await p.getByRole("dialog").getByRole("button", { name: /^Draft/ }).click();
    await p.waitForFunction(() => { const s = document.querySelector("[data-qd-result] [data-run-status]"); return !!s && !["running", "queued", "stopping"].includes(s.getAttribute("data-run-status") ?? ""); }, null, { timeout: 120_000 });
    const s5 = p.locator('[data-step="qd_conditions"]');
    const msg = await s5.innerText();
    const left = Number(/(\d+) left out with the reason/.exec(msg)?.[1] ?? 0);
    step("C4.11 pass (QA-162): step 5 says how many saved conditions were left out", left > 0, msg.replace(/\n/g, " | ").slice(0, 200));
    const sum = s5.locator("[data-step-details] summary");
    step("C4.11 pass (QA-162): the reasons are folded under step 5, closed at first, named by their number", (await sum.count()) === 1 && /^See the \d+ reasons$/.test((await sum.innerText()).trim()) && !(await s5.locator("[data-step-details]").evaluate((d) => d.open)), await sum.innerText().catch(() => "none"));
    await sum.focus(); await p.keyboard.press("Enter");
    const lines = await s5.locator("[data-step-details] li").allInnerTexts();
    const out = lines.filter((l) => l.startsWith("Left out: "));
    step("C4.11 pass (QA-162): Enter opens them, and every condition the step left out is listed (none silent)", out.length === left, { listed: out.length, left });
    const acts = /draft again with Saved \(US\$0\)|set it by hand|set on the Forms tab|already proposed once/;
    step("C4.11 pass (QA-162): every reason says what a person can do", out.length > 0 && out.every((l) => acts.test(l)), out.filter((l) => !acts.test(l))[0]);
    step("C4.11 fail (QA-162): no reason guesses: each one names why it is not taken", out.every((l) => /not guessed|cannot decide|names a form|already proposed once|not asked by a question/.test(l)), out.filter((l) => !/not guessed|cannot decide|names a form|already proposed once|not asked by a question/.test(l))[0]);
    const axe = await new AxeBuilder({ page: p }).include("[data-qd-result]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step("axe (WCAG 2.2 AA): the run card with the reasons open", axe.violations.length === 0, axe.violations.map((v) => v.id).join(", "));
    step("C4.11 pass (QA-162): no sideways scroll at 1440 with the reasons open", !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    await sum.focus(); await p.keyboard.press("Enter");
    step("C4.11 pass (QA-162): Enter folds them again", !(await s5.locator("[data-step-details]").evaluate((d) => d.open)));
    // A step that did not finish (still waiting) shows no details; the steps without details show no fold.
    const folds = await p.locator("[data-qd-result] [data-step]").evaluateAll((els) => els.map((e) => ({ status: e.getAttribute("data-step-status"), fold: !!e.querySelector("[data-step-details]") })));
    step("C4.11 fail (review m3): only a finished step shows a fold of reasons", folds.every((f) => !f.fold || f.status === "COMPLETED"), JSON.stringify(folds));
    step("C4.11 data: the run spent US$0", Number(sql("select coalesce(sum(cost_usd),0) from drafting_job") || 0) === spent0);
  } catch (e) { step("the walk ran to the end", false, e.message); }
  await b.close();
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
