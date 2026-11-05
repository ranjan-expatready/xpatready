// C11.6 How each form is filed, on the case page, walked as the case officer (M3-B; J7 2.3 and 5.2; r5c BR-8, §6; P-122,
// P-137, P-143; VV-R02, VV-R04, VV-R10, VV-R12; FQ-2, FQ-3). A Visitor visa family case (release 2 of the pack's setup):
// the IRCC account is said once, read-only; each person's forms start on the combination line's channel with what IRCC
// accepts and the signature; IMM 5476's Change channel greys Online with the Form library's line; IMM 5257's greys
// Online; Paper asks for the accommodation reason (refused on that field without one), then saves for that person only,
// with who, the default it left and the reason; a change made from an older read says Reload and saves after it. The
// combination's own line never moves; the change is audited. Keyboard only, 1440 and 1024 px, axe (WCAG 2.2 AA) on each
// state, no sideways scroll. Screenshots in product/screens/C11.6/screenshots/. No model call (US$0).
//   zsh studio/tools/isolated.sh fm_c116b 4452 start && tsx studio/tests/check_c116_channels_browser.ts 4452 xr_studio_fm_c116b
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { DB, FAMILY, PORT, call, itemsOf, needVisitorVisa, officerOf, openCase, prepare, sql } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "C11.6", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

const releases = () => Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`) ?? 0);
const setup = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(PORT), DB], { cwd: join(STUDIO, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts");
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());
const vv = needVisitorVisa();
const c = await openCase(vv, FAMILY);
const officer = officerOf(c.id);
const [P, S, K] = [c.subjects["Sample Client A"], c.subjects["Sample Spouse A"], c.subjects["Sample Child A1"]];
const p0 = (await prepare(c.id)).p;
const item = (subject: string, form: string) => itemsOf(p0, subject, form)[0];
ok("setup: the family's form items: Client A's IMM 5257, IMM 5707, IMM 5476; Child A1's IMM 5257", !!item(P, "IMM 5257") && !!item(P, "IMM 5707") && !!item(P, "IMM 5476") && !!item(K, "IMM 5257"));
const lineChannel = () => sql(`select channel from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='IMM 5257' order by cf.version desc limit 1`);
const line0 = lineChannel();

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage(); const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), officer);
const panel = () => p.locator("[data-item-channels]");
const row = (subject: string, form: string) => panel().locator(`[data-channel-person="${subject}"] [data-form="${form}"]`);
const dialog = () => p.getByRole("dialog");
const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30_000 }); await p.waitForTimeout(300); };
const open = async () => { await p.goto(`${BASE}/cases/${c.id}`); await panel().locator("[data-channel-item]").first().waitFor({ timeout: 30_000 }); await settle(); };
const press = async (loc: ReturnType<Page["locator"]>) => { await loc.focus(); await p.keyboard.press("Enter"); };
let n = 0;
async function state(name: string, scope = "[data-item-channels]") {
  n++; const base = `${String(n).padStart(2, "0")}-${name}`;
  await settle();
  if (scope === "[data-item-channels]") await panel().scrollIntoViewIfNeeded();
  await p.screenshot({ path: join(SHOTS, `${base}-1440.png`) });
  const v = (await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`axe: ${name}: no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
  if (scope === "[data-item-channels]") await panel().scrollIntoViewIfNeeded();
  await p.screenshot({ path: join(SHOTS, `${base}-1024.png`) });
  ok(`1024 px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
}
/** Arrow keys move a radio group's choice to the next enabled option; press until `want` is checked. */
async function choose(want: string) {
  for (let i = 0; i < 4 && !(await dialog().locator(`[data-option="${want}"] input`).isChecked()); i++) await p.keyboard.press("ArrowDown");
  return dialog().locator(`[data-option="${want}"] input`).isChecked();
}

try {
  // 1. The case header part: the IRCC account read-only, each form on its line's channel (J7 2.3).
  await open();
  const head = await panel().locator("[data-portal]").innerText();
  ok("C11.6-1 (screen): the case says the IRCC account once, read-only: \"Filed through APR Portal: set by the combination, not on the case\"", /Filed through APR Portal: set by the combination, not on the case/.test(head), head);
  ok("C11.6-2 (screen): nothing on the case changes the IRCC account (no control beside it)", (await panel().locator("[data-portal]").locator("button, select, input").count()) === 0);
  ok("C11.6-3 (screen): each form starts on its combination line's channel: IMM 5257 PDF upload, IMM 5707 Online, IMM 5476 PDF upload, each \"The combination's default\"",
    await row(P, "IMM 5257").getAttribute("data-channel") === "PDF_UPLOAD" && await row(P, "IMM 5707").getAttribute("data-channel") === "ONLINE" && await row(P, "IMM 5476").getAttribute("data-channel") === "PDF_UPLOAD"
    && /The combination’s default/.test(await row(P, "IMM 5476").innerText()));
  ok("C11.6-4/5 (screen): IMM 5476 says IRCC accepts PDF upload only and is signed by hand and scanned; IMM 5707 a typed name",
    /IRCC accepts: PDF upload\b(?! ·)/.test(await row(P, "IMM 5476").innerText()) && /Signed by hand and scanned/.test(await row(P, "IMM 5476").innerText()) && /Typed name/.test(await row(P, "IMM 5707").innerText()), await row(P, "IMM 5476").innerText());
  ok("pass: a child has only IMM 5257 (the forms come from the case's items)", (await panel().locator(`[data-channel-person="${K}"] [data-channel-item]`).count()) === 1 && (await row(K, "IMM 5257").count()) === 1);
  await state("each-form-on-its-default");

  // 2. IMM 5476: Online greyed with the Form library's line (J7 5.2, C11.6-6).
  await press(panel().getByRole("button", { name: "Change channel: IMM 5476 for Sample Client A" }));
  await dialog().waitFor();
  const online5476 = dialog().locator('[data-option="ONLINE"]');
  ok("C11.6-6 (screen): IMM 5476's Online is greyed and says why, with IRCC's line \"Upload this form along with your online application\"",
    await online5476.locator("input").isDisabled() && /IRCC does not accept it here/.test(await online5476.innerText()) && /Upload this form along with your online application/.test(await online5476.innerText()), await online5476.innerText());
  ok("a11y: focus starts on the chosen way (PDF upload), not on a greyed one", await p.evaluate(() => (document.activeElement as HTMLInputElement | null)?.value === "PDF_UPLOAD"));
  await state("imm5476-online-greyed", "[role=dialog]");
  await p.keyboard.press("Escape"); await dialog().waitFor({ state: "detached" });
  ok("a11y: Escape closes and gives focus back to the row's Change channel", await p.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Change channel: IMM 5476 for Sample Client A"));

  // 3. IMM 5257: Online greyed (C11.6-8a); Paper needs the reason (C11.6-8b), then saves for this person only (C11.6-9).
  await press(panel().getByRole("button", { name: "Change channel: IMM 5257 for Sample Client A" }));
  await dialog().waitFor();
  ok("C11.6-8a (screen): IMM 5257's Online is greyed on the APR Portal, with the reason", await dialog().locator('[data-option="ONLINE"] input').isDisabled() && /IRCC does not accept it here: the Form library records PDF upload · Paper/.test(await dialog().locator('[data-option="ONLINE"]').innerText()));
  ok("pass: Paper is offered (accepted, Sample record FQ-2, FQ-3)", await choose("PAPER"));
  ok("pass: choosing Paper asks why on paper", await dialog().getByLabel("Why on paper").isVisible());
  await press(dialog().getByRole("button", { name: "Save" }));
  await dialog().getByRole("alert").filter({ hasText: /Give the reason for IMM 5257 on paper/ }).waitFor({ timeout: 10_000 });
  await p.waitForTimeout(150);
  ok("C11.6-8b (screen): Paper without a reason is refused on the reason field in the server's words, focus on it, nothing saved",
    await p.evaluate(() => document.activeElement?.tagName === "TEXTAREA" && document.activeElement.getAttribute("aria-invalid") === "true") && sql(`select coalesce(channel::text, '') from filing_item where id='${item(P, "IMM 5257")?.id}'`) === "");
  await state("paper-needs-a-reason", "[role=dialog]");
  await p.keyboard.type("Cannot apply online: accommodation (Sample)");
  await press(dialog().getByRole("button", { name: "Save" }));
  await dialog().waitFor({ state: "detached", timeout: 15_000 });
  await row(P, "IMM 5257").and(p.locator('[data-channel="PAPER"]')).waitFor({ timeout: 15_000 });
  const r5257 = await row(P, "IMM 5257").innerText();
  ok("C11.6-9 (screen): Client A's IMM 5257 reads Paper, changed from PDF upload (the combination's default) by the case officer, with the reason", /Paper/.test(r5257) && /Changed from PDF upload \(the combination’s default\) by .+: “Cannot apply online: accommodation \(Sample\)”/.test(r5257), r5257);
  ok("C11.6-9 (screen): the spouse's IMM 5257 keeps PDF upload", await row(S, "IMM 5257").getAttribute("data-channel") === "PDF_UPLOAD");
  ok("a11y: focus is back on the row's Change channel after saving", await p.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Change channel: IMM 5257 for Sample Client A"));
  ok("data: the item holds Paper with its reason; the spouse's item holds no change", sql(`select channel::text || '|' || channel_reason from filing_item where id='${item(P, "IMM 5257")?.id}'`) === "PAPER|Cannot apply online: accommodation (Sample)" && sql(`select coalesce(channel::text, '') from filing_item where id='${item(S, "IMM 5257")?.id}'`) === "");
  ok("C11.6-10 (data): the change is audited with who, from and to, without the reason's text", /changed how IMM 5257 is filed .* from PDF upload to Paper \(reason given\)/.test(sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity='item' and entity_key='${item(P, "IMM 5257")?.id}'`) ?? "") && !/accommodation/.test(sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity='item' and entity_key='${item(P, "IMM 5257")?.id}'`) ?? ""));
  ok("C11.6-12 (data): the combination's own IMM 5257 line is unchanged by the case change", lineChannel() === line0 && line0 === "PDF_UPLOAD", [line0, lineChannel()]);
  await state("paper-saved-for-one-person");

  // 4. A change made from an older read (C11.6-11): another change lands while the dialog is open → Reload, then it saves.
  await press(panel().getByRole("button", { name: "Change channel: IMM 5707 for Sample Client A" }));
  await dialog().waitFor();
  const now = (await prepare(c.id)).p!;
  const other = await call("PATCH", `/runtime/items/${itemsOf(now, S, "IMM 5707")[0]?.id}/channel`, { channel: "PDF_UPLOAD", version: now.version }, officer);
  ok("setup: someone else changes the spouse's IMM 5707 meanwhile", other.status === 200, other.status);
  ok("pass: PDF upload is offered for IMM 5707", await choose("PDF_UPLOAD"));
  await press(dialog().getByRole("button", { name: "Save" }));
  await dialog().getByText("Changed since you read it").waitFor({ timeout: 10_000 });
  ok("C11.6-11 (screen): the older read is refused with \"Changed since you read it\" and a Reload, nothing saved", /Reload, then make your change again/.test(await dialog().innerText()) && sql(`select coalesce(channel::text, '') from filing_item where id='${item(P, "IMM 5707")?.id}'`) === "");
  await state("changed-since-you-read-it", "[role=dialog]");
  await press(dialog().getByRole("button", { name: "Reload" }));
  await p.waitForTimeout(800);
  await press(dialog().getByRole("button", { name: "Save" }));
  await dialog().waitFor({ state: "detached", timeout: 15_000 });
  await row(P, "IMM 5707").and(p.locator('[data-channel="PDF_UPLOAD"]')).waitFor({ timeout: 15_000 });
  ok("pass (screen): after Reload the change saves: Client A's IMM 5707 reads PDF upload, changed from Online", /Changed from Online \(the combination’s default\)/.test(await row(P, "IMM 5707").innerText()));
  await state("after-reload");
  ok("no page errors", errs.length === 0, errs);
} catch (e) {
  ok(`the walk ran to its end (stopped: ${(e as Error).message.split("\n")[0]})`, false);
  await p.screenshot({ path: join(SHOTS, "zz-stopped-1440.png") }).catch(() => undefined);
}
await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
