// UX-A part 2 (P-273; UX baseline 2 Nov finding 2): To review's "Needs you" includes the problems that block a combination's
// release, and a combination is on it exactly when the one rule (engine/setup-checklist.ts needsYouItems) says it needs
// that person, the rule the Programs chip and card read (review M2). Walked in a real browser on the demo sample. Pass: with
// a release-blocking error on Visitor visa the author's Needs you lists it with the Review and release tab's count and a
// link to the fix; the Programs card marks it Needs you for the same person. Fail cases: no Needs-you row offers a step no
// screen offers (Confirm or Choose the checklist page, Confirm who can apply; review M1, N8); a person who cannot fix a
// blocked release reads "Nothing waits for you, but … to fix before release", never a bare "Nothing waits for you"; steps
// with their own rows are not repeated; a combination with nothing set up is not called blocked. For user-A, user-B and
// user-C the combinations on Programs' Needs you and on To review's Needs you are the same. 1440, 1024 and 400 px without
// sideways page scroll; axe (WCAG 2.2 AA). Screenshots in product/screens/UX-A/screenshots/ (uxa2-*). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_uxa2 4448 start && node studio/tests/check_uxa2_to_review_browser.cjs 4448 xr_studio_screens_uxa2
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_screens_uxa2";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "UX-A", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  UX-A2: ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
const NO_SCREEN = /^(Confirm the checklist page|Choose the checklist page|Confirm who can apply)$/;
const PEOPLE = ["user-A", "user-B", "user-C"];

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": actor, "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (actor) => { await p.goto(BASE); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the demo sample loads", (await api("/demo/load", { method: "POST", data: {} })).status < 300);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const openReview = async (f = "") => { await p.goto(`${BASE}/review${f}`); await p.getByRole("heading", { name: "To review" }).waitFor(); await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 }); };
  const vvRow = () => p.locator(`tr[data-item^="setup:${vv}"]`);
  // Programs' Needs you, per person, as combination ids (both Pathway types).
  const programsNeeds = async (actor) => { const ids = new Set(); for (const pw of ["INDIVIDUAL", "CORPORATE"]) { const c = (await api(`/catalogue?pathway=${pw}&filter=all`, {}, actor)).body; for (const r of c?.rows ?? []) if (r.needsYou && r.combinationId) ids.add(r.combinationId); } return ids; };
  const reviewNeeds = async (actor) => (await api("/review-queue?filter=needs", {}, actor)).body;
  const agree = async (label) => {
    for (const actor of PEOPLE) {
      const prog = await programsNeeds(actor), q = await reviewNeeds(actor);
      const setupCombos = new Set(q.items.filter((i) => i.kind === "setup").map((i) => i.combination));
      const anyCombos = new Set(q.items.map((i) => i.combination).filter(Boolean));
      step(`${label} (${actor}): every setup row on Needs you is a Programs Needs-you combination, and every Programs Needs-you combination is on To review's Needs you`, [...setupCombos].every((c) => prog.has(c)) && [...prog].every((c) => anyCombos.has(c)), { programs: [...prog].length, setup: [...setupCombos].length, any: [...anyCombos].length });
      step(`${label} (${actor}): no Needs-you row offers a step no screen offers (N8)`, q.items.every((i) => !NO_SCREEN.test(i.next?.label ?? "")), q.items.map((i) => i.next?.label));
    }
  };

  // ------------------------------------------------------------------ as loaded: nothing blocked, nothing on screen-less steps
  await agree("as loaded");
  const all0 = (await api("/review-queue?filter=all")).body;
  step("fail case (review n2): a combination with nothing set up is not called blocked", all0.blocked === 0 && !all0.items.some((i) => i.kind === "setup"), { blocked: all0.blocked, setup: all0.items.filter((i) => i.kind === "setup").map((i) => i.title) });
  // Review M3: on the demo as loaded, combinations with nothing set up show "1 to fix" (Nothing to release yet); nobody reads
  // a bare "Nothing waits for you" beside that red count.
  step("setup (review M3): some combinations have nothing to release yet", all0.notSetUp > 0, all0.notSetUp);
  for (const actor of PEOPLE) {
    await as(actor); await openReview();
    const text = await p.locator("main").innerText();
    step(`fail case (review M3, ${actor}): the empty Needs you says how many have nothing to release yet and where their next step is`, new RegExp(`Nothing waits for you, but ${all0.notSetUp} combinations? (has|have) nothing to release yet`).test(text) && /next step is on Immigration programs/.test(text) && !/^Nothing waits for you$/m.test(text), text.match(/Nothing waits for you[^\n]*/)?.[0]);
  }
  await p.screenshot({ path: path.join(SHOTS, "uxa2-00-not-set-up-1440.png"), fullPage: false });
  await as("user-A");

  // ------------------------------------------------------------------ a release-blocking error on Visitor visa
  const people = (await api(`/combinations/${vv}/workspace?tab=forms`)).body.people;
  const lines = people.lines.map((l) => ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.applies, filing: l.filing ?? null }));
  const broken = lines.map((l) => (l.role === "spouse_or_partner" ? { ...l, filing: null, filingMode: null } : l));
  const saved = await api(`/combinations/${vv}/people`, { method: "PATCH", data: { participants: broken, version: people.version, confirmRemove: true } });
  step("setup: Visitor visa's spouse has no filing set (a release-blocking error)", saved.status < 300, saved.status);
  await openReview();
  step("pass: the author's Needs you lists Visitor visa as a Setup step", await vvRow().count() === 1 && (await vvRow().getAttribute("data-state")) === "needs", await vvRow().innerText().catch(() => ""));
  const said = await vvRow().innerText();
  const n = Number((said.match(/(\d+) problems? to fix before release/) ?? [])[1] ?? -1);
  step("pass: the row names the first problem", /first: Filing for Spouse or partner/.test(said), said);
  const found = (await api("/review-queue?filter=all&q=Temporary%20residence")).body.items.filter((i) => i.kind === "setup").map((i) => i.combination);
  step("pass (break m1): the row's title has the Pathway, so searching it finds the row", found.includes(vv), found);
  const nav = await p.locator('a[href="/review"] [aria-label$=" you"]').innerText().catch(() => "");
  step("pass: the menu's To review number is Needs you's", nav === String((await reviewNeeds("user-A")).counts.needs), nav);
  await axe("To review (author, blocked)");
  await p.screenshot({ path: path.join(SHOTS, "uxa2-01-needs-you-author-1440.png"), fullPage: true });
  await p.goto(`${BASE}/c/${vv}/overview`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const tabFix = Number(await p.locator('[data-tab="review"] [data-badge-tone="danger"]').getAttribute("data-step-badge").catch(() => "0"));
  step("pass: the row's number is the Review and release tab's \"to fix\"", n === tabFix && n > 0, { n, tabFix });
  await openReview();
  const link = vvRow().getByRole("link");
  const linkText = (await link.innerText()).trim();
  step("pass (review n1): the link never names a second, different number", /^Fix them$/.test(linkText) || linkText === `Fix ${n} problem${n === 1 ? "" : "s"}`, { linkText, n });
  await link.click();
  await p.waitForURL(new RegExp(`/c/${vv}/forms`));
  step("pass: the link opens the people card on Forms, where the filing is set", /focus=people/.test(p.url()) || new RegExp(`/c/${vv}/forms`).test(p.url()), p.url());
  await agree("blocked");

  // The approver cannot fix it: never a bare "Nothing waits for you".
  await as("user-B"); await openReview();
  const needsB = await reviewNeeds("user-B");
  const empty = await p.locator("main").innerText();
  step("fail case: the approver's empty Needs you says a combination has problems to fix before release", needsB.counts.needs === 0 && needsB.blocked === 1 && /Nothing waits for you, but 1 combination has problems to fix before release/.test(empty) && /Their problems are fixed by the configuration author/.test(empty), { needs: needsB.counts, blocked: needsB.blocked });
  await p.getByRole("button", { name: "Show Waiting for others" }).click();
  await vvRow().waitFor();
  step("fail case: Show Waiting for others lists Visitor visa as waiting for the configuration author", (await vvRow().getAttribute("data-state")) === "waiting" && /The configuration author fixes/.test(await vvRow().innerText()), await vvRow().innerText());
  await axe("To review (approver, blocked)");
  await p.screenshot({ path: path.join(SHOTS, "uxa2-03-waiting-approver-1440.png"), fullPage: true });

  // ------------------------------------------------------------------ widths
  await as("user-A");
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h }); await openReview();
    const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`${w} px: To review has no sideways page scroll (the table scrolls in its box)`, side <= 0 && await vvRow().count() === 1, side);
    await p.screenshot({ path: path.join(SHOTS, `uxa2-04-needs-you-${w}.png`), fullPage: false });
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // ------------------------------------------------------------------ not repeated, no form, put back
  const all = (await api("/review-queue?filter=all")).body.items;
  step("pass: one setup row per combination at most, belonging to no form (a form's guided path never counts it)", new Set(all.filter((i) => i.kind === "setup").map((i) => i.combination)).size === all.filter((i) => i.kind === "setup").length && all.filter((i) => i.kind === "setup").every((i) => i.forms.length === 0));
  const now = (await api(`/combinations/${vv}/workspace?tab=forms`)).body.people;
  await api(`/combinations/${vv}/people`, { method: "PATCH", data: { participants: lines, version: now.version } });
  const after = (await api("/review-queue?filter=all")).body;
  step("pass: with the filing set again, Visitor visa leaves To review and nothing is blocked", !after.items.some((i) => i.combination === vv && i.kind === "setup") && after.blocked === 0, after.items.filter((i) => i.kind === "setup").map((i) => i.title));
  await agree("put back");

  // Break round 2: on the six (AI proposals on several combinations) every combination Programs marks Needs you is on To
  // review's Needs you, and no setup row is outside it. AI proposals are a reviewer's (C2.6/C2.12; Lead 5, 2 Nov).
  const six = await api("/demo/reset-to-six", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the six load (saved AI answers replayed, US$0)", six.status < 300, six.status);
  for (const actor of PEOPLE) {
    const prog = await programsNeeds(actor), q = await reviewNeeds(actor);
    const setupCombos = new Set(q.items.filter((i) => i.kind === "setup").map((i) => i.combination));
    const anyCombos = new Set(q.items.map((i) => i.combination).filter(Boolean));
    step(`the six (${actor}): setup rows are Programs Needs-you combinations; every Programs Needs-you combination is on To review's Needs you`, [...setupCombos].every((c) => prog.has(c)) && [...prog].every((c) => anyCombos.has(c)), { programs: [...prog].length, setup: [...setupCombos].length });
  }
  // Lead 5's ruling on #616 Question 0 (2 Nov): AI proposals are decided by a holder of the review duty on To review, and
  // Programs' Needs you reads the same rule, so for the approver and the expert the two screens name the same combinations
  // (qa, 2 Nov: Programs "Needs you 0" against To review's 17).
  step("setup: the six have AI proposal rows on To review", (await reviewNeeds("user-B")).items.some((i) => i.kind === "ai_proposals"));
  for (const actor of ["user-B", "user-C"]) {
    const prog = await programsNeeds(actor), q = await reviewNeeds(actor);
    const rowCombos = new Set(q.items.map((i) => i.combination).filter(Boolean));
    const propCombos = new Set(q.items.filter((i) => i.kind === "ai_proposals").map((i) => i.combination).filter(Boolean));
    step(`fail case (Lead 5, ${actor}): every combination with AI proposals on To review's Needs you is Needs you on Programs (before: 0)`, propCombos.size > 0 && [...propCombos].every((c) => prog.has(c)), { programs: prog.size, proposals: propCombos.size });
    step(`pass (Lead 5, ${actor}): Programs' Needs you and To review's Needs you name the same combinations`, [...rowCombos].every((c) => prog.has(c)) && [...prog].every((c) => rowCombos.has(c)), { programs: [...prog].length, toReview: [...rowCombos].length });
  }
  // The same on the Programs page itself, for the approver and the expert: the Needs you chip of each Pathway type is the
  // number of that type's combinations on To review's Needs you.
  for (const actor of ["user-B", "user-C"]) {
    await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor);
    const rowCombos = new Set((await reviewNeeds(actor)).items.map((i) => i.combination).filter(Boolean));
    for (const pw of ["INDIVIDUAL", "CORPORATE"]) {
      const ids = ((await api(`/catalogue?pathway=${pw}&filter=all`, {}, actor)).body?.rows ?? []).filter((r) => r.combinationId).map((r) => r.combinationId);
      const want = ids.filter((id) => rowCombos.has(id)).length;
      await p.goto(`${BASE}/${pw === "CORPORATE" ? "?pw=CORPORATE" : ""}`); await p.locator("[data-needs-you]").first().waitFor({ timeout: 20000 }); await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 });
      const chip = p.locator("[data-needs-you]").first();
      await chip.waitFor({ timeout: 15000 }).catch(() => undefined);
      const shown = ((await chip.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim().match(/^(\d+) combinations? needs? you$/)?.[1]; // QA-179: the chip says it counts combinations
      step(`pass (Lead 5, ${actor}, ${pw === "CORPORATE" ? "Corporate" : "Retail"}): the Programs page's Needs you chip counts the combinations on To review's Needs you`, shown !== undefined && Number(shown) === want, { shown, want });
    }
  }
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  for (const actor of ["user-B", "user-C"]) {
    const q = await reviewNeeds(actor);
    step(`fail case (break round 2 m2, ${actor}): "Submit again" is never Needs you for someone the server refuses`, q.items.every((i) => i.next?.label !== "Submit again"), q.items.map((i) => `${i.kind}:${i.next?.label}`));
  }

  step("no page error or console error on the walk", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
