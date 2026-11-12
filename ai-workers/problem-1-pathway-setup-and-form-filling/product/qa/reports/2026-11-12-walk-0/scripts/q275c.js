const card = () => page.locator("main").getByText("IMM 5257 for Sample Principal A", { exact: true }).first().locator("xpath=ancestor::*[.//button[starts-with(normalize-space(),'Generate')]][1]");
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
{ const s = new Date().getUTCSeconds(); if (s > 3) await page.waitForTimeout((61 - s) * 1000); }
const t0 = Date.now(); console.log("copy A start", new Date().toISOString());
await card().getByRole("button", { name: /Generate a new copy/ }).click(); await page.waitForTimeout(2600);
console.log("copy A done", new Date().toISOString());
await page.locator("main").getByText("Funds available for the stay, in Canadian dollars", { exact: true }).last().locator("xpath=following::button[normalize-space()='Edit'][1]").click(); await page.waitForTimeout(500);
const d = page.getByRole("dialog"); await d.getByLabel("Funds available for the stay, in Canadian dollars").fill("7000"); await d.getByRole("button", { name: "Save" }).click(); await page.waitForTimeout(1200);
await page.locator("main").getByText("Details of visit to Canada", { exact: true }).last().locator("xpath=following::button[normalize-space()='Confirm section'][1]").click(); await page.waitForTimeout(1200);
await card().getByRole("button", { name: /Generate a new copy/ }).click(); await page.waitForTimeout(2600);
console.log("copy B done", new Date().toISOString(), "elapsed", Date.now() - t0, "ms");
console.log(((await card().innerText()).match(/Copy of [^\n]*/g) || []).join(" / "));
