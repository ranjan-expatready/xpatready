// C9.2 Out of date and Undo on the case page, walked in a real browser as the case officer (r5c BR-12; P-65, P-136): a
// validated IMM 5257 and a signed IMM 5476 go Out of date when the family name changes, each with its words; "Undo"
// names the value it really puts back (review M1: two changes in a row undo one at a time); a second tab that read
// before a change is refused, never undone blind (M2); the buttons' accessible names start with their words (M3, WCAG
// 2.5.3) and messages use the question's words, never a fact key (M4); nothing overflows at 400 px (S2); the focus
// stays on the panel after Undo (S3). Screenshots at 1440 and 400 px in product/screens/c92/walk/, axe (WCAG 2.2 AA) on
// each state. Sample data, no model call (US$0).
// It runs the pack's own setup on its copy first when the copy has no release 2 of Visitor visa yet.
//   zsh studio/tools/isolated.sh rt_c92b 4437 start && tsx studio/tests/check_c92_out_of_date_browser.ts 4437 xr_studio_rt_c92b
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { DB, OFFICER, PORT, answer, confirmAll, fillEverything, firms, itemsOf, needVisitorVisa, openCase, prepare, signByHand, sql, validateRoundTrip, yearsAgo } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
const studio = join(import.meta.dirname, ".."), tsx = join(studio, "node_modules", ".bin", "tsx");
const SHOTS = join(studio, "..", "..", "product", "screens", "c92", "walk"); mkdirSync(SHOTS, { recursive: true });
const releases = () => { try { return Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`)); } catch { return 0; } };
const setup = (file: string) => spawnSync(tsx, ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { cwd: join(studio, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts"); // its own red lines (other rows' S2w, S7a) do not stop it
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());
const vv = needVisitorVisa(), f = await firms(), officer = f.officer ?? OFFICER;
const c = await openCase(vv, [{ role: "principal", name: "Sample Client W", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
const P = c.subjects["Sample Client W"], FN = "person.family_name";
await fillEverything(c.id);
ok("setup: IMM 5257 validated and read back", !!(await validateRoundTrip(c.id, "IMM 5257", P)));
ok("setup: IMM 5476 signed by hand, its scan in", (await signByHand(c.id, itemsOf((await prepare(c.id, officer)).p, P, "IMM 5476")[0]?.id, "IMM 5476", P)) === 201);
const current = () => sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${P}' and canonical_field_key='${FN}' and superseded_by_id is null`);

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light", reducedMotion: "reduce" });
await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* private window */ } }, officer);
const errs: string[] = [];
const open = async () => { const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); }); await p.goto(`http://localhost:${PORT}/cases/${c.id}`); await p.locator("#forms-h").waitFor(); await settle(p); return p; };
const settle = async (p: Page) => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(400); };
const axe = async (p: Page, what: string) => { const v = (await new AxeBuilder({ page: p }).include("section[aria-labelledby=forms-h]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; ok(`C9.2 axe: ${what} has no WCAG A/AA violation`, v.length === 0, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target?.join(" ")}`)); };
const shot = (p: Page, name: string) => p.locator("section[aria-labelledby=forms-h]").screenshot({ path: join(SHOTS, `${name}.png`) });
const toastText = async (p: Page) => (await p.locator("div.fixed[aria-live=polite]").allInnerTexts()).join(" | ");

// 1. Nothing changed: no Out of date list.
const p1 = await open();
ok("C9.2 page (fail): before any change, no Out of date list is shown", (await p1.locator("[data-out-of-date]").count()) === 0);
await axe(p1, "the forms panel before a change"); await shot(p1, "1-before-change-1440");

// 2. Two changes in a row (SAMPLE → SAMPLEWA → SAMPLEWB): both finished items Out of date, Undo names SAMPLEWA.
await answer(c.id, P, FN, "SAMPLEWA"); await confirmAll(c.id, P);
await answer(c.id, P, FN, "SAMPLEWB"); await confirmAll(c.id, P);
await p1.reload(); await p1.locator("[data-out-of-date]").waitFor(); await settle(p1);
const texts = await p1.locator("[data-out-of-date-item]").allInnerTexts();
ok("C9.2 page: the validated IMM 5257 and the signed IMM 5476 are listed Out of date, each naming the change", texts.length === 2 && texts.some((t) => /IMM 5257/.test(t) && /validated copy/.test(t)) && texts.some((t) => /IMM 5476/.test(t) && /signed/.test(t)) && texts.every((t) => /changed from "SAMPLE" to "SAMPLEWB" on \d{1,2} \w{3} \d{4}/.test(t)), texts);
const btn1 = p1.locator(`[data-out-of-date-item="IMM 5257"] [data-undo="${FN}"]`);
ok("C9.2 page (M1): Undo names the value it really puts back (the one before the last change), not the one the copy read", /back to SAMPLEWA$/.test((await btn1.innerText()).trim()), await btn1.innerText());
ok("C9.2 page (M3): the button's accessible name starts with its visible words", ((await btn1.getAttribute("aria-label")) ?? "").startsWith((await btn1.innerText()).trim()), await btn1.getAttribute("aria-label"));
await axe(p1, "the Out of date list"); await shot(p1, "2-out-of-date-1440");
await p1.setViewportSize({ width: 400, height: 900 }); await settle(p1);
ok("C9.2 page (S2): at 400 px nothing scrolls sideways", await p1.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await p1.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
await axe(p1, "the Out of date list at 400 px"); await shot(p1, "2-out-of-date-400"); await p1.setViewportSize({ width: 1440, height: 1000 });

// 3. A second tab Undoes first; the first tab, still showing what it read, is refused (409), nothing undone.
const p2 = await open();
await p2.locator(`[data-out-of-date-item="IMM 5257"] [data-undo="${FN}"]`).click();
await p2.getByText(/^Undone: /).first().waitFor({ timeout: 15000 });
ok("C9.2 page: Undo in the second tab puts SAMPLEWA back", current() === "SAMPLEWA", current());
ok("C9.2 page (M4): the message uses the question's words, never the fact's key", !/person\./.test(await toastText(p2)) && /Undone: .*family name/i.test(await toastText(p2)), await toastText(p2));
await p2.close();
await btn1.click(); await settle(p1);
ok("C9.2 page (M2, fail): the first tab's Undo, made from an older read, is refused and undoes nothing", current() === "SAMPLEWA" && /changed after you read it/i.test(await toastText(p1)), [current(), await toastText(p1)]);

// 4. After a reload it offers SAMPLE; Undo by keyboard; nothing is Out of date; the focus stays on the panel.
await p1.reload(); await p1.locator("[data-out-of-date]").waitFor(); await settle(p1);
const btn2 = p1.locator(`[data-out-of-date-item="IMM 5257"] [data-undo="${FN}"]`);
ok("C9.2 page: after the reload the one change left is offered back to SAMPLE", /back to SAMPLE$/.test((await btn2.innerText()).trim()), await btn2.innerText());
await btn2.focus(); await p1.keyboard.press("Enter");
await p1.locator("[data-out-of-date]").waitFor({ state: "detached", timeout: 15000 }); await settle(p1);
ok("C9.2 page: Undo puts the value the items were finished with back: nothing is Out of date", current() === "SAMPLE" && !itemsOf((await prepare(c.id, officer)).p, P).some((i) => i.state === "out_of_date"), current());
ok("C9.2 page (S3): the focus goes to the panel's heading once the list is gone, never the page", await p1.evaluate(() => document.activeElement?.id === "forms-h"), await p1.evaluate(() => document.activeElement?.tagName + "#" + document.activeElement?.id));
await axe(p1, "the forms panel after Undo"); await shot(p1, "3-after-undo-1440");
ok("C9.2 page: no error in the browser console", errs.length === 0, errs);
await b.close();
process.exitCode = summary() ? 1 : 0;
