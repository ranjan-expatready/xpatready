// K13 (P-271, P-272; glossary PRODUCT.md): the Smart questionnaire names on screen. The module and tab read "Smart
// questionnaire (SQR)", with three views "Prospect questionnaire (PQR)", "Client questionnaire" and "Agent view"; the case's
// part where staff prepare what gets filed reads "Prepare application". "Case view", the "Questionnaires" tab and the
// "pre-qualification" wording are gone from every screen, tooltip (title, aria-label) and error the walk can reach.
// The check lists every visible label of every page and tab (configuration, preview by person, library, review, cases,
// a case as staff and as the client) at 1440, 1024 and 400 px, and fails on any old name; axe (WCAG 2.2 AA) on each page
// at 1440; no sideways page scroll at any width. A second, static part reads the API's and the web's own words for the old
// names (errors and tooltips no walk reaches; engine words included). No behaviour change: labels only. US$0.
//   zsh studio/tools/isolated.sh screens_k13 4446 start && node studio/tests/check_k13_names_browser.cjs 4446 xr_studio_screens_k13
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync, spawnSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_k13";
const BASE = `http://localhost:${PORT}`, STUDIO = path.resolve(__dirname, "..");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "K13-sqr-names", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 400)}` : ""}`); };

/** The old names (P-271 amends P-154's "Case view"; the tab was "Questionnaires"; the PQR was "pre-qualification"). A
 *  plain sentence about "your questionnaire" stays: only the names of the module, its views and the case part count. */
const OLD = [
  [/\bcase view\b/i, "Case view"],
  [/\bQuestionnaires\b/, "the Questionnaires tab"],
  [/(?<!(Smart|Client|Prospect) )\bQuestionnaire\b(?! \()/, "Questionnaire as a module or tab name"],
  [/\bpre-qualification\b/i, "pre-qualification (now Prospect questionnaire, PQR)"],
  [/\bWhat the client is asked\b/i, "What the client is asked (now Client questionnaire)"],
  [/\bCase officer's view\b/i, "Case officer's view (now Agent view)"],
  [/\bYour questionnaire\b/, "Your questionnaire (now Client questionnaire)"],
  [/\bclient's questionnaire\b/i, "the client's questionnaire as a name (now Client questionnaire)"],
  [/\bProgram question pick\b/i, "Program question pick (now Prospect questionnaire (PQR) pick)"],
];
/** Stored data values compared in code, never shown as written: a problem's `where` key (shown through review.tsx KIND_WORD)
 *  and an audit row's item word (shown through history.tsx ITEM_WORD). */
const KEYS = new Set(["Questionnaires", "pre-qualification"]);
/** The words a person reads in a source file: every string literal and every piece of JSX text, also between {expr}s. */
const sourceWords = (src, jsx = true) => {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/([^:])\/\/ .*$/gm, "$1");
  const out = [];
  for (const m of code.matchAll(/(["'`])((?:\\.|(?!\1).)*?)\1/g)) if (!KEYS.has(m[2])) out.push(m[2]);
  // JSX text (.tsx only): what sits between a tag or an {expr} and the next one, when it reads as words, not code.
  if (jsx) for (const m of code.matchAll(/[>}]([^<>{}\n]{3,})(?=[<{])/g)) if (!/=>|===|!==|&&|\|\||;\s*$|^\s*[)\]]/.test(m[1])) out.push(m[1]);
  return out;
};
const oldIn = (t) => OLD.filter(([re]) => re.test(t)).map(([re, why]) => `${why}: "${(t.match(re.global ? re : new RegExp(re.source, re.flags + "g")) ?? [])[0]}" in "${t.slice(Math.max(0, t.search(re) - 40), t.search(re) + 60).replace(/\s+/g, " ")}"`);

(async () => {
  if (sql("select count(*) from combination where combination_key='vv.single'") === "0") {
    const r = spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
    if (r.status !== 0) { console.error("STOP  setup_visitor_visa failed", r.stdout?.slice(-400), r.stderr?.slice(-400)); process.exit(2); }
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const b = await chromium.launch({ executablePath: fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined, channel: fs.existsSync("/opt/pw-browsers/chromium") ? undefined : "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-O", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(400); };
  const as = async (who) => { await p.goto(BASE + "/"); await p.evaluate((w) => { try { localStorage.setItem("xr-actor", w); } catch { /* private window */ } }, who); };
  /** Every label a person can read or hear on the page: its text, every title and aria-label, option texts. */
  const labels = () => p.evaluate(() => {
    const out = [document.body.innerText];
    for (const e of document.querySelectorAll("[title], [aria-label], [placeholder], option")) out.push(e.getAttribute("title") ?? "", e.getAttribute("aria-label") ?? "", e.getAttribute("placeholder") ?? "", e.tagName === "OPTION" ? e.textContent ?? "" : "");
    return out.filter(Boolean).join("\n");
  });
  const seen = new Map(); // old-name finding → pages
  /** `scroll: false` only for a page this row does not change whose own layout already scrolls sideways (Program structure
   *  at 400 px: its tree rows' Edit and Retire buttons, on main before K13; reported in the K13 PR for qa). */
  const visit = async (name, url, actor = "user-A", { scroll = true } = {}) => {
    await as(actor); await p.goto(BASE + url); await settle();
    for (const w of [1440, 1024, 400]) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
      for (const line of (await labels()).split("\n")) for (const f of oldIn(line)) seen.set(f, [...new Set([...(seen.get(f) ?? []), name])]);
      if (scroll) step(`${w} px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
      if (w === 1440) {
        const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length})`).join(" | "));
      }
      if (/^(combination: Smart questionnaire|case as staff|case as the client)/.test(name)) await p.screenshot({ path: path.join(SHOTS, `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${w}.png`) });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    return labels();
  };

  // ── Configuration, library, review and history pages (author), every combination tab.
  await visit("Program structure", "/structure", "user-A", { scroll: false });
  for (const [name, url] of [["Immigration programs", "/"], ["To review", "/review"], ["Fields", "/library/fields"], ["Sections", "/library/sections"], ["Document types", "/library/documents"], ["Forms library", "/library/forms"], ["Checks", "/library/checks"], ["Rules", "/library/rules"], ["AI work", "/ai"], ["Releases", "/releases"]]) await visit(name, url);
  // Break M2: a PQR draft (rules, US$0) writes its audit row, so the Activity page shows a PQR item to read.
  const plan = await api(`/combinations/${vv}/pqr-picks/plan`, { method: "POST", actor: "user-A", data: { mode: "rules" } });
  const draft = plan.status < 300 ? await api(`/combinations/${vv}/pqr-picks/draft`, { method: "POST", actor: "user-A", data: { mode: "rules", planSha256: plan.body?.plan_sha256 } }) : plan;
  step("setup: a PQR draft (rules, US$0) ran, so Activity has a PQR row", draft.status < 300 && sql("select count(*) from audit_event where entity = 'pre-qualification'") !== "0", `${plan.status} ${draft.status} ${JSON.stringify(draft.body).slice(0, 160)}`);
  const act = await visit("Activity", "/activity");
  step("K13 pass: Activity names a PQR draft's item \"Prospect questionnaire (PQR)\"", /Prospect questionnaire \(PQR\)/.test(act));
  const tabs = await (async () => { await as("user-A"); await p.goto(`${BASE}/c/${vv}`); await settle(); return p.getByRole("tab").allInnerTexts(); })();
  step("K13 pass: the combination's tabs name the module \"Smart questionnaire (SQR)\"", tabs.some((t) => /^Smart questionnaire \(SQR\)/.test(t.trim())), tabs.join(" | "));
  // Break M1: every tab, with its badges, sits wholly inside the tab bar and the window at every width (720 = 200 % of 1440).
  for (const w of [1440, 1024, 720, 400]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
    const cut = await p.evaluate(() => { const bar = document.querySelector('[role="tablist"]').getBoundingClientRect(); return [...document.querySelectorAll('[role="tablist"] [role="tab"]')].filter((t) => { const r = t.getBoundingClientRect(); return r.left < bar.left - 1 || r.right > Math.min(bar.right, window.innerWidth) + 1; }).map((t) => t.textContent); });
    step(`K13 break M1 fail: at ${w} px no combination tab or badge is cut off`, cut.length === 0, cut.join(" | "));
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  for (const key of ["overview", "forms", "questionnaires", "documents", "preview", "review"]) await visit(`combination: ${key === "questionnaires" ? "Smart questionnaire" : key}`, `/c/${vv}/${key}`);
  const sqr = await visit("combination: Smart questionnaire (views)", `/c/${vv}/questionnaires`);
  step("K13 pass: the Smart questionnaire names its prospect view \"Prospect questionnaire (PQR)\"", /Prospect questionnaire \(PQR\)/.test(sqr), sqr.match(/.{0,60}PQR.{0,60}/)?.[0]);
  for (const set of ["pqr", "sqr", "agent"]) await visit(`combination: preview ${set}`, `/c/${vv}/preview?set=${set}`);
  const prev = await visit("combination: preview", `/c/${vv}/preview`);
  step("K13 pass: the preview names the three views by their names", ["Prospect questionnaire (PQR)", "Client questionnaire", "Agent view"].every((v) => prev.includes(v)), ["Prospect questionnaire (PQR)", "Client questionnaire", "Agent view"].filter((v) => !prev.includes(v)).join(", "));

  // ── A case: staff (the case officer) and the client.
  const ref = `K13-${Date.now().toString(36)}`;
  const c = (await api("/runtime/cases", { method: "POST", data: { combinationId: vv, reference: ref, clientActor: "user-P", principal: { displayName: "Sample Client A" }, representative: "user-R", caseOfficers: ["user-O"] } })).body;
  if (!c?.id) { console.error("STOP  the case could not be opened", JSON.stringify(c).slice(0, 300)); process.exit(2); }
  await visit("cases", "/cases", "user-O");
  const staff = await visit("case as staff", `/cases/${c.id}`, "user-O");
  step("K13 pass: the case names its staff view \"Agent view\"", /Agent view/.test(staff), staff.slice(0, 200));
  step("K13 pass: the case's part where staff prepare what gets filed reads \"Prepare application\" (P-272)", /Prepare application/.test(staff));
  await visit("case eligibility", `/cases/${c.id}/eligibility`, "user-O");
  const client = await visit("case as the client", `/cases/${c.id}/questionnaire`, "user-P");
  step("K13 pass: the client's page names it \"Client questionnaire\"", /Client questionnaire/.test(client), client.slice(0, 200));

  // ── The whole walk: no old name anywhere.
  step("K13 fail: no screen, tooltip or label at 1440, 1024 or 400 px uses an old name (Case view, Questionnaires, pre-qualification)", seen.size === 0, [...seen].map(([f, pages]) => `${f} [${pages.join(", ")}]`).join("\n      "));

  // ── Static: the API's and the web's own words (errors, tooltips and states no walk reaches). Code names (keys, routes,
  // types, comments) are not words a person reads, so only string literals and JSX text are read.
  const words = [];
  const walk = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const fp = path.join(dir, f.name); if (f.isDirectory()) walk(fp); else if (/\.(ts|tsx)$/.test(f.name)) words.push([fp, fs.readFileSync(fp, "utf8")]); } };
  walk(path.join(STUDIO, "web", "src")); walk(path.join(STUDIO, "api", "src")); walk(path.join(STUDIO, "contracts")); walk(path.join(STUDIO, "engine"));
  const hits = [];
  for (const [fp, src] of words) for (const t of sourceWords(src, fp.endsWith(".tsx"))) for (const f of oldIn(t)) hits.push(`${path.relative(STUDIO, fp)}: ${f}`);
  // Review M3 (STANDARDS §46): the scan must fail on a planted old name in each shape it reads (a literal, JSX text after an
  // {expr}, a case view link), else a blind scan would pass.
  const planted = ['<p>{r.field} is added from Questionnaires › Facts a rule needs.</p>', '<Link to={x}>{a} → Answer in the case view</Link>', 'fail("Only a pre-qualification pick");', 'title="What the client is asked"'];
  step("K13 fail case: the code scan finds each planted old name (JSX text after {expr}, a link, a literal, a title)", planted.every((src) => sourceWords(src).some((t) => oldIn(t).length > 0)), planted.filter((src) => !sourceWords(src).some((t) => oldIn(t).length > 0)).join(" | "));
  step("K13 fail: no API error or web word in the code uses an old name", hits.length === 0, hits.slice(0, 30).join("\n      "));
  // The full lists for whoever fixes them (the step lines above are cut short): var/ is never committed.
  fs.mkdirSync(path.join(STUDIO, "var"), { recursive: true });
  fs.writeFileSync(path.join(STUDIO, "var", "k13-old-names.json"), JSON.stringify({ screens: [...seen].map(([f, pages]) => ({ f, pages })), code: hits }, null, 1));
  step("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
