// UX inventory crawl (A19 (k), the UX planner's scratch tool; UX-0 turns it into a repo tool).
// Usage: node crawl.mjs <targets.json> <outdir>
// targets.json: [{ id, base, path, actor, label, widths?: [1440,375], tabs?: true, steps?: "<async js using page>" }]
// For each target and width: opens the page as the actor, opens every <details>, then records the accessibility
// tree (Playwright ariaSnapshot), every section with its fields, actions, links, fold-outs, tabs, tooltips and
// alerts, plus counts (words, type sizes, primary buttons, raw keys, sideways scroll, small targets) and axe results.
// It clicks nothing but role=tab (and the target's own steps), so no priced or changing button is ever pressed.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const AXE = fs.readFileSync(process.env.AXE_JS, "utf8");
const [, , targetsFile, outdir] = process.argv;
const targets = JSON.parse(fs.readFileSync(targetsFile, "utf8"));
fs.mkdirSync(path.join(outdir, "raw"), { recursive: true });
fs.mkdirSync(path.join(outdir, "shots"), { recursive: true });

const browser = await chromium.launch();

function extract() {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("[hidden],[aria-hidden=true]"); };
  const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
  const byId = (ids) => (ids || "").split(/\s+/).map((i) => document.getElementById(i)).filter(Boolean).map((e) => clean(e.innerText || e.textContent)).join(" ");
  const name = (el) => {
    if (el.getAttribute("aria-labelledby")) return byId(el.getAttribute("aria-labelledby"));
    if (el.getAttribute("aria-label")) return clean(el.getAttribute("aria-label"));
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return clean(l.innerText); }
    const pl = el.closest("label"); if (pl) return clean(pl.innerText);
    if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return clean(el.getAttribute("placeholder") || el.getAttribute("title") || "");
    return clean(el.innerText || el.getAttribute("title") || el.getAttribute("value") || "");
  };
  // Primary = filled with the brand primary colour (the Button "default" variant).
  const probe = document.createElement("div"); probe.className = "bg-primary"; document.body.appendChild(probe);
  const primaryBg = getComputedStyle(probe).backgroundColor; probe.remove();
  const isPrimary = (el) => getComputedStyle(el).backgroundColor === primaryBg;
  const root = document.querySelector("[role=dialog]") || document.body;
  // Walk the page in order; each element belongs to the nearest preceding heading (h1-h4) or legend or summary.
  const all = [...root.querySelectorAll("*")];
  const sections = []; let cur = { heading: "(top of page)", level: 0, fields: [], actions: [], links: [], foldouts: [], tabs: [], notes: [] };
  sections.push(cur);
  const seen = new Set();
  for (const el of all) {
    if (!vis(el)) continue;
    const tag = el.tagName; const role = el.getAttribute("role");
    if (/^H[1-4]$/.test(tag) || tag === "LEGEND") {
      cur = { heading: clean(el.innerText), level: tag === "LEGEND" ? 5 : +tag[1], fields: [], actions: [], links: [], foldouts: [], tabs: [], notes: [] };
      sections.push(cur); continue;
    }
    if (seen.has(el)) continue;
    if (tag === "SUMMARY") { const d = el.parentElement; const arrow = getComputedStyle(el).display === "list-item" || !!el.querySelector("svg,[data-fold-arrow]"); cur.foldouts.push({ label: name(el).slice(0, 140), arrow, kind: d?.hasAttribute("data-fold") ? "shared fold-out" : "details" }); continue; }
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag) || ["combobox", "checkbox", "radio", "switch", "textbox", "spinbutton"].includes(role)) {
      if (tag === "INPUT" && el.type === "hidden") continue;
      const desc = byId(el.getAttribute("aria-describedby"));
      const f = { label: name(el).slice(0, 160) || "(no name)", type: tag === "SELECT" ? "select" : (el.type || role || tag.toLowerCase()), required: el.required || el.getAttribute("aria-required") === "true" };
      if (desc) f.hint = desc.slice(0, 200);
      if (el.getAttribute("aria-invalid") === "true") f.invalid = true;
      if (tag === "SELECT") f.options = el.options.length;
      if (el.disabled) f.disabled = true;
      cur.fields.push(f); continue;
    }
    if (role === "tab") { cur.tabs.push({ label: name(el).slice(0, 80), selected: el.getAttribute("aria-selected") === "true" }); continue; }
    if (tag === "BUTTON" || role === "button" || (tag === "A" && el.classList.contains("inline-flex") && isPrimary(el))) {
      const a = { label: name(el).slice(0, 140) || "(no name)" };
      if (isPrimary(el)) a.primary = true;
      if (el.disabled || el.getAttribute("aria-disabled") === "true") a.disabled = true;
      if (el.getAttribute("aria-expanded") != null) a.toggle = el.getAttribute("aria-expanded");
      if (el.getAttribute("aria-haspopup")) a.opens = el.getAttribute("aria-haspopup");
      if (!clean(el.innerText) && el.getAttribute("aria-label")) a.icon_only = true;
      if (el.getAttribute("title")) a.tooltip = clean(el.getAttribute("title")).slice(0, 140);
      el.querySelectorAll("*").forEach((c) => seen.add(c));
      cur.actions.push(a); continue;
    }
    if (tag === "A" && el.getAttribute("href")) { cur.links.push({ label: name(el).slice(0, 120) || "(no name)", href: el.getAttribute("href") }); el.querySelectorAll("*").forEach((c) => seen.add(c)); continue; }
    if (role === "alert" || role === "status") { const t = clean(el.innerText); if (t) cur.notes.push(`${role}: ${t.slice(0, 200)}`); continue; }
  }
  const out = sections.filter((s) => s.heading !== "(top of page)" || s.fields.length + s.actions.length + s.links.length + s.foldouts.length + s.tabs.length);
  for (const s of out) for (const k of ["fields", "actions", "links", "foldouts", "tabs", "notes"]) if (!s[k].length) delete s[k];
  // Counts.
  const main = document.querySelector("main") || document.body;
  const text = clean(main.innerText);
  const words = text ? text.split(" ").length : 0;
  const vh = innerHeight; let firstWords = 0;
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  const sizes = new Set(); let small = 0, smallList = [];
  while (walker.nextNode()) { const n = walker.currentNode; const p = n.parentElement; if (!p || !vis(p) || !clean(n.textContent)) continue; sizes.add(getComputedStyle(p).fontSize); const r = p.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) firstWords += clean(n.textContent).split(" ").length; }
  document.querySelectorAll("button,a[href],input,select,[role=button],[role=tab],summary").forEach((el) => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if ((r.width < 24 || r.height < 24) && !(el.tagName === "A" && getComputedStyle(el).display === "inline")) { small++; if (smallList.length < 8) smallList.push(name(el).slice(0, 40)); } });
  const rawKeys = [...new Set((text.match(/\b[a-z]+(?:_[a-z0-9]+)+\b|\b[a-z]+\.[a-z_]+(?:\.[a-z_]+)*\b/g) || []).filter((k) => !/^(e\.g|i\.e|canada\.ca|ircc\.gc|gc\.ca)$/.test(k) && !/\.(pdf|png|ca|com|org)$/.test(k)))].slice(0, 15);
  const primaries = [...document.querySelectorAll("button,a")].filter((b) => vis(b) && isPrimary(b)).map((b) => name(b).slice(0, 60));
  const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(vis).map((h) => +h.tagName[1]);
  let skips = 0; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) skips++;
  return {
    title: document.title, url: location.pathname + location.search, dialog: !!document.querySelector("[role=dialog]"),
    h1: [...document.querySelectorAll("h1")].filter(vis).map((h) => clean(h.innerText)),
    sections: out,
    counts: {
      words_on_page: words, words_first_view: firstWords, type_sizes: [...sizes].sort(), type_size_count: sizes.size,
      sections: out.length, fields: out.reduce((n, s) => n + (s.fields?.length || 0), 0), actions: out.reduce((n, s) => n + (s.actions?.length || 0), 0),
      links: out.reduce((n, s) => n + (s.links?.length || 0), 0), foldouts: out.reduce((n, s) => n + (s.foldouts?.length || 0), 0),
      foldouts_without_arrow: out.reduce((n, s) => n + (s.foldouts?.filter((f) => !f.arrow).length || 0), 0),
      primary_buttons: primaries.length, primary_labels: primaries, icon_only_without_tooltip: [...document.querySelectorAll("button")].filter((b) => vis(b) && !clean(b.innerText) && !b.getAttribute("title") && !b.getAttribute("aria-describedby")).length,
      unnamed_controls: [...document.querySelectorAll("button,input,select,textarea")].filter((b) => vis(b) && b.type !== "hidden" && !name(b)).length,
      raw_keys: rawKeys, small_targets: small, small_target_examples: smallList, heading_level_skips: skips, h1_count: hs.filter((h) => h === 1).length,
      sideways_scroll_px: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      page_height_px: document.documentElement.scrollHeight,
      tooltips_title_attr: document.querySelectorAll("[title]").length,
    },
  };
}

const results = [];
for (const t of targets) {
  for (const width of t.widths || [1440, 375]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 812 : 900 }, deviceScaleFactor: 1 });
    await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch {} }, t.actor || "user-A");
    const page = await ctx.newPage();
    const consoleErrors = []; page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
    const t0 = Date.now();
    let error = null;
    try {
      await page.goto(t.base + t.path, { waitUntil: "networkidle", timeout: 30000 });
      if (t.steps) await eval(`(async () => { ${t.steps} })()`);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(500);
    } catch (e) { error = String(e).split("\n")[0]; }
    const loadMs = Date.now() - t0;
    const states = [];
    const snap = async (stateName) => {
      await page.evaluate(() => document.querySelectorAll("details:not([open])").forEach((d) => d.setAttribute("open", "")));
      await page.waitForTimeout(150);
      const info = await page.evaluate(extract);
      await page.evaluate(AXE);
      const axe = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })); });
      let aria = ""; try { aria = await page.locator("body").ariaSnapshot({ timeout: 10000 }); } catch (e) { aria = "(aria snapshot failed) " + e; }
      const sid = `${t.id}${stateName ? "--" + stateName : ""}`;
      fs.writeFileSync(path.join(outdir, "raw", `${sid}@${width}.aria.yaml`), aria);
      const shot = `${sid}@${width}.jpg`;
      await page.screenshot({ path: path.join(outdir, "shots", shot), fullPage: true, type: "jpeg", quality: 55, clip: undefined }).catch(() => {});
      states.push({ state: stateName || "default", shot, ...info, axe });
    };
    if (!error) {
      await snap("");
      if (t.tabs) {
        const tabs = await page.locator("[role=tab]").all();
        for (let i = 1; i < tabs.length; i++) {
          const lab = ((await tabs[i].innerText().catch(() => "")) || `tab${i}`).replace(/[^A-Za-z]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 30);
          await tabs[i].click().catch(() => {}); await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(400);
          await snap(`tab-${lab}`);
        }
      }
    }
    results.push({ id: t.id, label: t.label, actor: t.actor || "user-A", path: t.path, width, load_ms: loadMs, error, console_errors: consoleErrors.slice(0, 5), states });
    console.log(`${t.id} @${width}: ${error ? "ERROR " + error : states.map((s) => `${s.state} w${s.counts.words_on_page} f${s.counts.fields} a${s.counts.actions} p${s.counts.primary_buttons} axe${s.axe.length}`).join(" | ")} (${loadMs} ms)`);
    await ctx.close();
  }
}
fs.writeFileSync(path.join(outdir, `crawl-${path.basename(targetsFile, ".json")}.json`), JSON.stringify(results, null, 1));
await browser.close();
