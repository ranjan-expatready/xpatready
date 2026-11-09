// QA-317 (C7.3, C7.7; concept product/screens/C7.3/concept.md r2): the Online line on Prepare application opens each
// person's answer sheet, by screens only, and the sheet reads like the server's. On the configured checkpoint (its
// release 2 files IMM 5257 Online), as the case officer, keyboard first. Pass and fail per rule:
//   link: the Online line has one "Open answer sheet" per person's Online item; no PDF form row has one; its words say
//         the PDF copy is listed with the forms above it (was "below");
//   page: title, the item's state and reason (the server's), the release's order note, the sections in the server's order;
//   answers: a value only for a declared or confirmed answer, marked "To confirm" when it waits for Confirm section (P-411);
//         an unanswered fact is listed as what the section waits for, never as a value;
//   copy: Copy puts exactly the server's copy_text on the clipboard and says "Copied"; an address copies part by part;
//   refusals: a client reads no sheet (the page's words and 403); a form not filed Online and an unknown item say so.
// Axe (WCAG 2.2 A/AA) at 1440 and 390 px, no sideways page scroll at 390 and 1024 px. Screenshots in
// product/screens/QA-317/screenshots/. It resets its copy and loads the configured checkpoint itself. US$0, no live AI.
//   zsh studio/tools/isolated.sh runtime_q317 4437 start && tsx studio/tests/check_qa317_sheet_browser.ts 4437 xr_studio_runtime_q317
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { AUTHOR, CLIENT, OFFICER, PORT, call, fillEverything, itemsOf, needVisitorVisa, openCase, prepare, yearsAgo } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "QA-317", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Sheet = { item: string; form: string; order_note: string; sections: { key: string; title: string; answers: { fact: string; subject: string; label: string; copy_text: string; value: unknown; to_confirm: boolean }[]; waiting: { fact: string; label: string }[] }[] };

if (PORT === 4400) { console.log("STOP  never the demo (:4400): this check resets its copy"); process.exit(2); }
const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR), load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
if (reset.status >= 300 || load.status >= 300) { console.log(`STOP  the configured checkpoint did not load: reset ${reset.status}, load ${load.status}`); process.exit(2); }
// A principal and a spouse: on release 2 each adult files their own IMM 5257 Online.
const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
const p0 = (await prepare(c.id)).p;
const online = itemsOf(p0, P).filter((i) => i.kind === "form" && i.channel === "ONLINE"), pdf = itemsOf(p0, P).find((i) => i.kind === "form" && i.channel !== "ONLINE");
if (online.length !== 1 || online[0].form !== "IMM 5257" || !pdf) { console.log(`STOP  setup: the checkpoint's release 2 should file the principal's IMM 5257 Online beside a PDF form (${online.map((i) => i.form)}, ${pdf?.form})`); process.exit(2); }
const ITEM = online[0].id, SPOUSE_ITEM = itemsOf(p0, S, "IMM 5257").find((i) => i.channel === "ONLINE")?.id;
if (!SPOUSE_ITEM) { console.log("STOP  setup: the spouse's IMM 5257 should be Online too on release 2"); process.exit(2); }
const api = async () => (await call("GET", `/runtime/items/${ITEM}/answer-sheet`, undefined, OFFICER)).body as Sheet;

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
const p = await ctx.newPage(); const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
const as = async (who: string) => { await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), who); };
const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30_000 }); await p.waitForTimeout(250); };
const clip = () => p.evaluate(() => navigator.clipboard.readText());
let n = 0;
async function shot(name: string, scope: string) {
  n++; const base = `${String(n).padStart(2, "0")}-${name}`; await settle();
  await p.screenshot({ path: join(SHOTS, `${base}-1440.png`), fullPage: true });
  const v = (await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`axe 1440 px: ${name}: no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
  for (const [w, h] of [[1024, 768], [390, 844]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
    ok(`${w} px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    if (w === 390) {
      await p.screenshot({ path: join(SHOTS, `${base}-390.png`), fullPage: true });
      const v3 = (await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
      ok(`axe 390 px: ${name}: no WCAG 2.2 A/AA violation`, v3.length === 0, v3.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
    }
  }
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(200);
}

try {
  // 1. The way in: Prepare application's Online line, by keyboard.
  await as(OFFICER);
  await p.goto(`${BASE}/cases/${c.id}`);
  const line = p.locator(`[data-online-form="IMM 5257"]`);
  await line.locator("[data-sheet-link]").first().waitFor({ timeout: 45_000 });
  const links = line.locator("[data-sheet-link]");
  const texts = await links.allInnerTexts();
  ok("QA-317 pass: the Online line has one \"Open answer sheet\" per person's Online item, named by form and person, in the line's own order (review m1: principal first)", await links.count() === 2 && texts[0].includes("Open answer sheet: IMM 5257 for Sample Client A") && texts[1].includes("Open answer sheet: IMM 5257 for Sample Spouse A"), texts);
  ok("QA-317 (review m3): each link says its item's state, the server's (To do)", await line.locator(`[data-sheet-link="${ITEM}"] [data-sheet-state="to_do"]`).count() === 1 && texts[0].includes("To do"), texts);
  ok("QA-317 (fail): no PDF form row offers an answer sheet (only the Online line does)", await p.locator("[data-sheet-link]").count() === await p.locator("[data-online-form] [data-sheet-link]").count());
  const words = await line.innerText();
  ok("QA-317 (fail): the line's words match the page: its PDF copy is listed with the forms above it, never \"below\"", !/below/.test(words) && (/forms above/.test(words) || !/PDF copy/.test(words)), words);
  await line.scrollIntoViewIfNeeded();
  await shot("online-line-opens-the-sheet", `[data-online-form="IMM 5257"]`);
  await links.first().focus(); await p.keyboard.press("Enter");
  await p.waitForURL(`**/cases/${c.id}/sheet/${ITEM}`, { timeout: 15_000 });
  await p.locator("[data-answer-sheet]").waitFor({ timeout: 30_000 });
  ok("QA-317 pass (gate A, by screens): Enter on the link opens the sheet's own page for that item", p.url().endsWith(`/cases/${c.id}/sheet/${ITEM}`) && await p.getByRole("heading", { level: 1, name: "IMM 5257 answer sheet · Sample Client A" }).isVisible());

  // 2. The page reads like the server.
  let s = await api();
  const titles = await p.locator("[data-section] h2").allInnerTexts();
  ok("C7.3 BR-2 pass: the sections are the server's, in its order (the release's parts), with its order note", JSON.stringify(titles.map((t) => t.replace(/^\d+\.\s*/, ""))) === JSON.stringify(s.sections.map((x) => x.title)) && (await p.locator("[data-order-note]").innerText()) === s.order_note, { titles, want: s.sections.map((x) => x.title) });
  const state = await p.locator("[data-item-state]").innerText(), itemNow = itemsOf((await prepare(c.id)).p, P, "IMM 5257")[0];
  ok("C7.3 pass: the item's state and reason are the server's (To do, naming what waits)", (await p.locator("[data-item-state]").getAttribute("data-item-state")) === itemNow.state && state.includes(itemNow.reason ?? "\u0000"), { state, reason: itemNow.reason });
  const dob = s.sections.flatMap((x) => x.answers).find((a) => a.fact === "person.date_of_birth" && a.subject === P)!;
  const dobRow = p.locator(`[data-answer="person.date_of_birth"][data-subject="${P}"]`).first();
  ok("P-411 pass: the officer-typed date of birth shows at once, its copy text as the portal takes it, marked To confirm", !!dob && /^\d{4}-\d{2}-\d{2}$/.test(dob.copy_text) && (await dobRow.locator("[data-copy-text]").innerText()) === dob.copy_text && await dobRow.getByText("To confirm").isVisible());
  const wait = s.sections.flatMap((x) => x.waiting).find((w) => w.fact === "person.family_name");
  ok("C7.3 BR-1 (fail): an unanswered fact (family name) is never shown as a value, only listed as what its section waits for", !!wait && await p.locator(`[data-answer="person.family_name"]`).count() === 0 && await p.locator("[data-waiting]").filter({ hasText: wait.label }).count() > 0, wait);
  await shot("sheet-before-the-answers", "[data-answer-sheet]");

  // 3. Copy.
  await dobRow.getByRole("button", { name: /^Copy .* for Sample Client A$/ }).focus(); await p.keyboard.press("Enter");
  await p.waitForTimeout(200);
  ok("C7.3 BR-3 pass: Copy puts exactly the server's copy text on the clipboard and says Copied", (await clip()) === dob.copy_text && await dobRow.getByRole("button", { name: /^Copied: .* for Sample Client A$/ }).filter({ hasText: "Copied" }).count() === 1, await clip());
  await fillEverything(c.id);
  s = await api();
  await p.reload(); await p.locator("[data-answer-sheet]").waitFor({ timeout: 30_000 }); await settle();
  const addr = s.sections.flatMap((x) => x.answers).find((a) => a.value && typeof a.value === "object" && "street_name" in (a.value as object));
  if (addr) {
    const row = p.locator(`[data-answer="${addr.fact}"][data-subject="${addr.subject}"]`).first();
    await row.getByRole("button", { name: /^Copy street name of / }).click(); await p.waitForTimeout(200);
    const part = await clip();
    await row.getByRole("button", { name: new RegExp(`^Copy ${addr.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} for `) }).click(); await p.waitForTimeout(200);
    ok("C7.3 (challenge M4) pass: an address copies part by part (street name alone) and whole on one line", part === String((addr.value as Record<string, unknown>).street_name) && (await clip()) === addr.copy_text, { part, whole: await clip() });
  } else ok("C7.3 (challenge M4) setup: an address answer on the sheet after the fill", false, s.sections.map((x) => x.title));
  // Review M1: a choice is copied as its option's label (as the portal lists it), never the release's key.
  const choice = s.sections.flatMap((x) => x.answers).find((a) => a.fact === "person.marital_status" && a.subject === P);
  ok("QA-317 M1 (fail): a choice (marital status) shows and copies its label, never its key", !!choice && typeof choice.value === "string" && choice.copy_text !== choice.value && !/_/.test(choice.copy_text)
    && (await p.locator(`[data-answer="person.marital_status"][data-subject="${P}"] [data-copy-text]`).first().innerText()) === choice.copy_text, choice);
  ok("QA-309 pass: once every fact is answered and confirmed, no section lists anything still to answer or confirm", await p.locator("[data-waiting]").count() === 0 && s.sections.every((x) => !x.waiting.length));
  ok("P-411 (fail): once confirmed, no answer is marked To confirm", await p.getByText("To confirm", { exact: true }).count() === 0);
  await shot("sheet-every-answer-confirmed", "[data-answer-sheet]");

  // Review M2: with the clipboard refused, Copy selects the value instead: a part's button that part alone, a row's the
  // whole one-line answer; and says so.
  if (addr) {
    const refused = await ctx.newPage();
    await refused.addInitScript(() => { Clipboard.prototype.writeText = () => Promise.reject(new Error("refused")); });
    await refused.goto(`${BASE}/cases/${c.id}/sheet/${ITEM}`); await refused.locator("[data-answer-sheet]").waitFor({ timeout: 30_000 });
    const row = refused.locator(`[data-answer="${addr.fact}"][data-subject="${addr.subject}"]`).first();
    await row.getByRole("button", { name: /^Copy city or town of |^Copy city of / }).click(); await refused.waitForTimeout(200);
    const partSel = await refused.evaluate(() => window.getSelection()?.toString() ?? "");
    await row.getByRole("button", { name: new RegExp(`^Copy ${addr.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} for `) }).click(); await refused.waitForTimeout(200);
    const rowSel = await refused.evaluate(() => window.getSelection()?.toString() ?? "");
    ok("QA-317 M2 (fail): no clipboard: a part's Copy selects that part alone (the city), a row's the whole answer, and the page says to press Ctrl+C", partSel === String((addr.value as Record<string, unknown>).city) && rowSel === addr.copy_text && await refused.getByText(/Selected: press Ctrl\+C/).count() > 0, { partSel, rowSel });
    await refused.close();
  }

  // Review m2: another case's item under this case's path shows nothing of it.
  const other = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client B", dob: yearsAgo(30) }]);
  const otherItem = itemsOf((await prepare(other.id)).p, other.subjects["Sample Client B"], "IMM 5257")[0];
  await p.goto(`${BASE}/cases/${c.id}/sheet/${otherItem.id}`); await p.locator("[data-sheet-error]").waitFor({ timeout: 30_000 });
  ok("QA-317 m2 (fail): another case's item under this case's path: \"not among this case's forms\", no answer of it shown", (await p.locator("[data-sheet-error]").getAttribute("data-sheet-error")) === "other-case" && await p.locator("[data-answer]").count() === 0);
  await p.goto(`${BASE}/cases/00000000-0000-4000-8000-000000000000/sheet/${ITEM}`); await p.locator("[data-sheet-error]").waitFor({ timeout: 30_000 });
  ok("QA-317 (break F1, fail): a case that cannot be read shows nothing of the item's sheet", (await p.locator("[data-sheet-error]").getAttribute("data-sheet-error")) === "other-case" && await p.locator("[data-answer]").count() === 0);

  // The ONLINE filter: a form moved to PDF upload loses its link on the Online line (the other person's stays).
  const pv = (await prepare(c.id)).p;
  const moved = await call("PATCH", `/runtime/items/${SPOUSE_ITEM}/channel`, { channel: "PDF_UPLOAD", version: pv?.version }, OFFICER);
  await p.goto(`${BASE}/cases/${c.id}`); await p.locator(`[data-online-form="IMM 5257"] [data-sheet-link]`).first().waitFor({ timeout: 45_000 }); await settle();
  ok("QA-317 (fail): the spouse's IMM 5257 moved to PDF upload has no sheet link; the principal's stays", moved.status === 200 && await p.locator("[data-sheet-link]").count() === 1 && await p.locator(`[data-sheet-link="${SPOUSE_ITEM}"]`).count() === 0 && await p.locator(`[data-sheet-link="${ITEM}"]`).count() === 1, moved.status);

  // 4. Refusals, in the server's words.
  await as(CLIENT);
  await p.goto(`${BASE}/cases/${c.id}/sheet/${ITEM}`); await settle();
  const clientApi = await call("GET", `/runtime/items/${ITEM}/answer-sheet`, undefined, CLIENT);
  ok("C7.3 (fail): a client reads no sheet: the page says it is for the case officer and shows no answer; the server answers 403", await p.getByText("This page is for the case officer").isVisible() && await p.locator("[data-answer]").count() === 0 && clientApi.status === 403, clientApi.status);
  await as(OFFICER);
  await p.goto(`${BASE}/cases/${c.id}/sheet/${pdf.id}`); await p.locator("[data-sheet-error]").waitFor({ timeout: 30_000 });
  ok(`C7.3 (fail): a form not filed Online (${pdf.form}) has no sheet: the page says so in the server's words, with the way to change how it is filed and back to the case`, (await p.locator("[data-sheet-error]").getAttribute("data-sheet-error")) === "409" && await p.getByText("This form has no answer sheet").isVisible() && await p.getByRole("link", { name: "Back to the case" }).isVisible());
  await p.goto(`${BASE}/cases/${c.id}/sheet/00000000-0000-4000-8000-000000000000`); await p.locator("[data-sheet-error]").waitFor({ timeout: 30_000 });
  ok("C7.3 (fail): an unknown item says there is no such answer sheet (404)", (await p.locator("[data-sheet-error]").getAttribute("data-sheet-error")) === "404" && await p.getByText("No such answer sheet").isVisible());
  ok("no page or console error on the way", errs.length === 0, errs.slice(0, 3));
} catch (e) { ok(`the check ran to its end (crashed: ${(e as Error).message.split("\n")[0]})`, false); }
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
