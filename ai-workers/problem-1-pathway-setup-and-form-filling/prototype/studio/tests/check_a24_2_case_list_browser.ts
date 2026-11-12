// A24-2 (P-492; design product/design/case-structure-a24-2026-11-12.md §6, §8 "walk by screens"): the case number on the
// screens, walked in a real browser as the case officer on the configured checkpoint. The case list shows each case's
// number with the firm's own reference under it, the client's name and its applications count (read against the API);
// search finds a case by its number, its reference and a person's name, and says so when nothing matches; Open a case
// shows the number given next, refuses a reference shaped like a case number in words (no number used), and opens a case
// without a reference: the toast, the list and the heading show its number. The next-number read never moves the counter.
// Every rule has a passing and a failing case. axe (WCAG 2.2 AA) on the list and the dialog; 375 px without page scroll.
// Screenshots: product/screens/A24-2/screenshots/. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_a24l 4444 start && tsx studio/tests/check_a24_2_case_list_browser.ts 4444 xr_studio_screens_a24l
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { call, firms, openCase, PORT, prepare, run, sql, yearsAgo } from "../acceptance/lib/m3.ts";
import { CASE_NUMBER } from "../contracts/runtime.ts";
import { recorder } from "./runtime/api.ts";

const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
const { ok, summary } = recorder();
const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "A24-2", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const AUTHOR = "user-A";
const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("vv.single")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const vv = comboId("vv.single")!;
const f = await firms();
const officer = f.officer ?? "user-O";
const team = f.rep ? { representative: f.rep, caseOfficers: [officer] } : undefined;

// Two cases opened through the API: one with the firm's own reference (prepared, so it holds its filing), one without.
const namedPerson = `Sample Listed ${run}`, barePerson = `Sample Bare ${run}`;
const named = await openCase(vv, [{ role: "principal", name: namedPerson, dob: yearsAgo(40) }], team, `A24L-${run}`);
const bare = await openCase(vv, [{ role: "principal", name: barePerson, dob: yearsAgo(35) }], team, null as unknown as string);
await prepare(named.id, officer);
const listed = (await call("GET", "/runtime/cases?take=100", undefined, officer)).body?.cases ?? [];
const apiRow = (id: string) => listed.find((c: { id: string }) => c.id === id);
const nRow = apiRow(named.id), bRow = apiRow(bare.id);
ok("A24-2 setup: two cases, numbered; one with its own reference and one or more filings, one with neither",
  CASE_NUMBER.test(nRow?.case_number ?? "") && CASE_NUMBER.test(bRow?.case_number ?? "") && nRow?.reference === `A24L-${run}` && bRow?.reference === null && nRow?.filings > 0 && bRow?.filings === 0, { nRow, bRow });

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage();
const errors: string[] = []; p.on("pageerror", (e) => errors.push(String(e)));
const listReads: string[] = [];
p.on("request", (r) => { const u = new URL(r.url()); if (u.pathname === "/api/runtime/cases" && r.method() === "GET") listReads.push(u.search); });
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), officer);
const axe = async (name: string, sel: string, page: Page = p) => {
  const r = await new AxeBuilder({ page }).include(sel).withTags(TAGS).analyze();
  ok(`${name}: axe finds no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ") || undefined);
};
const row = (n: string) => p.locator(`tr[data-case-row="${n}"]`);
const rowText = (n: string) => row(n).innerText();

// 1. The list: Case (number, own reference under it), Client, Applications.
await p.goto(`${BASE}/cases`);
await row(nRow.case_number).waitFor({ timeout: 30_000 });
const heads = (await p.getByRole("columnheader").allTextContents()).map((h) => h.trim());
ok("A24-2 list: the columns are Case, Client, Applications, Combination, Status, Opened", heads.join("|") === "Case|Client|Applications|Combination|Status|Opened", heads);
const nCell = row(nRow.case_number).locator("td").first(), bCell = row(bRow.case_number).locator("td").first();
ok("A24-2 list pass: a case with its own reference shows its number, with the reference under it, as one link to the case",
  (await nCell.locator("a").getAttribute("href")) === `/cases/${named.id}` && (await nCell.locator("a").innerText()).replace(/\s+/g, " ").trim() === `${nRow.case_number} A24L-${run}`,
  await nCell.innerText());
ok("A24-2 list fail: a case without a reference shows its number alone, never \"null\" or an empty line",
  (await bCell.innerText()).trim() === bRow.case_number && (await bCell.locator("[data-case-own-reference]").count()) === 0, await bCell.innerText());
ok("A24-2 list: the Client column names each case's client person (as the API's client_name)",
  (await row(nRow.case_number).locator("[data-case-client-name]").innerText()).trim() === nRow.client_name && nRow.client_name === namedPerson
  && (await row(bRow.case_number).locator("[data-case-client-name]").innerText()).trim() === barePerson, [nRow.client_name, bRow.client_name]);
ok("A24-2 list pass: a prepared case's Applications shows its filings count (as the API's filings)",
  (await row(nRow.case_number).locator("[data-case-filings]").innerText()).trim() === String(nRow.filings), { api: nRow.filings, shown: await row(nRow.case_number).locator("[data-case-filings]").innerText() });
ok("A24-2 list fail: a case not yet prepared reads \"None yet\", never 0",
  (await row(bRow.case_number).locator("[data-case-filings]").innerText()).trim() === "None yet", await rowText(bRow.case_number));
await p.screenshot({ path: join(SHOTS, "01-case-list-1440.png"), fullPage: false });
await axe("A24-2 list at 1440 px", "main");

// 2. Search: by number, by reference, by a person's name; nothing matching says so and clears.
const search = p.getByLabel("Search cases");
const shownRows = () => p.locator("tr[data-case-row]").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-case-row")));
/** Types the words and waits for the list's answer to that search, then for the page to show it (rows or "No case
 *  matches"); a wait that times out fails the check. */
async function searchFor(words: string) {
  const answered = p.waitForResponse((r) => { const u = new URL(r.url()); return u.pathname === "/api/runtime/cases" && u.searchParams.get("q") === words.trim(); }, { timeout: 15_000 });
  await search.fill(words);
  const r = await answered;
  const ids: string[] = ((await r.json())?.cases ?? []).map((c: { case_number: string }) => c.case_number);
  await p.waitForFunction((want) => { const got = [...document.querySelectorAll("tr[data-case-row]")].map((x) => x.getAttribute("data-case-row")); return want.length ? got.join() === want.join() : /No case matches/.test(document.querySelector("main")?.textContent ?? ""); }, ids, { timeout: 15_000 });
}
await searchFor(bRow.case_number);
let shown = await shownRows();
ok("A24-2 search pass: the case number finds that one case", shown.length === 1 && shown[0] === bRow.case_number, shown);
ok("A24-2 search: the search is sent to the API once typing stops (?q=), not filtered on the page", listReads.some((s) => new URLSearchParams(s).get("q") === bRow.case_number), listReads);
await p.screenshot({ path: join(SHOTS, "02-search-by-number-1440.png"), fullPage: false });
await searchFor(bRow.case_number.toLowerCase());
shown = await shownRows();
ok("A24-2 search: any letter case (\"c-…\")", shown.length === 1 && shown[0] === bRow.case_number, shown);
await searchFor(`a24l-${run}`);
shown = await shownRows();
ok("A24-2 search pass: the firm's own reference finds its case", shown.length === 1 && shown[0] === nRow.case_number, shown);
await searchFor(barePerson);
shown = await shownRows();
ok("A24-2 search pass: a person's name finds their case", shown.length === 1 && shown[0] === bRow.case_number, shown);
await p.reload(); await p.locator("tr[data-case-row]").first().waitFor({ timeout: 30_000 });
ok("A24-2 search: a reload keeps the search (it lives in the address)", (await search.inputValue()) === barePerson && (await shownRows()).join() === bRow.case_number, await search.inputValue());
await searchFor(`ZZ-none-${run}`);
const none = p.getByText(`No case matches "ZZ-none-${run}"`);
await none.waitFor({ timeout: 15_000 });
ok("A24-2 search fail: nothing matching says so in words and offers Clear search; no row shows",
  (await shownRows()).length === 0 && (await p.getByRole("button", { name: "Clear search" }).count()) === 1, await p.locator("main").innerText());
await p.screenshot({ path: join(SHOTS, "03-search-no-match-1440.png"), fullPage: false });
await p.getByRole("button", { name: "Clear search" }).click();
await row(nRow.case_number).waitFor({ timeout: 15_000 });
ok("A24-2 search: Clear search empties the box and shows the cases again", (await search.inputValue()) === "" && (await shownRows()).length >= 2 && !new URL(p.url()).searchParams.has("q"), p.url());
const long = await call("GET", `/runtime/cases?q=${"x".repeat(81)}`, undefined, officer);
const twice = await call("GET", "/runtime/cases?q=a&q=b", undefined, officer);
ok("A24-2 search fail (API): a search over 80 characters, or two at once, is refused in words, never read as every case",
  long.status === 400 && /at most 80 characters/.test(JSON.stringify(long.body)) && twice.status === 400 && /one text/.test(JSON.stringify(twice.body)), [long.status, long.body?.detail, twice.status, twice.body?.detail]);
const other = f.solo?.users?.[0]?.actor ?? "user-S";
const otherFirm = await call("GET", `/runtime/cases?q=${encodeURIComponent(bRow.case_number)}`, undefined, other);
ok("A24-2 search fail (firm scope, C6.11 BR-20): another firm searching this case's number finds none of this firm's cases",
  otherFirm.status === 200 && !(otherFirm.body?.cases ?? []).some((c: { id: string }) => c.id === bare.id), { status: otherFirm.status, n: otherFirm.body?.cases?.length });

// 3. The next-number read never takes a number.
const peek1 = (await call("GET", "/runtime/next-case-number", undefined, officer)).body?.case_number;
const peek2 = (await call("GET", "/runtime/next-case-number", undefined, officer)).body?.case_number;
const seq = (n: string) => Number(n.split("-")[2]);
ok("A24-2 next number: it has the case number's shape, follows the newest case and reading it twice gives the same one",
  CASE_NUMBER.test(peek1 ?? "") && peek1 === peek2 && seq(peek1) === seq(bRow.case_number) + 1, [peek1, peek2, bRow.case_number]);
const client = await call("GET", "/runtime/next-case-number", undefined, "user-P");
ok("A24-2 next number fail: a client cannot read it", client.status === 403, client.status);

// 4. Open a case: the number given next; a reference shaped like a case number refused in words; then opened without one.
await p.getByRole("button", { name: "Open a case" }).click();
const dlg = p.getByRole("dialog");
await dlg.getByText(`(${peek1} next)`).waitFor({ timeout: 15_000 });
ok("A24-2 Open a case: the case number reads \"Given when you open (<next> next)\"", (await dlg.locator("[data-next-case-number]").innerText()).replace(/\s+/g, " ").includes(`Given when you open (${peek1} next)`), await dlg.locator("[data-next-case-number]").innerText());
ok("A24-2 Open a case: the reference field is \"Your own reference (optional)\"", (await dlg.getByLabel("Your own reference (optional)").count()) === 1);
await axe("A24-2 Open a case dialog", "[role=dialog]");
await dlg.getByLabel("Principal applicant's name").fill(`Sample Opened ${run}`);
const shaped = `C-${peek1.split("-")[1]}-00001`;
await dlg.getByLabel("Your own reference (optional)").fill(shaped);
await dlg.getByRole("button", { name: "Open case" }).click();
const refusal = dlg.getByText("Your own reference cannot look like a case number");
await refusal.waitFor({ timeout: 15_000 });
await p.screenshot({ path: join(SHOTS, "04-open-a-case-refused-1440.png"), fullPage: false });
const peekAfter = (await call("GET", "/runtime/next-case-number", undefined, officer)).body?.case_number;
ok("A24-2 Open a case fail: a reference shaped like a case number is refused in words under the field; the dialog stays and no number is used",
  (await refusal.count()) === 1 && (await dlg.getByLabel("Your own reference (optional)").getAttribute("aria-invalid")) === "true" && (await dlg.count()) === 1 && peekAfter === peek1 && /\/cases$/.test(new URL(p.url()).pathname), { peekAfter, url: p.url() });
await dlg.getByLabel("Your own reference (optional)").fill("");
ok("A24-2 Open a case: changing the reference clears its refusal", (await refusal.count()) === 0);
await dlg.getByRole("button", { name: "Open case" }).click();
await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, { timeout: 30_000 });
const toast = p.getByText(`Case ${peek1} opened`);
const toastShown = await toast.waitFor({ timeout: 10_000 }).then(() => true, () => false);
const h1 = p.getByRole("heading", { level: 1 });
await h1.waitFor({ timeout: 30_000 });
const newId = new URL(p.url()).pathname.split("/").pop()!;
const got = await call("GET", `/runtime/cases/${newId}`, undefined, officer);
ok("A24-2 Open a case pass: with no reference the case opens with the number shown; the toast says \"Case <number> opened\"",
  got.body?.case_number === peek1 && got.body?.reference === null && toastShown, { number: got.body?.case_number, reference: got.body?.reference, toastShown });
const h1Text = (await h1.innerText()).replace(/\s+/g, " ");
ok("A24-2 heading pass: the case page's heading starts with the case number; no reference, so none beside it",
  (await p.locator("[data-case-number-h]").innerText()) === peek1 && (await p.locator("h1 [data-case-own-reference]").count()) === 0 && !/null/.test(h1Text), h1Text);
const crumb = await p.locator("header, nav").filter({ hasText: peek1 }).count();
ok("A24-2: the frame's line names the case by its number", crumb > 0);
await p.screenshot({ path: join(SHOTS, "05-case-opened-no-reference-1440.png"), fullPage: false });
await p.goto(`${BASE}/cases/${named.id}`);
await p.locator("[data-case-number-h]").waitFor({ timeout: 30_000 });
ok("A24-2 heading: a case with its own reference shows its number, and the reference beside it",
  (await p.locator("[data-case-number-h]").innerText()) === nRow.case_number && (await p.locator("h1 [data-case-own-reference]").innerText()) === `A24L-${run}`, await h1.innerText());
await p.screenshot({ path: join(SHOTS, "06-case-heading-with-reference-1440.png"), fullPage: false });
await p.goto(`${BASE}/cases`);
await row(peek1).waitFor({ timeout: 30_000 });
ok("A24-2 list: the case just opened is listed by its number, first (newest)", (await shownRows())[0] === peek1, (await shownRows()).slice(0, 3));

// 5. Phone width: the list fits the screen (the table scrolls inside its own box), and stays usable.
const phone = await (await b.newContext({ viewport: { width: 375, height: 812 }, colorScheme: "light", reducedMotion: "reduce" })).newPage();
phone.on("pageerror", (e) => errors.push(String(e)));
await phone.goto(BASE); await phone.evaluate((a) => localStorage.setItem("xr-actor", a), officer);
await phone.goto(`${BASE}/cases`); await phone.locator(`tr[data-case-row="${peek1}"]`).waitFor({ timeout: 30_000 });
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok("A24-2 at 375 px: no sideways page scroll; the number, client and applications stay in view", overflow <= 0 && await phone.locator(`tr[data-case-row="${peek1}"] [data-case-client-name]`).isVisible(), overflow);
await phone.screenshot({ path: join(SHOTS, "07-case-list-375.png"), fullPage: false });
await axe("A24-2 list at 375 px", "main", phone);

ok("A24-2: no page error", errors.length === 0, errors.length ? errors : undefined);
await b.close();
process.exitCode = summary() ? 1 : 0;
