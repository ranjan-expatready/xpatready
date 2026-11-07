// C9.5 Adopt a published update on an open case, by screens (B145; board screens/B145/design/draft-release-update.html),
// on the configured checkpoint plus one later Sample release made through the author's routes (IMM 5475's form fields
// filled differently, so a draft is "to fill again"). The case officer's journey, keyboard first: opens the Sample family
// case on release 1 → reads the notice under the header (its tooltip on focus) → "What changes for this case" opens the
// side panel (What changes per person, old → new; the work groups with counts and tooltips; the pre-filled reason) →
// "Not now" stores nothing → a release published while the panel is open: Move is refused "read the list again" (the
// conflict state), nothing changed → Read the list again → Move → the toast → Prepare application shows what the move did
// → Fill on a form to fill again makes its copy on the new release. Then the newest release: no notice. axe (WCAG 2.2
// A/AA) per state, 1440 and 1024 px, no sideways scroll; screenshots (deviceScaleFactor 1) in
// product/screens/B145/screenshots/. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c95b 4443 start && tsx studio/tests/check_c95_release_update_browser.ts 4443 xr_studio_screens_c95b
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { chromium, type Locator } from "playwright";
import { AUTHOR, CLIENT, OFFICER, PORT, call, sql } from "../acceptance/lib/m3.ts";
import { sampleRelease } from "../acceptance/lib/sample-release.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "B145", "screenshots"); mkdirSync(SHOTS, { recursive: true });
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
const vv = sql("select id from combination where combination_key='vv.single'") ?? "";
const r1 = sql(`select id from config_release where combination_id='${vv}' and version=1`) ?? "";
const fam = sql(`select case_id from pack_work_pin where config_release_id='${r1}' limit 1`) ?? "";
const later = load.status < 300 && fam ? await sampleRelease(vv, { map: "IMM 5475" }) : { version: null, steps: [] };
ok("setup: the configured checkpoint (the family case on release 1) and a later Sample release that fills IMM 5475 differently", load.status < 300 && !!fam && !!later.version, { load: load.status, fam, steps: later.steps });
if (!fam || !later.version) process.exit(1);
const pins = () => Number(sql(`select count(*) from pack_work_pin where case_id='${fam}'`) ?? 0);

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage(); const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
const as = async (actor: string) => { await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30_000 }); await p.waitForTimeout(300); };
const press = async (loc: Locator) => { await loc.focus(); await p.keyboard.press("Enter"); await settle(); };
const notice = () => p.locator("[data-release-notice]"), panel = () => p.locator("[data-release-panel]");
let n = 0;
async function state(name: string, scope: string, widths = [1440, 1024]) {
  n++; await settle();
  for (const w of widths) {
    await p.setViewportSize({ width: w, height: w === 1440 ? 900 : 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: join(SHOTS, `C95-${String(n).padStart(2, "0")}-${name}-${w}.png`) });
    ok(`${w} px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  const v = (await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`axe: ${name}: no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
}

await as(OFFICER); await p.goto(`${BASE}/cases/${fam}`); await notice().waitFor({ timeout: 60_000 });
const nt = await notice().innerText();
ok("C9.5 BR-1, BR-8: the notice under the case header says the newer release is out and the case stays on release 1 until it is moved", /Release \d+ of Visitor visa is out \(released /.test(nt) && /This case stays on Release 1 until you move it/.test(nt), nt);
await p.locator("[data-release-notice] button[aria-label='What a release is']").focus(); await p.waitForTimeout(400);
ok("BIC-14: the ⓘ tooltip opens on keyboard focus and explains a release", /frozen set of the combination's forms/.test(await p.locator("[data-slot='tooltip-content']").first().innerText().catch(() => "")));
await state("notice", "main");

await press(p.locator("[data-release-open]"));
await panel().waitFor({ timeout: 60_000 }); await p.locator("[data-change-group='forms']").waitFor({ timeout: 60_000 }); await settle();
const count = async (g: string) => Number(await p.locator(`[data-effect-group='${g}']`).getAttribute("data-count"));
ok("C9.5 BR-3: the panel lists What changes per group (forms named with people and old → new; the fees line says fees are not part of a release)",
  Number(await p.locator("[data-change-group='forms']").getAttribute("data-count")) > 0 && /→|becomes/.test(await p.locator("[data-change-line]").first().innerText()) && /not part of a release/.test(await p.locator("[data-release-fees]").innerText()));
ok("C9.5 BR-4: What happens to work already done shows the groups with counts: to fill again, filed another way now, no longer required (each non-empty here)", (await count("fill_again")) > 0 && (await count("filed_another_way")) > 0 && (await count("no_longer_required")) > 0);
ok("C9.5 BR-5: the reason is pre-filled and the one primary button names the action", (await p.locator("[data-release-reason]").inputValue()) === "Adopting the current release" && /^Move this case to Release \d+$/.test((await p.locator("[data-release-move]").innerText()).trim()));
ok("BIC-20: the panel opens on its first field (the reason), so the keyboard starts there", await p.locator("[data-release-reason]").evaluate((el) => el === document.activeElement));
await state("panel", "[role='dialog']");
const more = p.getByRole("button", { name: /^Show all \d+ items$/ }).first();
if (await more.count()) { await press(more); await state("panel-long-list", "[role='dialog']", [1440]); }
await press(p.locator("[data-release-later]"));
ok("C9.5 BR-8: \"Not now\" closes the panel and stores nothing; the notice stays and focus returns to its button", (await panel().count()) === 0 && pins() === 1 && await notice().isVisible() && await p.locator("[data-release-open]").evaluate((el) => el === document.activeElement));

// A release published while the panel is open: the move is refused with "read the list again", nothing changed.
await press(p.locator("[data-release-open]")); await p.locator("[data-change-group='forms']").waitFor({ timeout: 60_000 });
const newer = await sampleRelease(vv, { map: "IRM 0002" });
await press(p.locator("[data-release-move]"));
await p.locator("[data-release-conflict]").waitFor({ timeout: 30_000 }).catch(() => null);
ok("C9.5 BR-5 fail (conflict): a release published meanwhile makes Move answer \"read the list again\"; nothing changed", !!newer.version && await p.locator("[data-release-conflict]").isVisible() && pins() === 1, newer.steps);
await state("conflict", "[role='dialog']");
await press(p.locator("[data-release-reread]")); await p.waitForTimeout(800);
ok("conflict recovery: Read the list again shows the newest release on the button", new RegExp(`Release \\d+$`).test((await p.locator("[data-release-move]").innerText()).trim()) && !(await p.locator("[data-release-conflict]").count()));
await p.locator("[data-release-move]").focus(); await p.keyboard.press("Enter");
await p.locator("[data-release-moved]").waitFor({ timeout: 60_000 });
const toast = await p.getByText(/^Moved to Release \d+\./).first().innerText({ timeout: 5_000 }).catch(() => "");
const focusedMoved = await p.waitForFunction(() => document.activeElement?.id === "release-moved-h", null, { timeout: 5_000 }).then(() => true).catch(() => false);
await settle();
ok("C9.5 BR-5, BR-6: Move writes revision 2 on the newest release; the toast counts what it did (to fill again, press Fill); Prepare application shows the groups and takes focus",
  pins() === 2 && /Moved to Release \d+\..*to fill again \(press Fill\)/.test(toast) && focusedMoved, { pins: pins(), toast, focusedMoved });
ok("C9.5 BR-1: the case header now reads the new release", /Release \d+/.test(await p.locator("h1").innerText()) && !(await notice().count()));
await state("moved-prepare", "[data-release-moved]");
const before = await count("fill_again");
const fillBtn = p.locator("[data-release-fill]").first(), copyId = await fillBtn.getAttribute("data-release-fill");
const subj = sql(`select subject_id || '|' || form_number from form_instance where id='${copyId}'`) ?? "";
await press(fillBtn);
const made = await (async () => { for (let i = 0; i < 60; i++) { const id = sql(`select config_release_id from form_instance where case_id='${fam}' and subject_id='${subj.split("|")[0]}' and form_number='${subj.split("|")[1]}' order by created_at desc limit 1`); if (id && id !== r1) return id; await p.waitForTimeout(500); } return null; })();
await p.waitForTimeout(1500); await settle();
ok("C9.5 BR-6 (challenge B1): Fill on a form to fill again makes its copy on the new release (the move filled nothing), and the group shrinks", !!made && made === sql(`select config_release_id from pack_work_pin where case_id='${fam}' and revision=2`) && (await count("fill_again").catch(() => 0)) < before, { made, before });
await state("after-fill", "[data-release-moved]", [1440]);

await p.reload(); await p.locator("h1").waitFor(); await p.waitForTimeout(1500);
ok("C9.5 BR-2: on the newest release there is no notice", (await notice().count()) === 0);
await as(CLIENT); await p.goto(`${BASE}/cases/${fam}`); await p.waitForTimeout(1200);
ok("BR-9: the client never sees the notice or the panel", (await notice().count()) === 0 && (await p.locator("[data-release-open]").count()) === 0);
ok("no page error or console error during the walk", errs.length === 0, errs.slice(0, 3));
await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
