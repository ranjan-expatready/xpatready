// Gate A, step 0: Demo › Load the configured checkpoint… through the screen, as the configuration author (user-A), 1440 px.
//   node walk_c617_load.mjs <port> <outDir>
import { chromium } from "playwright";
const [port, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, baseURL: `http://127.0.0.1:${port}` });
await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-A"));
const p = await ctx.newPage();
await p.goto("/"); await p.waitForLoadState("networkidle");
await p.getByRole("button", { name: /^Demo/ }).click();
await p.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
await p.getByRole("dialog").getByRole("button", { name: /^Load the configured checkpoint$/ }).click();
await p.getByText(/Configured checkpoint loaded in/).first().waitFor({ timeout: 600_000 });
await p.screenshot({ path: `${out}/00-checkpoint-loaded.png` });
console.log((await p.getByText(/Configured checkpoint loaded in/).first().innerText()).slice(0, 120));
await b.close();
