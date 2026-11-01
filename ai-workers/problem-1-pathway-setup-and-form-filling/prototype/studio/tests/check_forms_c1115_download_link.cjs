// F2 C11.15 (forms lane; P-156 (4)): a form the finder could not download from canada.ca says where the file is: its row
// on the combination's Forms tab reads "Not found" with the reason, "Download from this link" (the PDF's link once the
// form page named one, else the form page), Upload PDF and Find again. A download that worked has no link. On the loaded
// demo's Visitor visa, the saved finder answer replayed (US$0), against a test-made copy of the recorded canada.ca files:
// IMM 5645's recorded PDF removed (the page names the PDF: link = the PDF), then its page changed (link = the page).
// Then (#261 m1–m3) another form's bytes, a page with no PDF and a damaged PDF, each re-recorded in the copy's index.
// Axe (WCAG 2.2 AA) on the row. US$0: no model call, nothing calls canada.ca.
//   zsh studio/tools/isolated.sh forms_c1115 4451 start STUDIO_CANADA_FIXTURES=canada-c1115 && node studio/tests/check_forms_c1115_download_link.cjs 4451 xr_studio_forms_c1115
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_c1115";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const OFFICIAL = path.join(ROOT, "official-sources", "ircc");
const VAR = path.join(__dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`); // the copy's own folder, whatever its name (run-suites prefixes it)
const COPY = path.join(VAR, "canada-c1115");
const PDF_URL = "https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5645/01-01-2021/imm5645e.pdf";
const PAGE_URL = "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5645.html";
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, pth, body, actor = "user-A") => {
  const r = await fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};

(async () => {
  // The recorded canada.ca copies, whole, as this copy's own folder (the sample loads from it too).
  fs.rmSync(COPY, { recursive: true, force: true }); fs.cpSync(OFFICIAL, COPY, { recursive: true });
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  if (load.status >= 300) throw new Error(`demo load: ${JSON.stringify(load.body).slice(0, 300)}`);
  const vv = sql("select id from combination where label='Visitor visa' limit 1");
  const find = async (key, only) => {
    const plan = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "replay", ...(only ? { only } : {}) })).body;
    const run = await call("POST", `/combinations/${vv}/forms/find`, { mode: "replay", ...(only ? { only } : {}), planSha256: plan.plan_sha256, idempotencyKey: key });
    if (run.status >= 300) throw new Error(`find: ${JSON.stringify(run.body).slice(0, 300)}`);
    let r;
    for (let i = 0; i < 120; i++) { r = (await call("GET", `/combinations/${vv}/forms/find/latest`)).body; if (r.run && !["QUEUED", "RUNNING"].includes(r.run.status) && r.run.id === run.body.id) return r; await sleep(500); }
    throw new Error(`the find did not end in 60 s: ${JSON.stringify(r?.run).slice(0, 200)}`);
  };

  // 1. canada.ca's PDF of IMM 5645 cannot be had (its recorded copy removed): the row links to the PDF.
  fs.rmSync(path.join(COPY, "forms", "imm5645e.pdf"));
  let latest = await find("c1115-no-pdf-1");
  let f5645 = latest.forms.find((f) => f.code === "IMM 5645"), f0002 = latest.forms.find((f) => f.code === "IRM 0002");
  step("C11.15 P-156 (4) pass (API): IMM 5645's download failed: Not found, with the reason and the PDF's own link", f5645?.state === "NOT_FOUND" && f5645.link === PDF_URL && /could not be downloaded from canada\.ca/.test(f5645.why ?? ""), f5645);
  step("C11.15 fail (API): a form downloaded as usual (IRM 0002) carries no link and is not 'Not found'", f0002?.state === "DOWNLOADED_ATTACHED" && !f0002.link, f0002);
  step("C11.15 fail (API): nothing of IMM 5645 was stored or attached (no edition, no line)", sql("select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = 'IMM 5645'") === "0" && sql(`select count(*) from combination_form where combination_id='${vv}' and lineage_key='IMM 5645'`) === "0");
  step("C11.15 pass (API): the run ends Done with problems and says one was not found", latest.run.status === "PARTIAL", latest.run.status);

  // The row on the Forms tab, like a person.
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await p.goto(`${BASE}/c/${vv}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
    const row = p.locator('[data-finder-row="IMM 5645"]'); await row.waitFor({ timeout: 15_000 });
    const link = row.locator("[data-download-link]");
    step("C11.15 P-156 (4) pass (page): the Not found row says why and offers Download from this link, Upload PDF and Find again", (await link.count()) === 1 && /Not found/.test(await row.innerText()) && /could not be downloaded from canada\.ca/.test(await row.innerText()) && (await row.getByRole("button", { name: /Upload PDF/ }).count()) === 1 && (await row.getByRole("button", { name: /Find again/ }).count()) === 1, await row.innerText());
    step("C11.15 pass (page): the link goes to canada.ca's PDF, in a new tab, and its name says so", (await link.getAttribute("href")) === PDF_URL && (await link.getAttribute("target")) === "_blank" && /noreferrer/.test((await link.getAttribute("rel")) ?? "") && /Download from this link \(canada\.ca, opens in a new tab\)/.test((await link.textContent()) ?? ""), await link.evaluate((e) => e.outerHTML));
    step("C11.15 fail (page): the downloaded form's row (IRM 0002, if listed) has no download link", (await p.locator('[data-finder-row="IRM 0002"] [data-download-link]').count()) === 0);
    await link.focus();
    step("C11.15 pass (page): the link is reached by keyboard and shows its focus", await link.evaluate((e) => document.activeElement === e && getComputedStyle(e).boxShadow !== "none"));
    const ax = await new AxeBuilder({ page: p }).include('[data-finder-row="IMM 5645"]').withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step("axe (WCAG 2.2 AA): the Not found row with its link", ax.violations.length === 0, ax.violations.map((v) => v.id).join(","));
    fs.mkdirSync(path.join(ROOT, "product", "screens", "W1-form-library", "screenshots", "c1115"), { recursive: true });
    await row.evaluate((e) => e.scrollIntoView({ block: "center" })); await sleep(150);
    await p.screenshot({ path: path.join(ROOT, "product", "screens", "W1-form-library", "screenshots", "c1115", "not-found-link-1440.png") });

    // 2. The form page itself cannot be read (its recorded copy changed): the row links to the form page.
    fs.copyFileSync(path.join(OFFICIAL, "forms", "imm5645e.pdf"), path.join(COPY, "forms", "imm5645e.pdf"));
    fs.appendFileSync(path.join(COPY, "canada", "pages", "imm5645.html"), "\n<!-- C11.15 check: changed -->\n");
    latest = await find("c1115-no-page-1", ["IMM 5645"]);
    f5645 = latest.forms.find((f) => f.code === "IMM 5645");
    step("C11.15 P-156 (4) pass (API): the form page could not be read: Not found, linking to the form page (no PDF link known)", f5645?.state === "NOT_FOUND" && f5645.link === PAGE_URL, f5645);

    // 2b–2d (#261 m1–m3): canada.ca serves something that is not this form; each time the copy's index takes the new
    // file's checksum, as if recorded so (the studio re-reads a changed index).
    const restore = () => { for (const [rel, src] of [["forms/imm5645e.pdf", "forms/imm5645e.pdf"], ["canada/pages/imm5645.html", "canada/pages/imm5645.html"], ["canada/index.json", "canada/index.json"]]) fs.copyFileSync(path.join(OFFICIAL, src), path.join(COPY, rel)); };
    const record = (rel, bytes) => {
      fs.writeFileSync(path.join(COPY, rel), bytes);
      const ix = JSON.parse(fs.readFileSync(path.join(COPY, "canada", "index.json"), "utf8"));
      ix.items.find((i) => i.path === rel).sha256 = require("node:crypto").createHash("sha256").update(bytes).digest("hex");
      fs.writeFileSync(path.join(COPY, "canada", "index.json"), JSON.stringify(ix, null, 2));
    };
    const editions5645 = () => sql("select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = 'IMM 5645'");
    // 2b. Another form's bytes (IMM 5257) behind IMM 5645's PDF link: refused, and the link is the form page, not that file (m2).
    restore(); record("forms/imm5645e.pdf", fs.readFileSync(path.join(OFFICIAL, "forms", "imm5257e.pdf")));
    latest = await find("c1115-other-form-1", ["IMM 5645"]);
    f5645 = latest.forms.find((f) => f.code === "IMM 5645");
    step("C11.15 m1/m2 pass (API): canada.ca's file reads as another form: Not found, not stored, linking to the form page", f5645?.state === "NOT_FOUND" && /reads as IMM 5257/.test(f5645.why ?? "") && f5645.link === PAGE_URL && editions5645() === "0", f5645);
    step("C11.15 m2 fail (API): the refused file's own address is not offered", f5645?.link !== PDF_URL, f5645?.link);
    // 2c. The form page names no PDF (online only): the link is the form page.
    restore(); record("canada/pages/imm5645.html", Buffer.from(fs.readFileSync(path.join(OFFICIAL, "canada", "pages", "imm5645.html"), "utf8").split("/content/dam/ircc/documents/pdf/english/kits/forms/imm5645/01-01-2021/imm5645e.pdf").join("#no-pdf")));
    latest = await find("c1115-no-pdf-page-1", ["IMM 5645"]);
    f5645 = latest.forms.find((f) => f.code === "IMM 5645");
    step("C11.15 m1 pass (API): the form page names no PDF: Not found, says so, linking to the form page", f5645?.state === "NOT_FOUND" && /has no PDF to download/.test(f5645.why ?? "") && f5645.link === PAGE_URL && editions5645() === "0", f5645);
    // 2d. A PDF whose number and edition cannot be read (damaged): the link is the PDF itself (the right file, a person reads it; m3's reader failure gives the same).
    restore(); record("forms/imm5645e.pdf", Buffer.from("%PDF-1.4\n% damaged on purpose by the C11.15 check\n%%EOF\n"));
    latest = await find("c1115-unreadable-1", ["IMM 5645"]);
    f5645 = latest.forms.find((f) => f.code === "IMM 5645");
    step("C11.15 m1/m3 pass (API): the file cannot be read: Not found, says so, linking to the PDF", f5645?.state === "NOT_FOUND" && /could not be read from the file/.test(f5645.why ?? "") && f5645.link === PDF_URL && editions5645() === "0", f5645);

    // 3. Both readable again: Find again downloads it, and the link is gone.
    restore();
    latest = await find("c1115-again-1", ["IMM 5645"]);
    f5645 = latest.forms.find((f) => f.code === "IMM 5645");
    step("C11.15 fail (API): once canada.ca answers, Find again downloads and attaches it, with no link", f5645?.state === "DOWNLOADED_ATTACHED" && !f5645.link, f5645);
    step("no page errors", errs.length === 0, errs.join(" | "));
  } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
