// F6 / C4.2 (runtime lane; P-76, P-130 M4, P-132): an author marks a combination's Prospect questionnaire (PQR) questions by hand on
// the Smart questionnaire (SQR) tab, walked in a real browser. Only a question the combination's questionnaire asks can be marked:
// a case officer fact and a fact no question asks are refused in the drawer, by the API and in a bulk change. The PQR is
// one record per combination: a tick here changes no other combination. check_w115_slice1's "no question asks it" fail
// is skipped when every sample fact has a question (it always has), so this check makes one fact unasked on purpose:
// its library question is set to "decides only" (rule_only), which is how a fact read only from a document looks.
// A pass and a fail per rule; screenshots at 1440 and 1024 in screens/W1-questions-and-documents/screenshots/c42-marking/,
// axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c42 4437 start && node studio/tests/check_c42_marking_browser.cjs 4437 xr_studio_runtime_c42
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_runtime_c42";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "c42-marking"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const KEYS = /\b[a-z_]+\.[a-z_]+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  // Waits fail loudly: a page that never settles is a failure, not a pass.
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const vv = sql("select id from combination where combination_key='vv.single'");
  let L = (await api(`/combinations/${wp}/fact-sources`)).body;
  const principal = L.facts.filter((f) => f.role === "principal" && !f.prequalification);
  const [client, client2] = principal.filter((f) => f.source === "CLIENT" && f.placed && !f.clientOnly);
  const officer = principal.find((f) => f.source === "AGENT");
  const doc = principal.find((f) => f.source === "DOCUMENT" && f.placed && !f.clientOnly && f.fact !== "person.date_of_birth");
  step("setup: the sample has two client questions, a case officer fact and a document fact for the principal applicant", !!client && !!client2 && !!officer && !!doc, [client?.fact, client2?.fact, officer?.fact, doc?.fact].join());
  // The document fact's library question only decides what applies from now on: no question asks it any more.
  sql(`update section_question set rule_only = true where canonical_field_key = '${doc.fact}'`);
  L = (await api(`/combinations/${wp}/fact-sources`)).body;
  const unasked = L.facts.find((f) => f.role === "principal" && f.fact === doc.fact);
  step("setup: the document fact is now asked by no question (read from its document only)", unasked && unasked.placed === false && unasked.source === "DOCUMENT", JSON.stringify({ placed: unasked?.placed, source: unasked?.source }));

  const go = async (actor = "user-A") => {
    await p.evaluate((a) => { localStorage.setItem("xr-actor", a); }, actor);
    await p.goto(`${BASE}/c/${wp}/questionnaires?role=principal`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle();
    const all = p.getByRole("button", { name: "Open all sections" }); if (await all.count()) { await all.click(); await settle(); }
  };
  const rowOf = (fact) => p.locator(`[data-questions] tr[data-fact="${fact}"]`).first();
  const chip = () => p.locator('[data-source-chip="pqr"]');
  const openDrawer = async (fact) => { await rowOf(fact).locator('button[aria-label^="Details of"]').click(); await p.locator("[data-fact-drawer]").waitFor(); };
  const closeDrawer = async () => { await p.keyboard.press("Escape"); await p.locator("[data-fact-drawer]").waitFor({ state: "detached" }); };
  const pqRows = () => Number(sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification`));

  // ======================================================== mark one question by hand
  await go();
  step("C4.2: the chips start at Prospect questionnaire (PQR) 0", /Prospect questionnaire \(PQR\) 0/.test(await chip().innerText()), await chip().innerText());
  await openDrawer(client.fact);
  const tick = p.locator("[data-pq-tick]");
  step("C4.2 pass: a question the questionnaire asks can be ticked in its details", await tick.isEnabled());
  await tick.check();
  await p.locator('section[aria-labelledby="d-pq"] textarea').fill("Sample: it decides whether the prospect fits this combination");
  await state("drawer-ticked");
  await p.locator("[data-drawer-save]").click();
  await p.locator("[data-fact-drawer]").waitFor({ state: "detached" }); await settle();
  await p.waitForFunction(() => /Prospect questionnaire \(PQR\) 1/.test(document.querySelector('[data-source-chip="pqr"]')?.textContent ?? ""), null, { timeout: 15000 });
  step("C4.2 pass: after Save the row says Ask and the chip counts 1", /Ask/.test(await rowOf(client.fact).innerText()));
  const saved = sql(`select status || '|' || prequalification || '|' || origin || '|' || coalesce(reason,'') from fact_source where combination_id='${wp}' and lineage_key='principal|${client.fact}' order by version desc limit 1`);
  step("C4.2 pass: the tick is a draft row of this combination's one PQR record, by a person, with the reason", saved.startsWith("DRAFT|true|HUMAN|Sample:"), saved);
  await state("row-ask");

  // ======================================================== only what the questionnaire asks
  await openDrawer(officer.fact);
  const why1 = await p.locator('section[aria-labelledby="d-pq"]').innerText();
  step("C4.2 fail: a case officer fact cannot be ticked; the drawer says why", !(await tick.isEnabled()) && /Not offered: the case officer enters it/.test(why1), why1.replace(/\s+/g, " ").slice(0, 160));
  await closeDrawer();
  await openDrawer(doc.fact);
  const why2 = await p.locator('section[aria-labelledby="d-pq"]').innerText();
  step("C4.2 fail: a fact no question asks cannot be ticked; the drawer says why", !(await tick.isEnabled()) && /needs a question to answer/.test(why2), why2.replace(/\s+/g, " ").slice(0, 160));
  step("C4.2 fail-guard: the reason shows no system key", !KEYS.test(why2), why2.match(KEYS)?.[0]);
  await state("drawer-no-question");
  await closeDrawer();
  let r = await api(`/combinations/${wp}/fact-sources/principal/${encodeURIComponent(doc.fact)}`, { method: "PUT", data: { prequalification: true, version: unasked.version } });
  step("C4.2 fail: the API refuses a tick on a fact no question asks (422, in words)", r.status === 422 && /No question asks/.test(String(r.body?.detail)) && r.body?.errors?.[0]?.field === "prequalification", `${r.status} ${r.body?.detail}`);
  r = await api(`/combinations/${wp}/fact-sources/principal/${encodeURIComponent(officer.fact)}`, { method: "PUT", data: { prequalification: true, version: officer.version } });
  step("C4.2 fail: the API refuses a tick on a case officer fact (422, in words)", r.status === 422 && /prospect is asked only what they can answer/.test(String(r.body?.detail)), `${r.status} ${r.body?.detail}`);
  step("C4.2: neither refusal wrote a row", pqRows() === 1, pqRows());

  // ======================================================== bulk: the asked one is saved, the others listed
  for (const f of [client2.fact, officer.fact, doc.fact]) await rowOf(f).locator("[data-row-tick]").check();
  step("C4.2: the bulk bar counts the 3 ticked rows", /3 selected/.test(await p.locator("[data-bulk-count]").innerText()));
  await p.locator("[data-bulk-pq]").selectOption("on"); await settle();
  await p.locator("[data-bulk-refused]").waitFor();
  const refused = await p.locator("[data-bulk-refused] li").allInnerTexts();
  step("C4.2 fail (bulk): the case officer fact and the unasked fact are listed as not changed, in words", refused.length === 2 && refused.some((t) => /case officer/.test(t)) && refused.some((t) => /No question asks/.test(t)) && !refused.some((t) => KEYS.test(t)), refused.join(" | "));
  await p.waitForFunction(() => /Prospect questionnaire \(PQR\) 2/.test(document.querySelector('[data-source-chip="pqr"]')?.textContent ?? ""), null, { timeout: 15000 });
  step("C4.2 pass (bulk): the asked question is ticked; the PQR has 2 questions", pqRows() === 2 && /Ask/.test(await rowOf(client2.fact).innerText()), pqRows());
  await state("bulk-refused");
  await p.locator("[data-note-undo]").click(); await settle();
  await p.waitForFunction(() => /Prospect questionnaire \(PQR\) 1/.test(document.querySelector('[data-source-chip="pqr"]')?.textContent ?? ""), null, { timeout: 15000 });
  step("C4.2: one Undo takes the bulk tick back (1 question again)", pqRows() === 1, pqRows());

  // ======================================================== one record per combination (P-132)
  const V = (await api(`/combinations/${vv}/fact-sources`)).body;
  step("C4.2 P-132 fail: a tick in one combination ticks nothing in another", V.counts.prequalification === 0 && sql(`select count(*) from fact_source where combination_id='${vv}'`) === "0", V.counts.prequalification);
  const K = (await api(`/combinations/${wp}/pqr/country`)).body;
  step("C4.2 P-132: the country view names the draft tick as joining at this combination's next release, not before", K.lines.length === 0 && K.thisCombination.draftAdds.length === 1 && K.thisCombination.draftAdds[0].fact === client.fact, JSON.stringify(K.thisCombination));
  r = await api(`/pqr`);
  step("C4.2 P-132 fail: there is no PQR record of its own to read", r.status === 404, r.status);

  // ======================================================== roles
  await go("user-B");
  await openDrawer(client.fact);
  step("C4.2 roles fail: the Approver reads the tick but cannot change it", !(await p.locator("[data-pq-tick]").isEnabled()) && await p.locator("[data-pq-tick]").isChecked() && await p.locator("[data-drawer-save]").count() === 0);
  await closeDrawer();
  step("C4.2 roles fail: the Approver has no row ticks for bulk changes", await p.locator("[data-row-tick]").count() === 0);
  r = await api(`/combinations/${wp}/fact-sources/principal/${encodeURIComponent(client2.fact)}`, { method: "PUT", actor: "user-B", data: { prequalification: true, version: 0 } });
  step("C4.2 roles fail: the API refuses the Approver's tick (403)", r.status === 403, r.status);

  step("no page error or console error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
