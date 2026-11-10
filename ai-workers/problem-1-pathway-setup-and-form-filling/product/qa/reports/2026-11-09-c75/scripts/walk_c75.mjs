// qa gate A walk of C7.5 by screens (P-317, P-348 (3)), as the case officer (user-O). Every press is a Playwright mouse
// click or keyboard entry on what the page shows; nothing here calls the API. Path: the case → Open Review → run card
// (Saved US$0, Live refused) → Run review (Saved) → findings (High/Low, both reasons, quote, Show on the form) → decide
// two (Acknowledge, Dismiss; an empty reason refused first) → back to the case → the next capability's first step: the
// open AI findings on Ready to file (C7.6) as warnings, never blocks, one passed with a reason (empty refused first).
// Never presses a priced button: Live is checked to be disabled and is never clicked.
//   node walk_c75.mjs <port> <caseId> <outDir> [width=1024]
import { createRequire } from "node:module";
const require = createRequire(process.env.STUDIO_NM ?? import.meta.url);
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const [port, caseId, out, w = "1024"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.PW_CHROME ?? "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: Number(w), height: 900 }, deviceScaleFactor: 2, baseURL: `http://127.0.0.1:${port}` });
await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const sent = []; p.on("request", (r) => { if (r.method() !== "GET") sent.push(`${r.method()} ${new URL(r.url()).pathname} ${(r.postData() ?? "").slice(0, 160)}`); });
p.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
let n = 0; const shot = async (name, loc) => { n++; const f = `${out}/${String(n).padStart(2, "0")}-${name}-${w}.png`; if (loc) { await loc.scrollIntoViewIfNeeded(); await loc.screenshot({ path: f }); } else await p.screenshot({ path: f, fullPage: false }); console.log(`[shot] ${f.split("/").pop()}`); };
const say = (k, v) => console.log(`[${k}] ${String(v).replace(/\s+/g, " ").slice(0, 1200)}`);
const axe = async (where) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa"]).analyze(); say(`axe ${where}`, r.violations.length ? r.violations.map((v) => `${v.id}(${v.nodes.length})`).join(", ") : "0 violations"); };
const sideways = async (where) => say(`sideways scroll ${where}`, await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 ? `YES ${document.documentElement.scrollWidth} > ${window.innerWidth}` : "none"));

// 1. The case, as the case officer.
await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle");
say("header", await p.getByText(/^Readiness:/).first().innerText().catch(() => "(no readiness header)"));
const rd0 = p.locator("[data-readiness]"); await rd0.waitFor();
const lines0 = await rd0.locator("[data-line]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-code")}|${e.getAttribute("data-severity")}`));
say("ready-to-file lines before", `${lines0.length}: findings ${lines0.filter((l) => l.startsWith("finding|")).length}`);
const panel = p.locator("[data-findings]").first();
await panel.scrollIntoViewIfNeeded(); say("case review panel", await panel.innerText()); await shot("case-review-panel", panel);
await panel.locator("[data-open-review]").click();
await p.waitForURL(/\/review$/); await p.waitForLoadState("networkidle");

// 2. The Review page and its run card: cost first.
say("h1", await p.locator("h1").innerText());
const card = p.locator("[data-run-card]"); await card.locator("[data-run-modes]").waitFor({ timeout: 30_000 });
const sel = card.locator("select");
say("person / form", `${await sel.nth(0).locator("option:checked").innerText()} / ${await sel.nth(1).locator("option:checked").innerText()} (forms: ${(await sel.nth(1).locator("option").allInnerTexts()).join(", ")})`);
if ((await sel.nth(1).inputValue()) !== "IMM 5257") await sel.nth(1).selectOption("IMM 5257");
const saved = card.locator('[data-mode="replay"]'), live = card.locator('[data-mode="live"]');
say("Saved row", `disabled=${await saved.getAttribute("data-mode-disabled")} · ${await saved.innerText()}`);
say("Live row", `disabled=${await live.getAttribute("data-mode-disabled")} · ${await live.innerText()}`);
say("Live radio disabled", await live.locator("input").isDisabled());
const runBtn = card.locator("[data-run-review]");
say("button", await runBtn.innerText());
await shot("run-card", card); await axe("review page before run"); await sideways("review page");
if ((await saved.getAttribute("data-mode-disabled")) === "true") {
  // Saved refused (no saved review for these answers): record what the person sees, then the next step's screen.
  say("button disabled", await runBtn.isDisabled()); say("card says", await card.innerText());
  await p.locator('nav[aria-label="Path"] a').nth(1).click(); await p.waitForURL(new RegExp(`/cases/${caseId}$`)); await p.waitForLoadState("networkidle");
  const rdx = p.locator("[data-readiness]"); await rdx.waitFor();
  say("finding lines on Ready to file", await rdx.locator('[data-line][data-code="finding"]').count());
  say("case review panel after", await p.locator("[data-findings]").first().innerText());
  await shot("ready-to-file-no-ai-review", rdx);
  say("non-GET requests the page sent", sent.length); sent.forEach((x) => console.log("   ", x));
  say("live requests sent", sent.filter((x) => /"mode":"live"/.test(x)).length);
  say("page errors / 5xx", errors.length ? errors.join(" | ") : "none");
  await b.close(); process.exit(0);
}

// 3. Run review (Saved, US$0.00): by keyboard only (focus the Saved radio, Space; Tab to the button, Enter).
await saved.locator("input").focus(); await p.keyboard.press("Space");
await runBtn.focus(); await p.keyboard.press("Enter");
const res = card.locator("[data-run-result]"); await res.getByText(/Review run|did not/).first().waitFor({ timeout: 120_000 });
say("result", await res.innerText()); await shot("after-saved-run", card);

// 4. Findings: AI rows with agreement, reasons and the quote.
const rows = p.locator("[data-finding]");
await p.waitForTimeout(800);
const all = await rows.evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-finding"), state: e.getAttribute("data-finding-state"), text: e.innerText.replace(/\s+/g, " ").slice(0, 400), reasons: e.querySelectorAll("[data-finding-reasons] li").length, quote: !!e.querySelector("[data-finding-quote]") })));
say("findings rows", all.length);
all.forEach((f) => console.log("   ", `${f.state} · reasons ${f.reasons} · quote ${f.quote} · ${f.text}`));
say("counts", await p.locator("[data-findings-counts]").first().innerText().catch(() => "(none)"));
await shot("findings", p.locator("[data-findings]").first());
const ai = all.filter((f) => f.quote);
const low = ai.filter((f) => /\bLow\b/.test(f.text)), high = ai.filter((f) => /\bHigh\b/.test(f.text));
say("AI rows", `${ai.length} (High ${high.length}, Low ${low.length}); every Low has 2 reasons: ${low.every((f) => f.reasons === 2)}; every AI row says Replayed: ${ai.every((f) => /Replayed/i.test(f.text))}`);

// 5. Show on the form: the quoted line is highlighted in "What the form says".
const firstAi = rows.filter({ has: p.locator("[data-finding-quote]") }).first();
await firstAi.getByRole("button", { name: "Show on the form" }).click(); await p.waitForTimeout(600);
const shown = p.locator('[data-source-shown="true"]');
say("show on the form", `${await shown.count()} line(s) highlighted: ${(await shown.first().innerText().catch(() => "")).slice(0, 200)} · pressed=${await firstAi.getByRole("button", { name: "Show on the form" }).getAttribute("aria-pressed")}`);
await shot("show-on-the-form");

// 6. Decide two AI findings: Acknowledge (empty reason refused on its field first), then Dismiss.
const openAi = () => rows.filter({ has: p.locator("[data-finding-quote]") }).and(p.locator('[data-finding-state="open"]'));
say("open AI rows before deciding", await openAi().count());
const target = openAi().first(); const targetId = await target.getAttribute("data-finding");
await target.getByRole("button", { name: /^Acknowledge/ }).click();
const dlg = p.getByRole("dialog"); await dlg.waitFor();
await dlg.getByRole("button", { name: /^Acknowledge$/ }).click(); await p.waitForTimeout(700);
say("acknowledge with an empty reason", await dlg.innerText()); await shot("acknowledge-empty-refused", dlg);
await dlg.getByRole("textbox").fill("Checked the passport page against the form: as printed (Sample, qa gate A).");
await dlg.getByRole("button", { name: /^Acknowledge$/ }).click(); await dlg.waitFor({ state: "hidden" });
await p.waitForTimeout(800);
const acked = p.locator(`[data-finding="${targetId}"]`);
say("acknowledged row", `${await acked.getAttribute("data-finding-state")} · ${await acked.innerText()}`); await shot("acknowledged", acked);
const target2 = openAi().first(); const target2Id = await target2.getAttribute("data-finding");
await target2.getByRole("button", { name: /^Dismiss/ }).click(); await dlg.waitFor();
await dlg.getByRole("textbox").fill("Does not apply: the client has no other travel document (Sample, qa gate A).");
await dlg.getByRole("button", { name: /^Dismiss$/ }).click(); await dlg.waitFor({ state: "hidden" }); await p.waitForTimeout(800);
say("dismissed row", `${await p.locator(`[data-finding="${target2Id}"]`).getAttribute("data-finding-state").catch(() => "(row gone from the default list)")}`);
say("counts after deciding", await p.locator("[data-findings-counts]").first().innerText().catch(() => "(none)"));
const stillOpen = await openAi().count(); say("open AI rows after deciding", stillOpen);
await shot("after-deciding", p.locator("[data-findings]").first()); await axe("review page after run");

// 7. Next capability's first step: back to the case by the path link → Ready to file (C7.6).
await p.locator('nav[aria-label="Path"] a').nth(1).click(); await p.waitForURL(new RegExp(`/cases/${caseId}$`)); await p.waitForLoadState("networkidle");
const rd = p.locator("[data-readiness]"); await rd.waitFor(); await p.waitForTimeout(800);
say("header after", await p.getByText(/^Readiness:/).first().innerText().catch(() => "(none)"));
const fl = rd.locator('[data-line][data-code="finding"]');
const fWords = await fl.evaluateAll((els) => els.map((e) => `${e.getAttribute("data-severity")} · ${e.querySelector("[data-words]")?.textContent?.slice(0, 220)}`));
say("finding lines on Ready to file", fWords.length); fWords.forEach((x) => console.log("   ", x));
say("finding lines that block", fWords.filter((x) => x.startsWith("block")).length);
say("ready-to-file summary", (await rd.innerText()).split("\n").slice(0, 6).join(" | "));
await shot("ready-to-file-findings", fl.count() ? fl.first() : rd);
await shot("ready-to-file", rd);
if (await fl.count()) {
  const line = fl.first(); const key = await line.getAttribute("data-line");
  await line.getByRole("button", { name: /^Pass with a reason/ }).click();
  const form = line.locator("[data-pass-form]"); await form.waitFor();
  await form.getByRole("button", { name: /^Pass$/ }).click(); await p.waitForTimeout(700);
  say("pass with an empty reason", await form.innerText()); await shot("pass-empty-refused", line);
  await form.getByRole("textbox").fill("The AI finding was checked by the case officer; the form is right as printed (Sample, qa gate A).");
  await form.getByRole("button", { name: /^Pass$/ }).click(); await p.waitForTimeout(1500);
  say("line after pass", await p.locator(`[data-line="${key}"]`).count() ? await p.locator(`[data-line="${key}"]`).innerText() : "(line no longer open)");
  say("finding lines left", await rd.locator('[data-line][data-code="finding"]').count());
  say("ready-to-file summary after pass", (await rd.innerText()).split("\n").slice(0, 6).join(" | "));
  await shot("ready-to-file-after-pass", rd);
}
await axe("case page"); await sideways("case page");
say("non-GET requests the page sent", sent.length); sent.forEach((x) => console.log("   ", x));
say("live requests sent", sent.filter((x) => /"mode":"live"/.test(x)).length);
say("page errors / 5xx", errors.length ? errors.join(" | ") : "none");
await b.close();
