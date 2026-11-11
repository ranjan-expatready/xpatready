// BK-2 (P-447 (2), Bake plan row 2) walked in a real browser: the shared fold-out (web/src/components/fold-out.tsx) on
// three screens of the configured checkpoint (C10.1). Immigration programs (a Pathway band opened by its own button), a
// combination's Questionnaires tab (a section opened by its own button) and its Preview tab (native <details>): the arrow is seen,
// points right when closed and down when open, the fold-out is reached by Tab and toggled by Enter, and aria-expanded (or
// the native open state) follows. At 1440 and 375 px, closed and open; axe (WCAG 2.2 AA) on each fold-out. Screenshots
// into product/screens/BK-2-fold-out-arrows/screenshots/. No model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_bk2 4443 start && node studio/tests/check_bk2_fold_outs_browser.cjs 4443
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4443);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "BK-2-fold-out-arrows", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data, timeout: 600000 }); let body = null; try { body = await r.json(); } catch { /* no body */ } return { status: r.status(), body }; };
  // Fails loudly when the page never settles (no silent wait).
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(200); };

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const loaded = await api("/demo/load", { method: "POST", data: { sample: "configured" } });
  step("setup: the configured checkpoint loads", loaded.status < 300, loaded.status);
  const vv = (loaded.body?.combinations ?? []).find((c) => /visitor/i.test(c.label ?? "") && /single|alone|one/i.test(c.label ?? ""))?.id
    ?? (loaded.body?.combinations ?? [])[0]?.id;
  step("setup: a combination to open", !!vv, vv);

  /** The arrow's turn and whether the fold-out is open, read from the page. */
  const read = (el) => el.evaluate((n) => {
    const arrow = n.matches("summary") ? n.querySelector(":scope > [data-fold-arrow]") : n.querySelector("[data-fold-arrow]");
    const r = arrow ? getComputedStyle(arrow).rotate : "missing";
    const box = arrow?.getBoundingClientRect();
    return { open: n.matches("summary") ? n.parentElement.open : n.getAttribute("aria-expanded") === "true", rotate: r, seen: !!box && box.width >= 10 && box.height >= 10, tab: n.tabIndex };
  });
  const turned = (s) => s.rotate === "90deg";
  const SCREENS = [
    { name: "programs", url: "/", fold: () => p.locator("[data-band] button[aria-expanded]").first(), kind: "button" },
    { name: "questionnaires", url: `/c/${vv}/questionnaires`, fold: () => p.locator("[data-section] button[aria-expanded]").first(), kind: "button" },
    { name: "preview", url: `/c/${vv}/preview`, fold: () => p.locator("details[data-tweaks] > summary"), kind: "details" },
  ];
  for (const width of [1440, 375]) {
    await p.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const s of SCREENS) {
      await p.goto(`${BASE}${s.url}`); await settle();
      const f = s.fold(); await f.waitFor({ timeout: 30000 }); await f.scrollIntoViewIfNeeded();
      let st = await read(f);
      if (st.open) { await f.click(); st = await read(f); }   // start closed
      step(`BK-2 ${s.name} ${width}: closed, the arrow is seen and points right`, !st.open && st.seen && !turned(st), JSON.stringify(st));
      step(`BK-2 ${s.name} ${width}: reachable by Tab (in the tab order)`, st.tab >= 0, st.tab);
      await p.screenshot({ path: path.join(SHOTS, `${s.name}-closed-${width}.png`) });
      await f.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(150);
      const o = await read(f);
      step(`BK-2 ${s.name} ${width}: Enter opens it, ${s.kind === "button" ? "aria-expanded is true" : "the <details> is open"} and the arrow points down`, o.open && turned(o), JSON.stringify(o));
      await f.scrollIntoViewIfNeeded();
      await p.screenshot({ path: path.join(SHOTS, `${s.name}-open-${width}.png`) });
      if (width === 1440) {
        const sel = s.kind === "button" ? (s.name === "programs" ? "[data-band]" : "[data-section]") : "details[data-fold]";
        const r = await new AxeBuilder({ page: p }).include(sel).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        step(`BK-2 ${s.name}: axe finds no WCAG A/AA violation on the fold-outs`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
      }
      await f.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(150);
      const c = await read(f);
      step(`BK-2 ${s.name} ${width}: Enter closes it again and the arrow points right`, !c.open && !turned(c), JSON.stringify(c));
    }
  }
  // The sweep: every set-up screen of the checkpoint at 1440 px. No native <details> without the shared piece, and every
  // shown control with aria-expanded either has the arrow or is a combobox or a button that opens a form (the same list
  // as tests/check_bk2_fold_outs.ts).
  await p.setViewportSize({ width: 1440, height: 900 });
  const ACTIONS = /^(Ask as its own question|Add the fact this rule needs|Work it out instead|Add a fact a rule needs|Decide|Show all \d+ .*|Show the first \d+ .*)$/;
  const ROUTES = ["/", "/structure", "/review", "/library/fields", "/library/sections", "/library/documents", "/library/forms", "/library/checks", "/library/rules", "/release", "/ai", "/releases", "/activity",
    ...["overview", "forms", "questionnaires", "documents", "preview", "tests", "review"].map((t) => `/c/${vv}/${t}`)];
  let seen = 0;
  for (const r of ROUTES) {
    await p.goto(`${BASE}${r}`); await settle();
    const x = await p.evaluate((actions) => {
      const re = new RegExp(actions);
      const raw = document.querySelectorAll("details:not([data-fold])").length;
      const folds = [...document.querySelectorAll("details[data-fold] > summary")];
      const noArrow = folds.filter((s) => !s.querySelector(":scope > [data-fold-arrow]")).length;
      const btns = [...document.querySelectorAll("[aria-expanded]")].filter((b) => b.getClientRects().length && b.getAttribute("role") !== "combobox" && !b.closest("[role=menu]") && !b.hasAttribute("aria-haspopup"));
      const bare = btns.filter((b) => !b.querySelector("[data-fold-arrow]") && !re.test(b.textContent.trim())).map((b) => b.textContent.trim().slice(0, 60));
      return { raw, folds: folds.length, noArrow, buttons: btns.length, bare };
    }, ACTIONS.source);
    seen += x.folds + x.buttons;
    step(`BK-2 sweep ${r}: every fold-out shows the arrow (${x.folds} fold-outs, ${x.buttons} buttons with aria-expanded)`, x.raw === 0 && x.noArrow === 0 && x.bare.length === 0, JSON.stringify(x));
  }
  step("BK-2 sweep: fold-outs were found on the way (the sweep is not empty)", seen > 10, seen);
  step("no page error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
