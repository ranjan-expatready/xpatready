// C11.13 "Draft fields" in the browser, as a person (P-138, P-120): Shared library › Forms › a form's drawer says whether
// its current edition has a saved AI draft. With none, the button is greyed with the cost of a live run and the reason
// (live AI is off); with one, the author drafts at US$0 and is linked to the edition's group on To review › Proposals;
// a person without the author duty reads it only. Configuration author (user-A) and Approver (user-B), 1440 and 1024 px,
// axe. Saved readings are written for this check into p2/runs and removed after. NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c1113ui 4452 start && tsx studio/tests/check_c1113_draft_fields_browser.ts 4452
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { sampleEditions } from "../api/src/field-drafts.ts";
import { fieldMap, savedReadings } from "./field_draft_fixtures.ts";

const PORT = Number(process.argv[2] ?? 4452), BASE = `http://localhost:${PORT}`;
const STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "W1-shared-library", "screenshots", "c1113-draft-fields"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return r.status;
};
async function axe(p: Page, what: string) {
  const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`C11.13 axe: ${what} has no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id}: ${x.nodes[0]?.target}`));
}
const asPerson = async (p: Page, actor: string) => { await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
const noSideScroll = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
/** Opens a form's drawer from its row and waits for the Draft fields section to answer (fails loudly on a timeout). */
async function openDrawer(p: Page, code: string) {
  await p.goto(`${BASE}/library/forms`); await p.waitForLoadState("networkidle");
  await p.locator("main table tbody tr").filter({ hasText: code }).first().getByRole("button", { name: code, exact: true }).click();
  const section = p.getByRole("dialog").locator("[data-draft-fields]");
  await section.waitFor({ timeout: 30_000 });
  await p.waitForFunction(() => { const s = document.querySelector("[data-draft-fields]"); return !!s && s.getAttribute("data-draft-fields") !== "loading"; }, null, { timeout: 30_000 });
  return section;
}

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs: string[] = []; p.on("pageerror", (e) => errs.push(e.message));
  const saved = savedReadings("c1113ui");
  try {
    ok("setup: reset and sample inputs loaded", (await call("POST", "/demo/reset", { confirm: "RESET" })) < 300 && (await call("POST", "/demo/load")) === 201);
    await asPerson(p, "user-A");

    // No saved draft: the cost of a live run, greyed, with the reason.
    let s = await openDrawer(p, "IMM 5409");
    const greyed = s.getByRole("button", { name: /Draft fields with AI \(about US\$\d+\.\d\d · at most US\$\d+\.\d\d\)/ });
    ok("P-138 pass: with no saved draft the drawer says so, with the cost of a live run", (await s.getAttribute("data-draft-fields")) === "no_saved" && /No saved AI draft of this form edition yet/.test(await s.innerText()));
    ok("P-138 fail: the live button is greyed and its reason is on the page (live AI is off), nothing runs", (await greyed.isDisabled()) && /live AI is off/.test(await s.locator("[data-draft-fields-live]").innerText()));
    ok("layout (1440): no sideways page scroll", await noSideScroll(p));
    await p.screenshot({ path: join(SHOTS, "no-saved-1440.png") });
    await axe(p, "the form drawer with no saved draft");

    // A form whose edition has no box reading of this file: said plainly, no button.
    s = await openDrawer(p, "IMM 5475");
    ok("C11.13 fail: an edition with no box reading of its file says there is nothing to draft, with no button", (await s.getAttribute("data-draft-fields")) === "cannot" && /no form-field reading/.test(await s.innerText()) && (await s.getByRole("button").count()) === 0);

    // A saved draft (both rounds): the author drafts at US$0, then the queue link.
    const e5409 = sampleEditions().find((e) => e.code === "IMM 5409")!;
    const f = [{ id: "case.years_together", meaning: "How many years the two people have lived together", value_type: "number" }, { id: "case.common_law_start_date", meaning: "The date the two people began living together", value_type: "date" }];
    const q = { "case.years_together": "(number of years)", "case.common_law_start_date": "Date (YYYY-MM-DD)" };
    saved.save(e5409, false, fieldMap(e5409.printed, f, q), 1);
    saved.save(e5409, true, fieldMap(e5409.printed, f, q), 2);
    await asPerson(p, "user-B");
    s = await openDrawer(p, "IMM 5409");
    ok("C11.13 fail: a person without the author duty sees the saved draft but no button", (await s.getAttribute("data-draft-fields")) === "saved" && (await s.getByRole("button").count()) === 0 && /author duty/.test(await s.innerText()));
    await asPerson(p, "user-A");
    s = await openDrawer(p, "IMM 5409");
    const go = s.getByRole("button", { name: "Draft fields with AI (saved draft, US$0)" });
    ok("C11.8 pass: with a saved draft the author's button says US$0", await go.isEnabled());
    await p.setViewportSize({ width: 1024, height: 800 });
    ok("layout (1024): no sideways page scroll", await noSideScroll(p));
    await p.screenshot({ path: join(SHOTS, "saved-1024.png") });
    await axe(p, "the form drawer with a saved draft");
    await go.click();
    const link = s.getByRole("link", { name: "Open its fields on To review › Proposals" });
    await link.waitFor({ timeout: 30_000 });
    ok("C11.13 pass: Draft fields puts the fields on To review at US$0 and links the edition's group", /2 fields proposed on To review, read by both rounds/.test(await p.locator("body").innerText()) && /group=edition/.test(await link.getAttribute("href") ?? ""));
    await link.click();
    await p.waitForURL(/\/review\/proposals\?group=edition/); await p.waitForLoadState("networkidle");
    await p.locator("[data-band]").first().waitFor({ timeout: 30_000 });
    ok("C11.13 pass: the queue opens on the edition's group with both drafted fields", /Years together/.test(await p.locator("main").innerText()) && /Common law start date/.test(await p.locator("main").innerText()));
    await p.screenshot({ path: join(SHOTS, "queue-group-1024.png"), fullPage: true });
    s = await openDrawer(p, "IMM 5409");
    ok("C11.13 pass: the drawer then says it was drafted once, with how many fields still wait", (await s.getAttribute("data-draft-fields")) === "drafted" && /2 fields, 2 still waiting/.test(await s.innerText()));
    ok("no page errors", errs.length === 0, errs);
  } catch (e) { ok(`no step threw: ${(e as Error).message.slice(0, 300)}`, false); } finally { saved.clear(); await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
