// Usage: node drive.mjs <shotName|-> '<async js using page>'  — connects to the visible Chromium, runs the action,
// prints what a person sees (title, url, headings, buttons, links, alerts, main text head), saves a screenshot.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [, , shot, code = "", mode = "brief"] = process.argv;
const S = new URL("..", import.meta.url).pathname.replace(/\/$/, ""); // the report folder
const browser = await chromium.connectOverCDP("http://localhost:9333");
const ctx = browser.contexts()[0];
let page = ctx.pages().find((p) => !p.url().startsWith("devtools")) ?? (await ctx.newPage());
await page.setViewportSize({ width: 1440, height: 1000 });
page.setDefaultTimeout(15000);
const t0 = Date.now();
try {
  if (code) await eval(`(async () => { ${code} })()`);
} catch (e) { console.log("ACTION ERROR:", String(e).split("\n")[0]); }
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(600);
const ms = Date.now() - t0;
const info = await page.evaluate((mode) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const txt = (el) => (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
  const root = document.querySelector("[role=dialog]") || document.querySelector("main") || document.body;
  const q = (sel) => [...root.querySelectorAll(sel)].filter(vis).map(txt).filter(Boolean);
  const hdr = [...document.querySelectorAll("header select")].map((s) => s.options[s.selectedIndex]?.text);
  return {
    title: document.title, url: location.pathname + location.search, dialog: !!document.querySelector("[role=dialog]"),
    acting: hdr,
    h: q("h1,h2,h3").slice(0, 20),
    buttons: [...new Set(q("button"))].slice(0, 60),
    links: [...new Set(q("a"))].slice(0, 50),
    alerts: [...document.querySelectorAll("[role=alert],[role=status],[data-sonner-toast],li[role=status]")].filter(vis).map(txt).filter(Boolean).slice(0, 8),
    text: txt(root).slice(0, mode === "full" ? 6000 : 1500),
  };
}, mode);
console.log(JSON.stringify({ ms, ...info }, null, 1));
if (shot && shot !== "-") await page.screenshot({ path: `${S}/shots/${shot}.png`, fullPage: false });
// no browser.close(): over CDP it would close the visible browser
process.exit(0);
