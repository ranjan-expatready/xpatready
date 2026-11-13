// C6.17 A multi-stage case, by screens (B139; board screens/B139/design/draft-multi-stage.html), on the configured
// checkpoint with its Sample route "Study, then work". The case officer's journey: Open a case on the work permit with
// "Earlier stages" (the study permit done before we started, its UCI and end date) → the stage strip with the deadline
// (Sample) → the done-before stage's panel → a case on the study permit → "Start next stage" dialog (what comes along, what
// is asked again, the documents on the checklist, the reason, "This cannot be undone") → a start without the reason: the
// error summary and the field → the start → the toast, focus on the strip's heading → the ended stage's panel, read only.
// P-444 (QA-375): before the start the officer uploads the study permit's passport copy on the Documents panel (C6.4); after
// it the work permit's own lines show "On file from Study permit …: check it for this application". axe (WCAG 2.2 A/AA) per state, 1440 and 1024 px, no sideways scroll;
// screenshots (deviceScaleFactor 1) in product/screens/B139/screenshots/. Review M3 and M4 (round 1) fail-first here.
// No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c617b 4446 start && tsx studio/tests/check_c617_stages_browser.ts 4446 xr_studio_screens_c617b
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { chromium } from "playwright";
import { AUTHOR, OFFICER, PORT, sql } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "B139", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); return !!c; };
const post = (path: string, body: unknown) => new Promise<{ status: number }>((done) => {
  const data = JSON.stringify(body);
  const rq = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method: "POST", timeout: 1_200_000, headers: { "content-type": "application/json", "x-actor": AUTHOR, "content-length": Buffer.byteLength(data) } }, (r) => { r.resume(); r.on("end", () => done({ status: r.statusCode ?? 0 })); });
  rq.on("timeout", () => rq.destroy(new Error("no answer in 20 minutes"))); rq.on("error", () => done({ status: 0 })); rq.end(data);
});

const reset = await post("/demo/reset", { confirm: "RESET" });
const load = reset.status < 300 ? await post("/demo/load", { sample: "configured" }) : reset;
ok("setup: the configured checkpoint loads its Sample route (fails, never skips, when it is missing)", load.status < 300 && Number(sql("select count(*) from route") ?? 0) >= 1, { load: load.status });
if (load.status >= 300) process.exit(1);

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage(); const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), OFFICER);
const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30_000 }); await p.waitForTimeout(300); };
let n = 0;
/** `tag`: a state added later (P-444) is named by its tag, so the numbered screenshots keep their names. */
async function state(name: string, scope: string, widths = [1440, 1024], tag?: string) {
  if (!tag) n++; await settle();
  for (const w of widths) {
    await p.setViewportSize({ width: w, height: w === 1440 ? 900 : 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: join(SHOTS, `C617-${tag ?? String(n).padStart(2, "0")}-${name}-${w}.png`) });
    ok(`${w} px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  const v = (await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`C6.17 axe: ${name}: no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
}
const run = Date.now().toString(36).slice(-4);
async function openCase(combo: string, ref: string, earlier: boolean) {
  await p.goto(`${BASE}/cases`); await settle(); await p.getByRole("button", { name: "Open a case" }).click();
  const sel = p.getByLabel("Combination (released)"); await sel.selectOption((await sel.locator("option", { hasText: combo }).first().getAttribute("value"))!);
  if (earlier) { await p.getByLabel("UCI (optional)").fill("12345678"); await p.getByLabel("Study permit valid until (optional)").fill("2027-02-03"); }
  await p.getByLabel("Your own reference (optional)").fill(ref); await p.getByLabel("Principal applicant's name").fill("Sample Client A");
}

try {
  // ---------------------------------------------------------------- open at a later stage
  await openCase("LMIA", `C617B-W-${run}`, true);
  ok("C6.17 BR-3: Open a case on the work permit shows \"Earlier stages\": the study permit, Done before we started, with its key details", /Done before we started/.test(await p.locator("[data-earlier-stages]").innerText()));
  await state("open-case-earlier-stages", "[role=dialog]");
  await p.getByRole("button", { name: "Open case" }).click(); await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/); await p.locator("[data-stage-strip]").waitFor();
  const strip = await p.locator("[data-stage-strip]").innerText();
  ok("C6.17 BR-1, BR-8: the strip shows the study permit Done before we started and the current stage's deadline, labelled Sample (3 Feb 2027)", /Done before we started/.test(strip) && /Current/.test(strip) && /3 Feb 2027/.test(strip) && /Sample/.test(strip), strip);
  await state("strip-later-stage", "[data-stage-strip]");
  ok("C6.17 review M3: no button inside a stage chip's button (nested-interactive)", await p.locator("[data-stage] button").count() === 0);
  await p.locator('[data-stage="study"]').focus(); await p.keyboard.press("Enter"); await p.locator("[data-stage-panel]").waitFor();
  ok("C6.17 BR-3: the done-before stage's panel shows its key details, entered by the case officer", /entered by the case officer/.test(await p.locator("[data-stage-panel]").innerText()));
  await state("done-before-panel", "[role=dialog]");
  await p.keyboard.press("Escape");

  // ---------------------------------------------------------------- Start next stage
  await openCase("Outside Canada", `C617B-S-${run}`, false);
  await p.getByRole("button", { name: "Open case" }).click(); await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/); await p.locator("[data-start-next]").waitFor(); await settle();
  // P-444 (QA-375): the study permit's checklist is worked out; the officer uploads the passport copy through its menu.
  const passport = p.locator("[data-documents-panel] [data-line]").filter({ has: p.locator("[data-line-label]", { hasText: /^Passport information page copy$/ }) }).first();
  await passport.waitFor(); await passport.locator("[data-line-menu]").click();
  const chooser = p.waitForEvent("filechooser"); await p.locator('[data-action="upload"]').click();
  await (await chooser).setFiles({ name: "sample-passport-study.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% Sample synthetic passport copy (C6.17 walk)\n") });
  await passport.locator("[data-state-words]", { hasText: "Received" }).waitFor();
  ok("C6.17-5 (P-444): on the study permit's Documents panel the officer uploads Client A's passport copy through the line's menu: Received, the file named", /sample-passport-study\.pdf/.test(await passport.innerText()));
  await passport.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, 200));
  await state("study-document-uploaded", "[data-documents-panel]", [1440, 1024], "P444a");
  await p.locator("[data-start-next]").focus(); await p.keyboard.press("Enter"); await p.locator("[data-start-dialog]").waitFor(); await settle();
  const dlg = p.locator("[data-start-dialog]"), docs = await p.locator("[data-start-documents]").innerText();
  ok("C6.17 P-444 (closes review M4, D1): the dialog counts the next stage's documents on its checklist, never \"not worked out yet\"", /\d+ documents? on the checklist/.test(docs) && !/not worked out yet/.test(docs) && !/documents added/.test(await dlg.innerText()), docs);
  ok("C6.17 BR-4: the dialog says \"This cannot be undone\"", await p.locator("[data-cannot-undo]").count() === 1);
  await state("start-next-dialog", "[role=dialog]");
  await p.locator("[data-start-confirm]").click(); await p.locator("[data-error-summary]").waitFor();
  ok("C6.17 BR-4 fail: a start without the reason shows the error summary and the reason's own error; nothing started", /filing record/.test(await p.locator("[data-error-summary]").innerText()) && await p.locator("[data-start-dialog]").count() === 1);
  await state("start-next-reason-error", "[role=dialog]");
  await dlg.getByLabel("Study permit valid until (optional)").fill("2027-02-03");
  await dlg.getByLabel("Reason").fill("The client filed the study permit themselves before the firm took the work permit");
  await p.locator("[data-start-confirm]").click(); await p.locator("[data-start-dialog]").waitFor({ state: "detached" }); await settle();
  const toast = await p.locator("[aria-live=polite].fixed").innerText();
  ok("C6.17 BR-4: the toast says what started, the counts, the documents on the checklist and the deadline (Sample)", /started/.test(toast) && /\d+ documents? on the checklist/.test(toast) && /3 Feb 2027 \(Sample\)/.test(toast), toast);
  ok("C6.17 review M3: after the start focus is on the strip's heading, never on the page body", await p.evaluate(() => document.activeElement?.id) === "stages-h");
  await state("started", "[data-stage-strip]");
  await p.locator('[data-stage="study"]').click(); await p.locator("[data-stage-panel]").waitFor(); await settle();
  ok("C6.17 m2: the ended stage's panel is read only, with its filing and key details", /Kept as it was/.test(await p.locator("[role=dialog]").innerText()) && /filing/.test(await p.locator("[data-stage-panel]").innerText()));
  ok("C6.17 BR-6 (P-444): the ended stage's panel lists its own document, uploaded before it ended", /sample-passport-study\.pdf/.test(await p.locator("[data-stage-panel]").innerText()));
  await state("ended-stage-panel", "[role=dialog]");
  await p.keyboard.press("Escape"); await settle();
  const onFile = p.locator("[data-documents-panel] [data-on-file]").first();
  await onFile.waitFor();
  ok("C6.17-9 (P-444, BR-6): the work permit's own passport line, Not requested, says \"On file from Study permit, uploaded …: check it for this application\"",
    /^On file from Study permit, uploaded \d{1,2} \w{3} \d{4}: check it for this application\.$/.test((await onFile.innerText()).trim())
    && /Not requested/.test(await p.locator("[data-documents-panel] [data-line]").filter({ has: p.locator("[data-on-file]") }).first().innerText()), await onFile.innerText());
  await onFile.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, 200));
  await state("new-stage-on-file", "[data-documents-panel]", [1440, 1024], "P444b");
  ok("no page error or console error on the way", errs.length === 0, errs);
} catch (e) {
  ok("the journey ran to its end", false, (e as Error).message);
} finally { await b.close(); }
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
