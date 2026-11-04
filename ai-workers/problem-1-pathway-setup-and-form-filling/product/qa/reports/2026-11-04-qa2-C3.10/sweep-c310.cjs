// qa2 C3.10 sweep at 1440 px: every main page and every combination tab, plus extra URLs; flags "box"/"boxes" (P-63) and
// "canonical" in what a person sees, except our own controls (search box, check box, "Tick the box").
const STUDIO = process.argv[2], OUT = process.argv[3], BASE = "http://localhost:4480";
const { chromium } = require(STUDIO + "/node_modules/playwright");
const extra = process.argv.slice(4);
const OK = /\b(search|check|text|combo|select|dialog|tick the) box(es)?\b/gi;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/"); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} });

  const ids = (process.env.IDS || "").split(" ").filter(Boolean);
  const pages = ["/", "/structure", "/review", "/review/proposals", "/library/fields", "/library/sections", "/library/documents", "/library/forms", "/library/checks", "/library/rules", "/release", "/ai", "/releases", "/activity"];
  for (const id of ids) for (const t of ["overview", "forms", "questionnaires", "documents", "preview", "tests", "review"]) pages.push(`/c/${id}/${t}`);
  pages.push(...extra);
  let hits = 0;
  for (const u of pages) {
    await p.goto(BASE + u); await p.waitForTimeout(2500);
    const t = (await p.locator("body").innerText()).replace(OK, "");
    const m = [...t.matchAll(/[^\n]{0,70}\b(box(es)?|canonical)\b[^\n]{0,70}/gi)].map((x) => x[0].trim());
    if (m.length) { hits += m.length; console.log("HIT  " + u + "  ::  " + [...new Set(m)].slice(0, 4).join("  ||  ")); await p.screenshot({ path: OUT + "/hit-" + u.replace(/[^a-z0-9]+/gi, "_").slice(0, 60) + ".png", fullPage: true }); }
  }
  console.log(`${pages.length} pages, ${ids.length} combinations, ${hits} hits, ${errs.length} page errors${errs.length ? ": " + errs.slice(0, 2).join(" | ") : ""}`);
  await b.close(); process.exit(hits ? 1 : 0);
})().catch((e) => { console.error("SWEEP ERROR " + e.message); process.exit(2); });
