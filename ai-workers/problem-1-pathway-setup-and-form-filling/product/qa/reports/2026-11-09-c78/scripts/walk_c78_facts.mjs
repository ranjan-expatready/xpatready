// Read-only follow-up on the walk's case: the added IMM 0008 row (its copy, its "Facts to answer or confirm"), 1024 px.
import { chromium } from "playwright";
const [port, caseId, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1024, height: 900 }, deviceScaleFactor: 2, baseURL: `http://127.0.0.1:${port}` });
await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
const p = await ctx.newPage();
await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
const row = p.getByText("IMM 0008 for Sample Client W").first().locator("xpath=ancestor::*[self::li or self::article][1]");
for (const s of await row.locator("summary").all()) { await s.click().catch(() => {}); }
await p.waitForTimeout(500);
console.log((await row.innerText()).slice(0, 3500));
await row.scrollIntoViewIfNeeded(); await row.screenshot({ path: `${out}/15-fills-row-facts-and-copy.png` });
const links = await row.locator("a, button").evaluateAll((els) => els.map((e) => `${e.tagName}:${e.innerText.trim().slice(0, 60)}${e.getAttribute("href") ? " → " + e.getAttribute("href") : ""}`));
console.log("CONTROLS", JSON.stringify(links));
await b.close();
