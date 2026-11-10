// Gate A, step 0: Demo › Load the configured checkpoint… through the screen, as the configuration author, 1024 px.
//   STUDIO_NM=<studio>/package.json node walk_c75_load.mjs <port> <outDir>
import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.STUDIO_NM ?? import.meta.url)("playwright");
const [port, out] = [process.argv[2], process.argv[3]];
const b = await chromium.launch({ executablePath: process.env.PW_CHROME ?? "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 1024, height: 900 }, deviceScaleFactor: 2, baseURL: `http://127.0.0.1:${port}` });
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
