// qa explore wording (29 Oct, main f7cb40d9): walks every screen of the studio and the case pages at 1440 and 1024 px on
// the loaded sample, as the author (and the officer and client on case pages), and flags on-screen words PRODUCT §4 rules
// out: decision numbers, internal names (Screen 04, slice), raw keys (case.application_date, yes_no), "1 form fields"
// grammar, stale placeholders, words from §4's "Not" column, and headings cut off or overlapping. Every page's text and a
// screenshot go to product/qa/reports/2026-10-29-wording-sweep/ for a person to read; the flags are a first pass only.
//   zsh studio/tools/isolated.sh qa_wd 4478 start && node studio/tests/qa/check_qa_wording_1029.cjs 4478 xr_studio_qa_wd
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4478), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_qa_wd";
const OUT = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-29-wording-sweep"); fs.mkdirSync(OUT, { recursive: true });
const FORMS = path.join(__dirname, "..", "..", "..", "..", "official-sources", "ircc", "forms");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method, p, body, actor = "user-A") => { const r = await fetch(`${BASE}/api${p}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t }; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// First-pass flags (a person reads every page anyway).
const FLAGS = [
  ["decision number", /\((?:P|D|M|BR|AIW)-\d+[a-z]?\)|\b(?:P|D)-\d{2,3}\b/],
  ["internal name", /\bScreen \d\d\b|\bslice\b|\bW1-\d\d\b|\bS[1-6] (?:item|ask)\b|\bLead check\b/i],
  ["raw key", /\b[a-z]+(?:\.[a-z_]+){1,}\b(?!\.(?:pdf|html|ca|com|gc))|\b[a-z]+_[a-z_]+\b/],
  ["one-plural", /\b1 (?!of\b)[a-z]+(?:s)\b(?! ago)/],
  ["placeholder", /later screen|coming soon|not yet built|TODO|lorem|placeholder|\bTBD\b/i],
  ["§4 Not word", /\b(?:canonical|composition|combo|predicate|participants|snapshot|segment|stream|N\/A|logical section|box map|AI output|Archive|Deactivate|Trash)\b/i],
  ["retired role word (P-154)", /\bagents?\b/i],
  ["system", /\b(?:undefined|null|NaN|\[object|sha256|uuid|json|endpoint|payload|enum)\b/i],
];
const hits = [];

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  if (!served || sql(`select count(*) from workspace where id='${served}'`) !== "1") { console.error(`STOP  ${DB} is not :${PORT}'s database`); process.exit(2); }
  if (!(await call("GET", "/demo/status")).body?.loaded) await call("POST", "/demo/load");
  // Items for the review pages: a held upload, a library retire waiting for a second person, a case for the case pages.
  if (sql("select count(*) from intake_item where status='HELD'") === "0") {
    const fd = new FormData(); fd.append("files", new Blob([Buffer.concat([fs.readFileSync(path.join(FORMS, "imm5562e.pdf")), Buffer.from("\n% qa wording\n")])], { type: "application/pdf" }), "imm5562e-copy.pdf");
    await fetch(`${BASE}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
    for (let i = 0; i < 20 && sql("select count(*) from intake_item where status='HELD'") === "0"; i++) await wait(1000);
  }
  const rel = (await call("GET", "/releases")).body; const relRow = Array.isArray(rel) ? rel[0] : null;
  if (relRow && (await call("GET", "/runtime/cases", undefined, "user-O")).body?.cases?.length === 0)
    await call("POST", "/runtime/cases", { combinationId: relRow.combination_id, reference: "QA-WORDING-1", clientActor: "user-P", principal: { displayName: "Client A" }, idempotencyKey: `qa-wd-${Date.now()}` }, "user-O");
  const one = (q) => { try { return sql(q).split("\n")[0] || null; } catch { return null; } };
  const ids = {
    combo: one("select c.id from combination c join combination_form f on f.combination_id=c.id group by c.id order by count(*) desc limit 1"),
    combo2: one("select c.id from combination c where not exists (select 1 from combination_form f where f.combination_id=c.id) limit 1"),
    field: one("select canonical_field_key from canonical_field order by canonical_field_key limit 1"),
    held: one("select id from intake_item where status='HELD' order by created_at desc limit 1"),
    change: one("select id from library_change limit 1"),
    job: one("select id from drafting_job order by started_at desc nulls last limit 1"),
    batch: one("select batch_id from drafting_job where batch_id is not null order by started_at desc nulls last limit 1"),
    kase: (await call("GET", "/runtime/cases", undefined, "user-O")).body?.cases?.[0]?.id ?? null,
  };
  console.log("ids", JSON.stringify(ids));
  const pages = [
    ["structure", "/structure"], ["structure-corporate", "/structure?t=CORPORATE"], ["programs", "/"], ["programs-corporate", "/?pw=CORPORATE"], ["programs-list", "/?view=list"],
    ["review", "/review"], ["review-all", "/review?filter=all"], ["library-fields", "/library/fields"], ["library-sections", "/library/sections"],
    ["library-documents", "/library/documents"], ["library-forms", "/library/forms"], ["library-checks", "/library/checks"], ["release", "/release"],
    ["ai", "/ai"], ["releases", "/releases"], ["activity", "/activity"], ["new-gone", "/new"],
  ];
  if (ids.field) pages.push(["library-field", `/library/fields/${encodeURIComponent(ids.field)}`]);
  for (const t of ["overview", "forms", "questionnaires", "documents", "preview", "review"]) {
    if (ids.combo) pages.push([`combo-${t}`, `/c/${ids.combo}/${t}`]);
    if (ids.combo2) pages.push([`combo2-${t}`, `/c/${ids.combo2}/${t}`]);
  }
  if (ids.held) pages.push(["review-held", `/review/held/${ids.held}`]);
  if (ids.change) pages.push(["review-change", `/review/change/${ids.change}`]);
  if (ids.job && ids.combo) pages.push(["job", `/c/${ids.combo}/jobs/${ids.job}`]);
  if (ids.batch) pages.push(["ai-batch", `/ai/${ids.batch}`]);
  const casePages = [["cases-officer", "/cases", "user-O"], ["cases-client", "/cases", "user-P"]];
  if (ids.kase) casePages.push(["case-officer", `/cases/${ids.kase}`, "user-O"], ["case-client", `/cases/${ids.kase}`, "user-P"], ["case-questionnaire", `/cases/${ids.kase}/questionnaire`, "user-P"]);

  const b = await chromium.launch();
  const visit = async (name, url, actor, w) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch {} }, actor);
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + url); await p.waitForLoadState("networkidle").catch(() => {}); await wait(600);
    const info = await p.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const cut = [...document.querySelectorAll("h1,h2,h3,[role=tab],button,th,a,label,legend")].filter((e) => vis(e) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible").map((e) => e.innerText.trim().slice(0, 80));
      const hs = [...document.querySelectorAll("header *, main h1, main h1 ~ *")].filter(vis).slice(0, 40).map((e) => e.getBoundingClientRect());
      return { title: document.title, h1: [...document.querySelectorAll("h1")].map((e) => e.innerText.trim()), heads: [...document.querySelectorAll("main h2, main h3, main th, main [role=tab], main legend")].filter(vis).map((e) => e.innerText.trim().replace(/\s+/g, " ")).slice(0, 80),
        text: (document.querySelector("main") ?? document.body).innerText, tips: [...document.querySelectorAll("[title],[aria-label]")].map((e) => e.getAttribute("title") || e.getAttribute("aria-label")).filter(Boolean).slice(0, 200), cut };
    });
    fs.writeFileSync(path.join(OUT, `${name}-${w}.txt`), `URL ${url} as ${actor}\nTITLE ${info.title}\nH1 ${JSON.stringify(info.h1)}\nHEADS ${JSON.stringify(info.heads)}\nCUT ${JSON.stringify(info.cut)}\nERRORS ${JSON.stringify(errs)}\n---\n${info.text}\n--- labels ---\n${[...new Set(info.tips)].join("\n")}\n`);
    await p.screenshot({ path: path.join(OUT, `${name}-${w}.png`), fullPage: true });
    for (const [kind, re] of FLAGS) for (const line of [...info.text.split("\n"), ...info.tips]) { const m = re.exec(line); if (m) hits.push({ page: name, w, kind, match: m[0], line: line.trim().slice(0, 160) }); }
    if (info.cut.length) hits.push({ page: name, w, kind: "cut off", match: info.cut.join(" | ").slice(0, 160), line: "" });
    if (errs.length) hits.push({ page: name, w, kind: "page error", match: errs[0].slice(0, 120), line: "" });
    await ctx.close();
  };
  for (const w of [1440, 1024]) {
    for (const [n, u] of pages) await visit(n, u, "user-A", w);
    for (const [n, u, a] of casePages) await visit(n, u, a, w);
  }
  // The Demo menu and its Reset dialog (scaffolding, P-35), 1440 only.
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} });
    const p = await ctx.newPage(); await p.goto(BASE + "/"); await p.waitForLoadState("networkidle");
    await p.getByRole("button", { name: /^Demo/ }).click(); await wait(300); await p.screenshot({ path: path.join(OUT, "demo-menu-1440.png") });
    const menu = await p.locator("[role=menu]").innerText().catch(() => "");
    await p.getByRole("menuitem", { name: /Reset/ }).click().catch(() => {}); await wait(1500);
    const dlg = await p.getByRole("dialog").innerText().catch(() => "");
    await p.screenshot({ path: path.join(OUT, "demo-reset-1440.png") });
    fs.writeFileSync(path.join(OUT, "demo-1440.txt"), `MENU\n${menu}\n--- RESET DIALOG ---\n${dlg}\n`);
    for (const [kind, re] of FLAGS) for (const line of `${menu}\n${dlg}`.split("\n")) { const m = re.exec(line); if (m) hits.push({ page: "demo", w: 1440, kind, match: m[0], line: line.trim().slice(0, 160) }); }
    await ctx.close(); }
  await b.close();
  fs.writeFileSync(path.join(OUT, "flags.json"), JSON.stringify(hits, null, 1));
  const seen = new Set(); const uniq = hits.filter((h) => { const k = `${h.page}|${h.kind}|${h.match}`; if (seen.has(k)) return false; seen.add(k); return true; });
  for (const h of uniq) console.log(`FLAG  ${h.page} ${h.w} [${h.kind}] ${h.match} :: ${h.line}`);
  console.log(`\n${pages.length + casePages.length} pages × 2 widths; ${uniq.length} distinct flags`);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
