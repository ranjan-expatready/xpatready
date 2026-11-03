// W1-visual-system round 3, R3b: Immigration programs' top (P-128 (4)(5); board W1-visual-system/design/
// draft-r3-immigration-programs-top.html option P2), walked in a real browser at 1440 and 1024 px. The filter bar is the
// same pattern as Program structure: Pathway chips with counts and need you, Program, Status, Needs you, active-filter
// chips and Clear all, kept in the address. "Add combination" opens the one "Add to Program structure" pop-up here,
// prefilled from the tab and filters; the new card shows in place, Just added and Not started, and a filter that would
// hide it is cleared; a reader cannot add. Sample inputs plus one saved AI replay (US$0, so "need you" is not zero).
// Screenshots into product/screens/W1-visual-system/screenshots/programs/, axe (WCAG 2.2 AA) on each.
// Card v4 (P-180): Status is a row of chips (data-status-chip), the new card says "0 of 5 steps" (data-state NOT_STARTED)
// and Just added is a 2 s outline on the card itself, so the new card is found by its name.
//   zsh studio/tools/isolated.sh screens_pr3 4434 start && node studio/tests/check_w1_programs_r3.cjs 4434 xr_studio_screens_pr3
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4434), DB = process.argv[3] ?? "xr_studio_screens_pr3";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-visual-system", "screenshots", "programs"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector("[data-view], [data-slot='empty-state']"), null, { timeout: 30000 });
  const open = async (qs = "") => { await p.goto(`${BASE}/${qs}`); await ready(); await p.waitForTimeout(300); };
  const chip = (name) => p.locator("[data-pathway-chips]").getByRole("button", { name: new RegExp(`^${name}`) });
  const cards = () => p.locator("article[data-node]");
  const dialog = () => p.locator("[data-add-dialog]");
  const field = (lv) => p.locator(`[data-field="${lv}"] input[role="combobox"]`);
  let n = 0;
  const state = async (name, opts = {}) => {
    n++; const base = `r3-${String(n).padStart(2, "0")}-${name}`;
    await p.waitForTimeout(400);
    if (!opts.dialog) await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: !opts.dialog });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(150);
    if (!opts.dialog) await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: !opts.dialog });
    step(`1024 px: ${name} has no sideways scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup: sample inputs and one saved AI replay (something needs you)
  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await api("/demo/load", { method: "POST" });
  const cat0 = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body;
  const sv = cat0.rows.find((r) => r.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  let cat = cat0;
  for (let i = 0; i < 60; i++) { cat = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body; if (cat.rows.find((r) => r.nodeKey === sv.nodeKey).aiProposals > 0) break; await p.waitForTimeout(500); }
  const needsYou = cat.rows.filter((r) => r.needsYou).length;
  step("setup: Sample inputs; Super visa has AI proposals waiting, so something needs you", needsYou >= 1, `${needsYou} need you`);

  // ======================================================== the filter bar (P-128 (4), board P2)
  await open();
  step("C11.10 P-128 (4): no Pathway cards and no '+ Add pathway'; one filter bar with Pathway chips, Program, Status chips and Needs you", await p.locator("[data-pathway-cards]").count() === 0 && await p.getByRole("button", { name: /Add pathway/ }).count() === 0 && await p.locator("[data-filter-bar] [data-pathway-chips]").count() === 1 && await p.locator("[data-program-filter]").count() === 1 && await p.locator("[data-status-chips] [data-status-chip]").count() >= 4 && await p.locator("[data-needs-you]").count() === 1);
  const chipCounts = await p.locator("[data-pathway-chip]").evaluateAll((a) => a.map((x) => `${x.getAttribute("data-pathway-chip")}:${x.querySelector("[data-count]")?.textContent}:${parseInt(x.querySelector("[data-need]")?.textContent ?? "0", 10)}`));
  const want = ["all:" + cat.rows.filter((r) => !r.retired).length + ":" + needsYou, ...cat.sections.map((s) => `${s.pathwayKey}:${s.combinations}:${s.needs}`)];
  step("C11.10 R3-6: the chips' counts and need-you counts are the catalogue's", JSON.stringify(chipCounts) === JSON.stringify(want), `${chipCounts.join(" ")} vs ${want.join(" ")}`);
  step("C11.10 R3-6: Needs you shows how many wait on a person", (await p.locator("[data-needs-you]").innerText()).replace(/\s+/g, " ").trim() === `${needsYou} combination${needsYou === 1 ? " needs" : "s need"} you`  /* QA-179 */, await p.locator("[data-needs-you]").innerText());
  await state("filter-bar");
  await p.locator("[data-needs-you]").click();
  await p.waitForFunction((k) => document.querySelectorAll("article[data-node]").length === k, needsYou, { timeout: 8000 }).catch(() => undefined);
  step("C11.10 R3-6 pass: Needs you leaves only the combinations waiting on a person; it shows as a chip", await cards().count() === needsYou && await p.locator(`article[data-node="${sv.nodeKey}"]`).count() === 1 && /Needs you/.test(await p.locator("[data-active-filters]").innerText()), await cards().count());
  await p.locator("[data-needs-you]").click();
  await p.waitForFunction((k) => document.querySelectorAll("article[data-node]").length === k, cat.rows.filter((r) => !r.retired).length, { timeout: 8000 }).catch(() => undefined);
  step("C11.10 R3-6 fail-guard: off again, every combination is back", await cards().count() === cat.rows.filter((r) => !r.retired).length && await p.locator("[data-active-filters]").count() === 0);
  const tr = cat.sections[0];
  await chip(tr.label).click(); await p.waitForFunction((k) => new URLSearchParams(location.search).get("p") === k, tr.pathwayKey);
  await p.waitForFunction((k) => document.querySelectorAll("[data-section]").length === 1, null, { timeout: 8000 }).catch(() => undefined);
  const progs = (await api(`/catalogue?pathway=INDIVIDUAL&filter=all&pathwayKey=${encodeURIComponent(tr.pathwayKey)}`)).body.programs;
  const wp = progs.find((x) => x.label === "Work permits");
  await p.locator("[data-program-filter]").selectOption(wp.key);
  await p.waitForFunction((k) => new URLSearchParams(location.search).get("prog") === k, wp.key);
  await p.waitForFunction((k) => document.querySelectorAll("article[data-node]").length === k, wp.combinations, { timeout: 8000 }).catch(() => undefined);
  const chipsText = (await p.locator("[data-active-filters]").innerText()).replace(/\s+/g, " ");
  step("C11.10 R3-6: a Pathway chip and a Program leave that Program's cards; both show as chips with Clear all", await cards().count() === wp.combinations && chipsText.includes(tr.label) && chipsText.includes("Work permits") && /Clear all/.test(chipsText), `${await cards().count()} cards · ${chipsText}`);
  await p.reload(); await ready(); await p.waitForTimeout(300);
  step("C11.10 P-115: the filters live in the address and survive a reload", await cards().count() === wp.combinations && (await chip(tr.label).getAttribute("aria-pressed")) === "true");
  await state("filtered");

  // ======================================================== Add combination: the one pop-up, here (P-128 (5))
  await p.locator("[data-add-combination]").click(); await dialog().waitFor();
  await p.waitForFunction(() => !!document.querySelector('[data-field="pathway"] input')?.value, null, { timeout: 8000 }).catch(() => undefined); // the pop-up's list loads first
  step("C11.3 P-128 (5): Add combination opens the Add to Program structure pop-up here, prefilled with the Pathway and Program filters", new URL(p.url()).pathname === "/" && (await field("pathway").inputValue()) === tr.label && (await field("program").inputValue()) === "Work permits", `${new URL(p.url()).pathname} · ${await field("pathway").inputValue()} · ${await field("program").inputValue()}`);
  await p.waitForTimeout(300);
  step("C11.3 AD-8: it starts at the first empty level (Category)", await field("category").evaluate((e) => e === document.activeElement));
  await p.getByRole("button", { name: "Cancel" }).click(); await dialog().waitFor({ state: "detached" });
  // Lead review follow-up: a Program filter alone (no Pathway in the address) still fills the Pathway above it.
  await open(`?prog=${encodeURIComponent(wp.key)}`);
  await p.locator("[data-add-combination]").click(); await dialog().waitFor();
  await p.waitForFunction(() => !!document.querySelector('[data-field="program"] input')?.value, null, { timeout: 8000 }).catch(() => undefined);
  step("C11.3 R3-7 fail-guard: a Program filter alone prefills its Pathway too, so Category is open", (await field("pathway").inputValue()) === tr.label && (await field("program").inputValue()) === "Work permits" && !(await field("category").isDisabled()), `${await field("pathway").inputValue()} · ${await field("program").inputValue()}`);
  await field("category").fill("Temporary resident permit (test)"); await p.waitForTimeout(500);
  await state("add-combination-pop-up", { dialog: true });
  await p.locator("[data-add-submit]").click(); await dialog().waitFor({ state: "detached" });
  const added = p.locator('article[data-node][data-label="Temporary resident permit (test)"]');
  await added.first().waitFor({ timeout: 10000 }).catch(() => undefined);
  step("C11.3 P-128 (5) / AD-7 / P-180: the new card shows in place, Not started (\"0 of 5 steps\"); no setup started", await added.count() === 1 && (await added.getAttribute("data-state")) === "NOT_STARTED" && /0 of 5 steps/.test(await added.innerText()) && sql("select count(*) from combination c join program_def d on d.id = c.program_def_id where d.label = 'Temporary resident permit (test)'") === "0");
  step("C11.3 S1-finish: what was added is said on the page, never in a toast", /Added Retail › Temporary residence › Work permits › Temporary resident permit \(test\): listed here as Not started; no setup started\./.test(await p.locator("[data-page-note]").innerText()) && await p.locator("div.fixed.bottom-4.right-4 > div").count() === 0, await p.locator("[data-page-note]").innerText().catch(() => ""));
  await state("after-add");
  await p.locator('[data-status-chip="live"]').click();
  await p.waitForFunction(() => new URLSearchParams(location.search).get("f") === "live");
  await p.locator("[data-add-combination]").click(); await dialog().waitFor();
  await field("category").fill("Hidden by the filter (test)"); await p.waitForTimeout(500);
  await p.locator("[data-add-submit]").click(); await dialog().waitFor({ state: "detached" });
  await p.waitForFunction(() => !new URLSearchParams(location.search).get("f"), null, { timeout: 8000 }).catch(() => undefined);
  const hidden = p.locator('article[data-node][data-label="Hidden by the filter (test)"]');
  await hidden.first().waitFor({ timeout: 8000 }).catch(() => undefined);
  step("C11.3 board P2 'After Add': a Status filter that would hide the new card is cleared, so it shows in place", !new URLSearchParams(new URL(p.url()).search).get("f") && await hidden.count() === 1, p.url());
  await chip(tr.label).click(); await p.locator("[data-needs-you]").click();
  await p.locator("[data-clear-all]").click();
  await p.waitForFunction(() => !/[?&](p|prog|f|n|q)=/.test(location.search));
  await p.waitForFunction((k) => document.querySelectorAll("article[data-node]").length === k, cat.rows.filter((r) => !r.retired).length + 2, { timeout: 8000 }).catch(() => undefined);
  step("C11.10 R3-6: Clear all brings back every combination of the tab", await cards().count() === cat.rows.filter((r) => !r.retired).length + 2, await cards().count());

  // ======================================================== a reader cannot add
  await as("user-B"); await open();
  step("BR-15: for the approver Add combination is off, with the reason; no pop-up can open", await p.locator("[data-add-combination]").isDisabled() && await dialog().count() === 0);
  step("BR-15 server: the approver's add is refused (403)", (await api("/structure/path", { method: "POST", actor: "user-B", data: { pathwayType: "INDIVIDUAL", pathway: { key: tr.pathwayKey }, program: { key: wp.key }, category: { label: "Approver try (test)" } } })).status === 403);
  await as("user-A");

  step("no page errors", errs.length === 0, errs.join(" | ") || "none");
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
