// C9.1 (row C9.1-AI; P-138, P-151, P-32, QA-100) Screen 02's new-edition review in a real browser: the AI offer with its
// cost, greyed with its reason while live AI is off (the priced button is never clicked), Saved when a saved run of this
// comparison is here, the saved run used at US$0 with its proposals shown next to each changed box, the previous edition's
// accepted-until date, and the components touched. axe (WCAG 2.2 AA) and no sideways scroll at 1440 and 1024 px; shots
// into product/screens/02-ai-work/screenshots/c91/. The test saved run is written for this check and removed after; the
// committed real one is set aside meanwhile (tests/fixtures/c91-saved-run.ts aside|back). US$0.
//   zsh studio/tools/isolated.sh forms_c91b 4452 start && node studio/tests/check_c91_impact_browser.cjs 4452 xr_studio_forms_c91b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_c91b";
const BASE = `http://localhost:${PORT}`;
const STUDIO = path.resolve(__dirname, ".."), SOL = path.resolve(STUDIO, "..", "..");
const OFFICIAL = path.join(SOL, "official-sources", "ircc");
const SHOTS = path.join(SOL, "product", "screens", "02-ai-work", "screenshots", "c91"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const saved = (what) => execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, "tests", "fixtures", "c91-saved-run.ts"), what, DB], { encoding: "utf8" });
let fail = 0;
const step = (name, ok, detail) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  saved("aside"); // the committed real saved run of this comparison waits in var/ while this check uses its own
  for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]]) process.on(sig, () => { try { saved("remove"); saved("back"); } catch { /* ignore */ } process.exit(code); });
  const b = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  // QA-100: a priced request is never sent by this check; any POST …/impact/draft with mode "live" fails it.
  const priced = []; p.on("request", (r) => { if (r.method() === "POST" && /\/impact\/draft$/.test(r.url()) && /"live"/.test(r.postData() ?? "")) priced.push(r.url()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", ...(init.multipart ? {} : { "content-type": "application/json" }) }, ...(init.multipart ? { multipart: init.multipart } : init.json !== undefined ? { data: JSON.stringify(init.json) } : {}) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const check = async (name, base) => {
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    await p.setViewportSize({ width: 1024, height: 768 });
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    const a2 = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe at 1024 px: ${name}`, a2.violations.length === 0, a2.violations.map((v) => v.id).join(" | "));
    await p.setViewportSize({ width: 1440, height: 900 });
  };
  const open = async (id) => { await p.goto(`${BASE}/review/edition/${id}`); await p.getByRole("heading", { level: 1, name: "New edition: review impact" }).waitFor({ timeout: 60000 }); await p.locator("[data-impact-ai]").waitFor({ timeout: 30000 }); };
  try {
    await p.goto(`${BASE}/`); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await api("/demo/reset", { method: "POST", json: { confirm: "RESET" } });
    await api("/intake", { method: "POST", multipart: { files: { name: "imm5476e-2021.pdf", mimeType: "application/pdf", buffer: fs.readFileSync(path.join(OFFICIAL, "previous-editions", "imm5476e-2021.pdf")) } } });
    await api("/demo/load", { method: "POST", json: { sample: "six" } });
    const id = sql(`select id from intake_item where outcome = 'new_edition_held' and status = 'HELD' and code = 'IMM 5476' limit 1`);
    step("setup: IMM 5476 11-2025 held over the 2021 edition the library uses", id !== "", id);

    await open(id);
    const offer = await p.locator("[data-offer]").innerText();
    step("C9.1 P-138: the review offers Draft with AI for the 23 new and reworded boxes with its cost in words; nothing runs on opening", /23 new and reworded boxes/.test(offer) && /about US\$\d+\.\d\d · at most US\$\d+\.\d\d/.test(offer) && sql(`select count(*) from drafting_job where kind = 'field_map_impact'`) === "0", offer);
    const btn = p.locator("[data-priced]");
    step("C9.1 P-175: while live AI is off the priced button is greyed, its cost on it and the reason next to it (never clicked)", await btn.isDisabled() && /at most US\$/.test(await btn.innerText()) && /live AI is off/.test(await p.locator("#impact-ai-why").innerText()));
    const until = await p.locator("[data-accepted-until]").innerText();
    step("C9.1 P-151: the previous edition's accepted-until date (12 March 2026) is shown, quoted from IRCC, and said to have passed", /2026-03-12/.test(until) && /has passed/.test(until) && /March 12, 2026/.test(until), until);
    step("C9.1: before any AI run each new or reworded box says it waits for Draft with AI or a person", (await p.locator("[data-box-ai]", { hasText: "Waiting for Draft with AI or a person" }).count()) === 23);
    await check("the impact review with the AI offer (live AI off)", "c91-offer");
    await p.getByRole("tab", { name: /Components touched/ }).click();
    step("C9.1 P-32: the Components touched tab lists sections, document types, rules and checks", (await p.locator("[data-components] h3").allInnerTexts()).join("|").replace(/ \(\d+\)/g, "") === "Sections|Document types|Rules|Checks");
    await check("the Components touched tab", "c91-components");

    saved("write");
    await open(id);
    step("C9.1 P-138: a saved run of this comparison shows Saved and Use the saved AI run (US$0), and no priced button next to it (break M2)", await p.getByText("Saved", { exact: true }).first().isVisible() && await p.locator("[data-use-saved]").isVisible() && (await p.locator("[data-priced]").count()) === 0);
    await p.locator("[data-use-saved]").click();
    await p.locator("[data-drafted]").waitFor({ timeout: 30000 });
    const drafted = await p.locator("[data-drafted]").innerText();
    step("C9.1 pass: the saved run is used at US$0: 3 proposals wait on To review for a person", /US\$0/.test(drafted) && /3 waiting on To review/.test(drafted) && sql(`select mode || '|' || cost_usd from drafting_job where kind = 'field_map_impact'`) === "REPLAY|0", drafted);
    step("C9.1: the proposals show next to the changed boxes they answer (3 boxes), the others say a person maps them", (await p.locator("[data-box-ai]", { hasText: "on To review" }).count()) === 3 && (await p.locator("[data-box-ai]", { hasText: "None proposed: a person maps it" }).count()) === 20);
    step("C9.1: after the saved run, focus is on its result (not the page body), and the offer and \"No saved run\" words are gone", await p.evaluate(() => document.activeElement?.hasAttribute("data-drafted")) && (await p.locator("[data-offer], [data-saved-words]").count()) === 0);
    await p.setViewportSize({ width: 400, height: 800 });
    step("400 px: the review's four tabs wrap, no sideways scroll", !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
    await check("the impact review after the saved AI run", "c91-drafted");
    step("QA-100: no priced request was sent from the page", priced.length === 0, priced.join(" "));
    step("no page error", errs.length === 0, errs.join(" | "));
  } finally { saved("remove"); saved("back"); await b.close(); }
  console.log(fail ? `\n${fail} failed` : "\nall passed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); try { saved("remove"); saved("back"); } catch { /* ignore */ } process.exit(2); });
