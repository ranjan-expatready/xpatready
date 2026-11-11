// Breadth-first link discovery: every same-origin route reachable by links from the seeds, one example per route
// pattern (id-like path segments become :id). Usage: node discover.mjs <base> <actor> <maxPages> <seed...>
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [, , base, actor, maxPages, ...seeds] = process.argv;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch {} }, actor);
const page = await ctx.newPage();
const pattern = (p) => p.split("?")[0].split("/").map((s) => (/\d/.test(s) && s.length > 6) || s.length > 24 || /^[0-9a-f-]{20,}$/.test(s) ? ":id" : s).join("/");
const seen = new Map(); const queue = [...seeds];
let n = 0;
while (queue.length && n < +maxPages) {
  const p = queue.shift(); const pat = pattern(p);
  if (seen.has(pat)) continue; seen.set(pat, p); n++;
  try {
    await page.goto(base + p, { waitUntil: "networkidle", timeout: 20000 }); await page.waitForTimeout(300);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/") && !h.startsWith("/api")));
    for (const h of hrefs) if (!seen.has(pattern(h))) queue.push(h);
  } catch (e) { console.error("fail", p, String(e).split("\n")[0]); }
}
for (const [pat, ex] of [...seen.entries()].sort()) console.log(pat + "\t" + ex);
await browser.close();
