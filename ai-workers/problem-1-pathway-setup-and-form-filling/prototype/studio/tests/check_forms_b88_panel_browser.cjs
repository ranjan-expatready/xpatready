// B88 (QA-239, C4.11): on Study permit, whose author did nothing, Review and release shows the "Hiding a value" problem a
// condition approved on Visitor visa puts there, with its way out: the plain form field (B86's button) and the worked-out
// Yes/No with the form's printed question beside the deciding question (B88's button). Walked in a real browser at 1440 px
// by keyboard, the second person's page checked, then the problem gone. Plain words, no field code, axe (WCAG 2.2 AA), no
// sideways scroll at 1440 and 400 px. Saved answers only: US$0. All conditions are Sample.
//   zsh studio/tools/isolated.sh forms_b88b 4689 start && node studio/tests/check_forms_b88_panel_browser.cjs 4689 xr_studio_forms_b88b
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4689), DB = process.argv[3] ?? "xr_studio_forms_b88b";
const BASE = `http://localhost:${PORT}`, STUDIO = path.resolve(__dirname, "..");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "B88-yes-no-asks-deciding-question", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const CODES = /AliasNameIndicator|natIDIndicator|usCardIndicator|person\.[a-z_]+|form1\[/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  const out = execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), [path.join(__dirname, "check_forms_b88_setup.ts"), String(PORT), DB], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 900_000 });
  const { sp } = JSON.parse(out.split("\n").find((l) => l.startsWith("SETUP {")).slice(6));
  const b = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, method = "GET", data, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, ...(data ? { data: JSON.stringify(data) } : {}) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const check = async (name, selector, shot) => {
    await p.waitForSelector(selector, { timeout: 60_000 });
    for (const [w, h] of [[1440, 900], [400, 800]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(200);
      if (w === 1440) await p.locator(selector).first().screenshot({ path: path.join(SHOTS, `${shot}-1440.png`) });
      const axe = await new AxeBuilder({ page: p }).include(selector).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      step(`axe at ${w} px, ${name}: no WCAG 2.2 AA violation`, axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
      step(`no sideways scroll at ${w} px, ${name}`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    const text = await p.locator(selector).first().innerText();
    step(`plain words, no field code, ${name}`, !CODES.test(text), text.match(CODES)?.[0]);
    return text;
  };
  const hiding = async () => ((await api(`/combinations/${sp}/submit`, "POST", { note: "B88 browser" })).body?.errors ?? []).filter((e) => e.item === "person.other_family_name" && /Hiding a value a form reads/.test(e.message ?? ""));

  // ---------------------------------------------------------------- Study permit, whose author did nothing
  step("C4.11 B88 fail (QA-239): Study permit is held by Visitor visa's condition", (await hiding()).length === 1);
  await p.goto(`${BASE}/c/${sp}/review`);
  const under = '[data-form-field-conditions="person.other_family_name"]';
  let text = await check("Review and release, Study permit", under, "review-release");
  step("the problem's way out lists the plain form field and the worked-out Yes/No, with the form's printed question and the deciding question", /Not confirmed/.test(text) && /The form asks/.test(text) && /used any other name/.test(text) && /writes Y when Yes, N when No/.test(text), text);
  const askBtn = p.locator(under).getByRole("button", { name: /^Asks the same as / });
  step("one button to ask the worked-out Yes/No as its deciding question", (await askBtn.count()) === 1);
  await askBtn.focus();
  step("the button takes the keyboard's focus", await askBtn.evaluate((e) => e === document.activeElement));
  await p.keyboard.press("Enter");
  await p.locator(`${under} [data-state="waiting"]`).waitFor({ timeout: 60_000 });
  text = await check("Review and release, waiting", under, "review-release-waiting");
  const href = await p.locator(`${under} [data-state="waiting"] a`).first().getAttribute("href");
  const askId = href.split("/").pop();

  // ---------------------------------------------------------------- the second person's page
  await p.goto(`${BASE}/review/change/${askId}`);
  text = await check("the second person's page", "[data-change-form-field]", "second-person");
  step("the second person compares the form's printed question with the deciding question and sees what it writes", /The form asks/.test(text) && /used any other name/.test(text) && /Asked as/.test(text) && /writes Y when Yes, N when No/.test(text), text);
  const pageText = await p.locator("main").innerText();
  step("no field code anywhere on the second person's page", !CODES.test(pageText), pageText.match(CODES)?.[0]);
  await api(`/library/changes/${askId}/approve`, "POST", { note: "Checked against the form's printed question by a test (B88)." }, "user-B");

  // ---------------------------------------------------------------- the plain form field, B86's door, and the problem gone
  await p.goto(`${BASE}/c/${sp}/review`);
  await p.waitForSelector(`${under} [data-state="asked"]`, { timeout: 60_000 });
  text = await check("Review and release, asked", under, "review-release-asked");
  step("the Yes/No now reads \"Asks its deciding question\", with Undo", /Asks its deciding question/.test(text) && (await p.locator(under).getByRole("button", { name: /worked out from other answers again/ }).count()) === 1, text);
  const say = p.locator(under).getByRole("button", { name: "Says the same as this condition" });
  await say.focus(); await p.keyboard.press("Enter");
  await p.locator(`${under} [data-state="waiting"]`).waitFor({ timeout: 60_000 });
  const ffId = (await p.locator(`${under} [data-state="waiting"] a`).first().getAttribute("href")).split("/").pop();
  await api(`/library/changes/${ffId}/approve`, "POST", { note: "Checked against the form's words by a test (B88)." }, "user-B");
  step("C4.11 B88 pass (QA-239): through these two buttons and a second person, Study permit's Hiding error is gone", (await hiding()).length === 0);
  await p.goto(`${BASE}/c/${sp}/review`);
  await p.waitForLoadState("networkidle");
  step("Review and release no longer shows that problem", (await p.locator(under).count()) === 0);
  await p.screenshot({ path: path.join(SHOTS, "review-release-cleared-1440.png") });

  step("no error in the page's console", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
