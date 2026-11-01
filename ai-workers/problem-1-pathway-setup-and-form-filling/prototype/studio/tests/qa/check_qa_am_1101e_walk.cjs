// qa after-merge 1 Nov, sixth round (main 25cefb67): a person's walk, headless, of what merged since 6b424941 and the
// builders' own checks do not walk:
//   * #259 C3.12: Shared library › Forms shows each form's field map — at 1440 (column), 1024 and 400 (short line),
//     its drawer line, no sideways scroll at 400, axe clean (serious and critical) on the list and the drawer;
//   * #252 QA-78 (free part): a Live combination with forms never says "No form find yet"; the rest of QA-78 is printed
//     as INFO (plan word "later wave", file names on lines) so the row can be narrowed;
//   * #247 X1 landings: ?focus=forms:lines lands keyboard focus on the forms table and clears the address; a landing
//     whose place is not on the page (forms:held with no held edition) leaves focus usable and shows no error;
//   * #254 X2b slice (a) underneath: POST /lines/bulk/preview by every other role, a non-JSON body, two at once,
//     and that a preview changes nothing (activity count and the target's form lines unchanged).
// Sample data (Load sample; none of these capabilities loads it), no STUDIO_*_LIVE, US$0.
//   zsh studio/tools/isolated.sh qa_wk 4472 start && node studio/tests/qa/check_qa_am_1101e_walk.cjs 4472
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4472), BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-11-01-after-merge-6"); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : ` — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 400)}`}`); };
const info = (n, d) => console.log(`INFO  ${n} — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 400)}`);

(async () => {
  const b = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : { channel: "chrome" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (u, actor = "user-A", method = "GET", data) => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, headers: { "x-actor": actor, ...(data !== undefined ? { "content-type": typeof data === "string" ? "text/plain" : "application/json" } : {}) }, data: data === undefined ? undefined : typeof data === "string" ? data : JSON.stringify(data) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  if (!(await api("/demo/status")).body?.loaded) step("setup: Load sample", (await api("/demo/load", "user-A", "POST")).status === 201);
  const axe = async (what) => { const r = await new AxeBuilder({ page: p }).analyze(); const bad = r.violations.filter((v) => ["serious", "critical"].includes(v.impact)); step(`${what}: axe has no serious or critical violation`, bad.length === 0, bad.map((v) => `${v.id}: ${v.nodes.length}`)); };

  // ---- #259 C3.12: field map in the Forms list
  // The sample now holds IRCC's whole forms list (237; "Showing 50 of 237 forms"), so IMM 5257 is past the first page.
  // A person narrows with "Used by"; the walk does the same (qa-2, after-merge 7, 69e0f215).
  const usedByVisitor = async () => { const sel = p.locator("select", { has: p.locator("option", { hasText: "Visitors › Visitor visa" }) }).first(); if (await sel.count()) { await sel.selectOption({ label: "Visitors › Visitor visa" }); await p.waitForTimeout(500); } };
  for (const w of [1440, 1024, 400]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto(`${BASE}/library/forms`); await p.getByRole("table").first().waitFor(); await usedByVisitor();
    await p.waitForTimeout(300);
    const head = await p.getByRole("columnheader", { name: "Field map" }).isVisible().catch(() => false);
    const short = await p.locator("[data-field-map-short]").first().isVisible().catch(() => false);
    step(`C3.12 @${w}: the field map shows as a ${w >= 1280 ? "column" : "line under the title"}`, w >= 1280 ? head : short, { head, short });
    const sideways = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`C3.12 @${w}: no sideways scroll on the page`, sideways <= 1, sideways);
    if (w === 1440) {
      const words = await p.locator("tbody tr").evaluateAll((rs) => rs.slice(0, 40).map((r) => r.innerText.replace(/\s+/g, " ")));
      info("C3.12: first rows as a person reads them", words.slice(0, 4));
      await axe("C3.12 Forms list @1440");
    }
    await p.screenshot({ path: path.join(SHOTS, `c312-forms-list-${w}.png`) });
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(`${BASE}/library/forms`); await p.getByRole("table").first().waitFor(); await usedByVisitor();
  const firstForm = p.locator("tbody tr").filter({ hasText: /IMM 5257/ }).first();
  await firstForm.getByRole("button").first().click().catch(async () => { await firstForm.click(); });
  const panel = p.locator("[data-field-map-panel]");
  const panelOk = await panel.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
  step("C3.12: the IMM 5257 drawer has its Field map line", panelOk, panelOk ? (await panel.innerText()).replace(/\s+/g, " ") : "no panel");
  if (panelOk) { await p.screenshot({ path: path.join(SHOTS, "c312-drawer.png") }); await axe("C3.12 drawer"); await p.keyboard.press("Escape"); }

  // ---- #252 QA-78 on a Live combination with forms
  const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.filter((r) => r.combinationId);
  // Visitor visa is In setup in the sample (forms attached, not lines yet); With an LMIA is Live with 8 form lines.
  const vv = rows.find((r) => /lmia/i.test(r.nodeKey) || /LMIA/.test(r.label ?? ""));
  await p.goto(`${BASE}/c/${vv.combinationId}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  await p.locator("[data-focus='forms:lines']").waitFor(); await p.waitForTimeout(500);
  const main = (await p.locator("main").innerText()).replace(/\s+/g, " ");
  step("QA-78: With an LMIA (Live, 8 forms) never says \"No form find yet\" and counts its forms", !/No form find yet/i.test(main) && /\b8 forms\b/.test(main), main.match(/.{0,60}(form find|8 forms).{0,100}/i)?.[0] ?? "absent");
  info("QA-78 rest: file names shown on lines", main.match(/\b[a-z0-9-]+\.pdf\b/gi) ?? []);
  const opts = await p.locator("option").allInnerTexts();
  info("QA-78 rest: channel choices with a plan word", opts.filter((o) => /later wave/i.test(o)).slice(0, 3));
  await p.screenshot({ path: path.join(SHOTS, "qa78-lmia-forms.png") });

  // ---- #247 landings
  await p.goto(`${BASE}/c/${vv.combinationId}/forms?focus=forms:lines`); await p.locator("[data-focus='forms:lines']").waitFor();
  await p.waitForTimeout(800);
  const landed = await p.evaluate(() => document.activeElement?.getAttribute("data-focus") ?? document.activeElement?.closest("[data-focus]")?.getAttribute("data-focus") ?? document.activeElement?.tagName);
  step("X1 #247: ?focus=forms:lines puts keyboard focus on the forms table", landed === "forms:lines", landed);
  step("X1 #247: the address no longer carries ?focus=", !/focus=/.test(p.url()), p.url());
  await p.keyboard.press("Tab");
  const next = await p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName} ${(a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 40)}` : null; });
  step("X1 #247: Tab from the landing goes on inside the page, not back to the top", !!next && !/^BODY/.test(next), next);
  const hasHeld = await api(`/combinations/${vv.combinationId}/summary`).then((r) => JSON.stringify(r.body ?? {}).includes("forms:held"));
  await p.goto(`${BASE}/c/${vv.combinationId}/forms?focus=forms:held`); await p.locator("[data-focus='forms:lines']").waitFor(); await p.waitForTimeout(800);
  const heldFocus = await p.evaluate(() => document.activeElement?.tagName);
  const alerts = await p.getByRole("alert").allInnerTexts();
  info("X1 #247: forms:held with no held edition on the page", { summaryNamesIt: hasHeld, focus: heldFocus, url: p.url(), alerts });
  step("X1 #247: a landing whose place is absent shows no error", !alerts.some((a) => /error|went wrong/i.test(a)), alerts);

  // ---- #254 X2b preview underneath
  const ids = rows.filter((r) => r.combinationId !== vv.combinationId).map((r) => r.combinationId);
  const body = { line: { combinationId: vv.combinationId, kind: "form", key: "IMM 1295" }, op: "add", combinationIds: ids };
  const actBefore = await api("/activity?limit=1"); const before = JSON.stringify(actBefore.body).length;
  const a = await api("/lines/bulk/preview", "user-A", "POST", body);
  step("C1.5 X2b: the Super Admin's preview answers 200 with one row per combination", a.status === 200 && a.body?.targets?.length === ids.length, { status: a.status, n: a.body?.targets?.length, counts: a.body?.counts });
  info("C1.5 X2b: outcomes", Object.entries((a.body?.targets ?? []).reduce((m, t) => (m[t.outcome] = (m[t.outcome] ?? 0) + 1, m), {})));
  for (const who of ["user-C", "user-O", "user-P"]) {
    const r = await api("/lines/bulk/preview", who, "POST", body);
    step(`C1.5 X2b: ${who} is refused a preview (403, plain words)`, r.status === 403 && typeof r.body?.detail === "string" && !/[A-Z_]{6,}/.test(r.body.detail), { status: r.status, detail: r.body?.detail });
  }
  const junk = await api("/lines/bulk/preview", "user-A", "POST", "not json");
  step("QA-131: a non-JSON body is a 400 Problem Details in plain words (no \"Invalid input: expected object, received undefined\")", junk.status === 400 && typeof junk.body?.detail === "string" && !/Invalid input|expected .*received/i.test(junk.body.detail), { status: junk.status, detail: junk.body?.detail });
  const empty = await api("/lines/bulk/preview", "user-A", "POST", { ...body, combinationIds: [] });
  step("C1.5 X2b: no combination chosen says \"Choose at least one combination.\"", empty.status === 400 && JSON.stringify(empty.body).includes("Choose at least one combination."), empty.body);
  const [x, y] = await Promise.all([api("/lines/bulk/preview", "user-A", "POST", body), api("/lines/bulk/preview", "user-A", "POST", body)]);
  step("C1.5 X2b: two previews at once give the same answer", x.status === 200 && JSON.stringify(x.body) === JSON.stringify(y.body), [x.status, y.status]);
  const actAfter = await api("/activity?limit=1");
  step("C1.5 X2b: a preview writes nothing (activity unchanged)", actBefore.status !== 200 || JSON.stringify(actAfter.body).length === before, { s: actBefore.status });
  const willAdd = (a.body?.targets ?? []).find((t) => t.outcome === "WILL_ADD");
  if (willAdd) {
    await p.goto(`${BASE}/c/${willAdd.combinationId}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.waitForTimeout(500);
    step("C1.5 X2b: the combination marked \"Will be added\" still has no IMM 1295 line", !/IMM 1295/.test(await p.locator("[data-focus='forms:lines']").innerText().catch(() => "")), willAdd.trail);
  }

  step("no page error on the way", errs.length === 0, errs);
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
