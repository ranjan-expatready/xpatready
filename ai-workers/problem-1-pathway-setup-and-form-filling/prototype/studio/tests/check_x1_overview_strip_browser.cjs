// X1, W1 setup checklist slice C3 (concept v4 §7 "Overview", board v3 §5): the Overview's setup strip replaces "Missing
// before firms can use it", and the people card leaves the Overview (P-161 (2): it sits in "Before forms" on Forms).
// Five rows read from the summary's checklist (never recounted), each open item a link to where it is done (itemHref,
// one definition with the engine's next.href), and the tab badges equal the strip. Walked in a real browser as the
// configuration author and as the immigration expert; axe (WCAG 2.2 AA). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_x1c 4441 start && node studio/tests/check_x1_overview_strip_browser.cjs 4441 xr_studio_screens_x1c
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { itemHref, tabCounts, STEP_KEYS } = require("../contracts/setup-checklist.ts");
const PORT = Number(process.argv[2] ?? 4441), DB = process.argv[3] ?? "xr_studio_screens_x1c";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "F1-setup", "screenshots", "x1-strip"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail.slice(0, 240) : JSON.stringify(detail).slice(0, 240)}` : ""}`); };

(async () => {
  // ---------------------------------------------------------------- pure rule: where an item's link goes
  const it = (kind, focus) => ({ kind, focus });
  step("C11.10 X1 C3 (rule): a questions problem in step 4 lands on Smart questionnaire (SQR) even when the step's tab is Documents", itemHref("c1", "questions_documents", "documents", it("fix_problems", "questionnaires:problems")) === "/c/c1/questionnaires?focus=questionnaires%3Aproblems");
  step("C11.10 X1 C3 (rule): a proposal opens the review queue filtered to the combination and step; AI progress opens the jobs page", itemHref("c1", "forms", "forms", it("review_proposals", "review:forms")) === "/review/proposals?c=c1&step=3" && itemHref("c1", "forms", "forms", it("view_ai", "ai:b1")) === "/c/c1/jobs");
  step("C11.10 X1 C3 fail (rule): a key no tab answers (release items) stays on the step's own tab, never a made-up one", itemHref("c1", "release", "review", it("submit", "review:submit")) === "/c/c1/review?focus=review%3Asubmit" && itemHref("c1", "release", "review", it("fix_problems", "release:problems")) === "/c/c1/review?focus=release%3Aproblems");

  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, actor = "user-A", init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": actor, "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const actAs = async (actor) => { await p.goto(BASE); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  await actAs("user-A");
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", "user-A", { method: "POST" })).status === 201);
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const strip = () => p.locator("[data-setup-strip]");
  const openOverview = async (id) => { await p.goto(`${BASE}/c/${id}/overview`); await strip().waitFor({ timeout: 15000 }); };
  const rows = () => p.locator("[data-step-row]").evaluateAll((els) => els.map((e) => ({ key: e.getAttribute("data-step-row"), mark: e.getAttribute("data-mark"), summary: e.querySelector("[data-step-summary]")?.textContent ?? "", open: e.querySelector("[data-step-open]")?.textContent ?? "" })));

  // ---------------------------------------------------------------- Visitor visa as the configuration author
  const vv = sql("select id from combination where combination_key='vv.single'");
  const vvSum = (await api(`/combinations/${vv}/summary`)).body;
  await openOverview(vv);
  const vvRows = await rows();
  step("C11.10 X1 C3: the Overview shows five steps in order, each mark and summary as the checklist says (never recounted)", vvRows.length === 5 && vvRows.every((r, i) => r.key === STEP_KEYS[i] && r.mark === vvSum.setup.steps[i].state && r.summary.startsWith(vvSum.setup.steps[i].summary)), vvRows.map((r) => `${r.key}:${r.mark}`));
  step("C11.10 X1 C3: the heading says how many steps are done", (await p.locator("#ov-steps").innerText()).startsWith(`Setup steps · ${vvSum.setup.bar.done} of 5 done`));
  step("C11.10 X1 C3 fail: the old 'Missing before firms can use it' list and its 'Next step for all of these' line are gone", await p.getByRole("region", { name: /Missing before firms can use it|Why firms cannot use it/ }).count() === 0 && await p.locator("[data-shared-step]").count() === 0);
  step("C11.12 X1 C3 fail (P-161 (2)): no people card on the Overview; people are changed on Forms only", await p.getByRole("heading", { name: "Who can be in this application", level: 2 }).count() === 0 && await p.locator("[data-overview-people]").count() === 0);
  // Every open item is a link, to exactly where the engine's own next.href would send it.
  const links = await p.locator("[data-open-item]").evaluateAll((els) => els.map((e) => ({ focus: e.getAttribute("data-open-item"), count: Number(e.getAttribute("data-count")), tab: e.getAttribute("data-tab"), href: e.getAttribute("href") })));
  const wantItems = vvSum.setup.steps.flatMap((s) => s.open.map((i) => ({ focus: i.focus, href: itemHref(vv, s.key, s.tab, i) })));
  step("C11.10 X1 C3: every open item of every step is listed once, linked where it is done", links.length === wantItems.length && wantItems.every((w, i) => links[i].focus === w.focus && links[i].href === w.href), links.map((l) => l.href));
  step("C11.10 X1 C3: the first item's link is the engine's next.href (one definition)", links[0]?.href === vvSum.setup.next.href, `${links[0]?.href} vs ${vvSum.setup.next.href}`);
  step("C11.10 X1 C3: a step after the current one says what it waits for ('After …')", /After Official pages/.test(vvRows[1].open) && /After Forms/.test(vvRows[3].open));
  // The tab badges equal the strip (handover of #206): per tab, the strip's counts sum to the badge.
  const badges = await p.getByRole("tablist", { name: "Combination" }).getByRole("tab").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute("href").split("/").pop(), Number(e.querySelector("[data-step-badge]")?.getAttribute("data-step-badge") ?? 0)])));
  const fromStrip = { forms: 0, documents: 0, questionnaires: 0 }; for (const l of links) if (l.tab in fromStrip) fromStrip[l.tab] += l.count;
  step("C11.10 X1 C3: the tab badges equal the strip (Forms, Documents, Smart questionnaire (SQR))", ["forms", "documents", "questionnaires"].every((t) => badges[t] === fromStrip[t]) && JSON.stringify(fromStrip) === JSON.stringify(tabCounts(vvSum.setup)), { badges, fromStrip });
  step("C11.10 X1 C3 fail: a tab with nothing open in the strip has no badge", fromStrip.questionnaires === 0 && badges.questionnaires === 0);
  // Review minors 1, 2, 5 (c0ccd2f6).
  step("C11.10 X1 C3 (review m2): the marks' legend is a visible line, not a hover-only tooltip", /✓ done · ● next · ◐ AI at work · ⧗ waiting for someone else/.test(await p.locator("[data-strip-legend]").innerText()));
  step("C11.12 X1 C3 (review m5): people counts the immigration expert has not confirmed carry the Sample label", (await p.locator('[data-step-row="people"] [data-step-summary]').innerText()).includes("Sample"));
  const shadow = () => p.locator('[data-open-item="pages:record"]').evaluate((e) => getComputedStyle(e).boxShadow);
  const unfocused = await shadow();
  await p.locator('[data-open-item="pages:record"]').focus();
  const ring = await shadow();
  step("C11.10 X1 C3 (review m1): a strip link shows a focus ring from the keyboard (the page resets outlines); none when not focused", ring !== unfocused && /rgb\((?!255, 255, 255|0, 0, 0)/.test(ring) && !/rgb\((?!255, 255, 255|0, 0, 0)/.test(unfocused), `${unfocused} → ${ring}`);
  await p.screenshot({ path: path.join(SHOTS, "01-overview-strip-author-1440.png"), fullPage: true });
  await axe("Overview with the strip (author)");
  // Keyboard: Tab reaches the first item's link; Enter lands on Forms with the item focused (C1's landing).
  const pplLink = p.locator('[data-open-item="people:card"]');
  await pplLink.focus(); await p.keyboard.press("Enter");
  await p.locator('[data-focus="people:card"][data-focused]').waitFor({ timeout: 10000 });
  step("C11.10 X1 C3: Enter on 'Confirm who can apply' lands on Forms with the people part focused and outlined", /\/forms$/.test(new URL(p.url()).pathname) && await p.evaluate(() => { const el = document.querySelector('[data-focus="people:card"]'); return !!el && (el === document.activeElement || el.contains(document.activeElement)); }));
  await openOverview(vv);
  await p.locator('[data-open-item="documents:lines"]').click();
  await p.locator('[data-focus="documents:lines"][data-focused]').waitFor({ timeout: 10000 });
  step("C11.10 X1 C3: 'Draft questions and documents' lands on Documents with its place outlined", /\/documents$/.test(new URL(p.url()).pathname));

  // ?show=missing (the header's old "See n missing" address) lands on the strip, never on nothing.
  await p.goto(`${BASE}/c/${vv}?show=missing`); await strip().waitFor({ timeout: 15000 });
  await p.waitForFunction(() => document.activeElement?.hasAttribute("data-setup-strip"), null, { timeout: 5000 });
  step("C11.10 X1 C3: an old ?show=missing address lands on the strip with focus", true);

  // ---------------------------------------------------------------- Super visa: the first item is the immigration expert's
  const sv = sql("select id from combination where combination_key='sv.super_visa'");
  await openOverview(sv);
  const svA = (await rows())[0];
  step("C11.10 X1 C3 (P-176): to the configuration author, a step whose first item is the expert's reads ⧗ waiting, and says for whom", svA.mark === "waiting" && /Waiting for the immigration expert/.test(svA.summary), svA);
  await p.screenshot({ path: path.join(SHOTS, "02-overview-waiting-author-1440.png"), fullPage: true });
  await actAs("user-C"); await openOverview(sv);
  const svC = (await rows())[0];
  step("C11.10 X1 C3 fail (P-176): to the immigration expert the same step is ● next, theirs to do (no 'Waiting')", svC.mark === "next" && !/Waiting for/.test(svC.summary), svC);
  await axe("Overview with the strip (immigration expert)");
  await actAs("user-A");

  // ---------------------------------------------------------------- With an LMIA: Live, steps 3–5 done
  const lm = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.find((r) => r.label === "With an LMIA")?.combinationId;
  const lmSum = (await api(`/combinations/${lm}/summary`)).body;
  await openOverview(lm);
  const lmRows = await rows();
  step("C11.10 X1 C3: a Live combination's heading says Live; done steps are ✓ and link 'See on …' their tab", /^Live · Release \d+ · (Next release: \d of 5 steps? to do|nothing open for the next release)/.test((await p.locator("#ov-steps").innerText()).trim()) /* UX-A part 3, QA-184 words */ && lmRows.filter((r) => r.mark === "done").length === lmSum.setup.steps.filter((s) => s.state === "done").length && /See on Forms/.test(lmRows[2].open) && /See on Review and release/.test(lmRows[4].open), lmRows.map((r) => `${r.key}:${r.mark}:${r.open}`));
  const see = await p.locator('[data-step-row="forms"] a', { hasText: "See on Forms" }).getAttribute("href");
  step("C11.10 X1 C3 fail: a done step offers no open item (nothing to fix is never shown as work)", await p.locator('[data-step-row="forms"] [data-open-item]').count() === 0 && see === `/c/${lm}/forms`, see);
  await p.screenshot({ path: path.join(SHOTS, "03-overview-live-1440.png"), fullPage: true });
  await axe("Overview with the strip (Live)");

  // ---------------------------------------------------------------- narrow screen: the strip stays inside the page
  await p.setViewportSize({ width: 400, height: 900 }); await openOverview(vv);
  const over = await p.evaluate(() => { const s = document.querySelector("[data-setup-strip]"); return s ? s.scrollWidth - s.clientWidth : -1; });
  step("C11.10 X1 C3: at 400 px the strip does not scroll sideways", over === 0, over);
  await p.screenshot({ path: path.join(SHOTS, "04-overview-strip-400.png"), fullPage: true });

  step("no page error or console error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
