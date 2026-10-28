// W1-visual-system, three qa findings added to the slice by the Lead (28 Oct), each with a pass and a fail check.
// QA-51 (BR-7): a removal on To review names the Pathway type in its trail, so Retail and Corporate names that read the
// same are told apart. QA-52 (P-116): approving the removal of an unused name says it is removed now; an approved
// retire still says it waits for the next release. QA-54 (STANDARDS §8): a case person who opens a Studio address is
// told the page is for the configuration people, with a link to their cases, not a load error. Sample inputs, no model
// call (US$0).
//   zsh studio/tools/isolated.sh screens_qa51 4440 start && node studio/tests/check_w1_qa51_52_54.cjs 4440
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4440), BASE = `http://localhost:${PORT}`;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 240)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const main = async () => (await p.locator("main").innerText()).replace(/\s+/g, " ");

  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const load = await api("/demo/load", { method: "POST" });
  step("setup: sample inputs loaded", load.status === 201, load.status);

  // ======================================================== QA-51: the trail names the Pathway type
  const addR = await api("/structure/nodes", { method: "POST", data: { pathwayType: "INDIVIDUAL", level: "category", parentKey: "individual.visitors", label: "Visitor record", decision: "add_anyway" } });
  const addC = await api("/structure/nodes", { method: "POST", data: { pathwayType: "CORPORATE", level: "category", parentKey: "corporate.lmia", label: "Visitor record", decision: "add_anyway" } });
  const delR = await api(`/structure/nodes/${addR.body?.key}`, { method: "DELETE", data: { reason: "screens check: added by mistake" } });
  const delC = await api(`/structure/nodes/${addC.body?.key}`, { method: "DELETE", data: { reason: "screens check: added by mistake" } });
  step("C11.9 QA-51 pass: a Retail removal's trail starts with the Pathway type (API)", delR.body?.label === "Retail › Temporary residence › Visitors › Visitor record", delR.body?.label);
  step("C11.9 QA-51 fail: a Corporate name read the same way is told apart (its trail starts 'Corporate and employers ›')", /^Corporate and employers › Temporary residence › LMIA › Visitor record$/.test(delC.body?.label ?? "") && delC.body?.label !== delR.body?.label, delC.body?.label);
  await as("user-B");
  await p.goto(`${BASE}/review`); await p.waitForSelector("main h1"); await p.waitForTimeout(800);
  const list = await main();
  step("C11.9 QA-51 BR-7: To review lists the two removals with different trails", list.includes("Retail › Temporary residence › Visitors › Visitor record") && list.includes("Corporate and employers › Temporary residence › LMIA › Visitor record"), list.match(/[^.]*Visitor record[^.]*/)?.[0]);
  await p.goto(`${BASE}/review/change/${delR.body.id}`); await p.waitForSelector("main h1");
  const title = await p.locator("main h1").innerText();
  step("C11.9 QA-51: the approver's page title names the Pathway type", title === "Delete structure name: Retail › Temporary residence › Visitors › Visitor record", title);

  // ======================================================== QA-52: the approval message says what happened
  await p.getByRole("button", { name: "Approve", exact: true }).click();
  const toast = await p.getByText(/approved/).first().innerText({ timeout: 10000 }).catch(() => "");
  const goneR = !(await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.some((n) => n.key === addR.body.key);
  step("C11.9 QA-52 pass P-116: approving an unused name's removal says it is removed now, and it is", goneR && /approved and deleted/.test(toast) && !/next release/.test(toast), `removed: ${goneR}; "${toast}"`);
  const viaApi = await api(`/library/changes/${delC.body.id}/approve`, { method: "POST", actor: "user-B", data: {} });
  step("C11.9 QA-52: the approve answer carries the applied state (RELEASED), not only the decision", viaApi.status === 201 && viaApi.body?.status === "RELEASED", `${viaApi.status} ${viaApi.body?.status}`);
  const lmia = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.find((r) => r.label === "With an LMIA");
  const ret = await api(`/combinations/${lmia.combinationId}/retire`, { method: "POST", data: { reason: "screens check: retire waits for the release" } });
  await p.goto(`${BASE}/review/change/${ret.body?.id}`); await p.waitForSelector("main h1");
  await p.getByRole("button", { name: "Approve", exact: true }).click();
  const toast2 = await p.getByText(/approved/).first().innerText({ timeout: 10000 }).catch(() => "");
  const still = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.find((r) => r.combinationId === lmia.combinationId);
  step("C11.9 QA-52 fail: an approved retire is not called removed; it says it waits for the next release", ret.status === 201 && /next release/.test(toast2) && !/removed/.test(toast2) && !!still, `${ret.status}; "${toast2}"; still listed: ${!!still}`);

  // ======================================================== QA-54: a case person on a Studio address
  for (const [who, page] of [["user-O", "/"], ["user-O", "/structure"], ["user-P", "/review"]]) {
    await as(who); await p.goto(`${BASE}${page}`); await p.waitForSelector("main [role=status], main [role=alert]"); await p.waitForTimeout(1200);
    const said = await main(), menu = await p.locator("[data-menu-column]").isVisible();
    step(`C11.10 QA-54 pass: ${who === "user-O" ? "the case officer" : "a client"} opening ${page} is told it is for the configuration people, with Open your cases`, /This page is for the configuration people/.test(said) && /works on cases/.test(said) && !/could not load|Retry|restart the studio/.test(said) && (await p.getByRole("link", { name: "Open your cases" }).count()) === 1, said.slice(0, 200));
    step(`C11.10 QA-54: no Studio menu or draft line for a case person (${page})`, !menu && !(await p.getByText(/unreleased change/).count()), `menu visible: ${menu}`);
    const acting = await p.locator('header select[aria-label="Simulated person"]').evaluate((s) => s.selectedOptions[0]?.textContent ?? "");
    step(`C11.10 QA-54: the header names the person acting (${page})`, acting.startsWith(who === "user-O" ? "Case officer" : "Client A"), acting);
  }
  const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("C11.10 QA-54: the notice passes axe (WCAG 2.2 AA)", axe.violations.length === 0, axe.violations.map((v) => v.id).join(", ") || "0 violations");
  await as("user-O"); await p.goto(`${BASE}/structure`); await p.getByRole("link", { name: "Open your cases" }).click();
  await p.waitForURL(/\/cases$/); await p.waitForTimeout(1200);
  step("C11.3 QA-54: Open your cases leads to the officer's Cases", new URL(p.url()).pathname === "/cases" && /Cases/.test(await p.locator("header").innerText()), p.url());
  await as("user-A"); await p.goto(`${BASE}/`); await p.waitForSelector("[data-view]", { timeout: 30000 });
  const a = await main();
  step("C11.10 QA-54 fail: a configuration person on / sees Immigration programs, not the notice", !/This page is for the configuration people/.test(a) && (await p.locator("[data-menu-column]").isVisible()), a.slice(0, 120));

  step("no page errors", errs.length === 0, errs.join(" | ") || "none");
  console.log(`${pass}/${pass + fail} passed`);
  await b.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
