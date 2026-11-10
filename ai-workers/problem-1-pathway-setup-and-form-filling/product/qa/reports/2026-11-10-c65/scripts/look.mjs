// qa C6.5 walk helper: opens one page as a simulated person (localStorage "xr-actor", as the app's "Acting as" box does),
// at a width, waits until it settles, saves a screenshot and prints what a person reads. US$0, read-only.
// Usage: node look.mjs <port> <actor> <path> <shot.png> [width] [fullPage]
import { createRequire } from "node:module";
const { chromium } = createRequire(`${process.cwd()}/`)("playwright"); // run from studio/
const [port, actor, path, shot, width = "1024", full = ""] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" }) /* as lib/browser.ts on Linux */;
const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 }, baseURL: `http://127.0.0.1:${port}` });
await ctx.addInitScript((a) => localStorage.setItem("xr-actor", a), actor);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
await p.goto(path); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
await p.screenshot({ path: shot, fullPage: !!full });
console.log((await p.locator("body").innerText()).replace(/\n{2,}/g, "\n").slice(Number(process.env.FROM ?? 0), Number(process.env.FROM ?? 0) + 6000));
console.log("ERRORS", errs);
await b.close();
