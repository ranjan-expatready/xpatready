// qa gate A walk of C7.8 by screens (P-317, P-348 (3)), as the case officer, 1024 px, the image's Chrome. Every press is a
// Playwright mouse click or keyboard entry on what the page shows; nothing here calls the API. Ends at the next capability's
// first step: the added forms on Ready to file (C7.6/C7.10), the blank one's CRITICAL line passed with a reason, and the
// filled one's copy made from the case (C7.1).
//   node walk_c78.mjs <port> <caseId> <outDir>
import { chromium } from "playwright";
const [port, caseId, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1024, height: 900 }, deviceScaleFactor: 2, baseURL: `http://127.0.0.1:${port}`, acceptDownloads: true });
await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
p.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
let n = 0; const shot = async (name, loc) => { n++; const f = `${out}/${String(n).padStart(2, "0")}-${name}.png`; if (loc) { await loc.scrollIntoViewIfNeeded(); await loc.screenshot({ path: f }); } else await p.screenshot({ path: f }); console.log(`[shot] ${f.split("/").pop()}`); };
const say = (k, v) => console.log(`[${k}] ${String(v).replace(/\s+/g, " ").slice(0, 900)}`);
const readiness = async () => { const r = p.locator("[data-readiness]"); await r.waitFor(); return r; };
const header = async () => say("header", (await p.getByText(/^Readiness:/).first().innerText()));

await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle");
await header();
const rd0 = await readiness(); say("ready-to-file before", await rd0.innerText());
await shot("ready-to-file-before", rd0);
const addBtn = p.getByRole("button", { name: /Add a form to .*filing/ }).first();
await addBtn.scrollIntoViewIfNeeded(); await shot("prepare-application-add-a-form");
await addBtn.click();
const panel = p.getByRole("dialog"); await panel.waitFor();
await p.waitForTimeout(800); await shot("panel-opened");
const box = panel.getByRole("combobox");
await box.fill("IMM"); await p.waitForTimeout(1200);
const rows = await panel.locator("[data-addable]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-addable")}|${e.getAttribute("data-kind")}|${e.getAttribute("data-refused") ?? ""}|${e.innerText.replace(/\s+/g, " ").slice(0, 140)}`));
say("library rows", rows.length); rows.forEach((r) => console.log("   ", r));
await shot("search-imm");
const fills = rows.find((r) => r.split("|")[1] === "fills" && !r.split("|")[2])?.split("|")[0];
const blank = rows.find((r) => r.split("|")[1] === "blank" && !r.split("|")[2])?.split("|")[0];
const onRel = rows.find((r) => r.split("|")[2] === "on_release")?.split("|")[0];
say("picks", `fills=${fills} blank=${blank} release=${onRel}`);

// A release form: refused with why.
await box.fill(onRel); await p.waitForTimeout(1000);
const relRow = panel.locator(`[data-addable="${onRel}"]`);
say("release form row", `aria-disabled=${await relRow.getAttribute("aria-disabled")} · ${await relRow.innerText()}`); await shot("release-form-refused", relRow);
await relRow.click({ force: true }).catch(() => {}); await p.waitForTimeout(500);
say("picked after clicking a refused row", await panel.locator("[data-picked]").count());

// A form that fills from the case.
await box.fill(fills); await p.waitForTimeout(1000);
await panel.locator(`[data-addable="${fills}"]`).click();
const pickedF = panel.locator(`[data-picked="${fills}"]`); await pickedF.waitFor(); await p.waitForTimeout(800);
say("fills picked", await pickedF.innerText()); await shot("fills-picked-coverage", pickedF);
await panel.getByRole("button", { name: /^Add to .*filing$/ }).click();
await p.locator(`[data-row-form^="${fills}|"], :text("${fills} for Sample Client W")`).first().waitFor({ timeout: 20_000 }).catch(() => {});
await p.waitForTimeout(1500);
say("panel open after add", await p.getByRole("dialog").isVisible().catch(() => false));
if (await p.getByRole("dialog").isVisible().catch(() => false)) { await shot("after-add-fills-panel"); await p.getByRole("dialog").getByRole("button", { name: /^Close$/ }).first().click(); }
const fRow = p.locator("li, article, section").filter({ hasText: new RegExp(`^${fills} for Sample Client W`) }).last();
const fRowAny = p.getByText(`${fills} for Sample Client W`).first();
await fRowAny.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
say("fills row", await fRowAny.locator("xpath=ancestor::*[self::li or self::article][1]").innerText().catch(() => "(row not found)"));
await shot("fills-row-added");

// A blank official PDF.
await addBtn.scrollIntoViewIfNeeded(); await p.getByRole("button", { name: /Add a form to .*filing/ }).first().click();
const panel2 = p.getByRole("dialog"); await panel2.waitFor();
await panel2.getByRole("combobox").fill(blank); await p.waitForTimeout(1000);
await panel2.locator(`[data-addable="${blank}"]`).click();
const pickedB = panel2.locator(`[data-picked="${blank}"]`); await pickedB.waitFor(); await p.waitForTimeout(600);
say("blank picked", await pickedB.innerText()); await shot("blank-picked", pickedB);
await panel2.getByRole("button", { name: /^Add to .*filing$/ }).click();
const bRow = p.locator(`[data-blank-form="${blank}"]`); await bRow.waitFor({ timeout: 20_000 });
if (await p.getByRole("dialog").isVisible().catch(() => false)) await p.getByRole("dialog").getByRole("button", { name: /^Close$/ }).first().click();
await p.waitForTimeout(800);
say("blank row", await bRow.innerText()); await shot("blank-row-download-upload", bRow);
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 15_000 }).catch(() => null), bRow.getByRole("button", { name: /Download the blank PDF/ }).click()]);
if (dl) { const path = await dl.path(); const { readFileSync } = await import("node:fs"); const buf = readFileSync(path); say("blank download", `${dl.suggestedFilename()} ${buf.length} bytes, starts ${buf.subarray(0, 8).toString("latin1")}, sha256 ${(await import("node:crypto")).createHash("sha256").update(buf).digest("hex")}`); } else say("blank download", "no download event");

// Next capability's first step: Ready to file (C7.6, C7.10).
await p.waitForTimeout(1000); await header();
const rd = await readiness(); say("ready-to-file after adds", await rd.innerText());
await shot("ready-to-file-after-adds", rd);
const crit = rd.locator('[data-code="hand_filled_copy"]');
say("hand_filled_copy lines", await crit.count());
if (await crit.count()) {
  say("critical line", `${await crit.first().getAttribute("data-severity")} · ${await crit.first().innerText()}`);
  await crit.first().getByRole("button", { name: /Pass with a reason/ }).click();
  await crit.first().getByRole("button", { name: /^Pass$/ }).click(); await p.waitForTimeout(800);
  say("empty reason", await crit.first().innerText()); await shot("pass-empty-reason-refused", crit.first());
  await crit.first().getByRole("textbox").fill("The client is completing the paper copy by hand; scan to follow (Sample, qa gate A).");
  await crit.first().getByRole("button", { name: /^Pass$/ }).click(); await p.waitForTimeout(1500);
}
await header();
const rd2 = await readiness(); say("ready-to-file after pass", await rd2.innerText()); await shot("ready-to-file-after-pass", rd2);

// The filled added form: its copy is made from the case (C7.1's first step), by the row's own button.
const gen = p.getByText(`${fills} for Sample Client W`).first().locator("xpath=ancestor::*[self::li or self::article][1]").getByRole("button", { name: /Generate a (new )?copy/ });
if (await gen.count()) { await gen.first().scrollIntoViewIfNeeded(); await gen.first().click(); await p.getByText(/form fields written/).first().waitFor({ timeout: 90_000 }).catch(() => {}); await p.waitForTimeout(1500); }
const fRow2 = p.getByText(`${fills} for Sample Client W`).first().locator("xpath=ancestor::*[self::li or self::article][1]");
say("fills row after copy", await fRow2.innerText().catch(() => "(row not found)")); await fRow2.scrollIntoViewIfNeeded().catch(() => {}); await shot("fills-copy-made");
await header();
const rd3 = await readiness(); say("ready-to-file end", await rd3.innerText()); await shot("ready-to-file-end", rd3);
say("page errors", errors.length ? errors.join(" | ") : "none");
await b.close();
