// UX-A part 2 (P-273; UX baseline 2 Nov finding 2): To review's "Needs you" includes each combination's next step and the
// problems that block its release, from the setup checklist the Programs card and the page header read, walked in a real
// browser on the demo sample. Pass: the configuration author sees Visitor visa's next step there and it opens where it is
// done; the number of blocking problems is the Review and release tab's. Fail cases: with a release-blocking error
// (Filing not set) the row says so and leads to the fix; a person who cannot fix it never reads a bare "Nothing waits for
// you" while a release is blocked; a step listed elsewhere (AI proposals) is not repeated. 1440, 1024 and 400 px without
// sideways page scroll; axe (WCAG 2.2 AA). Screenshots in product/screens/UX-A/screenshots/ (uxa2-*). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_uxa2 4446 start && node studio/tests/check_uxa2_to_review_browser.cjs 4446 xr_studio_screens_uxa2
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_uxa2";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "UX-A", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };

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

  // ------------------------------------------------------------------ pass: the author's Needs you has Visitor visa's next step
  const sum = (await api(`/combinations/${vv}/summary`)).body;
  const nextText = sum.setup.next?.item.text;
  await openReview();
  step("pass: Needs you lists Visitor visa as a Setup step with its next step, the header's words", await vvRow().count() === 1 && (await vvRow().getAttribute("data-state")) === "needs" && (await vvRow().innerText()).includes(`Next step · Official pages: ${nextText}`), { next: nextText, row: await vvRow().innerText().catch(() => "") });
  const q = (await api("/review-queue?filter=needs")).body;
  step("pass: the menu's To review number is Needs you's", await p.locator('a[href="/review"] [aria-label$="waiting for you"]').innerText().catch(() => "") === String(q.counts.needs), q.counts);
  await axe("To review (author)");
  await p.screenshot({ path: path.join(SHOTS, "uxa2-01-needs-you-author-1440.png"), fullPage: true });
  // The Review and release tab counts the same blocking problems as the row.
  const blockRow = (await api("/review-queue?filter=all")).body.items.find((i) => i.combination === vv && i.kind === "setup");
  const n = Number((blockRow.what.match(/^(\d+) problems? blocks?/) ?? [])[1] ?? 0);
  await p.goto(`${BASE}/c/${vv}/overview`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const tabFix = Number(await p.locator('[data-tab="review"] [data-badge-tone="danger"]').getAttribute("data-step-badge").catch(() => "0"));
  step("pass: the row's blocking problems are the Review and release tab's \"to fix\"", n === tabFix, { row: blockRow.what, tabFix });
  // The step opens where it is done.
  await openReview();
  await vvRow().getByRole("link", { name: nextText }).click();
  await p.waitForURL(new RegExp(`/c/${vv}/forms`));
  step("pass: the step's link opens Visitor visa's Forms tab, where the checklist page is confirmed", new RegExp(`/c/${vv}/forms`).test(p.url()), p.url());

  // ------------------------------------------------------------------ fail case: a release-blocking error is listed and fixed by the author
  const people = (await api(`/combinations/${vv}/workspace?tab=forms`)).body.people;
  const lines = people.lines.map((l) => ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.applies, filing: l.filing ?? null }));
  const broken = lines.map((l) => (l.role === "spouse_or_partner" ? { ...l, filing: null, filingMode: null } : l));
  const saved = await api(`/combinations/${vv}/people`, { method: "PATCH", data: { participants: broken, version: people.version } });
  step("setup: Visitor visa's spouse has no filing set (a release-blocking error)", saved.status < 300, saved);
  await openReview();
  const said = await vvRow().innerText();
  step("fail case: the row says the problems block release and names the first, with the fix as its step", /\d+ problems? blocks? release \(first: Filing for Spouse or partner/.test(said) && await vvRow().getByRole("link", { name: /^Fix 1 problem$/ }).count() === 1, said);
  await p.goto(`${BASE}/c/${vv}/overview`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const tabFix2 = Number(await p.locator('[data-tab="review"] [data-badge-tone="danger"]').getAttribute("data-step-badge").catch(() => "0"));
  const n2 = Number((said.match(/(\d+) problems? blocks?/) ?? [])[1] ?? 0);
  step("fail case: the row's number follows the Review and release tab's (one more)", n2 === tabFix2 && n2 === tabFix + 1, { n2, tabFix2, before: tabFix });
  await openReview(); await vvRow().getByRole("link", { name: /^Fix 1 problem$/ }).click();
  await p.waitForURL(new RegExp(`/c/${vv}/forms`));
  step("fail case: Fix opens the people card on Forms, where the filing is set", /focus=people/.test(p.url()) || new RegExp(`/c/${vv}/forms`).test(p.url()), p.url());
  await openReview(); await p.screenshot({ path: path.join(SHOTS, "uxa2-02-blocked-author-1440.png"), fullPage: true });

  // The approver cannot fix it: never a bare "Nothing waits for you" while a release is blocked.
  await as("user-B"); await openReview();
  const needsB = (await api("/review-queue?filter=needs", {}, "user-B")).body;
  const empty = await p.locator("main").innerText();
  step("fail case: the approver's empty Needs you says releases are blocked (never a bare \"Nothing waits for you\")", needsB.counts.needs === 0 && needsB.blocked > 0 && /Nothing waits for you, but \d+ combinations?'? releases? (is|are) blocked/.test(empty), { needs: needsB.counts, blocked: needsB.blocked });
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

  // Put the filing back: the blocking row goes, the next step stays.
  const now = (await api(`/combinations/${vv}/workspace?tab=forms`)).body.people;
  await api(`/combinations/${vv}/people`, { method: "PATCH", data: { participants: lines, version: now.version } });
  const after = (await api("/review-queue?filter=all")).body.items.find((i) => i.combination === vv && i.kind === "setup");
  step("pass: with the filing set again, the row is back to its next step and the blocking count to the tab's", !!after && !/Filing for/.test(after.what), after?.what);

  // ------------------------------------------------------------------ not repeated: a step with its own row stays there
  const all = (await api("/review-queue?filter=all")).body.items;
  const dup = all.filter((i) => i.kind === "setup" && /Next step · [^:]+: (Review \d+ (AI )?proposals?|View AI progress|Review and sign|Release)\b/.test(i.what));
  step("pass: no setup row repeats a step that has its own row (AI proposals, AI running, sign, release)", dup.length === 0, dup.map((d) => d.what));
  step("pass: one setup row per combination at most", new Set(all.filter((i) => i.kind === "setup").map((i) => i.combination)).size === all.filter((i) => i.kind === "setup").length);
  // A form's guided path is not changed by these rows (they belong to no form).
  step("pass: a setup row belongs to no form, so a form's guided path never counts it", all.filter((i) => i.kind === "setup").every((i) => i.forms.length === 0));

  step("no page error or console error on the walk", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
