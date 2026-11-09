// C7.5 part 2 (M3-E; r5c BR-19, board frame 13; screens/C7.5/concept-part2.md; stand-in SI-6): the Review page walked in a
// real browser, keyboard only, on an isolated copy started with STUDIO_MADE_UP_REVIEW_RUNS=1 (its saved review is MADE UP
// for this test by tests/fixtures/c75-made-up-run.ts, in the copy's own folder, never p2/runs; the page says so). The case
// page's Review panel → Open Review → the run card: cost first (Saved US$0.00, Live with its usual and worst cost, disabled
// with the founder's Go words), the steps, the SI-6 chip, the made-up banner; Run review (Saved) → the result line → the
// findings per filing, then person: High and Low pills, Low with both rounds' reasons, Replayed, "The form says"; Show on
// the form highlights the quoted line in the source panel; Dismiss… a finding, run again → not raised again; a client
// sees no Review page. Screenshots at 1440, 1024 and 400 px in product/screens/C7.5/screenshots/part2-*, axe (WCAG 2.2 AA)
// on each state, no sideways scroll. No model call, no ai_batch row (US$0).
//   zsh studio/tools/isolated.sh runtime_c75p 4437 start STUDIO_MADE_UP_REVIEW_RUNS=1 && node studio/tests/check_c75_review_page_browser.cjs 4437 xr_studio_runtime_c75p
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync, spawnSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_runtime_c75p";
const BASE = `http://localhost:${PORT}`, STUDIO = path.resolve(__dirname, "..");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "C7.5", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 260)}` : ""}`); };

(async () => {
  const tsx = (f, ...extra) => spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, f), String(PORT), DB, ...extra], { encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
  const releases = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'");
  if (releases() === "0") tsx("tests/runtime/setup_visitor_visa.ts");
  if (releases() === "1") { tsx("acceptance/lib/setup_vv_m3.ts"); step("setup: the Visitor visa released twice (pack 4 setup)", releases() === "2", releases()); }
  const spend0 = sql("select count(*) from ai_batch");
  const prep = tsx("tests/fixtures/c75-made-up-run.ts", "prepare");
  let made = null; try { made = JSON.parse(prep.stdout.trim().split("\n").pop()); } catch { /* reported below */ }
  step("setup: the pack's case and its made-up saved review (the copy's own folder)", !!made?.case, prep.stderr.slice(-300) || prep.stdout.slice(-300));
  if (!made?.case) { console.log(`\n${pass}/${pass + fail} passed`); process.exit(1); }
  const caseId = made.case;

  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name, region = "[data-review-page]") => {
    n++; const base = `part2-${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).include(region).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name}: no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    for (const [w, h] of [[1024, 768], [400, 860]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: true });
      step(`${w} px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    }
    await p.setViewportSize({ width: 1440, height: 900 });
  };
  const as = (who) => p.evaluate((w) => { try { localStorage.setItem("xr-actor", w); } catch { /* ignore */ } }, who);
  /** Keyboard only: Tab until the focused element's text matches (fails loudly when never reached). */
  const tabTo = async (re, max = 500) => {
    for (let i = 0; i < max; i++) { await p.keyboard.press("Tab"); const t = await p.evaluate(() => ((document.activeElement?.textContent ?? "") + " " + (document.activeElement?.getAttribute("aria-label") ?? "")).trim()); if (re.test(t)) return true; }
    throw new Error(`never reached ${re} by Tab (focus on: ${await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 160))})`);
  };
  const until = async (fn, what, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await p.waitForTimeout(250); } throw new Error(`timed out waiting for ${what}`); };
  const card = () => p.locator("[data-run-card]").innerText();

  try {
    // ── the case page: the Review panel links to the page ──
    await p.goto(`${BASE}/cases/${caseId}`); await as("user-O"); await p.reload(); await settle();
    const link = p.locator("[data-open-review]");
    step("case page: the Review panel has Open Review", await link.count() === 1);
    await link.focus(); await p.keyboard.press("Enter");
    await until(async () => p.url().endsWith(`/cases/${caseId}/review`), "the Review page");
    await p.locator("[data-run-modes]").waitFor({ timeout: 30000 });

    // ── the run card: cost first ──
    const t1 = await card();
    step("run card: Saved at US$0.00 is offered first and chosen", /Saved\s*US\$0\.00/.test(t1) && await p.locator('[data-mode="replay"] input').isChecked(), t1.slice(0, 400));
    step("run card (P-110): Live shows its usual and worst cost before anything runs", /Live\s*about US\$\d+\.\d\d, at most US\$4\.80/.test(t1), t1.slice(0, 600));
    step("run card (P-227, P-295): Live is disabled, saying it needs approval first with its cost, in a firm's words (no internal role)", await p.locator('[data-mode="live"]').getAttribute("data-mode-disabled") === "true" && /A live review needs approval first, with its cost stated/.test(t1) && !/tech lead|founder/i.test(t1));
    step("run card: the SI-6 stand-in chip and the four steps", await p.locator('[data-run-card] [data-stand-in="SI-6"]').count() === 1 && await p.locator("[data-run-steps] li").count() === 4);
    step("run card: a made-up run says so (test copy only)", /Made-up test runs/.test(t1));
    step("run card: one primary action, named with its mode and price", /Run review \(Saved, US\$0\.00\)/.test(t1) && await p.locator("[data-run-review]").count() === 1);
    const src0 = await p.locator("[data-source-panel]").innerText();
    step("source: what the form prints, box by box (a date split over DD / MM / YYYY reads as its parts; no email)", /What the form says/.test(src0) && /IMM 5257 \(09-2023\)/.test(src0) && /\b1986\b/.test(src0) && !/@example\.com/.test(src0), src0.slice(0, 300));
    await state("run-card");

    // ── run Saved, keyboard only ──
    await p.locator("[data-review-page] h1").focus();
    await tabTo(/^Run review \(Saved, US\$0\.00\)/);
    await p.keyboard.press("Enter");
    await until(async () => /Review run/.test(await p.locator("[data-run-result]").innerText()), "the run's result");
    const res = await p.locator("[data-run-result]").innerText();
    step("result: Saved (made-up test run): 2 new findings, US$0.00, warnings decided here or passed with a reason", /Saved \(made-up test run\): 2 new findings/.test(res) && /US\$0\.00/.test(res) && /pass it with a reason on Ready to file/.test(res), res);
    step("result: the AI finding the rules dropped and the box the AI could not judge are listed for a person", /1 AI finding left out by the rules/.test(res) && /1 form field the AI could not judge/.test(res), res);
    await until(async () => (await p.locator('[data-findings] [data-finding]').count()) >= 2, "the findings");
    const list = await p.locator("[data-findings]").innerText();
    step("steps (review M2 c): when the run ends each step says what the run reported (all four done for a Saved run)", (await p.locator('[data-run-steps] [data-step-state="done"]').count()) === 4 && (await p.locator("[data-run-running]").count()) === 0);
    step("focus (break m): after the run, focus is on its result, not the page body", await p.evaluate(() => !!document.activeElement?.closest("[data-run-result]")));
    step("findings: per filing, then person", await p.locator("[data-findings-filing]").count() >= 1 && await p.locator("[data-findings-filing] [data-findings-person='Sample Client A']").count() >= 1, list.slice(0, 300));
    const low = p.locator("[data-finding]").filter({ hasText: "The two AI rounds disagree" });
    const high = p.locator("[data-finding]").filter({ hasText: "Both AI rounds raised it" });
    step("findings (P-121): a Low finding carries both rounds' reasons, Replayed", await low.count() === 1 && /Low/.test(await low.innerText()) && /Round 1: MINOR/.test(await low.innerText()) && /Round 2 \(blind checker\): raised nothing/.test(await low.innerText()) && /Replayed/.test(await low.innerText()), await low.innerText().catch(() => ""));
    step("findings (P-121): a High finding shows both rounds' reasons and the words it quotes", await high.count() === 1 && /Round 1: MAJOR/.test(await high.innerText()) && /Round 2 \(blind checker\): MAJOR/.test(await high.innerText()) && /The form says “/.test(await high.innerText()), await high.innerText().catch(() => ""));
    step("findings (BIC-06): the Low finding comes before the High one", (await p.locator("[data-finding]").first().innerText()).includes("The two AI rounds disagree"));
    await state("after-saved-run");

    // ── Show on the form: the quoted line highlighted in both ──
    await high.getByRole("button", { name: "Show on the form" }).focus(); await p.keyboard.press("Enter");
    await until(async () => (await p.locator('[data-source-shown="true"]').count()) >= 1, "the highlighted line");
    const quote = (await high.locator("[data-finding-quote]").innerText()).match(/“(.+)”/)?.[1] ?? "";
    step("Show on the form: the source line the finding quotes is highlighted, and the finding too", (await p.locator('[data-source-shown="true"]').first().innerText()).includes(quote) && await high.getAttribute("data-finding-shown") === "true", quote);
    await state("show-on-form");

    // ── dismiss the Low one; run again: not raised again ──
    await low.getByRole("button", { name: "Dismiss…", exact: true }).focus(); await p.keyboard.press("Enter");
    await p.getByRole("dialog").getByRole("textbox").fill("Not relevant to this visit (Sample)");
    await p.getByRole("dialog").getByRole("button", { name: "Dismiss", exact: true }).focus(); await p.keyboard.press("Enter");
    await until(async () => (await p.getByRole("dialog").count()) === 0, "the dialog to close");
    await p.locator("[data-run-review]").focus(); await p.keyboard.press("Enter");
    await until(async () => /no new finding/.test(await p.locator("[data-run-result]").innerText()), "the second run's result");
    const res2 = await p.locator("[data-run-result]").innerText();
    step("run again: a dismissed finding is not raised again (no new finding, 2 already on the case)", /no new finding, 2 already on the case/.test(res2), res2);
    step("run again: the dismissed finding stays dismissed", Number(sql(`select count(*) from review_finding where case_id='${caseId}' and source='ai' and state='dismissed'`)) === 1);

    // ── review M3: the run card reloads after "Look at the run card again" (the answers changed under it) ──
    const before = await p.locator('[data-mode="replay"]').getAttribute("data-mode-disabled");
    const ans = tsx("tests/fixtures/c75-made-up-run.ts", "answer", caseId, made.subject, "person.applying_from_country", "Canada");
    await p.locator("[data-run-review]").focus(); await p.keyboard.press("Enter");
    await until(async () => /The review did not run/.test(await p.locator("[data-run-result]").innerText()), "the refusal");
    await until(async () => (await p.locator('[data-mode="replay"]').getAttribute("data-mode-disabled")) === "true", "the run card to reload");
    const card2 = await card();
    step("review M3 fail→pass: after a refusal the run card reloads itself: Saved is now unavailable for the changed answers, with the reason", before === "false" && ans.status === 0 && /No saved review of this form edition with these values/.test(card2) && await p.locator("[data-run-review]").isDisabled(), card2.slice(0, 400));
    await state("after-answers-changed");

    // ── a client sees no Review page; no model call ──
    await as("user-P"); await p.reload(); await settle();
    step("a client gets no Review page (staff only)", /This page is for the case officer/.test(await p.locator("main").innerText()) && await p.locator("[data-run-card]").count() === 0);
    step("no ai_batch row and no model call (US$0)", sql("select count(*) from ai_batch") === spend0);
    step("no page error or console error", errs.length === 0, errs.join(" | "));
  } catch (e) {
    step("the walk finished", false, e.message);
    await p.screenshot({ path: path.join(SHOTS, "part2-failure.png"), fullPage: true }).catch(() => undefined);
  } finally { await b.close(); }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
