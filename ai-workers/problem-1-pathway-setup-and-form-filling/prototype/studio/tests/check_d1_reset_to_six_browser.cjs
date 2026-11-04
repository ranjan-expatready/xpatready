// D1 (P-226; C10.1, C11.7): Demo › Reset to the six walked in a real browser like a person, by keyboard: open Demo,
// choose Reset to the six…, read what goes, what comes back and what is kept, type RESET, confirm (a double click
// sends one request), see the six loaded with the saved AI answers replayed. Widths 1440, 1024 and 400 without
// sideways scroll; axe (WCAG 2.2 AA) on each dialog. Screenshots before/after in screens/W1-reset-and-sample/screenshots/
// (d1-*). A failure midway is forced in this copy's own database (a trigger refusing the third combination, dropped in
// finally): the dialog stays open with the server's words and RESET typed, and the screen behind shows the emptied
// configuration (D1 review 2). A pass and a fail per rule. Replays only, no model call (US$0).
//   zsh studio/tools/isolated.sh rt_d1b 4432 start && node studio/tests/check_d1_reset_to_six_browser.cjs 4432 xr_studio_rt_d1b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4432), DB = process.argv[3] ?? "xr_studio_rt_d1b", NAME = DB.replace(/^xr_studio_/, ""); // the copy's name, as isolated.sh names its database
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-reset-and-sample", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
// The copy's reset log (api/src/demo.ts appends one line per reset): counts the resets the page really sent.
const RESET_LOG = path.join(__dirname, "..", "var", `isolated-${NAME}`, "reset-log.jsonl");
const resets = () => (fs.existsSync(RESET_LOG) ? fs.readFileSync(RESET_LOG, "utf8").split("\n").filter(Boolean).length : 0);
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const n = (q) => Number(sql(q));
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const post = (p, body) => fetch(`${BASE}/api${p}`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.status);

(async () => {
  // A configured start: the suites' fixture (a release, library fields, a Super visa that is not one of the six).
  await post("/demo/reset", { confirm: "RESET" });
  if ((await post("/demo/load", {})) >= 300) { console.error("STOP  the fixture did not load"); process.exit(2); }
  const oldWs = sql(`select id from workspace limit 1`);
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const dialog = () => p.getByRole("dialog");
  const sideways = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const widths = async (name, shots) => {
    const out = [];
    for (const [w, h] of [[1440, 900], [1024, 768], [400, 800]]) {
      await p.setViewportSize({ width: w, height: h });
      const box = await dialog().boundingBox();
      out.push([w, await sideways(), box ? Math.round(box.x + box.width) <= w : false]);
      if (shots && w !== 400) await p.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`) });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    step(`D1: "${name}" fits at 1440, 1024 and 400 with no sideways scroll`, out.every(([, s, fits]) => s <= 0 && fits), JSON.stringify(out));
    const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).include("[role=dialog]").analyze();
    step(`axe (WCAG 2.2 AA) on "${name}": no violations`, axe.violations.length === 0, axe.violations.map((v) => v.id).join(", "));
  };
  await p.goto(BASE); await p.waitForLoadState("networkidle");

  // By keyboard: focus Demo, open it, move down to the item, choose it.
  // Red-main fix (LeadX, 2 Nov; runs 41401230384, 41400122250): the keys were pressed and the focus read at once, so a
  // focus that lags (or never enters the menu) failed with no reason, then hung on the dialog. Each key now waits for
  // the focus to settle, the path it took is shown, and a miss stops the keyboard path in words instead of hanging.
  await p.getByRole("button", { name: "Demo" }).focus();
  await p.keyboard.press("Enter");
  await p.getByRole("menu").waitFor();
  const focusText = () => p.evaluate(() => (document.activeElement?.textContent ?? "").trim());
  const inMenu = await p.waitForFunction(() => !!document.activeElement?.closest("[role=menu]"), null, { timeout: 5000 }).then(() => true, () => false);
  const focusPath = [await focusText()], items = await p.getByRole("menuitem").allInnerTexts();
  let reached = inMenu && /Reset to the six/.test(focusPath[0]);
  for (let i = 0; inMenu && i < items.length && !reached; i++) {
    await p.keyboard.press("ArrowDown");
    // The focus moves to the next item; at the last item it stays (the menu does not wrap), which ends the walk.
    const moved = await p.waitForFunction((b) => (document.activeElement?.textContent ?? "").trim() !== b && !!document.activeElement?.closest("[role=menu]"), focusPath[focusPath.length - 1], { timeout: 3000 }).then(() => true, () => false);
    if (!moved) break;
    focusPath.push(await focusText()); reached = /Reset to the six/.test(focusPath[focusPath.length - 1]);
  }
  step("D1: Reset to the six… is in the Demo menu, next to Reset demo…, reachable with the arrow keys", reached && await p.getByRole("menuitem", { name: /Reset demo…/ }).count() === 1,
    JSON.stringify({ focus_entered_menu: inMenu, focus_path: focusPath, items }));
  if (!reached) { console.log("STOP  the keyboard path did not reach Reset to the six…; the dialog checks need it (see the focus path above)"); await b.close(); process.exit(1); }
  await p.keyboard.press("Enter");
  await dialog().getByText("Reset to the six?").waitFor({ timeout: 10000 });
  const t = await dialog().innerText();
  step("D1 (P-226): the dialog says plainly what goes (all configuration, the shared library, checks, rules, questionnaires, releases)", /Goes/.test(t) && /All configuration: structure, combinations, the shared library \(fields, sections, document types\), the Form library, checks, rules, questionnaires and releases/.test(t), t.slice(0, 200));
  step("D1 (P-226): ... what comes back (the six, 5 Retail + 1 Corporate, their official PDFs, saved answers replayed)", /Comes back/.test(t) && /The six combinations: 5 Retail \+ 1 Corporate/.test(t) && /official PDFs/.test(t) && /saved AI answers replayed/.test(t));
  step("D1 (P-226): ... and what is kept (saved AI results, replayed at US$0)", /Kept/.test(t) && /Saved AI results \(recorded answers\), so they replay at US\$0/.test(t));
  const go = dialog().getByRole("button", { name: "Reset to the six" });
  step("D1 fail: Reset to the six stays off until RESET is typed", await go.isDisabled());
  const focused = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  step("D1: the confirmation field has the focus when the dialog opens (keyboard)", focused === "Type RESET to confirm", focused);
  await p.keyboard.type("reset");
  step("D1 fail: a lower-case reset does not unlock it", await go.isDisabled());
  await widths("d1-01-reset-to-six-dialog", true);
  await p.keyboard.press("Escape");
  await dialog().waitFor({ state: "detached" });
  step("D1 fail: Escape (cancel) changes nothing: the same workspace, the Super visa still there", sql(`select id from workspace limit 1`) === oldWs && n(`select count(*) from combination where label='Super visa'`) === 1);

  // A failure midway (D1 review 2): the words stay in the dialog, and the screen behind reads the emptied state again.
  const superBefore = await p.getByText("Super visa").count();
  sql(`create or replace function d1_refuse_third() returns trigger language plpgsql as $$ begin if (select count(*) from combination where workspace_id = new.workspace_id) >= 2 then raise exception 'd1 test: the third combination is refused'; end if; return new; end $$`);
  sql(`create trigger d1_refuse_third before insert on combination for each row execute function d1_refuse_third()`);
  try {
    await p.getByRole("button", { name: "Demo" }).click(); await p.getByRole("menuitem", { name: /Reset to the six/ }).click();
    await dialog().getByText("Reset to the six?").waitFor();
    await p.getByLabel("Type RESET to confirm").fill("RESET"); await p.keyboard.press("Enter");
    await p.locator("[data-six-failed]").waitFor({ timeout: 400000 });
  } finally { sql(`drop trigger if exists d1_refuse_third on combination`); sql(`drop function if exists d1_refuse_third()`); }
  const failedText = await p.locator("[data-six-failed]").innerText();
  step("D1 fail (review 2): after a failure midway the dialog stays open with the server's words in place, RESET still typed, ready to try again", /emptied/.test(failedText) && /Reset to the six again/.test(failedText) && (await p.getByLabel("Type RESET to confirm").inputValue()) === "RESET" && await dialog().getByRole("button", { name: "Try again" }).isEnabled(), failedText);
  step("D1 fail (review m1): the words are plain (no database internals or server paths)", !/invocation|prisma|\.ts:\d|\/home\/|\/Users\//i.test(failedText), failedText);
  await widths("d1-03-reset-to-six-stopped", true);
  await p.keyboard.press("Escape"); await dialog().waitFor({ state: "detached" });
  const behind = n(`select count(*) from combination`);
  let superAfter = -1; for (let i = 0; i < 20 && superAfter !== 0; i++) { superAfter = await p.getByText("Super visa").count(); if (superAfter) await p.waitForTimeout(250); }
  step("D1 fail (review 2): the screen behind shows the emptied configuration, not the old one (the Super visa gone)", superBefore > 0 && superAfter === 0 && behind === 2 && n(`select count(*) from combination where label='Super visa'`) === 0, `Super visa on screen ${superBefore} → ${superAfter}; combinations in the database ${behind}`);

  // Again, through to the end; confirmed with a double click: one request.
  await p.getByRole("button", { name: "Demo" }).click(); await p.getByRole("menuitem", { name: /Reset to the six/ }).click();
  await dialog().getByText("Reset to the six?").waitFor();
  const input = p.getByLabel("Type RESET to confirm");
  step("D1: the field opens empty (the earlier typing is not kept)", (await input.inputValue()) === "");
  await input.fill("RESET");
  await p.keyboard.press("Tab"); await p.keyboard.press("Tab"); // the field, then Cancel, then the button
  const onGo = await p.evaluate(() => document.activeElement?.textContent ?? "");
  step("D1: Tab from the field reaches Cancel, then the Reset to the six button", /Reset to the six/.test(onGo), onGo);
  const r0 = resets();
  await go.dblclick();
  await dialog().getByText("Reset to the six: done").waitFor({ timeout: 400000 });
  const shown = Number(await p.locator('[data-count="Combinations"]').innerText());
  const ws = sql(`select id from workspace limit 1`);
  step("D1: one request for a double click: one reset in the copy's log, no error shown", resets() - r0 === 1 && !(await p.locator("[data-toaster] .border-l-danger").count()), resets() - r0);
  step("C10.1 (P-226): after it, the old configuration is gone: no Super visa, no release, no library field", ws !== oldWs && n(`select count(*) from combination where label='Super visa'`) === 0 && n(`select count(*) from config_release`) === 0 && n(`select count(*) from canonical_field`) === 0);
  step("C11.7 (P-226): the result shows exactly the six, and the saved AI answers' proposals waiting", shown === 6 && n(`select count(*) from combination where workspace_id='${ws}'`) === 6 && Number(await p.locator('[data-count="AI proposals waiting for review"]').innerText()) === n(`select count(*) from proposal_item where status='waiting' and origin='ai'`) && n(`select count(*) from proposal_item where status='waiting' and origin='ai'`) > 0);
  const kept = await p.locator("[data-six-kept]").innerText();
  step("D1 (P-226): the result says the saved AI results are byte-identical before and after", /Saved AI results, official PDF copies and the spend record are byte-identical/.test(kept), kept);
  await widths("d1-02-reset-to-six-done", true);
  await dialog().getByRole("button", { name: "Continue" }).click();
  await p.getByRole("button", { name: "Demo" }).click();
  step("D1: the blank Reset demo… is still in the menu; Load sample is off (the six are loaded)", await p.getByRole("menuitem", { name: /Reset demo…/ }).count() === 1 && await p.getByRole("menuitem", { name: /Sample loaded \(reset to load again\)/ }).count() === 1);
  await p.keyboard.press("Escape");

  step("no page error or console error on the way", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
