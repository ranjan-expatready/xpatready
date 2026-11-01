// QA-119 (qa #208, Major; C11.10, P-157, P-161 (1)): one page, one next step. The combination header's "Next step" takes
// the setup checklist's next item on every combination in setup, so the header, the Overview strip (● Next) and the tab
// badges agree on every sample combination. A forms item with no landing place yet opens the Forms tab (no `?focus=`
// nothing answers). Also the two X1 C3 follow-ups: the strip's "could not be loaded · Retry" state and the sure/not-sure
// tooltip. Walked in a real browser as the configuration author and the immigration expert; axe (WCAG 2.2 AA). US$0.
//   zsh studio/tools/isolated.sh screens_q119 4442 start && node studio/tests/check_qa119_next_step_browser.cjs 4442 xr_studio_screens_q119
const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { nextStepHref, itemHref, tabOfFocus, LANDED_FOCUS } = require("../contracts/setup-checklist.ts");
const PORT = Number(process.argv[2] ?? 4442);
const BASE = `http://localhost:${PORT}`;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail.slice(0, 300) : JSON.stringify(detail).slice(0, 300)}` : ""}`); };

(async () => {
  // ---------------------------------------------------------------- pure rule: where the header's step goes
  const nx = (kind, focus, st) => ({ item: { kind, focus }, step: st });
  step("C11.10 QA-119 (rule): a forms item with no landing place yet (Map forms) opens the Forms tab itself", nextStepHref("c1", nx("map_forms", "forms:lines", "forms"), "forms") === "/c/c1/forms");
  step("C11.10 QA-119 (rule): every forms key without a place (sources, lines, problems, held, finder) opens the plain Forms tab", ["forms:sources", "forms:lines", "forms:problems", "forms:held", "forms:finder"].every((f) => nextStepHref("c1", nx("add_forms_found", f, "forms"), "forms") === "/c/c1/forms"));
  step("C11.10 QA-119 fail (rule): an item that has a landing place keeps its ?focus= (Official pages, people, documents, gaps)", nextStepHref("c1", nx("confirm_pages", "pages:record", "pages"), "forms") === itemHref("c1", "pages", "forms", { kind: "confirm_pages", focus: "pages:record" }) && nextStepHref("c1", nx("confirm_people", "people:card", "people"), "forms").endsWith("?focus=people%3Acard") && nextStepHref("c1", nx("unasked", "questionnaires:gaps", "questions_documents"), "documents") === "/c/c1/questionnaires?focus=questionnaires%3Agaps");
  step("C11.10 QA-119 fail (rule): a proposal still opens the review queue, never a tab", nextStepHref("c1", nx("review_proposals", "review:forms", "forms"), "forms") === "/review/proposals?c=c1&step=3");

  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of [45]\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, actor = "user-A", init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": actor, "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const actAs = async (actor) => { await p.goto(BASE); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  await actAs("user-A");
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", "user-A", { method: "POST" })).status === 201);
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const header = () => p.locator("[data-header-next]");
  const openOverview = async (id) => { await p.goto(`${BASE}/c/${id}/overview`); await p.locator("[data-setup-strip]").waitFor({ timeout: 15000 }); await header().waitFor({ timeout: 15000 }); };
  const combos = [];
  for (const pw of ["INDIVIDUAL", "CORPORATE"]) for (const r of (await api(`/catalogue?pathway=${pw}&filter=all`)).body.rows) if (r.combinationId) combos.push(r);
  step("setup: the sample has combinations in setup to compare", combos.filter((r) => r.setup?.next).length >= 5, combos.map((r) => r.label));

  // ---------------------------------------------------------------- every sample combination: header = strip = badges
  for (const actor of ["user-A", "user-C"]) {
    await actAs(actor);
    const bad = [];
    let checked = 0;
    for (const r of combos) {
      const sum = (await api(`/combinations/${r.combinationId}/summary`, actor)).body;
      const nx = sum.setup?.next;
      await openOverview(r.combinationId);
      const h = { focus: await header().getAttribute("data-header-next"), text: (await header().innerText()).replace(/\s+/g, " ") };
      if (!nx) { if (h.focus !== "" || !/Nothing to do/.test(h.text)) bad.push(`${r.label}: no next item but the header says ${h.text}`); continue; }
      checked++;
      // The strip's current row (● Next, or ⧗ waiting for this viewer) is the header's step, and its first item is the header's item.
      const cur = await p.locator(`[data-step-row="${nx.step}"]`).getAttribute("data-mark");
      const firstItem = await p.locator(`[data-step-row="${nx.step}"] [data-open-item]`).first().getAttribute("data-open-item").catch(() => null);
      const marked = await p.locator('[data-step-row][data-mark="next"], [data-step-row][data-mark="waiting"], [data-step-row][data-mark="ai"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-step-row")));
      if (h.focus !== nx.item.focus) bad.push(`${r.label}: header ${h.focus} vs checklist ${nx.item.focus}`);
      if (!h.text.includes(nx.item.text)) bad.push(`${r.label}: header words "${h.text}" lack "${nx.item.text}"`);
      if (!["next", "waiting", "ai"].includes(cur) || marked[0] !== nx.step) bad.push(`${r.label}: strip marks ${marked.join(",")} (${cur}) vs header step ${nx.step}`);
      if (firstItem !== nx.item.focus) bad.push(`${r.label}: strip's first item ${firstItem} vs header ${nx.item.focus}`);
      if (r.nextAction && r.nextAction.label !== nx.item.text && h.text.includes(r.nextAction.label)) bad.push(`${r.label}: the header still shows the catalogue's "${r.nextAction.label}"`);
      // The badge of the tab the header's item lands on counts it.
      const tab = tabOfFocus(nx.item.focus, sum.setup.steps.find((s) => s.key === nx.step).tab);
      if (tab) { const n = Number(await p.getByRole("tablist", { name: "Combination" }).locator(`a[href$="/${tab}"] [data-step-badge]`).getAttribute("data-step-badge").catch(() => "0")); if (n < nx.item.count) bad.push(`${r.label}: ${tab} badge ${n} < header item's ${nx.item.count}`); }
      // A button only for the person whose item it is; otherwise who it waits for.
      const btn = await header().locator("[data-next-step]").count();
      const mine = nx.item.kind === "view_ai" || sum.setup.viewer?.filled;
      if (mine ? btn !== 1 : btn !== 0 || !h.text.includes(sum.setup.viewer.nextLine)) bad.push(`${r.label}: as ${actor} button=${btn} filled=${sum.setup.viewer?.filled} "${h.text}"`);
    }
    step(`C11.10 QA-119 (${actor}): on every sample combination the header's Next step is the checklist's next item, the strip's ● Next row and its first item, and its tab badge counts it`, bad.length === 0 && checked >= 5, bad.length ? bad : `${checked} combinations`);
  }

  // ---------------------------------------------------------------- the qa finding itself, on Super visa
  const sv = combos.find((r) => r.label === "Super visa");
  await actAs("user-A"); await openOverview(sv.combinationId);
  const svHead = (await header().innerText()).replace(/\s+/g, " ");
  step("C11.10 QA-119 fail: Super visa's header no longer says 'Add 1 form from the library' while the strip says Choose the checklist page", !/Add 1 form from the library/.test(svHead) && /Choose the checklist page/.test(svHead), svHead);
  step("C11.10 QA-119: for the configuration author the expert's item says who it waits for, with no button, and a link to where it is", /Waiting for the immigration expert: Choose the checklist page/.test(svHead) && await header().locator("[data-next-step]").count() === 0 && /\/forms\?focus=pages%3Arecord$/.test(await header().getByRole("link", { name: "See it on Forms" }).getAttribute("href")), svHead);
  await axe("the combination header with a waiting step (author)");
  await actAs("user-C"); await openOverview(sv.combinationId);
  const go = header().locator('[data-next-step="choose_pages"]');
  step("C11.10 QA-119: for the immigration expert the same item is the header's one button, in the strip's words", (await go.innerText()).trim() === "Choose the checklist page");
  await go.click(); await p.waitForURL(/\/forms/);
  await p.waitForFunction(() => document.activeElement?.getAttribute("data-focus") === "pages:record", null, { timeout: 10000 }).catch(() => undefined);
  step("C11.10 QA-119: the button lands on Official pages in Before forms (focused)", await p.evaluate(() => document.activeElement?.getAttribute("data-focus")) === "pages:record");
  await axe("the combination header with the expert's button");

  // ---------------------------------------------------------------- a forms item with no landing place opens the Forms tab
  // Visitor visa: confirm its one matching page and save its people, so the next item is a Forms one (forms:sources).
  await actAs("user-A");
  const vv = combos.find((r) => r.label === "Visitor visa").combinationId;
  const pages = (await api(`/combinations/${vv}/official-pages`)).body;
  await api(`/combinations/${vv}/official-pages/confirm`, "user-A", { method: "POST", data: { attachmentId: pages.candidates.find((c) => c.match).id } });
  const pe = (await api(`/combinations/${vv}/workspace?tab=questionnaires`)).body.people;
  const saved = await api(`/combinations/${vv}/people`, "user-A", { method: "PATCH", data: { participants: pe.lines.map((x) => ({ role: x.role, min: x.min, max: x.max, applies: x.applies, ...(x.quote ? { quote: x.quote } : {}), ...(x.origin ? { origin: x.origin } : {}) })), version: pe.version } });
  const vvSum = (await api(`/combinations/${vv}/summary`)).body;
  step("setup: Visitor visa's next item is now a Forms item with no landing place", saved.status === 200 && vvSum.setup.next?.step === "forms" && !LANDED_FOCUS.includes(vvSum.setup.next.item.focus), { saved: saved.status, next: vvSum.setup.next?.item });
  await openOverview(vv);
  const vvBtn = header().locator("[data-next-step]");
  const vvWords = (await vvBtn.innerText()).trim();
  step("C11.10 QA-119: the header's Forms step is the strip's ● Next item in the checklist's words", vvWords === vvSum.setup.next.item.text && (await p.locator('[data-step-row="forms"]').getAttribute("data-mark")) === "next", vvWords);
  if (vvSum.setup.next.item.kind === "add_forms_found" && vvSum.row.nextAction?.kind === "add_from_library") {
    await vvBtn.click();
    await p.waitForFunction((t) => document.querySelector("[data-header-next]")?.textContent?.includes(t) === false, vvWords, { timeout: 10000 });
    const after = (await api(`/combinations/${vv}/summary`)).body;
    step("C11.10 QA-119: 'Add 1 form found' adds the form from the library, as the Programs list's step does; the header moves on to the checklist's new next", !after.setup.steps.find((s) => s.key === "forms").open.some((i) => i.kind === "add_forms_found") && (await header().getAttribute("data-header-next")) === (after.setup.next?.item.focus ?? ""), after.setup.next?.item);
  } else step("C11.10 QA-119: the header's forms item is a link to the plain Forms tab", (await vvBtn.getAttribute("href")) === `/c/${vv}/forms`, await vvBtn.getAttribute("href"));
  const after = (await api(`/combinations/${vv}/summary`)).body;
  if (after.setup.next && after.setup.next.step === "forms" && !LANDED_FOCUS.includes(after.setup.next.item.focus) && !(after.setup.next.item.kind === "map_forms" && after.row.nextAction?.kind === "draft_ai")) {
    step("C11.10 QA-119: a Forms item with no landing place links to the Forms tab without ?focus=", (await header().locator("[data-next-step]").getAttribute("href")) === `/c/${vv}/forms`);
  } else if (after.setup.next?.item.kind === "map_forms") {
    await header().locator('[data-next-step="map_forms"]').click();
    step("C11.10 QA-119: 'Map n forms' (Draft with AI) opens the cost-checked AI launch, as before; nothing runs until Start", await p.getByRole("dialog").filter({ hasText: /Draft setup|worst case|Start/ }).count() > 0);
    await p.keyboard.press("Escape");
  }
  await p.screenshot({ path: "/tmp/qa119-forms-next.png" });

  // ---------------------------------------------------------------- X1 follow-ups: sure/not-sure tooltip, load error + Retry
  await openOverview(vv);
  const tier = p.locator("[data-tier-tip]").first();
  step("X1 follow-up: a confirmed step's tier words carry the sure/not-sure tooltip (keyboard reachable)", await tier.count() === 1 && (await tier.getAttribute("tabindex")) === "0");
  await tier.focus();
  const tipText = await p.getByRole("tooltip").first().innerText({ timeout: 5000 }).catch(() => "");
  step("X1 follow-up: the tooltip says who confirms what (concept v4 copy)", /configuration author confirms what the rules or both AI readings agree on; anything else waits for the immigration expert/.test(tipText), tipText);
  step("X1 follow-up fail: a step nobody confirmed has no tier tooltip", await p.locator('[data-step-row="forms"] [data-tier-tip]').count() === 0);
  await axe("the Overview with the tier tooltip open");
  // The summary fails: the strip says so and offers Retry; Retry brings the strip back once the studio answers.
  let failing = true;
  await p.route(/\/api\/combinations\/[^/]+\/summary/, (route) => failing ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "boom" }) }) : route.continue());
  await p.goto(`${BASE}/c/${vv}/overview`);
  const err = p.locator("[data-setup-strip-error]");
  await err.waitFor({ timeout: 30000 }).catch(() => undefined);
  step("X1 follow-up: a failed summary shows 'The setup steps could not be loaded · Retry', not an endless Loading", await err.count() === 1 && /The setup steps could not be loaded · Retry/.test(await err.innerText()) && await p.locator("[data-setup-strip-loading]").count() === 0);
  failing = false;
  await err.getByRole("button", { name: "Retry" }).click();
  await p.locator("[data-setup-strip]").waitFor({ timeout: 15000 }).catch(() => undefined);
  step("X1 follow-up: Retry loads the strip once the studio answers", await p.locator("[data-setup-strip]").count() === 1 && await err.count() === 0);
  await p.unroute(/\/api\/combinations\/[^/]+\/summary/);

  step("no page errors", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
