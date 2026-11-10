// screens lane walk for QA-355 (C7.8, P-352), as the case officer at 1440 px: every press is a Playwright click or key on
// what the page shows; nothing here calls the API. On a filing at Ready · 100% (qa's walk_c78_setup.mts, the configured
// checkpoint), the release's forms are read, the form that fills is added through "+ Add a form", the same forms are read
// again, and the added form's copy is made (C7.1's first step). Forms are found by what the panel offers ("Fills from the
// case"), never by a fixed number (P-319). US$0, no AI.
//   (from studio/) node ../../product/screens/qa-355/walk_qa355.mjs <port> <caseId> <outDir>
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
const { chromium } = createRequire(`${process.cwd()}/package.json`)("playwright"); // run from studio/ (its playwright)
const [port, caseId, out] = process.argv.slice(2);
const b = await chromium.launch(existsSync("/opt/google/chrome/chrome") || process.platform === "darwin" ? { channel: "chrome" } : {}); // as acceptance/lib/browser.ts
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, baseURL: `http://127.0.0.1:${port}` });
await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
p.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
let n = 0; const shot = async (name, loc) => { n++; const f = `${out}/${String(n).padStart(2, "0")}-${name}.png`; if (loc) { await loc.scrollIntoViewIfNeeded(); await loc.screenshot({ path: f }); } else await p.screenshot({ path: f }); console.log(`shot ${f}`); };
const say = (k, v) => console.log(`[${k}] ${String(v).replace(/\s+/g, " ").slice(0, 700)}`);
const readiness = async () => { const r = p.locator("[data-readiness]"); await r.waitFor(); return r; };
const rowOf = (form) => p.getByText(new RegExp(`^${form} for Sample Client W`)).first().locator("xpath=ancestor::*[self::li or self::article][1]");
const releaseForms = async () => (await p.getByText(/^IMM [0-9A-Z ]+ for Sample Client W/).allInnerTexts()).map((t) => t.replace(/ for Sample Client W.*/s, "")).filter((v, i, a) => v && a.indexOf(v) === i);
const readRows = async (label, forms) => { const txt = {}; for (const f of forms) { const r = rowOf(f); txt[f] = (await r.innerText().catch(() => "(row not found)")).replace(/\s+/g, " "); say(`${label} ${f}`, txt[f]); } return txt; };

await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle");
const rd0 = await readiness(); say("ready-to-file before", await rd0.innerText()); await shot("ready-to-file-before", rd0);
const forms = await releaseForms(); say("release forms", forms.join(", "));
const before = await readRows("before", forms);
for (const f of forms.filter((x) => /^IMM (5257|5645)$/.test(x))) await shot(`before-${f.replace(/ /g, "")}`, rowOf(f));

const addBtn = p.getByRole("button", { name: /Add a form to .*filing/ }).first();
await addBtn.scrollIntoViewIfNeeded(); await addBtn.click();
const panel = p.getByRole("dialog"); await panel.waitFor();
await panel.getByRole("combobox").fill("IMM"); await p.waitForTimeout(1200);
const rows = await panel.locator("[data-addable]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-addable")}|${e.getAttribute("data-kind")}|${e.getAttribute("data-refused") ?? ""}`));
const fills = rows.find((r) => r.split("|")[1] === "fills" && !r.split("|")[2])?.split("|")[0];
say("fills pick", fills);
await panel.getByRole("combobox").fill(fills); await p.waitForTimeout(1000);
await panel.locator(`[data-addable="${fills}"]`).click();
const picked = panel.locator(`[data-picked="${fills}"]`); await picked.waitFor(); await p.waitForTimeout(600);
await shot("fills-picked", picked);
await panel.getByRole("button", { name: /^Add to .*filing$/ }).click();
await p.getByText(new RegExp(`^${fills} for Sample Client W`)).first().waitFor({ timeout: 20_000 });
await p.waitForTimeout(1500); // the panel closes itself after Add
if (await p.getByRole("dialog").isVisible().catch(() => false)) await p.getByRole("dialog").getByRole("button", { name: /^Close$/ }).first().click({ timeout: 5_000 }).catch(() => {});

const after = await readRows("after", forms);
for (const f of forms.filter((x) => /^IMM (5257|5645)$/.test(x))) await shot(`after-${f.replace(/ /g, "")}`, rowOf(f));
const rd1 = await readiness(); say("ready-to-file after add", await rd1.innerText()); await shot("ready-to-file-after-add", rd1);
say("release forms unchanged", forms.every((f) => before[f] === after[f]) ? "yes" : `NO: ${forms.filter((f) => before[f] !== after[f]).join(", ")}`);

const gen = rowOf(fills).getByRole("button", { name: /Generate a (new )?copy/ });
if (await gen.count()) { await gen.first().scrollIntoViewIfNeeded(); await gen.first().click(); await p.getByText(/form fields written/).first().waitFor({ timeout: 90_000 }).catch(() => {}); await p.waitForTimeout(1500); }
say("added form after its copy", await rowOf(fills).innerText().catch(() => "(row not found)")); await shot("added-form-copy", rowOf(fills));
say("page errors", errors.length ? errors.join(" | ") : "none");
await b.close();
