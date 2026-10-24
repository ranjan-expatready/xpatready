// qa lane, /qa after-merge on main 12e7207: the R1c case area (/cases) walked as its people would, with what the
// builders' journey (tests/runtime/check_runtime_r1c.cjs) does not try: wrong role by address (client on the case list,
// the configuration author on /cases, a client on another client's questionnaire), more than one page of cases (Load more,
// clicked twice at once), a double click on Add child, Back after a refused save (the typing stays, PR 10), a reload
// in the middle of a part, keyboard only to the primary action, no sideways scroll and axe at 390 px and 1440 px.
// Runs on the runtime copy after setup_visitor_visa.ts. Cases and people are Sample. No model call.
//   zsh studio/tools/isolated.sh qa_rt4 4474 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4474 xr_studio_qa_rt4
//   node studio/tests/qa/check_qa_r1c_walk.cjs 4474 xr_studio_qa_rt4
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = process.argv[2] ?? "4474", DB = process.argv[3] ?? "xr_studio_qa_rt4", BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => fs.existsSync(p));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const OUT = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", `${new Date().toISOString().slice(0, 10)}-${process.env.QA_MODE ?? "after-merge-3"}`); fs.mkdirSync(OUT, { recursive: true });
const OFFICER = "user-O", CLIENT = "user-P", CLIENT_B = "user-Q", AUTHOR = "user-A";
let pass = 0, fail = 0, shot = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
const call = async (method, url, body, actor) => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const run = Date.now().toString(36).slice(-5);

(async () => {
  const vv = sql("select id from combination where combination_key='vv.single'");
  // More than one page of cases (the API gives 50 at a time): 55 through the API, as earlier work would leave them.
  for (let i = 0; i < 55; i++) await call("POST", "/runtime/cases", { combinationId: vv, reference: `QA-LM-${run}-${String(i).padStart(2, "0")}`, clientActor: CLIENT_B, principal: { displayName: `Sample Applicant ${i}` } }, OFFICER);
  const mine = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `QA-WALK-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant Á" } }, OFFICER)).body;
  const other = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `QA-OTHER-${run}`, clientActor: CLIENT_B, principal: { displayName: "Sample Applicant B" } }, OFFICER)).body;
  const total = Number(sql("select count(*) from runtime_case"));

  const browser = await chromium.launch({ channel: "chrome" });
  const errors = [];
  const page = async (actor, width) => {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
    await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* private window */ } }, actor);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(String(e)));
    return p;
  };
  const look = async (p, name) => {
    const sw = await p.evaluate(() => document.documentElement.scrollWidth), w = p.viewportSize().width;
    step(`${name} at ${w} px: no sideways scroll`, sw <= w + 1, `${sw} px`);
    const axe = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations;
    step(`${name} at ${w} px: axe clean`, !axe.length, axe.map((v) => `${v.id} (${v.nodes.length})`).join(", ") || "clean");
    await p.screenshot({ path: path.join(OUT, `r1c-${String(++shot).padStart(2, "0")}-${name.replace(/\W+/g, "-")}-${w}.png`), fullPage: true });
  };
  const text = async (p) => (await p.innerText("body")).replace(/\s+/g, " ");

  // ── Officer, desktop then phone: the list, more than one page, a case
  for (const w of [1440, 390]) {
    const o = await page(OFFICER, w);
    await o.goto(`${BASE}/cases`); await o.getByRole("heading", { name: "Cases" }).waitFor();
    await o.getByText(/cases? shown/).waitFor();
    await look(o, "officer case list");
    if (w === 1440) {
      const shown = async () => Number(/(\d+) cases? shown/.exec(await text(o))?.[1]);
      const first = await shown();
      const more = o.getByRole("button", { name: "Load more" });
      await more.dblclick();
      await o.waitForFunction((n) => Number(/(\d+) cases? shown/.exec(document.body.innerText)?.[1]) > n, first, { timeout: 10000 }).catch(() => {});
      const after = await shown(), links = await o.locator("main table a").allInnerTexts();
      console.log(`NOTE  cases in the workspace: ${total}`);
      step("Load more (double click): exactly one more page is added, no case twice", first === 50 && after === Math.min(100, total) && new Set(links).size === links.length, { first, after, total, unique: new Set(links).size });
      for (let k = 0; k < 10 && await more.isVisible().catch(() => false); k++) { const n = await shown(); await more.click(); await o.waitForFunction((m) => Number(/(\d+) cases? shown/.exec(document.body.innerText)?.[1]) > m, n, { timeout: 10000 }).catch(() => {}); }
      const all = await o.locator("main table a").allInnerTexts();
      step("Load more until it disappears: every case in the workspace is listed once", (await shown()) === total && new Set(all).size === total && !(await more.isVisible().catch(() => false)), { shown: await shown(), total, unique: new Set(all).size });
      // Keyboard only: Tab from the page start reaches "Open a case" and Enter opens the dialog.
      await o.goto(`${BASE}/cases`); await o.getByRole("heading", { name: "Cases" }).waitFor();
      let reached = false; for (let i = 0; i < 25 && !reached; i++) { await o.keyboard.press("Tab"); reached = await o.evaluate(() => document.activeElement?.textContent?.includes("Open a case") ?? false); }
      if (reached) await o.keyboard.press("Enter");
      step("keyboard only: Tab reaches 'Open a case' and Enter opens its dialog", reached && await o.getByRole("dialog").isVisible().catch(() => false));
    }
    await o.goto(`${BASE}/cases/${mine.id}`); await o.getByRole("heading", { level: 1 }).first().waitFor();
    await look(o, "officer case page");
    if (w === 1440) {
      const kids = () => Number(sql(`select count(*) from case_participant where case_id='${mine.id}' and role='child'`));
      const before = kids();
      await o.getByRole("button", { name: "Add child" }).click(); await o.getByLabel("Name", { exact: true }).fill("Sample Child Dbl");
      await o.getByRole("button", { name: "Add", exact: true }).dblclick(); await o.waitForTimeout(1500);
      step("Add child, the Add button double-clicked: one child added", kids() === before + 1, { before, after: kids() });
      await o.keyboard.press("Escape").catch(() => {});
    }
    await o.context().close();
  }

  // ── Wrong person by address
  // The way in from the studio: Demo menu → "Open the case area (runtime preview)", as the configuration author.
  const ad = await page(AUTHOR, 1440); await ad.goto(`${BASE}/`); await ad.getByRole("button", { name: /Demo/ }).click();
  await ad.getByText("Open the case area (runtime preview)").click(); await ad.waitForTimeout(2500);
  const adText = await text(ad);
  step("QA-35 the studio's Demo menu 'Open the case area' shows the case area (not a blank page)", /Cases/.test(adText), { url: ad.url(), text: adText.slice(0, 80) || "(blank page)" });
  await ad.screenshot({ path: path.join(OUT, "r1c-author-from-demo-menu-1440.png") }); await ad.context().close();
  const a = await page(AUTHOR, 1440); await a.goto(`${BASE}/cases`); await a.waitForLoadState("networkidle"); await a.waitForTimeout(1500);
  step("QA-35 the configuration author opening /cases by address sees the case area as the officer (the page's own rule) or a plain message, not a blank page", (await text(a)).trim().length > 0, (await text(a)).slice(0, 160) || "(blank page)");
  await a.context().close();
  const c = await page(CLIENT, 390);
  await c.goto(`${BASE}/cases`); await c.waitForLoadState("networkidle");
  step("a client on /cases sees no case list (plain words)", !(await text(c)).includes("QA-LM-") && /case officer|questionnaire/i.test(await text(c)), (await text(c)).slice(0, 160));
  await c.goto(`${BASE}/cases/${other.id}/questionnaire`); await c.waitForLoadState("networkidle");
  const otherText = await text(c);
  step("a client opening another client's questionnaire by address sees nothing of it (plain refusal)", !otherText.includes("Sample Applicant B") && !otherText.includes(`QA-OTHER-${run}`) && /not available|not found|not yours|cannot|could not/i.test(otherText), otherText.slice(0, 200));
  await c.goto(`${BASE}/cases/${other.id}`); await c.waitForLoadState("networkidle");
  step("a client on the officer's case page by address sees nothing of the case", !(await text(c)).includes("Sample Applicant B"), (await text(c)).slice(0, 160));

  // ── Client on a phone: their own questionnaire
  await c.goto(`${BASE}/cases/${mine.id}/questionnaire`); await c.getByRole("heading", { name: "Your questionnaire" }).waitFor();
  await look(c, "client overview");
  await c.getByRole("button", { name: /^Start/ }).click();
  await c.getByText(/^Part 1 of \d+/).waitFor();
  await look(c, "client part 1");
  // Move to a part with a date: save part 1 the way a person would.
  await c.getByRole("group", { name: /visitor visa or a transit visa/ }).getByLabel("Visitor visa").check();
  await c.getByRole("group", { name: /Official language/ }).getByRole("radio").first().check();
  await c.getByRole("button", { name: /Save and continue/ }).click(); await c.getByText(/^Part 2 of \d+/).waitFor();
  const start = c.getByRole("group", { name: /When will the visit start/ });
  await start.getByLabel("Day").fill("31"); await start.getByLabel("Month").fill("2"); await start.getByLabel("Year").fill("2027");
  await c.getByRole("button", { name: "Back" }).first().click(); await c.waitForTimeout(1200);
  const kept = await start.getByLabel("Day").inputValue().catch(() => "(gone)");
  const summary = await c.getByRole("alert").filter({ hasText: /problem|Check/ }).isVisible().catch(() => false);
  const storedDate = sql(`select coalesce(string_agg(a.value_json #>> '{}', ','), '') from client_canonical_answer a join case_participant p on p.subject_id=a.subject_id where p.case_id='${mine.id}' and a.canonical_field_key='case.intended_stay_from' and a.superseded_by_id is null`);
  step("Back with an impossible date typed (31 Feb): like Save and continue, the part stays with the error, the typing is kept, nothing impossible is stored as saved", (await text(c)).includes("Part 2 of") && summary && kept === "31" && !storedDate.includes("-02-31"), { kept, summary, part: /Part \d+ of \d+/.exec(await text(c))?.[0], stored: storedDate, says: /✓ Saved/.test(await text(c)) ? "✓ Saved" : "" });
  await look(c, "client after Back");
  if (!(await text(c)).includes("Part 2 of")) { await c.getByRole("button", { name: /Save and continue/ }).click(); await c.getByText(/^Part 2 of \d+/).waitFor(); }
  // Reload in the middle of a part: saved answers stay; what was typed and not saved is not silently counted as saved.
  await start.getByLabel("Day").fill("3"); await start.getByLabel("Month").fill("7");
  await c.reload(); await c.waitForLoadState("networkidle");
  const afterReload = await text(c);
  step("reload in the middle of a part: the client is back in the questionnaire, nothing claims the unsaved part was saved", /questionnaire|Part \d+ of/i.test(afterReload) && !/2 of \d+ parts done/.test(afterReload), afterReload.slice(0, 200));
  const savedP1 = sql(`select count(*) from client_canonical_answer a join case_participant p on p.subject_id=a.subject_id where p.case_id='${mine.id}' and a.superseded_by_id is null`);
  step("data: part 1's answers are stored underneath", Number(savedP1) > 0, savedP1);
  step("no page errors", !errors.length, errors.slice(0, 3));
  await browser.close();
  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
