// G2 (C5.5; concept product/screens/G2-answer-key-gate/concept.md v2 §4, §6): Review and release shows the answer-key
// gate in the one list of problems and in the "Answer-key tests" block, like a person would meet it. With an LMIA
// (real) with a new IMM 5257 form line: the line "no answer-key test" is an error, Submit is greyed, and "Fix on
// Tests" (reached by keyboard) opens the item on Tests with focus on it. The Visitor visa (Sample): the hand-written E1
// key passes but is not signed (a Sample warning); the immigration expert signs it on Tests and, back on Review, the
// warning is gone and the block reads Passed, signed. axe at 1440 px; no sideways scroll at 1024 and 400 px. US$0.
//   zsh studio/tools/isolated.sh screens_g2b 4446 start && node studio/tests/check_g2_answer_key_gate_browser.cjs 4446 xr_studio_screens_g2b
const fs = require("node:fs"); const { execFileSync } = require("node:child_process"); const { join } = require("node:path");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_g2b", BASE = `http://localhost:${PORT}`;
const STUDIO = join(__dirname, "..");
const PSQL = fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(JSON.stringify(detail)).slice(0, 240)}` : ""}`); };

(async () => {
  // The Visitor visa (and the sample load) through the endpoints the screens call (tests/runtime/setup_visitor_visa.ts).
  if (sql("select count(*) from combination where combination_key = 'vv.single'") !== "1")
    execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: "ignore" });
  const vv = sql("select id from combination where combination_key = 'vv.single'"), wp = sql("select id from combination where combination_key = 'wp.family'");
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (path, method = "GET", body, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, data: body === undefined ? undefined : JSON.stringify(body), timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (actor) => { await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  try {
    step("setup: the Visitor visa and With an LMIA exist", !!vv && !!wp);
    await p.goto(BASE); await as("user-A");

    // With an LMIA (a real release) with a new map that has no test
    let r = await api(`/combinations/${wp}/lines`, "POST", { kind: "FORM", formKey: "IMM 5257" });
    step("setup: IMM 5257 added to With an LMIA", r.status < 300 || r.body?.type === "https://expatready.local/problems/already-on-this-combination", r.body);
    // The list shows 8 problems until "Show all" (as a person sees it); the gate's lines come with the rest.
    const showAll = async () => { const more = p.getByRole("button", { name: /^Show all \d+$/ }); await p.locator("[data-problem]").first().waitFor({ timeout: 60000 }); if (await more.count()) await more.first().click(); };
    await p.goto(`${BASE}/c/${wp}/review`); await showAll();
    const line = p.locator("li", { has: p.locator("[data-problem]", { hasText: "IMM 5257 field map: no answer-key test" }) });
    await line.first().waitFor({ timeout: 60000 }); // fails loudly on time-out
    step("C5.5 BR-5 E7 (screen): Review lists \"Answer-key tests · IMM 5257 field map: no answer-key test\" as an error", /error/i.test(await line.first().innerText()) && /Answer-key tests/.test(await line.first().innerText()));
    const submit = p.getByRole("button", { name: /Submit for review/ });
    step("C5.5 BR-5 (screen): Submit is greyed while the error stands (Fix the problems first)", await submit.isDisabled() && (await submit.getAttribute("title")) === "Fix the problems first");
    const block = p.locator("[data-answer-key-block]");
    step("C5.5 BR-9 (screen): the Answer-key tests block lists IMM 5257 as No test, and the maps as released before the gate", await block.isVisible() && /IMM 5257 field map/.test(await block.innerText()) && /No test/.test(await block.innerText()) && /Released before the gate/.test(await block.innerText()));
    let v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
    step("axe: Review and release with the gate's lines has no WCAG A/AA violation (1440 px)", !v.length, v.map((x) => `${x.id}: ${x.nodes[0]?.target}`));

    // Keyboard: Tab to the line's Fix on Tests, Enter, land on the item
    await p.locator("body").click({ position: { x: 1, y: 1 } });
    let reached = false;
    for (let i = 0; i < 160 && !reached; i++) { await p.keyboard.press("Tab"); reached = await p.evaluate(() => document.activeElement?.hasAttribute("data-fix-tests") && /IMM 5257 field map/.test(document.activeElement?.getAttribute("aria-label") ?? "")); }
    step("C5.5 §4 (keyboard): Tab reaches the IMM 5257 line's \"Fix on Tests\"", reached);
    if (reached) await p.keyboard.press("Enter"); else await line.first().locator("[data-fix-tests]").click();
    await p.waitForURL(/\/tests#tests-field_map-IMM-5257$/, { timeout: 30000 });
    await p.waitForFunction(() => document.activeElement?.id === "tests-field_map-IMM-5257", undefined, { timeout: 30000 });
    step("C5.5 §4: Fix on Tests opens Tests with the IMM 5257 item focused", await p.evaluate(() => document.activeElement?.getAttribute("aria-label")) === "IMM 5257 field map");

    // Widths: no sideways scroll on Review and release
    await p.goto(`${BASE}/c/${wp}/review`); await block.waitFor({ timeout: 60000 });
    for (const w of [1024, 400]) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
      // The page itself may scroll sideways for reasons G2 does not touch (a long data path in the changes table, the
      // tab row at 400 px: build notes); the gate's block and lines must fit: the block scrolls its own table.
      const fit = await p.evaluate(() => { const W = document.documentElement.clientWidth, blk = document.querySelector("[data-answer-key-block]"), lines = [...document.querySelectorAll("[data-fix-tests]")].map((a) => a.closest("li"));
        return !!blk && blk.getBoundingClientRect().right <= W + 1 && blk.scrollWidth <= blk.clientWidth + 1 && lines.every((li) => li && li.getBoundingClientRect().right <= W + 1 && li.scrollWidth <= li.clientWidth + 1); });
      step(`C5.5 §4: at ${w} px the Answer-key tests block and the gate's lines fit the width (the block's table scrolls inside it)`, fit);
    }
    await p.setViewportSize({ width: 1440, height: 900 });

    // The Visitor visa (Sample): an unsigned passing key, signed by the expert on Tests
    await api(`/combinations/${vv}/checks`, "POST", { appliesTo: "case.funds_available_cad", condition: { subjectKind: "CASE", op: "lt", field: "case.funds_available_cad", value: 7 }, message: "The money available looks too low (Sample check, G2 browser).", sourceQuote: "Sample quote for a gate test: the applicant must show enough money for the stay." });
    const { e1Keys, sample } = await import("./g4_e1_key.ts").catch(() => ({}));
    let key = null;
    if (e1Keys) {
      const ed = JSON.parse(sql(`select snapshot->'field_maps' from config_release where combination_id = '${vv}' order by version desc limit 1`)).find((m) => m.form_number === "IMM 5257").form_edition;
      const fam = await api("/answer-keys/families", "POST", { ...sample, key: "e1-g2-browser" });
      key = (await api(`/combinations/${vv}/answer-keys`, "POST", { family_id: fam.body.id, item_kind: "field_map", item_ref: "IMM 5257", expected: e1Keys(ed).key }, "user-C")).body;
      await api(`/answer-keys/${key.id}/run`, "POST");
    }
    step("setup: the E1 key for the Visitor visa's IMM 5257 is written and run (passes, not signed)", !!key?.id && sql(`select result from answer_key_run where key_id = '${key.id}' order by ran_at desc limit 1`) === "PASSED");
    await p.goto(`${BASE}/c/${vv}/review`); await showAll();
    const sampleLine = p.locator("[data-problem]", { hasText: /IMM 5257 field map: the answer-key test for .* is Sample/ });
    await sampleLine.first().waitFor({ timeout: 60000 });
    step("C5.5 BR-5 (screen, Demo release): the unsigned passing key is a warning, and the block says unsigned tests are allowed", /warning/i.test(await p.locator("li", { has: sampleLine }).first().innerText()) && /Demo release: tests not signed/.test(await block.innerText()));
    await as("user-C"); await p.goto(`${BASE}/c/${vv}/tests#tests-field_map-IMM-5257`);
    const keyRow = p.locator(`[data-key="${key?.id}"]`);
    await keyRow.waitFor({ timeout: 60000 });
    await keyRow.getByRole("button", { name: "Sign" }).click();
    await p.waitForFunction((id) => /Signed/.test(document.querySelector(`[data-key="${id}"]`)?.textContent ?? ""), key?.id, { timeout: 30000 });
    await p.goto(`${BASE}/c/${vv}/review`); await block.waitFor({ timeout: 60000 }); await showAll();
    await p.waitForFunction(() => /Passed/.test(document.querySelector("[data-answer-key-block]")?.textContent ?? ""), undefined, { timeout: 30000 });
    step("C5.5 BR-4 (screen): after the expert signs on Tests, the Sample line is gone and the block reads Passed, signed by the content reviewer", !(await sampleLine.count()) && /Signed by Content reviewer/.test(await block.innerText()) && /Passed, 66 of 66 values|Passed, \d+ of \d+ values/.test(await block.innerText()));
    v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
    step("axe: Review and release with a passing signed key has no WCAG A/AA violation", !v.length, v.map((x) => `${x.id}: ${x.nodes[0]?.target}`));
    step("no page error", !errs.length, errs);
  } catch (e) { step("ran to the end", false, e.message); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
