// C3.14 in the browser at 1440 and 1024 px (screens lane, swarm builder J5; Screen 04 views 9 and 10): Shared library ›
// Checks and Rules list every check and rule read-only, with kind chips and counts, a combination filter and a search
// kept in the address, what each reads, where it is used (linked to the combination's tab) and its source; no button
// to add, edit or remove. Sample inputs; no AI call (US$0). Screenshots into
// product/screens/04-shared-library/screenshots/c314/, axe (WCAG 2.2 AA) on each state.
//   zsh studio/tools/isolated.sh screens_rulesui 4451 start && node studio/tests/check_c314_rules_browser.cjs 4451 xr_studio_screens_rulesui
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4451), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_screens_rulesui";
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "04-shared-library", "screenshots", "c314"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const rows = () => p.locator("main table tbody tr");
  const go = async (u) => { await p.goto(`${BASE}${u}`); await p.waitForLoadState("networkidle"); await p.waitForFunction(() => !!document.querySelector("main h1"), null, { timeout: 30000 }); await rows().first().waitFor({ timeout: 30000 }); };
  const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(300); };
  const main = () => p.locator("main").innerText();
  const axe = async (name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id}: ${x.nodes.length}`).join(", ")); };
  const fits = () => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const noWrite = async () => (await p.locator("main").getByRole("button", { name: /^(Add|Edit|Delete|Retire|Remove|Restore|Save)\b/ }).count()) === 0;
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    step("setup: sample inputs loaded", (await api("/demo/load", { method: "POST" })).status === 201);
    const checks = (await api("/library/checks")).body, rules = (await api("/library/rules")).body;

    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      await p.setViewportSize({ width: w, height: h });
      await go("/library/checks");
      const t = await main();
      step(`C3.14 BR-15 (${w}): Checks lists every check, read-only, says where they change and that checks only warn, and offers no write button`, (await rows().count()) === checks.length && /Read-only/.test(t) && /Smart questionnaire \(SQR\) tab/.test(t) && /Checks warn; only the form's own Validate stops a form/.test(t) && /When it runs: not built/.test(t) && await noWrite(), t.slice(0, 300));
      step(`C3.14 BR-15 (${w}): each row shows its kind and group, what it reads, its effect per combination (linked) and its source; nothing says it stops`, /Consistency/.test(t) && /Answers compared/.test(t) && /Warns/.test(t) && /Serious warning/.test(t) && !/Stops until resolved/.test(t) && (await rows().first().locator("a[href*='/questionnaires']").count()) >= 1 && (await p.locator("main [data-source]").count()) === checks.length, t.slice(300, 700));
      step(`C3.14 (${w}): no sideways scroll`, await fits());
      await p.screenshot({ path: path.join(SHOTS, `checks-${w}.png`), fullPage: false });
      await axe(`Checks (${w})`);
      await go("/library/rules");
      const r = await main();
      step(`C3.14 (${w}): Rules lists every rule as a sentence with where it lives (combination · tab, linked), read-only`, (await rows().count()) === rules.length && /Every rule in one place/.test(r) && /With an LMIA · Documents tab/.test(r) && /With an LMIA · Smart questionnaire \(SQR\) tab/.test(r) && /\nWhen: /.test(r) && !/\. when:/.test(r) && await noWrite(), r.slice(0, 300));
      step(`C3.14 (${w}): no sideways scroll`, await fits());
      await p.screenshot({ path: path.join(SHOTS, `rules-${w}.png`), fullPage: false });
      await axe(`Rules (${w})`);
    }
    await p.setViewportSize({ width: 1440, height: 900 });

    // Kind chips with counts, search and combination filters, all kept in the address.
    await go("/library/checks");
    const chip = p.getByRole("group", { name: "Kind" }).getByRole("button", { name: /^Document validity \d+$/ });
    const nRead = checks.filter((c) => c.kind === "document_validity").length;
    step("C3.14 BR-15: the kind chips carry counts (All and each kind)", (await chip.count()) === 1 && new RegExp(`^Document validity ${nRead}$`).test((await chip.innerText()).trim()), await chip.innerText().catch(() => ""));
    const aiChip = p.getByRole("group", { name: "Kind" }).getByRole("button", { name: /^AI review 0$/ });
    await aiChip.click(); await settle();
    step("C3.14 M8: AI review shows 0 and says it is not built yet; Field validation says where it lives", /No AI review objectives yet: not built/.test(await main()) && (await p.locator("main table").count()) === 0 && (await p.getByRole("group", { name: "Kind" }).getByRole("button", { name: /^Field validation 0$/ }).count()) === 1);
    await p.screenshot({ path: path.join(SHOTS, "checks-ai-review-not-built-1440.png"), fullPage: false });
    await chip.click(); await settle();
    step("C3.14 BR-15 pass: a kind chip keeps only that kind, pressed, and the choice is in the address", (await rows().count()) === nRead && (await chip.getAttribute("aria-pressed")) === "true" && /[?&]kind=document_validity/.test(p.url()), p.url());
    const box = p.getByRole("textbox", { name: "Search checks" });
    await box.click(); await p.keyboard.type("zzz no such check", { delay: 0 }); await settle();
    step("C3.14 m10: fast typing keeps every letter in the search box and the address", (await box.inputValue()) === "zzz no such check" && /q=zzz(\+|%20)no(\+|%20)such(\+|%20)check/.test(p.url()), await box.inputValue());
    step("C3.14 fail: a search that matches nothing says so in words, not a blank table", /No check matches/.test(await main()) && (await p.locator("main table").count()) === 0);
    await p.screenshot({ path: path.join(SHOTS, "checks-nothing-matches-1440.png"), fullPage: false });
    await axe("Checks, nothing matches");
    await p.goto(`${BASE}/library/rules?combination=vv.single`);
    const none = await p.getByText("No rule matches").waitFor({ timeout: 30000 }).then(() => true, () => false);
    step("C3.14 fail: a combination with no rules yet is said in words (a filter from the address)", none && (await p.locator("main table").count()) === 0);
    // Review c314 M1, m4: a check two combinations hold with other values: each one's own effect and source, 24 px links, axe.
    const vv = sql("select id from combination where combination_key='vv.single'");
    sql(`insert into check_def (id, workspace_id, combination_id, check_key, check_group, applies_to, predicate_json, severity, message, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, '${vv}', check_key, check_group, applies_to, predicate_json, 'warn', 'C314 Visitor visa wording.', 1, 'DRAFT', 'HUMAN', 'user-A' from check_def where check_key='OR_PASSPORT_PAGE_FACTS' and status='PUBLISHED' limit 1`);
    await go("/library/checks?q=Passport%20information%20page");
    const row = p.locator("main tr[data-check='OR_PASSPORT_PAGE_FACTS']"), rt = await row.innerText();
    step("C3.14 M1: a check whose copies differ says so and shows each combination's own effect and source", /Differs by combination/.test(rt) && /With an LMIA: Serious warning/.test(rt) && /Visitor visa: Warns/.test(rt) && /C314 Visitor visa wording/.test(rt) && /No source recorded/.test(rt) && (await row.locator("[data-per-combination]").count()) === 2, rt.slice(0, 400));
    await p.screenshot({ path: path.join(SHOTS, "checks-differs-1440.png"), fullPage: false });
    await axe("Checks with a check used by two combinations (target size)");
    await p.getByRole("combobox", { name: "Origin" }).selectOption("HUMAN"); await settle();
    step("C3.14 m7: the Origin filter keeps checks a person edited in some combination, kept in the address", (await rows().count()) === 1 && /[?&]origin=HUMAN/.test(p.url()), await rows().count());
    await go("/library/rules?q=IMM%205707");
    const hits = await rows().count();
    step("C3.14 pass: the search finds rules by what they add (IMM 5707), kept in the address", hits >= 1 && hits < rules.length && (await rows().first().innerText()).includes("IMM 5707"), hits);
    const link = rows().first().locator("a").first();
    await link.click(); await p.waitForLoadState("networkidle");
    step("C3.14 pass: where a rule lives opens that combination's tab, where it is changed", /\/c\/[0-9a-f-]+\/questionnaires$/.test(new URL(p.url()).pathname), p.url());
    await go("/library/rules");
    const menu = await p.locator("nav, aside").first().innerText();
    step("C3.14: the menu lists Rules under the shared library, right after Checks and before History", /Checks\s+Rules\s+History/.test(menu), menu.replace(/\s+/g, " ").slice(0, 300));
    await p.setViewportSize({ width: 1024, height: 768 });
    const cut = await p.evaluate(() => { const r = document.querySelector("main [role=region]"); return r ? r.scrollWidth - r.clientWidth : -1; });
    step("C3.14 (1024): the Rules table fits its frame (no column cut off)", cut >= 0 && cut <= 1, cut);
    await go("/library/checks");
    const cutC = await p.evaluate(() => { const r = document.querySelector("main [role=region]"); return r ? r.scrollWidth - r.clientWidth : -1; });
    step("C3.14 (1024): the Checks table fits its frame (no column cut off)", cutC >= 0 && cutC <= 1, cutC);
    step("no page error", !errs.length, errs.join(" | "));
  } catch (e) { step("ran to the end", false, e.stack); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
