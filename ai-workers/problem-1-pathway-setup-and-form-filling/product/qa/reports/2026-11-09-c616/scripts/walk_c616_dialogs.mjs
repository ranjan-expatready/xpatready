// Retake of the three staff dialogs as viewport shots (the walk's full-page shots did not show the fixed dialog). Each
// dialog is opened, its empty submit refused, and then cancelled, so the case does not change. "Keep private…" uses a
// fourth adult added for this retake (Sample Child 22; setup, not under test), as the child of 19 is already private.
//   node walk_c616_dialogs.mjs <port> <caseId> <outDir>
import { chromium } from "playwright";
const [port, id, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, baseURL: `http://127.0.0.1:${port}` });
await c.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
const o = await c.newPage(); await o.goto(`/cases/${id}`); await o.waitForLoadState("networkidle");
const panel = o.locator("section", { has: o.getByRole("heading", { name: "Own links and privacy" }) }).first();
const row = (who) => panel.locator("[data-person]").filter({ hasText: who }).first();
const open = async (who, btn, submit, file) => {
  await row(who).scrollIntoViewIfNeeded(); await row(who).getByRole("button", { name: btn }).click();
  const d = o.getByRole("dialog"); await d.waitFor();
  if (submit) { await d.getByRole("button", { name: submit }).last().click(); await o.waitForTimeout(500); }
  console.log(`[${file}] ${(await d.innerText()).replace(/\s+/g, " ")}`);
  await o.screenshot({ path: `${out}/${file}` }); await d.getByRole("button", { name: /^(Cancel|Keep the link)$/ }).click(); await d.waitFor({ state: "detached" });
};
await open("Sample Partner", "Take back…", "Take back", "17-officer-take-back-empty-refused.png");
await open("Sample Partner", /new address/, "Send to the new address", "21-officer-send-new-address.png");
await open("Sample Child 22", "Keep private…", /^Keep private$/, "23-officer-keep-private-empty-refused.png");
await b.close();
