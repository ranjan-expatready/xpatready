// qa (11 Nov, Lead 17's ask): two of the UX planner's round-1 findings (design/ux-2026-11-11/02-baseline-score.md, main
// fbfb263c7), confirmed on a fresh configured checkpoint. (1) UXF-25: an unknown representative-review round on a case
// that exists reads "No such case"; error and permission pages have no page heading (h1); the client's blocked page names
// only "the case officer". (2) The edition review page (To review › New edition) fails axe at 375 px:
// scrollable-region-focusable (a scrollable area keyboard users cannot reach). Each line fails while its finding is open.
// US$0, live AI off; never :4400.
//   zsh tools/isolated.sh qa_ux 4475 start && curl -X POST localhost:4475/api/demo/load -H 'x-actor: user-A' \
//     -H 'content-type: application/json' -d '{"sample":"configured"}' && node tests/qa/check_ux_uxf25_edition_axe.cjs 4475 [shots-dir]
const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const port = process.argv[2], shots = process.argv[3]; if (!port || port === "4400") { console.log("usage: <port of an isolated copy>, never 4400"); process.exit(2); }
const base = `http://localhost:${port}`;
let failed = 0; const ok = (n, c, d) => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 500)}` : ""}`); };
const api = async (path, actor) => (await fetch(base + "/api" + path, { headers: { "x-actor": actor } })).json();
(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.statSync("/opt/pw-browsers/chromium", { throwIfNoEntry: false })?.isFile() ? { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] } : {}) });
  const open = async (actor, path, width = 1440) => {
    const ctx = await b.newContext({ viewport: { width, height: 900 } }); await ctx.addInitScript((a) => localStorage.setItem("xr-actor", a), actor);
    const p = await ctx.newPage(); await p.goto(base + path); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1200);
    const main = (await p.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ");
    const h1 = await p.locator("h1").allInnerTexts();
    return { p, ctx, main, h1 };
  };
  const shot = async (p, name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await p.screenshot({ path: `${shots}/${name}.png` }); } };
  const cases = (await api("/runtime/cases", "user-O")).cases ?? [];
  const fam = cases.find((c) => c.reference === "SAMPLE-VV-FAMILY-1");
  ok("UXF setup: the checkpoint's family case exists", !!fam, cases.map((c) => c.reference));

  // (1a) An unknown review round on a case that exists, as the representative of record.
  const r1 = await open("user-R", `/cases/${fam.id}/representative-review/99`); await shot(r1.p, "uxf25-unknown-round-1440");
  ok("UXF-25a fail today: an unknown review round on an existing case never reads \"No such case\"; it says the round does not exist on this case", !/No such case/i.test(r1.main) && /round/i.test(r1.main), r1.main.slice(0, 300));
  // (1b) Error and permission pages carry one page heading (h1).
  const pages = [["unknown review round (representative)", r1], ["case not found (case officer)", await open("user-O", "/cases/00000000-0000-0000-0000-000000000000")],
    ["case page as Client A (permission)", await open("user-P", `/cases/${fam.id}`)], ["Studio page as the case officer (permission)", await open("user-O", "/library/fields")], ["unknown Studio address (author)", await open("user-A", "/nowhere-qa")]];
  for (const [what, x] of pages) ok(`UXF-25b fail today: ${what} has exactly one page heading (h1)`, x.h1.length === 1, { h1: x.h1, words: x.main.slice(0, 200) });
  await shot(pages[2][1].p, "uxf25-client-blocked-1440");
  // (1c) The client's blocked page names who works the case: the representative of record also works it.
  const team = await api(`/runtime/cases/${fam.id}/team`, "user-O");
  const words = pages[2][1].main;
  ok("UXF-25c fail today: the client's blocked page does not name only \"the case officer\" when the representative also works the case", !(/for the case officer/i.test(words) && !/representative/i.test(words)), { words: words.slice(0, 300), team: JSON.stringify(team).slice(0, 160) });
  for (const [, x] of pages) await x.ctx.close().catch(() => {});

  // (2) The edition review page, axe at 375 and 1440 px (WCAG 2.0-2.2 A/AA), as the author.
  const html = await (await fetch(base + "/api/review", { headers: { "x-actor": "user-A" } })).text();
  const ctxR = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctxR.addInitScript(() => localStorage.setItem("xr-actor", "user-A"));
  const pr = await ctxR.newPage(); await pr.goto(base + "/review"); await pr.waitForLoadState("networkidle"); await pr.waitForTimeout(1200);
  const href = await pr.locator('a[href^="/review/edition/"]').first().getAttribute("href").catch(() => null); await ctxR.close(); void html;
  ok("UXF setup: To review lists a new edition to review (the checkpoint's IMM 5476 (11-2025))", !!href, href);
  for (const width of [375, 1440]) {
    const x = await open("user-A", href, width); await shot(x.p, `edition-review-${width}`);
    const r = await new AxeBuilder({ page: x.p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const v = r.violations.map((y) => `${y.id} (${y.impact}, ${y.nodes.length}): ${y.nodes.map((n) => n.target.join(" ")).join(" | ").slice(0, 160)}`);
    ok(`UX axe ${width} px ${width === 375 ? "fail today" : "pass"}: the edition review page has no WCAG A/AA violation`, r.violations.length === 0, v);
    if (width === 375 && r.violations.some((y) => y.id === "scrollable-region-focusable")) {
      // Underneath: the region scrolls, holds nothing focusable, and is not itself in the tab order.
      const sel = r.violations.find((y) => y.id === "scrollable-region-focusable").nodes[0].target[0];
      const facts = await x.p.locator(sel).first().evaluate((e) => ({ tag: e.tagName, cls: e.className.slice(0, 80), tabindex: e.getAttribute("tabindex"), scrollW: e.scrollWidth, clientW: e.clientWidth, focusables: e.querySelectorAll("a,button,input,select,textarea,[tabindex]").length }));
      console.log(`NOTE  axe 375: ${sel}: ${JSON.stringify(facts)}`);
    }
    await x.ctx.close();
  }
  await b.close(); console.log(failed ? `${failed} failed` : "all passed"); process.exit(failed ? 1 : 0);
})();
