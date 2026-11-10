// qa probe (C6.4/C6.5's next step from C6.14): does the line menu's "Upload a file…" open a file chooser in Chromium?
// Mouse and keyboard, on a Visitor visa case of the configured checkpoint (loaded by the Demo menu). Nothing uploaded. US$0.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = join(HERE, "..", "..", "..", "..", "..", "prototype", "studio");
const L: any = await import(join(STUDIO, "acceptance", "lib", "m3.ts"));
const { chromium } = createRequire(join(STUDIO, "package.json"))("playwright");
const PORT = Number(process.argv[2]);
const browser = await chromium.launch(existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {});
const page = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
const B = `http://localhost:${PORT}`;
await page.goto(B); await page.evaluate(() => localStorage.setItem("xr-actor", "user-A")); await page.goto(B, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^Demo/ }).click();
await page.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
await page.getByRole("dialog").getByRole("button", { name: /Load the configured checkpoint/ }).click();
await page.getByText(/Configured checkpoint loaded in/).first().waitFor({ timeout: 600_000 });
const c = await L.openCase(L.needVisitorVisa(), L.FAMILY.slice(0, 2));
await page.evaluate((a: string) => localStorage.setItem("xr-actor", a), c.officer);
await page.goto(`${B}/cases/${c.id}`, { waitUntil: "networkidle" });
const row = page.locator("[data-documents-panel] li[data-line]").filter({ has: page.locator("[data-line-label]", { hasText: /^Passport information page/ }) }).first();
await row.scrollIntoViewIfNeeded();
let events = 0; page.on("filechooser", () => { events++; });
const tryIt = async (how: string, f: () => Promise<void>) => {
  const before = events;
  await row.getByRole("button", { name: /Actions for/ }).click();
  await f(); await page.waitForTimeout(3000);
  console.log(`${events > before ? "CHOOSER" : "NO CHOOSER"}  ${how}`);
  await page.keyboard.press("Escape").catch(() => {});
};
await tryIt("mouse click on menu item", async () => { await page.getByRole("menuitem", { name: /Upload a file/ }).click(); });
await tryIt("keyboard: arrow to item, Enter", async () => { await page.getByRole("menuitem", { name: /Upload a file/ }).focus(); await page.keyboard.press("Enter"); });
await tryIt("direct click on the hidden input (control)", async () => { await page.keyboard.press("Escape"); await row.locator("[data-upload-input]").evaluate((e: HTMLInputElement) => e.click()); });
await browser.close();
