// BK-3 PR 1 (P-447 (2), Bake plan row 3) walked in a real browser: one frame around every screen. On the configured
// checkpoint (C10.1) it opens every route of the Studio, the case area (as the case officer, and the questionnaire as
// Client A), the adult's link page and the demo inbox, at 1440 and 375 px, and fails on a screen without its "where am I"
// line (one, at the top, naming the place) or, but on an area's first page, without Back; every Back target is opened and
// must be a real page, and Back is clicked on three screens. Staff see the other area on the line at both widths and it
// takes them there (qa baseline dead ends 2 and 3). No sideways scroll at 375. axe (WCAG 2.2 AA) on the line. Screenshots
// of three set-up and three case screens into product/screens/BK-3-one-frame/screenshots/. No model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_bk3 4441 start && node studio/tests/check_bk3_frame_browser.cjs 4441
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4441);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "BK-3-one-frame", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 600000 }); let body = null; try { body = await r.json(); } catch { /* no body */ } return { status: r.status(), body }; };

  await p.goto(BASE);
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const loaded = await api("/demo/load", { method: "POST", data: { sample: "configured" } });
  step("setup: the configured checkpoint loads", loaded.status < 300, loaded.status);
  const combos = loaded.body?.combinations ?? [];
  const vv = (combos.find((c) => /visitor visa/i.test(c.label ?? "")) ?? combos[0])?.id;
  const job = (await api(`/combinations/${vv}`)).body?.jobs?.find((j) => j.id)?.id;
  const field = (await api("/library/fields?retired=all")).body?.[0]?.key;
  const batch = (await api("/ai/batches")).body?.[0]?.id;
  const firstCase = (await api("/runtime/cases", { actor: "user-O" })).body?.cases?.[0], caseId = firstCase?.id, ref = firstCase?.reference;
  const item = (await api(`/runtime/cases/${caseId}/prepare`, { actor: "user-O" })).body?.items?.find((i) => i.id)?.id;
  step("setup: a combination, an AI job, a field, an AI run, a case and a case form item to open", !!(vv && job && field && batch && caseId && item), { vv, job, field, batch, caseId, item });

  // Every route of App.tsx and runtime/cases.tsx (tests/check_bk3_frame.ts reads them from the source); review items with an
  // id no item has: the page's error state must keep the frame's line and Back too.
  const S = "user-A", O = "user-O", C = "user-P";
  const ROUTES = [
    ["/", S, "home"], ["/structure", S], ["/review", S], ["/review/proposals", S], ["/review/change/x1", S], ["/review/batch/x1", S], ["/review/merge/x1", S],
    ["/review/held/x1", S], ["/review/edition/x1", S], ["/review/form-fields/x1", S], [`/c/${vv}`, S],
    ...["overview", "forms", "questionnaires", "documents", "preview", "tests", "review"].map((t) => [`/c/${vv}/${t}`, S]),
    [`/c/${vv}/jobs/${job}`, S], ["/library/fields", S], [`/library/fields/${encodeURIComponent(field)}`, S], ["/library/sections", S], ["/library/documents", S],
    ["/library/forms", S], ["/library/checks", S], ["/library/rules", S], ["/release", S], ["/ai", S], [`/ai/${batch}`, S], ["/releases", S], ["/activity", S],
    ["/no-such-page", S, "not found"],
    ["/cases", O, "home"], [`/cases/${caseId}`, O], [`/cases/${caseId}/questionnaire`, O], [`/cases/${caseId}/eligibility`, O], [`/cases/${caseId}/review`, O],
    [`/cases/${caseId}/representative-review`, O], [`/cases/${caseId}/sheet/${item}`, O], [`/cases/${caseId}/no-such-page`, O, "not found"],
    [`/cases/${caseId}/questionnaire`, C, "home"], [`/cases/${caseId}`, C], ["/link", null, "home"], ["/inbox", null],
  ];
  const as = async (actor) => { await p.evaluate((a) => { try { if (a) localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  /** Opens a route as a person and waits, failing loudly, for the frame's line and the page under it. */
  const open = async (url, actor) => {
    if (actor) { await p.goto(`${BASE}/inbox`); await as(actor); }
    await p.goto(`${BASE}${url}`);
    await p.locator("[data-where]").first().waitFor({ timeout: 30000 });
    await p.waitForFunction(() => { const m = document.querySelector("main"), w = document.querySelector("[data-where]"); return !!m && !!w && m.innerText.trim().length > w.innerText.trim().length + 5 && !document.querySelector('[aria-busy="true"]') && !document.querySelector("main .animate-spin"); }, null, { timeout: 30000 });
    await p.waitForTimeout(300);
  };
  /** The line as the page shows it. */
  const line = () => p.evaluate(() => {
    const w = [...document.querySelectorAll("[data-where]")], el = w[0];
    const paths = document.querySelectorAll('nav[aria-label="Path"]');
    const crumbs = el ? [...el.querySelectorAll('nav[aria-label="Path"] a, nav[aria-label="Path"] span:not([aria-hidden])')].map((x) => x.textContent.trim()).filter(Boolean) : [];
    const back = el?.querySelector("[data-where-back]"), backName = back?.getAttribute("aria-label") ?? null, other = el?.querySelector("[data-where-area]");
    const seen = (x) => !!x && x.getClientRects().length > 0 && x.getBoundingClientRect().width > 0;
    const r = el?.getBoundingClientRect();
    return { lines: w.length, paths: paths.length, inLine: el ? el.querySelectorAll('nav[aria-label="Path"]').length : 0, crumbs, top: r ? Math.round(r.top) : null,
      back: seen(back) ? back.getAttribute("href") : null, backName, other: seen(other) ? other.textContent.trim() : null, here: location.pathname, sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
      lineFits: !!r && r.right <= window.innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1,
      notFound: /Page not found|No such page/.test(document.querySelector("main")?.innerText ?? ""), notFoundTimes: (document.body.innerText.match(/Page not found/g) ?? []).length };
  });

  // Seen on origin/main 3a9b91743 before this change (473 px wide at 375): page content, not the frame; in the PR as a finding.
  const SIDEWAYS_ON_MAIN = [[/^\/structure$/, "the tree rows' Archive buttons run past the edge (473 px)"], [/^\/c\/[^/]+\/preview$/, "a Preview section runs past the edge once it loads (394 px)"]];
  const onMain = (url) => SIDEWAYS_ON_MAIN.find(([re]) => re.test(url))?.[1];
  const targets = new Map();
  for (const width of [1440, 375]) {
    await p.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const [url, actor, kind] of ROUTES) {
      await open(url, actor);
      // A case page names the case once its data is in (fails loudly when it never does).
      if (actor === O && url.startsWith(`/cases/${caseId}`) && kind !== "not found") await p.waitForFunction((r) => (document.querySelector('[data-where] nav')?.textContent ?? "").includes(r), ref, { timeout: 15000 });
      const x = await line();
      const name = `BK-3 ${width} ${url}${actor ? ` as ${actor}` : ""}`;
      step(`${name}: one "where am I" line at the top, naming the place (${x.crumbs.join(" › ")})`, x.lines === 1 && x.inLine === 1 && x.paths === 1 && x.crumbs.length >= 1 && x.top !== null && x.top < 200 && (kind === "not found" ? x.crumbs.at(-1) === "No such page" : x.crumbs.at(-1) !== "No such page"), x);
      if (kind === "not found") step(`${name}: "Page not found" once, in the page's notice (the line does not repeat it)`, x.notFoundTimes === 1, x.notFoundTimes);
      if (kind === "home") step(`${name}: an area's first page (no Back needed)`, x.back === null, x.back);
      else {
        step(`${name}: Back, one level up (${x.back})`, !!x.back && x.back.split("?")[0] !== x.here, x); if (x.back) targets.set(x.back, actor);
        step(`${name}: Back's name says where it goes (${x.backName})`, /^Back: \S/.test(x.backName ?? ""), x.backName);
      }
      // Every case page names the case by its reference, as the case page does (review m3), and never "No such page" for the client (m2).
      if (actor === O && url.startsWith(`/cases/${caseId}`) && kind !== "not found") step(`${name}: the line names the case ${ref}`, x.crumbs[0] === "Cases" && x.crumbs[1] === ref, x.crumbs);
      const staff = actor === S || actor === O;
      if (staff) step(`${name}: the other area is on the line (${x.other})`, x.other === (actor === S ? "Cases" : "Product Studio"), x.other);
      else step(`${name}: no other area for a client or an outside page`, x.other === null, x.other);
      if (width === 375 && onMain(url)) step(`${name}: the line itself fits at 375 px (the page's own sideways scroll is on main too: ${onMain(url)})`, x.lineFits, x);
      else if (width === 375) step(`${name}: no sideways scroll at 375 px`, !x.sideways && x.lineFits, x);
      if (width === 1440 && (url === "/" || url === `/cases/${caseId}`)) {
        const r = await new AxeBuilder({ page: p }).include("[data-where]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        step(`BK-3 ${url}: axe finds no WCAG A/AA violation on the line`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
      }
    }
  }
  // Every Back leads to a real page (never "Page not found" or "No such page"), which has its own line.
  await p.setViewportSize({ width: 1440, height: 900 });
  for (const [to, actor] of targets) {
    await open(to, actor); const x = await line();
    step(`BK-3 Back target ${to}: a real page with its line (${x.crumbs.join(" › ")})`, !x.notFound && x.lines === 1, x);
  }
  // Back clicked like a person, on three screens.
  for (const [url, actor, to] of [[`/c/${vv}/forms`, S, "/"], [`/library/fields/${encodeURIComponent(field)}`, S, "/library/fields"], [`/cases/${caseId}/review`, O, `/cases/${caseId}`]]) {
    await open(url, actor); await p.locator("[data-where-back]").click(); await p.waitForURL((u) => u.pathname === to, { timeout: 15000 }).catch(() => {});
    step(`BK-3 Back clicked on ${url} lands on ${to}`, new URL(p.url()).pathname === to, p.url());
  }
  // The other area, at phone width (dead end 3: the case area's way to the Studio was hidden below 768 px).
  await p.setViewportSize({ width: 375, height: 812 });
  await open(`/cases/${caseId}`, O); await p.locator("[data-where-area]").click(); await p.locator('[data-where="studio"]').waitFor({ timeout: 15000 }).catch(() => {});
  step("BK-3 375: Product Studio → on a case page opens the Studio", new URL(p.url()).pathname === "/" && await p.locator('[data-where="studio"]').count() === 1, p.url());
  await p.locator("[data-where-area]").click(); await p.locator('[data-where="cases"]').waitFor({ timeout: 15000 }).catch(() => {});
  step("BK-3 375: Cases → in the Studio opens the case list (dead end 2: no longer only the Demo menu)", new URL(p.url()).pathname === "/cases" && await p.locator('[data-where="cases"]').count() === 1, p.url());

  // Screenshots: three set-up and three case screens, at 1440 and 375.
  const SHOT = [["setup-programs", "/", S], ["setup-combination-forms", `/c/${vv}/forms`, S], ["setup-field", `/library/fields/${encodeURIComponent(field)}`, S],
    ["case-list", "/cases", O], ["case-page", `/cases/${caseId}`, O], ["case-client-questionnaire", `/cases/${caseId}/questionnaire`, C]];
  for (const width of [1440, 375]) {
    await p.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const [n, url, actor] of SHOT) { await open(url, actor); await p.screenshot({ path: path.join(SHOTS, `${n}-${width}.png`) }); }
  }
  step("no page error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
