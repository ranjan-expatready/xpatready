// goose gap-scan v2 — axe + overflow + concise copy. Output JSON to file, summary to console.
const { chromium } = require(process.cwd() + "/node_modules/playwright");
const AxeBuilder = require(process.cwd() + "/node_modules/@axe-core/playwright").default;
const fs = require("node:fs");
const path = require("node:path");
const BASE = "http://localhost:4470";
const OUT = path.join(process.cwd(), "..", "..", "product", "qa", "reports", "2026-10-25-goose-visual");

const routes = [
  ["/", "Programs (Screen 01)"],
  ["/c/73f0c8c2-65fc-46df-a099-bd3835fcf625", "Combination · Visitor visa (in setup)"],
  ["/c/ab801bad-2339-4c84-a946-667a4c992c63", "Combination · LMIA (Live, Release 1)"],
  ["/c/ab801bad-2339-4c84-a946-667a4c992c63/configuration", "Combination · LMIA configuration"],
  ["/library/fields", "Library · Fields"],
  ["/library/sections", "Library · Sections"],
  ["/library/documents", "Library · Document types"],
  ["/library/forms", "Library · Forms"],
  ["/library/checks", "Library · Checks"],
  ["/ai", "AI work (Screen 02)"],
  ["/release", "Review and release"],
  ["/releases", "Releases"],
  ["/activity", "Activity"],
  ["/cases", "Runtime case area"],
];

(async () => {
  const b = await chromium.launch();
  const report = [];
  for (const [route, label] of routes) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} });
    let navErr = null;
    try { await p.goto(BASE + route, { waitUntil: "networkidle" }); } catch (e) { navErr = e.message.split("\n")[0]; }
    await p.waitForTimeout(400);
    const rec = { label, route, navErr };

    // axe
    try {
      const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      rec.axe = { count: r.violations.length, violations: r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes.slice(0,3).map(x => (x.target||[]).join(" ")) })) };
    } catch (e) { rec.axeErr = e.message.split("\n")[0]; }

    // overflow
    rec.overflow = {};
    for (const w of [1440, 1024, 400]) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200);
      rec.overflow[w] = await p.evaluate(() => {
        const de = document.documentElement;
        const over = de.scrollWidth - de.clientWidth;
        const wide = [];
        document.querySelectorAll("body *").forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.right > de.clientWidth + 1) {
            const cls = (el.className && typeof el.className === "string") ? el.className.split(" ")[0] : "";
            wide.push(el.tagName.toLowerCase() + "." + cls + "→" + Math.round(r.right));
          }
        });
        return { over: Math.max(0, over), wide: Array.from(new Set(wide)).slice(0, 10) };
      });
    }

    // concise copy
    await p.setViewportSize({ width: 1440, height: 900 });
    rec.copy = await p.evaluate(() => {
      const t = s => Array.from(document.querySelectorAll(s)).map(e => (e.textContent||"").trim().replace(/\s+/g," ")).filter(Boolean);
      return { h1: t("h1").slice(0,3), h2: t("h2").slice(0,6) };
    });
    report.push(rec);
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, "scan.json"), JSON.stringify(report, null, 2));

  // concise console summary
  for (const r of report) {
    console.log("\n== " + r.label + "  " + r.route + (r.navErr ? "  NAV-ERR: " + r.navErr : "") + " ==");
    if (r.axeErr) console.log("  axeErr: " + r.axeErr);
    else if (r.axe && r.axe.count) {
      console.log("  axe violations: " + r.axe.count);
      for (const v of r.axe.violations) console.log("    - " + v.impact + " " + v.id + " (x" + v.n + ") " + v.help + "  e.g. " + v.sample.join(" | "));
    } else console.log("  axe: clean");
    for (const w of [1024, 400]) {
      const o = r.overflow[w];
      console.log("  overflow@" + w + ": +" + o.over + "px" + (o.wide.length ? "  wide: " + o.wide.join(", ") : ""));
    }
    console.log("  h1: " + JSON.stringify(r.copy.h1) + "  h2: " + JSON.stringify(r.copy.h2));
  }
  await b.close();
  console.log("\nwrote " + path.join(OUT, "scan.json"));
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
