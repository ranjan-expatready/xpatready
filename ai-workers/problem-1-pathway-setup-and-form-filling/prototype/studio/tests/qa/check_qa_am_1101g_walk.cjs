// qa after-merge 1 Nov, ninth round (main after #285, #294, #284; qa-2): a person's walk of the three rows the merges
// mark Built, awaiting qa (P-219, P-221), on the data a person reaches from the Demo menu (the configured checkpoint):
//   * #284 C4.1: Questionnaires › Move down on a section header by keyboard; the move is named on Review; one Undo puts
//     it back; the first header's Move up is greyed with the reason; the approver sees no move.
//   * #294 C3.14: Shared library › Checks and › Rules: read-only lists with chips, counts, filter and search; where
//     used links to the combination; 1440, 1024 and 400 px without sideways scroll; axe; the approver reads them too.
//   * #285 C2.12: To review opened from a form's guided path (?form=&c=) shows only that form, the return strip and
//     "Back to the steps" (reported with what the page shows).
// Blank isolated copy, configured checkpoint loaded through the API as the author (C10.1 is not under test here),
// no STUDIO_*_LIVE, US$0.
//   zsh studio/tools/isolated.sh qa_g 4474 start && node studio/tests/qa/check_qa_am_1101g_walk.cjs 4474 xr_studio_qa_g
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4474), DB = process.argv[3] ?? "xr_studio_qa_g", BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-11-01-after-merge-9"); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : ` — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`}`); };
const info = (n, d) => console.log(`INFO  ${n} — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`);
const sql = (q) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", DB, "-Atc", q]).toString().trim();

(async () => {
  const b = await chromium.launch({ headless: !process.env.QA_HEADED, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : { channel: "chrome" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (u, actor = "user-A", method = "GET", data) => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, timeout: 600000, headers: { "x-actor": actor, ...(data !== undefined ? { "content-type": "application/json" } : {}) }, data: data === undefined ? undefined : JSON.stringify(data) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const axe = async (what) => { const r = await new AxeBuilder({ page: p }).analyze(); const bad = r.violations.filter((v) => ["serious", "critical"].includes(v.impact)); step(`${what}: axe has no serious or critical violation`, bad.length === 0, bad.map((v) => `${v.id}: ${v.nodes.length}`)); };
  const as = async (actor) => { await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
  const sideways = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (!(await api("/demo/status")).body?.programsExist) step("setup: configured checkpoint loaded", (await api("/demo/load", "user-A", "POST", { sample: "configured" })).status === 201);
  await as("user-A");

  // ---- C4.1: section order on the Questionnaires tab
  const combos = sql("select id||'|'||combination_key from combination order by combination_key").split("\n").map((l) => l.split("|"));
  let target = null;
  for (const [id, key] of [...combos.filter(([, k]) => k === "vv.single"), ...combos.filter(([, k]) => k !== "vv.single")]) {
    await p.goto(`${BASE}/c/${id}/questionnaires`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
    if (await p.getByRole("button", { name: /^Move down/ }).count() >= 1) { target = { id, key }; break; }
    info(`C4.1: ${key} has no section to move`, (await p.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 160));
  }
  step("C4.1: a combination of the checkpoint offers Move down on its section headers", !!target, target?.key);
  if (target) {
    const headers = async () => p.getByRole("button", { name: /^Move down/ }).evaluateAll((bs) => bs.map((x) => x.getAttribute("aria-label")));
    const before = await headers();
    info(`C4.1 on ${target.key}: Move down buttons`, before.slice(0, 4));
    const up0 = p.getByRole("button", { name: /^Move up/ }).first();
    const why = (await p.locator("[data-move-why]").first().getAttribute("data-move-why").catch(() => "")) || (await up0.getAttribute("aria-label")).replace(/^Move up: [^(]*\(?/, "").replace(/\)$/, "");
    step("C4.1: the first header's Move up is greyed and says why", (await up0.isDisabled()) && why.length > 0, why || "(no reason element)");
    const down0 = p.getByRole("button", { name: /^Move down/ }).first();
    await down0.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(1200);
    const after = await headers();
    step("C4.1: Move down by keyboard changes the order shown", JSON.stringify(after) !== JSON.stringify(before), { before: before.slice(0, 2), after: after.slice(0, 2) });
    const focused = await p.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent?.slice(0, 60));
    info("C4.1: focus after the move", focused);
    await p.screenshot({ path: path.join(SHOTS, "c41-moved-1440.png") });
    await axe("C4.1 Questionnaires after a move");
    const rev = await api(`/combinations/${target.id}`);
    const named = JSON.stringify(rev.body?.draft?.changes ?? rev.body ?? {}).match(/Sections reordered[^"]{0,120}/)?.[0];
    step("C4.1: the move is named in the combination's changes (\"Sections reordered: …\")", !!named, named);
    const undo = p.getByRole("button", { name: /^Undo/ }).first();
    if (await undo.isVisible().catch(() => false)) { await undo.click(); await p.waitForTimeout(1200); }
    step("C4.1: one Undo puts the order back", JSON.stringify(await headers()) === JSON.stringify(before), (await headers()).slice(0, 2));
    await as("user-B"); await p.goto(`${BASE}/c/${target.id}/questionnaires`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
    step("C4.1 fail: the approver (no author duty) sees no enabled Move button", (await p.getByRole("button", { name: /^Move (up|down)/ }).evaluateAll((bs) => bs.filter((x) => !x.disabled).length)) === 0);
    await as("user-A");
  }

  // ---- C3.14: Shared library › Checks and Rules
  for (const page of ["checks", "rules"]) {
    for (const w of [1440, 1024, 400]) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.goto(`${BASE}/library/${page}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
      step(`C3.14 ${page} @${w}: no sideways scroll`, (await sideways()) <= 1, await sideways());
      await p.screenshot({ path: path.join(SHOTS, `c314-${page}-${w}.png`) });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    const text = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    info(`C3.14 ${page}: as a person reads it`, text.slice(0, 500));
    step(`C3.14 ${page}: the list shows rows, or says plainly there are none`, (await p.locator("tbody tr, [role=row], li").count()) > 0 || /no (checks|rules)/i.test(text), text.slice(0, 120));
    step(`C3.14 ${page}: read-only (no Add, Edit, Delete or Save on the page)`, (await p.getByRole("button", { name: /^(Add|Edit|Delete|Save|New)\b/ }).count()) === 0);
    const search = p.getByRole("searchbox").or(p.getByPlaceholder(/search/i)).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill("zzqqxx-nothing"); await p.waitForTimeout(600);
      info(`C3.14 ${page}: a search that matches nothing`, (await p.locator("main").innerText()).replace(/\s+/g, " ").match(/.{0,40}(No |nothing|0 ).{0,80}/i)?.[0] ?? "(no words found)");
      await search.fill("");
    } else info(`C3.14 ${page}: no search box found`, "");
    const link = p.locator("main a[href*='/c/']").first();
    if (await link.count()) { const href = await link.getAttribute("href"); await link.click(); await p.waitForLoadState("networkidle"); step(`C3.14 ${page}: "where used" opens the combination's tab`, /\/c\/[0-9a-f-]{36}\//.test(p.url()), href); }
    else info(`C3.14 ${page}: no where-used link on the page`, "");
    await p.goto(`${BASE}/library/${page}`); await p.waitForLoadState("networkidle"); await axe(`C3.14 ${page}`);
    await as("user-B"); await p.goto(`${BASE}/library/${page}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(500);
    step(`C3.14 ${page}: the approver can read it too`, !/not allowed|403/i.test(await p.locator("main").innerText()));
    await as("user-A");
  }

  // ---- C2.12: To review from a form's guided path
  const vv = combos.find(([, k]) => k === "vv.single")?.[0];
  const form = sql(`select f.form_key from combination_form cf join gov_form_def f on f.id = cf.gov_form_def_id where cf.combination_id = '${vv}' limit 1`).trim();
  if (vv && form) {
    await p.goto(`${BASE}/review?form=${encodeURIComponent(form)}&c=${vv}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000);
    const t = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    info("C2.12: To review opened from the path", t.slice(0, 400));
    step("C2.12: the return strip offers \"Back to the steps\"", await p.getByRole("link", { name: /Back to the steps/ }).isVisible().catch(() => false));
    step("C2.12: \"Show every form\" is offered", /Show every form/.test(t));
    await p.screenshot({ path: path.join(SHOTS, "c212-to-review-filtered-1440.png") });
    await axe("C2.12 To review filtered");
  } else info("C2.12: no Visitor visa form found for the walk", { vv, form });

  step("no page errors in the walk", errs.length === 0, errs.slice(0, 3));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(2); });
