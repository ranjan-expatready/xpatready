// W1 setup checklist, slice C1 (P-161 (2), board W1-setup-checklist/design/draft-setup-checklist.html §5): "Before forms"
// at the top of the Forms tab holds step 1 (Official pages, read only until the forms lane's record, F2) and step 2 (the
// people card, moved from Questionnaires); each line's mark and words are the setup checklist's; a ?focus= link lands on
// its line (scrolled to, focused, outlined 2 s, the address cleared); the card's Resume on the people step lands there;
// Questionnaires and the Overview link to it. Sample inputs, no AI (US$0). Screenshots into
// product/screens/W1-setup-checklist/screenshots/before-forms/.
//   zsh studio/tools/isolated.sh screens_bf 4441 start && node studio/tests/check_w1_before_forms_browser.cjs 4441 xr_studio_screens_bf
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4441);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-setup-checklist", "screenshots", "before-forms"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
const MARK = { done: "✓", next: "●", todo: "○", ai: "◐", waiting: "⧗" };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const settle = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30000 }).catch(() => {});
  const go = async (url) => { await p.goto(`${BASE}${url}`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle(); };
  let n = 0;
  const shot = async (name, widths = [1440]) => {
    n++;
    for (const w of widths) {
      await p.setViewportSize({ width: w, height: w > 1100 ? 900 : 812 }); await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${name}-${w}.png`), fullPage: false });
    }
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
  };

  // ======================================================== setup: the sample
  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await api("/demo/load", { method: "POST" });
  const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows;
  const started = rows.filter((r) => r.combinationId && !r.retired);
  const sv = rows.find((r) => r.nodeKey === "individual.visitors.super_visa") ?? started[0];
  const setupOf = async (id) => (await api(`/combinations/${id}/summary`)).body.setup;

  // ======================================================== the block on Forms
  await go(`/c/${sv.combinationId}/forms`);
  const bf = p.locator("[data-before-forms]");
  await bf.locator("[data-mark]").first().waitFor({ timeout: 15000 }).catch(() => {}); await p.waitForTimeout(500);
  const s = await setupOf(sv.combinationId);
  // Every other visible part of the tab starts below the block.
  const panelFirst = await p.evaluate(() => { const panel = document.querySelector('[role="tabpanel"]'); const block = document.querySelector("[data-before-forms]"); if (!panel || !block) return { ok: false, above: ["no block"] }; const end = block.getBoundingClientRect().bottom; const above = [...panel.querySelectorAll("section, table, h2, h3, button")].filter((e) => !block.contains(e) && e.getClientRects().length && e.getBoundingClientRect().top < end).map((e) => `${e.tagName} ${(e.textContent ?? "").slice(0, 30)}`); return { ok: !above.length, above }; });
  step("P-161 (2) pass: Before forms is the first thing on the Forms tab, above the forms", await bf.count() === 1 && panelFirst.ok && /Before forms/i.test(await bf.innerText()), panelFirst.above);
  const pagesLine = bf.locator('[data-step="pages"]'), peopleLine = bf.locator('[data-step="people"]');
  step("C11.10 pass: its two lines are step 1 Official pages and step 2 Who can be in this application", await pagesLine.count() === 1 && await peopleLine.count() === 1 && /Official pages/.test(await pagesLine.innerText()) && await peopleLine.locator("[data-who-can-be]").count() === 1);
  const marks = [await pagesLine.locator("[data-mark]").getAttribute("data-mark"), await peopleLine.locator("[data-mark]").getAttribute("data-mark")];
  step("C11.10 pass: each line's mark is the setup checklist's (the card and this block never disagree)", marks[0] === s.steps[0].state && marks[1] === s.steps[1].state && (await pagesLine.innerText()).includes(MARK[s.steps[0].state]), { marks, setup: [s.steps[0].state, s.steps[1].state] });
  step("C11.10 pass: the Official pages line says the step's words (read only until the forms lane's record)", (await pagesLine.innerText()).includes(s.steps[0].summary) && await pagesLine.getByRole("button").count() === 0, await pagesLine.innerText());
  const who = peopleLine.locator("[data-who-can-be]");
  step("P-147 §3 pass: the people card is folded to one line with Show and edit (moved, not rebuilt)", await who.getAttribute("data-folded") !== null && await who.getByRole("button", { name: "Show and edit" }).count() === 1);
  const words = await who.locator("[data-people-words]").innerText();
  step("P-161 (2) pass: the folded line says who in the board's plain words, e.g. \"Principal applicant (always)\"", /Principal applicant \(always\)/.test(words) && words.split(" · ").every((w) => /\((always|optional)\)$/.test(w.replace(/^· /, ""))), words);
  step("P-161 (2) fail case: no exact counts on the folded line (\"exactly\", \"0 to 1\": they stay in Show and edit)", !/exactly|\d to \d/.test(words), words);
  // #139 review: a role whose most is 0 cannot be in the application, so the folded line leaves it out (not "(optional)").
  const zeroUrl = /\/api\/combinations\/[^/]+\/workspace\?tab=forms/;
  let zeroLabel = null;
  await p.route(zeroUrl, async (route) => { const r = await route.fetch(); const j = await r.json(); const l = j.people?.lines?.find((x) => x.min === 0 && x.max > 0); if (l) { l.max = 0; zeroLabel = l.label ?? l.role; } await route.fulfill({ response: r, json: j }); });
  await p.reload(); await settle();
  const zeroWords = await peopleLine.locator("[data-who-can-be] [data-people-words]").innerText().catch(() => "");
  await p.unroute(zeroUrl); await p.reload(); await settle();
  step("#139 review fail case: a role allowed 0 times is not listed as \"(optional)\" on the folded line", zeroLabel !== null && zeroWords.split(" · ").length === words.split(" · ").length - 1, { zeroLabel, words, zeroWords });
  await shot("forms-before-forms");
  await who.getByRole("button", { name: "Show and edit" }).click(); await settle();
  step("P-147 §3: Show and edit opens the full table there", await p.locator("[data-who-can-be] table").count() === 1 && await p.locator('[data-who-can-be] [data-person="principal"]').count() === 1);
  await shot("forms-before-forms-people-open");
  const axe = await new AxeBuilder({ page: p }).include("[data-before-forms]").analyze();
  step("STANDARDS a11y: no serious or critical axe finding in Before forms", !axe.violations.some((v) => v.impact === "serious" || v.impact === "critical"), axe.violations.map((v) => v.id).join(", "));

  // ======================================================== ?focus= lands on its line
  await go(`/c/${sv.combinationId}/forms?focus=people%3Acard`);
  await p.locator('[data-step="people"][data-focused]').waitFor({ timeout: 8000 }).catch(() => {});
  const landed = await p.evaluate(() => { const el = document.querySelector('[data-step="people"]'); return { outlined: el?.hasAttribute("data-focused"), focused: !!el && (el === document.activeElement || el.contains(document.activeElement)), focusInUrl: new URLSearchParams(location.search).has("focus"), ring: el ? getComputedStyle(el).boxShadow : null }; });
  step("C11.10 pass: ?focus=people:card lands on the people line: focused and outlined, the address cleared", landed.outlined && landed.focused && !landed.focusInUrl && !!landed.ring && landed.ring !== "none", landed);
  await shot("focus-people-landed");
  await p.waitForTimeout(2300);
  step("C11.10: the outline goes after 2 s", !(await p.locator('[data-step="people"]').evaluate((el) => el.hasAttribute("data-focused"))));
  const peopleDone = s.steps[1].state === "done";
  step(`C11.10 ${peopleDone ? "pass" : "fail case"}: "This was done since you opened it." only when the step is done (people: ${s.steps[1].state})`, (await p.getByText("This was done since you opened it.").count() === 1) === peopleDone);
  await go(`/c/${sv.combinationId}/forms?focus=pages%3Arecord`);
  await p.locator('[data-step="pages"][data-focused]').waitFor({ timeout: 8000 }).catch(() => {});
  step("C11.10 fail case: an Official pages step not done never says it was done since you opened it", s.steps[0].state === "done" || await p.getByText("This was done since you opened it.").count() === 0, s.steps[0].state);
  step("C11.10 pass: ?focus=pages:record lands on the Official pages line", await p.locator('[data-step="pages"]').evaluate((el) => el === document.activeElement || el.hasAttribute("data-focused")));

  // ======================================================== the card's Resume on the people step
  let target = null;
  for (const r of started) { const c = await setupOf(r.combinationId); if (c?.next?.step === "people") { target = { r, c }; break; } }
  // Since N8 (#122) step 1 waits for its checklist page to be confirmed, so on the sample every started combination's
  // next step is Official pages: confirm the matching page on one (as the author, as check_official_pages does).
  for (const r of started) {
    if (target) break;
    const op = (await api(`/combinations/${r.combinationId}/official-pages`)).body;
    const match = op?.candidates?.find((x) => x.match);
    if (!match || (await api(`/combinations/${r.combinationId}/official-pages/confirm`, { method: "POST", data: { attachmentId: match.id } })).status >= 300) continue;
    const c = await setupOf(r.combinationId); if (c?.next?.step === "people") target = { r, c };
  }
  if (!target) {
    const ns = rows.find((r) => !r.combinationId && !r.retired);
    const made = ns ? await api("/combinations", { method: "POST", data: { nodeKey: ns.nodeKey } }) : null;
    const id = made?.body?.id ?? made?.body?.combinationId;
    if (id) { const c = await setupOf(id); if (c?.next?.step === "people") target = { r: { ...ns, combinationId: id }, c }; }
  }
  step("C11.10 pass: a combination whose next step is people links to Forms, focus people:card", !!target && target.c.next.href === `/c/${target.r.combinationId}/forms?focus=people%3Acard`, target?.c?.next?.href);
  if (target) {
    await p.goto(`${BASE}/?f=all&q=${encodeURIComponent(target.r.label)}`);
    const card = p.locator(`article[data-node="${target.r.nodeKey}"]`);
    await card.waitFor({ timeout: 20000 }).catch(() => {});
    await card.getByRole("button", { name: "Resume setup" }).or(card.getByRole("link", { name: "Resume setup" })).first().click().catch(() => {});
    await p.waitForURL(/\/c\/[0-9a-f-]+\/forms/, { timeout: 15000 }).catch(() => {});
    await p.locator('[data-step="people"][data-focused]').waitFor({ timeout: 8000 }).catch(() => {});
    step("C11.10 pass: the card's Resume setup lands on Forms with the people line outlined (P-161 (2), the 30 Oct interim reverted)", /\/forms$/.test(new URL(p.url()).pathname) && await p.locator('[data-step="people"][data-focused]').count() === 1, p.url());
    step("C11.10 fail case: it never lands on Questionnaires", !/questionnaires/.test(p.url()));
    await shot("resume-lands-on-people");
  }

  // ======================================================== Questionnaires and Overview link to it
  await go(`/c/${sv.combinationId}/questionnaires`);
  const moved = p.locator("[data-who-can-be-moved]");
  step("P-161 (2) pass: Questionnaires no longer holds the people card; one line names the people and links to Forms", await p.locator("[data-who-can-be]").count() === 0 && await moved.getByRole("link", { name: "Change on Forms" }).count() === 1);
  await shot("questionnaires-pointer");
  await moved.getByRole("link", { name: "Change on Forms" }).click();
  await p.waitForURL(/\/forms/); await p.locator('[data-step="people"][data-focused]').waitFor({ timeout: 8000 }).catch(() => {});
  step("P-161 (2) pass: following it lands on the people line on Forms", await p.locator('[data-step="people"][data-focused]').count() === 1);
  await go(`/c/${sv.combinationId}/overview`);
  step("P-161 (2) pass: the Overview's people line says Change on Forms (C3 removes it there)", await p.getByRole("link", { name: "Change on Forms" }).count() === 1 && await p.getByRole("link", { name: "Change in Questionnaires" }).count() === 0);

  // ======================================================== read only, and save from Forms
  await as("user-B"); await go(`/c/${sv.combinationId}/forms`);
  await p.locator("[data-who-can-be]").getByRole("button", { name: "Show and edit" }).click().catch(() => {});
  step("read only: the approver sees no Edit or Undo on the people card in Before forms", await p.locator("[data-who-can-be]").getByRole("button", { name: /^(Edit|Undo|Fill from the guide)$/ }).count() === 0);
  await as("user-A");
  step("no page errors in the walk", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
