// B86 (QA-237, C4.11; Done when 9): "Form fields that read this answer", walked in a real browser at 1440 px by keyboard: on a
// condition's card, on the second person's page, and under a "Hiding a value" problem on Review and release. Plain words, no
// field code, axe (WCAG 2.2 AA), no sideways scroll at 1440 and 400 px. Saved answers only: US$0. All conditions are Sample.
//   zsh studio/tools/isolated.sh forms_b86b 4452 start && node studio/tests/check_forms_b86_panel_browser.cjs 4452 xr_studio_forms_b86b
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_b86b";
const BASE = `http://localhost:${PORT}`, STUDIO = path.resolve(__dirname, "..");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "B86-form-field-condition", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const CODES = /AliasNameIndicator|natIDIndicator|usCardIndicator|person\.[a-z_]+|form1\[/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  const out = execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), [path.join(__dirname, "check_forms_b86_setup.ts"), String(PORT), DB], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 540_000 });
  const { vv, given } = JSON.parse(out.split("\n").find((l) => l.startsWith("SETUP {")).slice(6));
  const b = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, method = "GET", data, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, ...(data ? { data: JSON.stringify(data) } : {}) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const check = async (name, selector, shot) => {
    await p.waitForSelector(selector, { timeout: 60_000 });
    for (const [w, h] of [[1440, 900], [400, 800]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(200);
      if (w === 1440) await p.screenshot({ path: path.join(SHOTS, `${shot}-1440.png`) });
      const axe = await new AxeBuilder({ page: p }).include(selector).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      step(`Done when 9: axe at ${w} px, ${name}: no WCAG 2.2 AA violation`, axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
      step(`Done when 9: no sideways scroll at ${w} px, ${name}`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    const text = await p.locator(selector).innerText();
    step(`Done when 9: plain words, no field code, ${name}`, !CODES.test(text), text.match(CODES)?.[0]);
    return text;
  };

  // ---------------------------------------------------------------- the card
  await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent(`combination:${vv}`)}`);
  const open = p.getByRole("button", { name: /Other family name|family name/i }).or(p.getByRole("link", { name: /family name/i })).first();
  await open.waitFor({ timeout: 60_000 });
  await open.focus(); await p.keyboard.press("Enter");
  const panel = '[data-form-field-conditions="person.other_family_name"]';
  let text = await check("the condition's card", panel, "card");
  step("BR-2: the card shows the form field's own words", /one name only on the form/.test(text), text);
  step("BR-2: Not confirmed, Sample, a second person", /Not confirmed/.test(text) && /A second person approves/.test(text) && /Sample, Unconfirmed: expert/.test(text), text);
  const say = p.locator(panel).getByRole("button", { name: "Says the same as this condition" });
  await say.focus();
  step("Done when 9: the button takes the keyboard's focus", await say.evaluate((e) => e === document.activeElement));
  await p.keyboard.press("Enter");
  await p.locator(`${panel} [data-state="waiting"]`).waitFor({ timeout: 60_000 });
  step("Done when 1: by keyboard the row goes to Waiting for a second person, with the way to To review", await p.locator(panel).getByRole("link", { name: "Open on To review" }).count() === 1);
  await check("the card, waiting", panel, "card-waiting");

  // ---------------------------------------------------------------- the second person's page
  const ffId = (await p.locator(`${panel} a`).getAttribute("href")).split("/").pop();
  step("the row links to its own change", !!ffId, ffId);
  await p.goto(`${BASE}/review/change/${ffId}`);
  text = await check("the second person's page", "[data-change-form-field]", "second-person");
  step("BR-3: it names the form field, its own words and what is proposed", /Its own words/.test(text) && /one name only on the form/.test(text) && /Filled only when/.test(text), text);
  const pageText = await p.locator("main").innerText();
  step("Done when 9: no field code anywhere on the second person's page", !CODES.test(pageText), pageText.match(CODES)?.[0]);
  await api(`/library/changes/${ffId}/approve`, "POST", { note: "Checked against the form's words by a test (B86)." }, "user-B");

  // ---------------------------------------------------------------- Review and release: the given names, accepted and approved, not confirmed
  await api("/review/proposals/decide", "POST", { ids: [given], action: "accept" });
  const cond = execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", `select id from library_change where kind='placement_condition' and key='person.other_given_names' and status='WAITING'`], { encoding: "utf8" }).trim();
  await api(`/library/changes/${cond}/approve`, "POST", { note: "Approved by a test (B86)." }, "user-B");
  await p.goto(`${BASE}/c/${vv}/review`);
  const under = '[data-form-field-conditions="person.other_given_names"]';
  text = await check("Review and release", under, "review-release");
  step("the refusal's way out is on the problem: the form field, its own words, one button", /one name only on the form/.test(text) && (await p.locator(under).getByRole("button", { name: "Says the same as this condition" }).count()) === 1, text);
  const first = await p.locator("[data-problem]").first().innerText();
  step("BR (m5): \"Hiding a value\" sorts first, so it is never behind Show all", /Hiding a value a form reads/.test(first), first);

  // ---------------------------------------------------------------- the way back (review M1), and a returned change (review M2)
  await p.locator(under).getByRole("button", { name: "Says the same as this condition" }).click();
  await p.locator(`${under} [data-state="waiting"]`).waitFor({ timeout: 60_000 });
  const backId = (await p.locator(`${under} a`).getAttribute("href")).split("/").pop();
  await api(`/library/changes/${backId}/approve`, "POST", { note: "Approved by a test (B86)." }, "user-B");
  await p.reload();
  await p.locator("[data-form-fields-held] summary").click();
  await check("Review and release, a form field holding a condition", "[data-form-fields-held]", "held");
  const undo = p.locator(`[data-form-fields-held] ${under}`).getByRole("button", { name: /take the condition off/i }); // B88 (WCAG 2.5.3): the name starts with its visible "Undo:"
  step("BR-7 pass (review M1): once approved, Undo is on the screen", await undo.count() === 1);
  await undo.focus(); await p.keyboard.press("Enter");
  await p.locator(`[data-form-fields-held] ${under} [data-state="waiting"]`).waitFor({ timeout: 60_000 });
  const undoId = (await p.locator(`[data-form-fields-held] ${under} a`).getAttribute("href")).split("/").pop();
  await api(`/library/changes/${undoId}/return`, "POST", { note: "Returned by a test: keep it for now (B86)." }, "user-B");
  await p.goto(`${BASE}/review/change/${undoId}`);
  await p.getByRole("button", { name: "Withdraw it" }).waitFor({ timeout: 60_000 });
  const pg = await p.locator("main").innerText();
  step("review M2: a returned change offers Withdraw, and no form to correct a name it does not have", /withdraw it, then confirm the form field again/.test(pg) && (await p.getByLabel("Name").count()) === 0 && (await p.getByLabel("Meaning").count()) === 0, pg.slice(0, 200));
  step("no error in the page's console", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
