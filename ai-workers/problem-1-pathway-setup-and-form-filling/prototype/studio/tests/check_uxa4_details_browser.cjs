// UX-A part 4 (P-273; UX baseline 2 Nov finding 4; EXPERIENCE §5): internal identifiers are behind a collapsed "Details
// (for admins)" disclosure, walked in a real browser on the demo sample. Pass: the Fields list and a field's page name it,
// with its key only under Details; the Draft with AI dialog names saved AI answers by form and date and keeps the job, the
// run file and the budget lines under Details. Fail cases: no field key, model name, run file name, job id or budget line
// is on the main path of these screens; Details is closed until opened and opens by keyboard. 1440, 1024 and 400 px without
// sideways page scroll; axe (WCAG 2.2 AA). Screenshots in product/screens/UX-A/screenshots/ (uxa4-*). Nothing is started:
// the dialog is opened and closed (US$0).
//   zsh studio/tools/isolated.sh screens_uxa4 4446 start && node studio/tests/check_uxa4_details_browser.cjs 4446 xr_studio_screens_uxa4
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_uxa4";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "UX-A", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  UX-A4: ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
// A field key ("case.application_date", "person.passport_number"), a run file ("…-live-20261021t060247723z"), a job id
// ("studio-fieldmap-imm5257e"), a model name, a budget line.
const KEY = /\b(case|person|principal|spouse|child|employer|representative|app|relationship|organisation|document)\.[a-z0-9_]+(\.[a-z0-9_]+)*\b/;
const INTERNAL = /\d{8}t\d{6,}z|studio-fieldmap|fieldmap-|\bOpus\b|claude-|\bWave 1\b|experiment cap|\.json\b|\buser-[A-Z]\b|form field ""/i;
// Review M1: a release's hash ("2c66472f3758") on a field's page.
const HASH = /\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{10,40}\b/;
// A select fits its chosen option's words when their width (in its own font) plus its padding and arrow is within it.
const fits = (e) => { const c = document.createElement("canvas").getContext("2d"); const cs = getComputedStyle(e); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return c.measureText(e.selectedOptions[0]?.text ?? "").width + 40 <= e.clientWidth; };
const leak = (t) => (t.match(KEY) ?? t.match(INTERNAL) ?? t.match(HASH))?.[0];

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the demo sample loads", (await api("/demo/load", { method: "POST", data: {} })).status < 300);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const axe = async (name, sel = "main") => { const r = await new AxeBuilder({ page: p }).include(sel).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  // The main path: the page's text without what sits under Details (closed or open).
  const mainPath = (sel) => p.locator(sel).evaluate((el) => { const c = el.cloneNode(true); c.querySelectorAll("[data-admin-details]").forEach((d) => d.remove()); return c.innerText ?? c.textContent; });

  // ------------------------------------------------------------------ Fields list and a field's page
  await p.goto(`${BASE}/library/fields`); await p.locator("tr[data-item]").first().waitFor({ timeout: 20000 });
  const list = await mainPath("main");
  step("fail case: the Fields list shows no field key on any row (names and meanings only)", !KEY.test(list), list.match(KEY)?.[0]);
  await axe("Fields list");
  await p.screenshot({ path: path.join(SHOTS, "uxa4-01-fields-1440.png"), fullPage: false });
  const key = await p.locator("tr[data-item]").first().getAttribute("data-item");
  await p.locator("tr[data-item]").first().getByRole("link").click();
  await p.locator("h1").waitFor();
  // CI on #643: the heading can come before the field's Details; read the page only once its Details is there (a loud
  // wait: a missing Details fails the next step instead of letting the main-path step pass on a half-drawn page).
  const det = p.locator("main [data-admin-details]").first();
  const detSeen = await det.waitFor({ timeout: 20000 }).then(() => true, () => false);
  const page = await mainPath("main");
  step("pass: the field's page is named by its name and meaning, its key not on the main path", detSeen && !page.includes(key) && !KEY.test(page), { key, detSeen, hit: page.match(KEY)?.[0] });
  step("pass: Details (for admins) is there and closed", detSeen && await det.count() === 1 && !(await det.evaluate((d) => d.open)));
  await det.locator("summary").focus(); await p.keyboard.press("Enter");
  step("pass: Details opens by keyboard and shows the field's key", await det.evaluate((d) => d.open) && (await det.innerText()).includes(key), await det.innerText());
  await axe("a field's page (Details open)");
  await p.screenshot({ path: path.join(SHOTS, "uxa4-02-field-details-open-1440.png"), fullPage: false });

  // Review M1: "Where it comes from" names the release and the AI in words; the hash and run files are under Details.
  // Read once its sources have loaded (the section shows a spinner first).
  const sourcesLoaded = () => p.waitForFunction(() => { const s = document.querySelector("[data-sources]"); return !!s && !s.querySelector('[role="status"], .animate-spin') && !!s.querySelector("ul li, [role='alert'], .text-text-warn"); }, null, { timeout: 20000 });
  await sourcesLoaded();
  const srcMain = await mainPath("[data-sources]");
  step("fail case (review M1): \"Where it comes from\" has no release hash, AI run file or person id on the main path", !leak(srcMain) && /From /.test(srcMain), { hit: leak(srcMain), text: srcMain.slice(0, 200) });
  const sdet = p.locator("[data-sources] [data-admin-details]");
  step("pass: the release's hash and the AI runs are under its Details (for admins)", await sdet.count() === 1 && HASH.test(await sdet.textContent()) && /-live-\d{8}t\d+z/.test(await sdet.textContent()), await sdet.textContent());
  step("fail case: the whole field page's main path, sources loaded, has no key, hash or run file", !leak(await mainPath("main")), leak(await mainPath("main")));
  // A field read from a form field with no label (review n2, n3): words on the page, the data path under Details only.
  const keys = (await api("/library/fields")).body?.map?.((f) => f.key ?? f.canonicalFieldKey).filter(Boolean) ?? [];
  let bare = null;
  for (const k of keys) { const r = await api(`/library/fields/${encodeURIComponent(k)}/sources`); if (r.body?.sources?.some((l) => /with no label on the form/.test(l.text))) { bare = k; break; } }
  step("setup: some field is read from a form field with no label", !!bare, keys.length);
  if (bare) {
    await p.goto(`${BASE}/library/fields/${encodeURIComponent(bare)}`); await p.locator("h1").waitFor(); await sourcesLoaded();
    const bareMain = await mainPath("main");
    step("fail case (review n2, n3): an unlabelled form field reads \"with no label on the form\", never `form field \"\"`, and no data path or title shows it", /with no label on the form/.test(bareMain) && !leak(bareMain) && await p.locator("main [title*='[0]'], main [title*='.']").count() === 0, leak(bareMain));
    step("pass: its data path is under that row's Details", /Form field path/.test(await p.locator("main [data-admin-details]").allTextContents().then((a) => a.join(" "))));
  }
  // Break M3: the condition editor offers and shows fields by name; the condition stores the key (nothing is saved here).
  const placed = keys.find((k) => !!sql(`select 1 from section_question where canonical_field_key='${k}' limit 1`)) ?? null;
  step("setup: some field is placed in a section (its page has the question's condition)", !!placed);
  if (placed) {
    await p.goto(`${BASE}/library/fields/${encodeURIComponent(placed)}`); await p.locator("h1").waitFor();
    await p.getByLabel("Condition on the question").selectOption("SHOW");
    const box = p.getByLabel("Field", { exact: true }).first();
    step("fail case (break M3): the field box's example is a name, not a key", !KEY.test((await box.getAttribute("placeholder")) ?? ""), await box.getAttribute("placeholder"));
    // The list joins the library's fields and the calculated values, two requests: read it once the library's fields are
    // in (CI 41610894380 shard 2 read it with only the 22 calculated values loaded). A wait that times out fails the check.
    await p.waitForFunction(() => [...document.querySelectorAll("main datalist option")].some((o) => !/\(calculated\)$/.test(o.value)), null, { timeout: 15000 });
    const offered = await p.locator("main datalist option").evaluateAll((os) => os.map((o) => o.value));
    step("pass: the fields offered are names, never keys", offered.length > 10 && !offered.some((o) => KEY.test(o)), offered.slice(0, 4));
    await box.fill(offered[0]);
    const row = box.locator("xpath=..");
    step("pass: a name chosen is a library field (its meaning shows; no \"not a library field\" warning) and the box keeps the name", (await box.inputValue()) === offered[0] && !/not a library field/.test(await row.innerText()), await row.innerText());
    // Break R2-M1: typed key by key, a name that starts with another field's whole name ("Email" → "Email address")
    // keeps every character and ends as its own field.
    const longer = offered.find((o) => offered.some((q) => q !== o && o.startsWith(`${q} `)));
    step("setup: some field's name starts with another field's whole name", !!longer, longer);
    if (longer) {
      await box.fill(""); await box.click(); await p.keyboard.type(longer, { delay: 5 });
      step("fail case (break R2-M1): typed key by key, the box keeps exactly what was typed and finds the field", (await box.inputValue()) === longer && !/not a library field/.test(await row.innerText()), { typed: longer, box: await box.inputValue(), note: (await row.innerText()).slice(0, 160) });
      await p.keyboard.press("Tab");
      step("pass: leaving the box keeps the field's name", (await box.inputValue()) === longer, await box.inputValue());
    }
    // Break R2-M2: a calculated value (age) is offered by name and accepted as it is.
    const calc = offered.find((o) => / \(calculated\)$/.test(o) && /^Age/i.test(o)) ?? offered.find((o) => / \(calculated\)$/.test(o));
    step("fail case (break R2-M2): calculated values are offered by name (\"… (calculated)\")", !!calc && !KEY.test(calc), calc);
    if (calc) {
      await box.fill(calc);
      await p.waitForTimeout(600); // the editor's own check runs 250 ms after a change
      step("pass: a calculated value chosen by name says what it calculates, with no \"not a library field\" warning and no error", /Calculated: /.test(await row.innerText()) && !/not a library field|not in the library/.test(await p.locator("main").innerText()), (await row.innerText()).slice(0, 200));
    }
    // Break R3-M2: "Add a comparison" shows a second row. Break R3-M1: clearing the first box to retype it keeps the
    // second comparison as it was (before, the rows below moved up under the text being typed and were overwritten).
    await p.getByRole("button", { name: "Add a comparison" }).click();
    const boxes = p.getByLabel("Field", { exact: true });
    step("fail case (break R3-M2): \"Add a comparison\" adds a second row", await boxes.count() === 2, await boxes.count());
    const plain = offered.filter((o) => !/\(calculated\)$/.test(o));
    await boxes.nth(1).fill(plain[1]);
    await boxes.nth(0).click(); await p.keyboard.press("ControlOrMeta+a"); await p.keyboard.press("Backspace");
    step("pass: the cleared first box stays empty and the second still names its field", (await boxes.nth(0).inputValue()) === "" && (await boxes.nth(1).inputValue()) === plain[1], [await boxes.nth(0).inputValue(), await boxes.nth(1).inputValue()]);
    await p.keyboard.type(plain[2], { delay: 3 }); await p.keyboard.press("Tab");
    step("fail case (break R3-M1): retyping the first comparison keeps two rows, each with its own field", await boxes.count() === 2 && (await boxes.nth(0).inputValue()) === plain[2] && (await boxes.nth(1).inputValue()) === plain[1], [await boxes.nth(0).inputValue(), await boxes.nth(1).inputValue()]);
    await p.getByRole("button", { name: "Edit as JSON" }).click();
    const tree = JSON.parse(await p.getByLabel("Condition as JSON").inputValue());
    step("pass: the condition sent holds both comparisons, two different keys", tree.args?.length === 2 && tree.args[0].field !== tree.args[1].field && tree.args.every((x) => KEY.test(x.field)), tree);
    step("pass: the condition stores the field's key (advanced JSON view)", KEY.test(await p.getByLabel("Condition as JSON").inputValue()), (await p.getByLabel("Condition as JSON").inputValue()).slice(0, 120));
  }
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`${BASE}/library/fields/${encodeURIComponent(key)}`); await p.locator("h1").waitFor(); await sourcesLoaded();
    const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`${w} px a field's page: no key, hash or run file on the main path; no sideways page scroll`, !leak(await mainPath("main")) && side <= 0, { side, hit: leak(await mainPath("main")) });
    await axe(`a field's page at ${w} px`);
    await p.screenshot({ path: path.join(SHOTS, `uxa4-05-field-${w}.png`), fullPage: false });
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // ------------------------------------------------------------------ the Draft with AI dialog (opened, never started)
  await p.goto(`${BASE}/c/${vv}/forms`); await p.locator("[data-filing]").waitFor({ timeout: 20000 });
  const draft = p.getByRole("button", { name: /^Draft with AI/ }).first();
  step("setup: Visitor visa offers Draft with AI on a form", await draft.count() > 0);
  const jobs0 = sql(`select count(*) from drafting_job where combination_id='${vv}'`);
  await draft.click();
  const dlg = p.getByRole("dialog");
  await dlg.waitFor();
  await p.waitForFunction(() => !!document.querySelector('[role="dialog"] [data-options-loaded="true"]') || !!document.querySelector('[role="dialog"] [data-draft-start]'), null, { timeout: 20000 });
  await p.waitForTimeout(800);
  const said = await mainPath('[role="dialog"]');
  step("fail case: the dialog's main path has no model name, run file, job id or budget line", !INTERNAL.test(said), said.match(INTERNAL)?.[0]);
  const ledger = (await api(`/attachments/${sql(`select id from source_attachment where combination_id='${vv}' order by created_at limit 1`)}/draft-options`)).body?.ledger;
  step("pass (break M2): the money left names the limit that sets it (this round's budget when it is the smaller)", !ledger || (ledger.wave && ledger.wave.cap_usd - ledger.wave.spent_usd < ledger.cap_usd - ledger.committed_usd ? /left in this round's AI budget \(US\$[\d.]+ before the AI spending cap\)/.test(said) : /left before the AI spending cap/.test(said)), { ledger, said: said.match(/US\$[^.]*\./g) });
  const options = await dlg.locator("select option").allInnerTexts();
  step("pass: each saved AI answer is named by its form and date (\"IMM 5257 · saved …\")", options.length > 0 && options.every((o) => /^IMM \d{4}[A-Z0-9 ]* · saved /.test(o) && !INTERNAL.test(o)), options);
  const ddet = dlg.locator("[data-admin-details]");
  step("pass: the dialog's Details is closed and holds the model a Live run calls, the job and the spending lines (review n1)", await ddet.count() === 1 && !(await ddet.evaluate((d) => d.open)) && /AI model \(Live\)\s*claude-/.test(await ddet.textContent()) && /Job/.test(await ddet.textContent()) && /AI spending cap/.test(await ddet.textContent()), await ddet.textContent());
  const sel = dlg.locator("select").first();
  const chosen = await sel.inputValue();
  step("pass (Devin #643): Details names the chosen saved answer's file under \"Saved run file\", not its run id", !!chosen && (await ddet.textContent()).includes(`Saved run file${chosen}`), { chosen, details: await ddet.textContent() });
  step("pass (review n6): the saved answer's name is not cut off in its list", await sel.evaluate(fits), await sel.evaluate((e) => [e.selectedOptions[0]?.text, e.clientWidth]));
  await axe("the Draft with AI dialog", '[role="dialog"]');
  await p.screenshot({ path: path.join(SHOTS, "uxa4-03-draft-dialog-1440.png"), fullPage: false });
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
    const box = await dlg.boundingBox();
    const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`${w} px: the dialog fits the window, no sideways page scroll`, !!box && box.x >= 0 && box.x + box.width <= w + 1 && side <= 0, { box, side });
    await p.screenshot({ path: path.join(SHOTS, `uxa4-04-draft-dialog-${w}.png`), fullPage: false });
    await axe(`the Draft with AI dialog at ${w} px`, '[role="dialog"]');
  }
  await p.keyboard.press("Escape");
  await p.setViewportSize({ width: 1440, height: 900 });
  step("nothing was started: opening and closing the dialog created no AI job", sql(`select count(*) from drafting_job where combination_id='${vv}'`) === jobs0);

  // ------------------------------------------------------------------ widths: the Fields list
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h }); await p.goto(`${BASE}/library/fields`); await p.locator("tr[data-item]").first().waitFor({ timeout: 20000 });
    step(`${w} px Fields list: still no field key on the main path`, !KEY.test(await mainPath("main")));
  }

  step("no page error or console error on the walk", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
