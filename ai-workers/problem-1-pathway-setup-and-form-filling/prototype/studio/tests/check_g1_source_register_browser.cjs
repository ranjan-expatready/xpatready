// G1 PR 2b (C5.4, P-240; concept screens/G1-source-register/concept.md v2 §4–§6, boards 1 and 2) in the browser at
// 1440, 1024 and 400 px: on With an LMIA, a draft change holds back every number without a source; Review and release
// lists them in "Numbers without a source (n)", grouped by item, each with Add source (Check source when it changed);
// the Source panel cites a number (field errors in §5's words, the words must state the number), marks one "None
// published – set by ExpatReady" with its reason, re-checks a changed number ("Still correct for 19" refused on words
// that state 18, then new words), shows a conflict (409) with Keep mine, and is read only for a non-author. Once every
// number has its answer the block says so and Submit is offered. The Release page holds the row back with its count.
// axe (WCAG 2.2 AA) on each state, keyboard into and out of the panel, no sideways scroll. Sample inputs; no AI call
// (US$0). Screenshots into product/screens/G1-source-register/screenshots/.
//   zsh studio/tools/isolated.sh screens_g1ui 4452 start && node studio/tests/check_g1_source_register_browser.cjs 4452 xr_studio_screens_g1ui
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { sourceEveryNumber } = require("./fixtures/source-every-number.cjs");
const PORT = Number(process.argv[2] ?? 4452), BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "G1-source-register", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const NONE = "None published – set by ExpatReady";
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).replace(/\s+/g, " ").slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (method, u, data, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, data: data === undefined ? undefined : JSON.stringify(data) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (actor) => { await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(250); };
  const axe = async (name, include) => { let a = new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]); if (include) a = a.include(include); const v = (await a.analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, v.length === 0, v.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`).join("; ")); };
  const fits = () => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const block = () => p.locator("[data-unsourced]");
  const panel = () => p.locator("[data-source-panel]");
  const card = (address) => panel().locator(`[data-source-number="${address}"]`);
  /** Review r2 m1 on PR 2b: a card's state after a save is read once the refetch has landed (up to 15 s), never at once. */
  const stateIs = async (address, state) => { try { await panel().locator(`[data-source-number="${address}"][data-state="${state}"]`).waitFor({ timeout: 15000 }); return true; } catch { return false; } };
  const held = async (id) => (await api("GET", `/combinations/${id}/sources`)).body.counts.held_back;
  const review = async (id) => { await p.goto(`${BASE}/c/${id}/review`); await settle(); await p.waitForSelector("[data-unsourced], [data-sources-all-set]", { timeout: 30000 }); };
  const openFor = async (n) => { const more = block().getByRole("button", { name: /^Show all \d+ items$/ }); if (await more.count()) await more.click(); await block().locator(`[data-unsourced-item="${n.key}"] [data-unsourced-number="${n.address}"] button`).click(); await panel().locator(`[data-source-number="${n.address}"]`).waitFor(); await p.waitForTimeout(200); };
  const closePanel = async () => { await p.keyboard.press("Escape"); await p.locator("[data-source-panel]").waitFor({ state: "detached" }); await settle(); };
  const field = (c, label) => c.getByLabel(label, { exact: false });
  try {
    await p.goto(BASE); await as("user-A");
    step("setup: Reset, then the sample inputs loaded", (await api("POST", "/demo/reset", { confirm: "RESET" })).status < 300 && (await api("POST", "/demo/load")).status === 201);
    const cat = JSON.stringify((await api("GET", "/catalogue")).body);
    let wp = null;
    for (const m of cat.matchAll(/"combinationId":"([0-9a-f-]{36})"/g)) { const s = (await api("GET", `/combinations/${m[1]}/sources`)).body; if (s?.combination?.key === "wp.family") { wp = m[1]; break; } }
    step("setup: With an LMIA (wp.family) found", !!wp);
    const cfg = (await api("GET", `/combinations/${wp}/config`)).body.snapshot; const rule = cfg.rules.find((x) => x.id === "R-01");
    // Both of R-01's 18s become 19 ("at least 19" and "less than 19"), so the item holds the same number twice (the twin save).
    const when19 = JSON.parse(JSON.stringify(rule.when).replace('{"op":"gte","field":"person.age_years","value":18}', '{"op":"gte","field":"person.age_years","value":19}').replace('{"op":"lt","field":"person.age_years","value":18}', '{"op":"lt","field":"person.age_years","value":19}'));
    step("setup: rule R-01's two 18s (\"at least 18\", \"less than 18\") changed to 19 in the draft", (await api("PATCH", `/combinations/${wp}/rules/R-01`, { condition: when19, whenPlain: rule.when_plain, thenPlain: rule.then, forWhom: rule.for_whom, sourceQuote: rule.source_quote })).status < 300);
    const s0 = (await api("GET", `/combinations/${wp}/sources`)).body, n0 = s0.counts.held_back;
    const r01 = s0.numbers.find((n) => n.key === "wp.family/R-01" && n.address === "person.age_years|gte|1"), r01lt = s0.numbers.find((n) => n.key === "wp.family/R-01" && n.address === "person.age_years|lt|1");
    const n90 = s0.numbers.find((n) => n.state === "missing" && n.value === "90"), n5 = s0.numbers.find((n) => n.state === "missing" && n.value === "5");

    // ------------------------------------------------------------------ board 1: the block, at three widths
    for (const [w, h] of [[1440, 1000], [1024, 768], [400, 860]]) {
      await p.setViewportSize({ width: w, height: h }); await review(wp);
      const t = await block().innerText();
      step(`C5.4 §4 (${w}): Review and release lists "Numbers without a source (${n0})", grouped by item, with the refusal's words`, t.includes(`Numbers without a source (${n0})`) && /They block submission and release, grouped by item/.test(t) && t.includes("has no source entry. Add the official source, or mark \"None published – set by ExpatReady\"."), t.slice(0, 300));
      step(`C5.4 BR-6 (${w}): the changed number reads "Changed since its source" with 18 and 19, and offers Check source`, await block().locator(`[data-unsourced-item="${r01.key}"] [data-unsourced-number="${r01.address}"]`).filter({ hasText: "Changed since its source" }).filter({ hasText: "written for 18; the number is now 19" }).getByRole("button", { name: /^Check source/ }).count() > 0);
      step(`C5.4 §4 (${w}): the context line counts the sample load's own citations`, /more have a source "From the sample load"/.test(t), t.slice(0, 300));
      step(`C5.4 (${w}): no sideways scroll`, await fits());
      await p.screenshot({ path: path.join(SHOTS, `review-block-${w}.png`), fullPage: false });
      if (w === 1440) await axe("Review and release with the block", "main");
    }
    await p.setViewportSize({ width: 1440, height: 1000 }); await review(wp);
    const vt = await p.locator("main").innerText();
    step("C5.4 BR-7: the validation block no longer repeats the numbers (it counts \"other\" errors)", /0 other errors/.test(vt) && !/Validation of the draft[\s\S]*has no source entry/.test(vt));
    step("C5.4 BR-8: Submit stays greyed with \"Fix the problems first\"", await p.getByRole("button", { name: /Submit for review/ }).isDisabled() && (await p.getByRole("button", { name: /Submit for review/ }).getAttribute("title")) === "Fix the problems first");

    // ------------------------------------------------------------------ board 2: cite a number, field errors first (keyboard in)
    const add5 = block().locator(`[data-unsourced-item="${n5.key}"] [data-unsourced-number="${n5.address}"]`).getByRole("button");
    await add5.focus(); await p.keyboard.press("Enter"); await card(n5.address).waitFor(); await p.waitForTimeout(200);
    step("C5.4 keyboard: Enter on Add source opens the Source panel with focus inside it", await p.evaluate(() => !!document.activeElement?.closest("[role=dialog]")));
    const c5 = card(n5.address);
    step("C5.4 §4 (review m6): the words start as the item's own quote (item_quote)", !!n5.item_quote && (await field(c5, "The words that state the number").inputValue()) === n5.item_quote, n5.item_quote);
    step("C5.4 §4: a missing number opens on Official source, with the item's own quote filled in and today's date", (await c5.getByRole("radio", { name: "Official source" }).isChecked()) && (await field(c5, "Date read").inputValue()) === new Date().toISOString().slice(0, 10));
    await field(c5, "Official address").fill("http://www.canada.ca/x"); await field(c5, "The words that state the number").fill("Test data, not an official quote: at least five years ago");
    await field(c5, "Date read").fill("1989-05-01");
    await c5.getByRole("button", { name: "Save source" }).click(); await settle();
    const e1 = await c5.innerText();
    step("C5.4 §5 fail: an http address and a 1989 date read are refused on their fields, in §5's words", e1.includes("Use an https address.") && e1.includes("The date read cannot be before 1990."), e1);
    await axe("the Source panel with field errors", "[role=dialog]");
    await p.screenshot({ path: path.join(SHOTS, "panel-field-errors-1440.png") });
    await field(c5, "Official address").fill("https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5487.html");
    await field(c5, "Date read").fill("2026-10-19"); await field(c5, "The words that state the number").fill("Test data, not an official quote: at least 50 years");
    await c5.getByRole("button", { name: "Save source" }).click(); await settle();
    step("C5.4 BR-3 fail: words that state another number (50 for 5) are refused on the words", (await c5.innerText()).includes("These words do not state 5. Copy the words that state the number."));
    await field(c5, "The words that state the number").fill("Test data, not an official quote: at least five years");
    await c5.getByRole("button", { name: "Save source" }).click(); await settle();
    // Review r2 m1 on PR 2b: wait for the refetch to land, not a fixed pause.
    await panel().locator(`[data-source-number="${n5.address}"][data-state="cited"]`).waitFor({ timeout: 15000 }).catch(() => {});
    step("C5.4 BR-3 pass: words that state 5 save; the card reads \"Official source\" with its page and date", await stateIs(n5.address, "cited") && /checked (19 Oct|Oct 19,) 2026/.test(await card(n5.address).innerText()), await card(n5.address).innerText());
    await p.screenshot({ path: path.join(SHOTS, "panel-cited-1440.png") });
    await closePanel();
    step("C5.4 keyboard: Escape closes the panel", (await p.locator("[role=dialog]").count()) === 0);
    await p.waitForTimeout(300);
    const focusAfterSave = await p.evaluate(() => ({ inBlock: !!document.activeElement?.closest("[data-unsourced]"), tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent?.slice(0, 60) }));
    step("C5.4 review MJ-2 (WCAG 2.4.3): after its number left the list, focus goes to the next number's button in the block, never the page", focusAfterSave.inBlock && focusAfterSave.tag === "BUTTON", focusAfterSave);
    const b90 = block().locator(`[data-unsourced-item="${n90.key}"] [data-unsourced-number="${n90.address}"] button`);
    if (await b90.count() === 0) await block().getByRole("button", { name: /^Show all \d+ items$/ }).click();
    await b90.focus(); await p.keyboard.press("Enter"); await card(n90.address).waitFor(); await p.keyboard.press("Escape"); await p.locator("[data-source-panel]").waitFor({ state: "detached" }); await p.waitForTimeout(200);
    step("C5.4 review MJ-2: Escape without saving returns focus to the button that opened the panel", await p.evaluate((a) => document.activeElement?.getAttribute("aria-label") === a, `Add source: ${n90.words}`));
    step("C5.4 §4 pass: the cited number leaves the block, and the count drops by one", (await block().innerText()).includes(`Numbers without a source (${n0 - 1})`) && (await held(wp)) === n0 - 1);

    // ------------------------------------------------------------------ None published, with its reason
    await openFor(n90);
    const c90 = card(n90.address);
    // Break M4: a typed source is not thrown away without asking.
    await c90.getByRole("radio", { name: NONE }).check(); await field(c90, "Why ExpatReady set this number").fill("Typed, not saved yet");
    let asked = ""; p.once("dialog", (dlg) => { asked = dlg.message(); void dlg.dismiss(); });
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    step("C5.4 break M4: Escape with a typed, unsaved source asks first; answering no keeps the panel and the words", asked.startsWith("Discard the source you typed?") && await p.locator("[data-source-panel]").count() === 1 && (await field(c90, "Why ExpatReady set this number").inputValue()) === "Typed, not saved yet", asked);
    await c90.getByRole("radio", { name: NONE }).check();
    await field(c90, "Why ExpatReady set this number").fill("too short"); await c90.getByRole("button", { name: "Save source" }).click(); await settle();
    step("C5.4 §5 fail: a reason under 10 characters answers its own words", (await c90.innerText()).includes("Say why ExpatReady set this number (at least 10 characters)."));
    step("C5.4 §4: None published says when to use it", (await c90.innerText()).includes("Use this only when the government publishes nothing on the point."));
    await field(c90, "Why ExpatReady set this number").fill("Test data: ExpatReady's own early warning; IRCC publishes no lead time.");
    await c90.getByRole("button", { name: "Save source" }).click(); await settle();
    step(`C5.4 BR-3 pass: "${NONE}" with its reason saves`, await stateIs(n90.address, "none_published"));
    await p.screenshot({ path: path.join(SHOTS, "panel-none-published-1440.png") });
    await closePanel();

    // ------------------------------------------------------------------ a changed number: Still correct is refused on words that state 18
    await openFor(r01);
    const cr = card(r01.address);
    step("C5.4 BR-6: the changed card says the source was written for 18 and the number is now 19, with Still correct and Write a new source", (await cr.innerText()).includes("The source was written for 18; the number is now 19.") && await cr.getByRole("button", { name: "Still correct for 19" }).count() === 1 && await cr.getByRole("button", { name: "Write a new source" }).count() === 1);
    await p.screenshot({ path: path.join(SHOTS, "panel-changed-1440.png") });
    await cr.getByRole("button", { name: "Still correct for 19" }).click(); await settle();
    step("C5.4 BR-6 fail: \"Still correct for 19\" with words that state 18 is refused, and the editor opens on the words", (await cr.innerText()).includes("These words do not state 19.") && await cr.locator("[data-source-editor]").count() === 1, await cr.innerText());
    await field(cr, "The words that state the number").fill("Test data, not an official quote: aged 19 years or older");
    const twin = cr.getByRole("checkbox", { name: /Use the same source for the other 19 in this item/ });
    step("C5.4 board 2 (review m6): the item's other 19 is offered as a twin", await twin.count() === 1);
    await twin.check();
    await cr.getByRole("button", { name: "Save source" }).click(); await settle();
    step("C5.4 BR-6 pass: new words that state 19 save, and the card is cited again", await stateIs(r01.address, "cited"));
    step("C5.4 board 2 (review m6): the twin save wrote the other 19 too", await stateIs(r01lt.address, "cited"));
    const mine1 = await card(r01.address).innerText();
    step("C5.4 review MJ-1: once the author saves it, the card no longer credits the sample load (no chip, \"by Configuration author\")", !mine1.includes("From the sample load") && !mine1.includes("written by the sample load") && /by Configuration author/.test(mine1), mine1);
    // The number moves while the panel is open (review m2): the 409 says the number changed, never "someone else".
    const when21 = JSON.parse(JSON.stringify(when19).replace('{"op":"gte","field":"person.age_years","value":19}', '{"op":"gte","field":"person.age_years","value":21}'));
    step("setup: R-01's \"at least 19\" moved to 21 while the panel is open", (await api("PATCH", `/combinations/${wp}/rules/R-01`, { condition: when21, whenPlain: rule.when_plain, thenPlain: rule.then, forWhom: rule.for_whom, sourceQuote: rule.source_quote })).status < 300);
    await card(r01.address).getByRole("button", { name: "Change" }).click();
    await card(r01.address).getByRole("button", { name: "Save source" }).click(); await settle();
    const mv = await card(r01.address).innerText();
    step("C5.4 review m2: a number that moved answers \"The number changed\" with Reload, never \"Saved by someone else\" or Keep mine", mv.includes("The number changed") && !mv.includes("Saved by someone else") && await card(r01.address).getByRole("button", { name: "Keep mine and save again" }).count() === 0 && await card(r01.address).getByRole("button", { name: "Reload", exact: true }).count() === 1, mv);
    await card(r01.address).getByRole("button", { name: "Reload", exact: true }).click(); await settle();
    step("C5.4 review m2: after Reload the card shows the number as it is now (changed: written for 19; now 21)", await stateIs(r01.address, "changed") && (await card(r01.address).innerText()).includes("the number is now 21"));
    await card(r01.address).getByRole("button", { name: "Write a new source" }).click();
    await field(card(r01.address), "The words that state the number").fill("Test data, not an official quote: aged 21 years or older");
    await card(r01.address).getByRole("button", { name: "Save source" }).click(); await settle();
    step("C5.4 BR-6 pass: words that state 21 save", await stateIs(r01.address, "cited"));
    await closePanel();

    // ------------------------------------------------------------------ conflict (409): someone else saved while it was open
    const s1 = (await api("GET", `/combinations/${wp}/sources`)).body;
    const nc = s1.numbers.find((n) => n.state === "missing" && n.value === "30");
    await openFor(nc);
    const cc = card(nc.address);
    await cc.getByRole("radio", { name: NONE }).check(); await field(cc, "Why ExpatReady set this number").fill("Test data: mine, typed while someone else saved.");
    const other = await api("PUT", `/combinations/${wp}/sources/${encodeURIComponent(nc.kind)}/${encodeURIComponent(nc.key)}`, { address: nc.address, value: nc.value, version: 0, none_published: { reason: "Test data: theirs, saved first." } });
    step("setup: another author saves the same number first (200)", other.status === 200);
    await cc.getByRole("button", { name: "Save source" }).click(); await settle();
    const ct = await cc.innerText();
    step("C5.4 §5 conflict (the same author in another window, break M3): the panel says so with when, and offers Reload the saved one and Keep mine", ct.includes("You saved this source in another window while this one was open (") && await cc.getByRole("button", { name: "Reload the saved one" }).count() === 1 && await cc.getByRole("button", { name: "Keep mine and save again" }).count() === 1, ct);
    step("C5.4 break M3: the conflict shows what the other save holds before Keep mine", (await cc.locator("[data-source-theirs]").innerText().catch(() => "")).includes("Test data: theirs, saved first."));
    await axe("the Source panel in conflict", "[role=dialog]");
    await p.screenshot({ path: path.join(SHOTS, "panel-conflict-1440.png") });
    await cc.getByRole("button", { name: "Keep mine and save again" }).click(); await settle();
    const mine = (await api("GET", `/combinations/${wp}/sources/${encodeURIComponent(nc.kind)}/${encodeURIComponent(nc.key)}`)).body.numbers.find((n) => n.address === nc.address);
    step("C5.4 BR-11 pass: Keep mine saves over theirs with the version it was told (version 2)", mine.entry.version === 2 && mine.entry.none_published.reason.startsWith("Test data: mine"), mine.entry);
    await closePanel();

    // ------------------------------------------------------------------ read only for a non-author (the immigration expert)
    await as("user-C"); await review(wp);
    const left = (await api("GET", `/combinations/${wp}/sources`)).body.numbers.find((n) => !n.passes);
    step("C5.4 review m1: a non-author is offered View, never Add source or Check source", await block().getByRole("button", { name: /^(Add source|Check source)/ }).count() === 0 && await block().getByRole("button", { name: /^View: / }).count() > 0);
    await openFor(left);
    step("C5.4 review m1: a missing number reads \"No source yet\" for a non-author", await card(left.address).locator("[data-source-none-yet]").count() === 1);
    const ro = await panel().innerText();
    step("C5.4 BR-11: for a non-author the panel is read only: no Save, and it says who adds sources", ro.length > 0 && (await p.locator("[role=dialog]").innerText()).includes("Only the configuration author adds sources.") && await panel().getByRole("button", { name: /Save source|Change/ }).count() === 0);
    await p.screenshot({ path: path.join(SHOTS, "panel-read-only-1440.png") });
    await closePanel(); await as("user-A");

    // ------------------------------------------------------------------ the Release page holds the row back with its count
    await as("user-B"); await p.goto(`${BASE}/release`); await settle();
    const nowHeld = await held(wp);
    const rt = await p.locator("main").innerText();
    step("C5.4 §4: the Release page holds the row back: \"<n> numbers have no source entry: fix on Review and release.\"", rt.includes(`Held back: ${nowHeld} numbers have no source entry: fix on Review and release.`), rt.slice(0, 600));
    await p.screenshot({ path: path.join(SHOTS, "release-held-1440.png") });
    await as("user-A");

    // ------------------------------------------------------------------ all sourced: the block says so, Submit is offered
    await sourceEveryNumber(PORT, wp);
    await review(wp);
    const at = await p.locator("[data-sources-all-set]").innerText().catch(() => "");
    step("C5.4 pass: with every number answered, the block says every published number has its source, and Submit is offered", /Every published number has its answer: an official source or "None published – set by ExpatReady" \(\d+, \d+ of them from the sample load\)/.test(at) && await p.locator("[data-unsourced]").count() === 0 && !(await p.getByRole("button", { name: /Submit for review/ }).isDisabled()), at);
    await axe("Review and release with every number sourced", "main");
    await p.screenshot({ path: path.join(SHOTS, "review-all-sourced-1440.png") });
    step("no page errors", errs.length === 0, errs.join(" | "));
  } catch (e) { step("ran to the end", false, e.stack ?? e.message); }
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
