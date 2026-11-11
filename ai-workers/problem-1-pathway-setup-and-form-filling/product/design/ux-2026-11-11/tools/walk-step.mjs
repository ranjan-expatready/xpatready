// node d.mjs <shot|-> '<js using page, click(name), clicks>' [width]
// Connects to the walk browser, runs the action, prints what a person sees; appends to walk.log with the click count.
import { createRequire } from "module"; import fs from "fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [, , shot, code = "", width = "1440"] = process.argv;
const S = "/tmp/claude-0/-home-user-xpatready/749c8643-7491-5bd7-abf6-197ee21dcec6/scratchpad/walk";
const browser = await chromium.connectOverCDP("http://localhost:9334");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => !p.url().startsWith("devtools")) ?? (await ctx.newPage());
await page.setViewportSize({ width: +width, height: +width < 600 ? 812 : 900 });
page.setDefaultTimeout(15000);
let clicks = 0, typed = 0;
const main = () => page.locator("main").first();
const click = async (name, opts = {}) => { const l = page.getByRole(opts.role || "button", { name, exact: !!opts.exact }).nth(opts.nth || 0); await l.click(); clicks++; await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(300); };
const link = (name, o = {}) => click(name, { ...o, role: "link" });
const fill = async (label, v) => { await page.getByLabel(label).first().fill(v); typed++; };
const t0 = Date.now(); let err = null;
try { if (code) await eval(`(async () => { ${code} })()`); } catch (e) { err = String(e).split("\n")[0]; console.log("ACTION ERROR:", err); }
await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
  const txt = (el) => (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
  const root = document.querySelector("[role=dialog]") || document.querySelector("main") || document.body;
  const q = (sel) => [...new Set([...root.querySelectorAll(sel)].filter(vis).map(txt).filter(Boolean))];
  return { url: location.pathname + location.search, title: document.title, dialog: !!document.querySelector("[role=dialog]"), h: q("h1,h2,h3").slice(0, 15), buttons: q("button").slice(0, 45), links: q("a").slice(0, 30),
    alerts: [...document.querySelectorAll("[role=alert],[role=status],[data-sonner-toast]")].filter(vis).map(txt).filter(Boolean).slice(0, 6), words: txt(root).split(" ").length, text: txt(root).slice(0, 900) };
});
console.log(JSON.stringify({ ms: Date.now() - t0, clicks, typed, ...info }, null, 0));
fs.appendFileSync(`${S}/walk.log`, JSON.stringify({ at: new Date().toISOString(), shot, clicks, typed, err, url: info.url, ms: Date.now() - t0, code: code.slice(0, 300) }) + "\n");
if (shot && shot !== "-") await page.screenshot({ path: `${S}/shots/${shot}.jpg`, type: "jpeg", quality: 60 });
process.exit(0);
