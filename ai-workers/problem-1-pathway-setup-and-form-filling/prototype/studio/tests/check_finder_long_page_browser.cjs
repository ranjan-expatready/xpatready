// C11.15 form finder, "Choose the page and find again", walked like a person at 1440 px (founder's test 5 Nov ~13:05 IST,
// P-352): on the loaded demo's Super visa › Forms the author finds the forms (the slot's one offer), the run waits for
// the application page, and the author tries every page the dialog offers, then a pasted canada.ca address of over 300
// characters, each in Saved and in Rules only (US$0; Live is off on this copy and is never clicked). Each Start must
// start one run on that page with no red line (before: "Too big: expected string to have <=120 characters" for every
// offered page, 103 to 148 characters), and the walk goes on to what the Forms tab shows next. A double click on Start is
// one run. QA-252 (2): once a find finished on a page, Find again shows that page and lets the person paste another one
// (before, the page choice was never offered again and a wrong page was a dead end). Screenshots into product/screens/C11.15/screenshots/long-page/, axe (WCAG 2.2 AA) on the dialog. No model call.
//   zsh studio/tools/isolated.sh forms_lpb 4452 start && node studio/tests/check_finder_long_page_browser.cjs 4452 xr_studio_forms_lpb
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_lpb";
const BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "C11.15", "screenshots", "long-page"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${(typeof detail === "string" ? detail : JSON.stringify(detail)).replace(/\s+/g, " ").slice(0, 300)}` : ""}`); };
const RAW = /Too big|Too small|expected string|Invalid input|idempotency/i;
const LONG = `https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/${"applying-permanent-residence-start-visa-".repeat(5)}guide.html`;
const MODES = [["replay", "Saved"], ["rules", "Rules only (US$0)"]];

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  let n = 0;
  const shot = async (name) => { n++; await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${name}-1440.png`) }); };
  const panel = p.locator("[data-finder]"), dlg = p.locator("[data-find-dialog]");
  const runs = (sv) => Number(sql(`select count(*) from ai_batch where operation='find_forms' and scope_label like '${sv}|%'`));
  // Waits fail loudly: a run that does not end, or a button that does not come back, throws with its name.
  const ended = async (sv) => {
    for (let i = 0; i < 240; i++) { if (sql(`select count(*) from ai_batch where operation='find_forms' and scope_label like '${sv}|%' and status in ('QUEUED','RUNNING')`) === "0") return; await p.waitForTimeout(500); }
    throw new Error("a find did not end within 120 s");
  };
  const button = async () => { const x = panel.locator("[data-find-forms]:not([disabled])").first(); await x.waitFor({ timeout: 30000 }); return x; };

  // ======================================================== setup: the demo as the founder had it
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const sv = sql("select id from combination where combination_key='sv.super_visa'");
  await p.goto(`${BASE}/c/${sv}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const offer = panel.locator("[data-finder-start] [data-find-forms]"); await offer.waitFor({ timeout: 30000 });
  const offerMode = await offer.getAttribute("data-find-forms");
  step("journey: Super visa's Forms tab offers one way to find its forms, not live (live AI is off on this copy)", offerMode !== "live", { offerMode, label: await offer.innerText() });
  await shot("forms-before-find");
  await offer.click(); await ended(sv);
  await p.reload(); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const choose = panel.locator('[data-find-forms="page"]'); await choose.waitFor({ timeout: 30000 });
  step("journey: the find waits for the application page; the one action is 'Choose the page and find again'", /Waiting for you: choose the application page/.test(await panel.innerText()) && (await choose.innerText()).trim() === "Choose the page and find again");
  await shot("waiting-for-page");

  // ======================================================== every offered page and the pasted one, Saved and Rules only
  await choose.click(); await dlg.waitFor();
  const offered = await dlg.locator("[data-page-choice] label").evaluateAll((ls) => ls.map((l) => ({ title: l.querySelector(".font-medium")?.textContent ?? "", url: l.querySelector(".break-all")?.textContent ?? "" })).filter((x) => x.url));
  step("journey: the dialog offers the founder's page, Start Up Visa (148 characters), among its pages", offered.some((o) => o.title === "Start Up Visa" && o.url.length === 148), offered.map((o) => `${o.title} (${o.url.length})`));
  await p.keyboard.press("Escape"); await dlg.waitFor({ state: "detached" });
  // Visitor visa's page is the one offered page in the recorded canada.ca copies, so a find on it finishes and is then
  // remembered (QA-252 (2)): it goes last among the offered pages, so every other one, Start Up Visa included, is pressed
  // in the offered list as the founder did; the pasted address then goes through Find again's "Another canada.ca page".
  const RECORDED = /\/apply-visitor-visa\.html$/;
  const tries = [...offered.filter((o) => !RECORDED.test(o.url)), ...offered.filter((o) => RECORDED.test(o.url))].map((o) => ({ ...o, pasted: false })).concat([{ title: `pasted ${LONG.length}-character address`, url: LONG, pasted: true }]);
  let k = 0, doubled = false, againShown = false;
  for (const t of tries) for (const [mode, label] of MODES) {
    k++;
    const tag = `${t.title} (${t.url.length} characters), ${label}`; // the step names say how the page was chosen below
    // Each try by screens. While the find waits for the page, "Choose the page and find again" offers the pages. QA-252 (2):
    // once a find finished on a page, Find again shows that page and "Another canada.ca page", where the next one is
    // pasted. After a run that read no page and none is remembered, Find again in Rules only waits for the page again.
    let via = "offered";
    if (!(await choose.count())) {
      await (await button()).click(); await dlg.waitFor();
      await dlg.locator("[data-find-plan], [data-page-again]").first().waitFor({ timeout: 30000 }); await p.waitForTimeout(500);
      if (await dlg.locator("[data-page-again]").count()) via = "again";
      else {
        await dlg.locator('[data-mode="rules"] input').check(); await dlg.locator("[data-find-plan]").waitFor({ timeout: 30000 });
        await p.getByRole("button", { name: "Start" }).click(); await dlg.waitFor({ state: "detached", timeout: 30000 }); await ended(sv);
        await choose.waitFor({ timeout: 30000 });
      }
    }
    if (via === "offered") {
      await (await button()).click(); await dlg.waitFor();
      if (t.pasted) await dlg.locator("[data-page-other]").fill(t.url);
      else await dlg.locator("[data-page-choice] label").filter({ hasText: t.url }).locator("input").check();
    } else {
      const used = (await dlg.locator("[data-page-used]").innerText()).trim();
      const usedNow = sql(`select plan->>'page_url' from ai_batch where operation='find_forms' and scope_label like '${sv}|%' and status in ('COMPLETED','PARTIAL') order by started_at desc limit 1`);
      if (!againShown) {
        step("QA-252 (2): after a find finished on a page, Find again shows that page (the one it will read) and offers another canada.ca page, so a wrong page is never a dead end", used === usedNow && await dlg.getByRole("radio", { name: /Another canada\.ca page/ }).count() === 1, { used, usedNow });
        await dlg.getByRole("radio", { name: /Another canada\.ca page/ }).check(); await p.waitForTimeout(500);
        step("QA-252 (2) fail: with 'Another canada.ca page' chosen and nothing pasted, Start stays off and the dialog asks for the address (it never reads the page used before instead)", await p.getByRole("button", { name: "Start" }).isDisabled() && await dlg.locator("[data-page-needed]").count() === 1 && !(await dlg.locator("[data-find-plan]").count()));
        await shot("find-again-another-page-empty");
        againShown = true;
      }
      await dlg.locator("[data-page-other]").fill(t.url);
    }
    await dlg.locator(`[data-mode="${mode}"] input`).check();
    await dlg.locator("[data-find-plan]").waitFor({ timeout: 30000 });
    const planText = await dlg.innerText();
    step(`${tag} [${via === "offered" ? (t.pasted ? "pasted in the page choice" : "offered") : "pasted in Find again"}]: the plan reads only the chosen page, at US$0`, /Cost: US\$0 \(no AI call\)/.test(planText) && !/This find cannot start/.test(planText), planText.slice(-200));
    if (k === 1 || t.pasted || t.title === "Start Up Visa") {
      await shot(`dialog-${k}-${via}-${t.pasted ? "pasted" : t.title.replace(/[^A-Za-z]+/g, "-").toLowerCase()}-${mode}`);
      const v = (await new AxeBuilder({ page: p }).include("[role=dialog]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
      step(`axe: the dialog (${tag}) has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id}: ${x.nodes[0]?.target?.join(" ")}`).join(" | "));
    }
    const before = runs(sv);
    const start = p.getByRole("button", { name: "Start" });
    // One try presses Start twice at once (a double click): the key is the same, so it is still one run.
    if (!doubled && t.url.length === 148 && mode === "rules") { await start.dblclick(); doubled = true; } else await start.click();
    const closed = await dlg.waitFor({ state: "detached", timeout: 30000 }).then(() => true, () => false);
    const red = closed ? "" : await dlg.locator('[role="alert"]').innerText().catch(() => "");
    if (!closed) await shot(`refused-${k}`);
    step(`${tag}: Start starts the find; no red line, never a validator's message`, closed && !RAW.test(red), red || "started");
    if (!closed) { await p.keyboard.press("Escape"); await dlg.waitFor({ state: "detached" }); continue; }
    await ended(sv);
    const last = sql(`select mode || '|' || (plan->>'page_url') || '|' || status || '|' || coalesce(message,'') from ai_batch where operation='find_forms' and scope_label like '${sv}|%' order by started_at desc limit 1`).split("|");
    step(`${tag}: one run, in that mode, on that page${t.url.length === 148 && mode === "rules" ? " (Start pressed twice at once)" : ""}`, runs(sv) === before + 1 && last[0] === mode.toUpperCase() && last[1] === t.url, { runs: runs(sv) - before, mode: last[0], page: last[1]?.length });
    await p.reload(); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await button();
    const after = await panel.innerText();
    step(`${tag}: next step: the Forms tab says how the find ended and offers the next action (a find button, never a dead end)`, await panel.locator("[data-find-forms]").count() === 1 && /Last find|Waiting for you|AI found/.test(after), `${last[2]}: ${last[3]} | ${after.split("\n").slice(0, 2).join(" | ")}`);
    if (k <= 2 || t.pasted || t.title === "Start Up Visa" || RECORDED.test(t.url)) await shot(`after-${k}-${t.pasted ? "pasted" : t.title.replace(/[^A-Za-z]+/g, "-").toLowerCase()}-${mode}`);
  }
  step("no page error in the walk", !errs.length, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
