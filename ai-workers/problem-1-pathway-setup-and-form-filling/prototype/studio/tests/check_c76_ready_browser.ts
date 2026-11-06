// C7.6 Ready to file by screens (M3 sprint row B2, journey J-B2; prepare-tab concept r2 BR-8, BR-11; L-SA3 under P-315,
// P-237, P-238; P-155; QA-229), on the configured checkpoint (Demo › Load the configured checkpoint, as the author).
// A single adult's Visitor visa case, its facts filled by the pack's helper (the questionnaire's screens are C4's and are
// walked there). Then by screens only: the case officer reads the filing's readiness panel (lines by who owes them, the
// server's words, never a percentage, the same as GET /prepare); presses Ready to file and is refused with the same
// lines; passes a warning without a reason (refused on the field, nothing recorded), then each warning with a reason
// (who and when shown and stored); does not see "Review the filing". The representative of record presses Review the
// filing ("Prepared by · Reviewed by" shown). The case officer presses Ready to file: the filing reads "Ready to file"
// on the screen and in /prepare. Ends at C8.2's first step: "Record the submission" is enabled and a missing
// application number is refused on its field. A form row never says "Ready to file" (QA-229). Keyboard only, axe
// (WCAG 2.2 A/AA) per state, 1440 and 1024 px, no sideways scroll. Screenshots: product/screens/C7.6/screenshots/B2-*.
// No model call (US$0).
//   zsh studio/tools/isolated.sh rt_c76b 4432 start && tsx studio/tests/check_c76_ready_browser.ts 4432 xr_studio_rt_c76b
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import { CLIENT, PORT, agent, answer, call, confirmAll, fillEverything, filingOf, firms, needVisitorVisa, openCase, prepare, readinessOf, sql, yearsAgo } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "C7.6", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const STATUS: Record<string, string> = { not_started: "Not started", ready_to_file: "Ready to file", submitted: "Submitted" };
const ORDER = ["staff", "representative", "client", "employer", "ircc"];
type Line = { code: string; key: string; owes: string; words: string; severity: string };

// Demo › Reset, then Demo › Load the configured checkpoint, as the author (node:http: the load can outlast fetch's wait).
const post = (path: string, body: unknown) => new Promise<{ status: number; body: { detail?: string } | null }>((done) => {
  const data = JSON.stringify(body);
  const rq = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method: "POST", timeout: 1_200_000, headers: { "content-type": "application/json", "x-actor": "user-A", "content-length": Buffer.byteLength(data) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("timeout", () => rq.destroy(new Error("no answer in 20 minutes"))); rq.on("error", (e) => done({ status: 0, body: { detail: e.message } })); rq.end(data);
});
const reset = await post("/demo/reset", { confirm: "RESET" });
const load = reset.status < 300 ? await post("/demo/load", { sample: "configured" }) : reset;
if (load.status >= 300) { console.log(`STOP  the configured checkpoint did not load: ${load.status} ${load.body?.detail ?? ""}`); process.exit(2); }
ok("setup: Demo › Load the configured checkpoint (after Reset)", true);

const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep;
ok("setup: the Sample firm has a representative of record and a separate case officer", !!rep && rep !== officer, { rep, officer });
const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: rep, caseOfficers: [officer] });
const P = c.subjects["Sample Client A"];
// Set-up, not a check: on the checkpoint the helper leaves some facts with a problem (C7.6-4, -5 on the checkpoint); those
// lines are CRITICAL warnings (P-238) and are passed with a reason below like every other warning.
console.log(`NOTE  set-up: facts filled by the pack's helper: ${(await fillEverything(c.id)) ? "all confirmed" : "some left open (passed with a reason below)"}`);
const read = async () => { const p = (await prepare(c.id, officer)).p, f0 = filingOf(p, P), fl = f0 ? { ...f0, status: String(f0.status).toLowerCase() } : null; return { fl, rd: readinessOf(p, fl?.id) as unknown as { ready: boolean; blocks: Line[]; warns: Line[]; passed: (Line & { reason: string; by: string; at: string })[]; facts_hash: string } | null }; };
let { fl, rd } = await read();
const fid = fl?.id ?? "";
ok("setup: one filing, not ready, with open warnings (checkpoint)", !!fid && rd?.ready === false && (rd?.warns.length ?? 0) > 0, rd ? { blocks: rd.blocks.map((b) => b.code), warns: rd.warns.map((w) => w.code) } : null);
const nameOf = (id: string | null) => f.firm?.users.find((u) => u.actor === id)?.name ?? id ?? "";

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage(); const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
const as = async (actor: string) => { await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
const panel = () => p.locator("[data-readiness]");
const filing = () => panel().locator(`[data-readiness-filing="${fid}"]`);
const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30_000 }); await p.waitForTimeout(300); };
const open = async () => { await p.goto(`${BASE}/cases/${c.id}`); await filing().waitFor({ timeout: 60_000 }); await settle(); };
const press = async (loc: Locator) => { await loc.focus(); await p.keyboard.press("Enter"); await settle(); };
const words = async (loc: Locator) => (await loc.allInnerTexts()).map((t) => t.trim());
let n = 0;
async function state(name: string) {
  n++; const base = `B2-${String(n).padStart(2, "0")}-${name}`;
  await settle(); await filing().scrollIntoViewIfNeeded();
  await p.screenshot({ path: join(SHOTS, `${base}-1440.png`) });
  const v = (await new AxeBuilder({ page: p }).include("[data-readiness]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`axe: ${name}: no WCAG 2.2 A/AA violation in the panel`, v.length === 0, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250); await filing().scrollIntoViewIfNeeded();
  await p.screenshot({ path: join(SHOTS, `${base}-1024.png`) });
  ok(`1024 px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
}
/** The screen and /prepare say the same: the status in the same words, and each open line in the server's words. */
async function same(label: string) {
  ({ fl, rd } = await read());
  const shown = await words(filing().locator("[data-line] [data-words]")), server = [...(rd?.blocks ?? []), ...(rd?.warns ?? [])].map((l) => l.words);
  const pill = (await filing().locator("h3 + span").first().innerText()).trim();
  ok(`${label}: the screen and /prepare say the same state in the same words ("${STATUS[fl?.status ?? ""]}", ${server.length} open lines)`, pill === STATUS[fl?.status ?? ""] && shown.length === server.length && [...shown].sort().join("\n") === [...server].sort().join("\n"), { pill, status: fl?.status, shown, server });
}

// ---------------------------------------------------------------- the case officer: not ready
await as(officer); await open();
const panelText = await panel().innerText();
ok("C7.6 pass: the panel names the filing and its status \"Not started\", and says what stands before Ready to file, never a percentage", (await filing().getAttribute("data-status")) === "not_started" && /stands? before Ready to file\./.test(await filing().locator("[data-standing]").innerText()) && !/%/.test(panelText), panelText.slice(0, 300));
await same("C7.6 / QA-229 pass (not ready)");
const owners = await filing().locator("[data-owes]").evaluateAll((els) => els.map((e) => e.getAttribute("data-owes") ?? ""));
const wanted = ORDER.filter((o) => [...(rd?.blocks ?? []), ...(rd?.warns ?? [])].some((l) => l.owes === o));
ok("C7.6 pass: the lines are grouped by who owes them, in the server's order (case team · representative · client …)", owners.join() === wanted.join(), { owners, wanted });
ok("P-155 fail-guard: a case officer does not see \"Review the filing\"", (await p.getByRole("button", { name: "Review the filing" }).count()) === 0);
ok("QA-229 pass: no form row of the Prepare application panel says \"Ready to file\" (it is the filing's, said by the readiness panel only)",
  (await p.locator("section", { has: p.getByRole("heading", { name: "Prepare application", exact: true }) }).getByText("Ready to file", { exact: true }).count()) === 0);
await state("not-ready");

// Ready to file is refused (409) and names the same lines.
const before = [...(rd?.blocks ?? []), ...(rd?.warns ?? [])].map((l) => l.words);
await press(filing().locator("[data-mark-ready]"));
const refused = filing().locator("[data-not-ready]");
await refused.waitFor({ timeout: 15_000 }).catch(() => null);
const listed = await words(refused.locator("li"));
ok("C7.6 fail: \"Ready to file\" is refused on the screen with the server's words, listing the same lines", await refused.isVisible() && /Not ready to file/.test(await refused.innerText()) && /stand before Ready to file/.test(await refused.innerText()) && [...listed].sort().join("\n") === [...before].sort().join("\n"), { listed, before });
ok("C7.6 fail: nothing changed on the server (still not_started)", (await read()).fl?.status === "not_started");
await state("ready-refused");

// A pass without a reason is refused on the field; nothing is recorded.
const passes = () => Number(sql(`select count(*) from readiness_pass where filing_id = '${fid}'`) ?? -1);
const firstWarn = (rd?.warns ?? []).find((w) => w.code !== "representative_review")!;
const lineOf = (l: Line) => filing().locator(`[data-line="${l.key.replace(/"/g, '\\"')}"][data-code="${l.code}"]`);
await press(lineOf(firstWarn).getByRole("button", { name: /^Pass with a reason/ }));
const field = lineOf(firstWarn).getByRole("textbox", { name: "Why is this passed?" });
ok("keyboard: \"Pass with a reason…\" opens the reason field and moves the focus into it", await field.evaluate((el) => el === document.activeElement));
await press(lineOf(firstWarn).getByRole("button", { name: "Pass", exact: true }));
const alert = lineOf(firstWarn).locator('[role="alert"]');
ok("C7.6 fail: a pass without a reason is refused on the field, in the server's words; nothing recorded", (await field.getAttribute("aria-invalid")) === "true" && /Say why this warning is passed/.test(await alert.first().innerText().catch(() => "")) && passes() === 0, { invalid: await field.getAttribute("aria-invalid"), n: passes() });
await state("pass-without-reason");
await field.fill("1234"); await press(lineOf(firstWarn).getByRole("button", { name: "Pass", exact: true }));
ok("C7.6 fail: a reason without words (\"1234\") is refused on the field too; nothing recorded", /Say why this warning is passed/.test(await alert.first().innerText().catch(() => "")) && passes() === 0);
await press(lineOf(firstWarn).getByRole("button", { name: "Cancel" }));
ok("keyboard: Cancel gives the focus back to the line's \"Pass with a reason…\"", await lineOf(firstWarn).getByRole("button", { name: /^Pass with a reason/ }).evaluate((el) => el === document.activeElement));

// Break F1 (#1171): a stale tab. Another tab passes the first warning (the API, as the same case officer); this page
// still shows it and presses Ready to file: the server's refusal stays on the screen after the page reads the view
// again (never wiped by the refresh), names the lines open now, and the focus goes to the filing's heading.
const other = await call("POST", `/runtime/filings/${fid}/warnings/${firstWarn.code}/pass`, { reason: "Sample: checked with the client by phone (0)", key: firstWarn.key }, officer);
await press(filing().locator("[data-mark-ready]"));
await p.waitForTimeout(1500);
const nowOpen = [...((await read()).rd?.blocks ?? []), ...((await read()).rd?.warns ?? [])].map((l) => l.words);
const staleListed = await words(filing().locator("[data-not-ready] li"));
ok("F1 fail (stale tab): a refused Ready to file stays on the screen after the refresh, with the server's words and the lines open now; the passed line is gone from the list",
  other.status === 200 && await filing().locator("[data-not-ready]").isVisible() && [...staleListed].sort().join("\n") === [...nowOpen].sort().join("\n") && (await lineOf(firstWarn).count()) === 0, { other: other.status, staleListed, nowOpen });
ok("F1 / F3 (keyboard): after the refusal the focus is on the filing's heading, never the page", await filing().locator("h3").evaluate((el) => el === document.activeElement));
await state("ready-refused-stale-tab");

// Each other warning (except the representative's review) passed with a reason, by keyboard.
const toPass = (rd?.warns ?? []).filter((w) => w.code !== "representative_review");
let i = 1;
for (const w of toPass.filter((x) => x !== firstWarn)) {
  i++;
  await press(lineOf(w).getByRole("button", { name: /^Pass with a reason/ }));
  await p.keyboard.type(`Sample: checked with the client by phone (${i})`);
  await press(lineOf(w).getByRole("button", { name: "Pass", exact: true }));
  await lineOf(w).waitFor({ state: "detached", timeout: 15_000 }).catch(() => null);
}
({ fl, rd } = await read());
ok("C7.6 pass: once lines are passed, the earlier refusal (which listed them) is gone from the screen", (await filing().locator("[data-not-ready]").count()) === 0);
const stored = (sql(`select passed_by || '|' || reason from readiness_pass where filing_id = '${fid}' order by passed_at`) ?? "").split("\n").filter(Boolean);
const shownPassed = await words(filing().locator("[data-passed-line]"));
ok(`C7.6 pass: each of the ${toPass.length} warnings passed with a reason; only the representative's review stays open`, toPass.length > 0 && (rd?.warns ?? []).map((w) => w.code).join() === "representative_review" && rd?.passed.length === toPass.length, rd?.warns.map((w) => w.code));
ok("C7.6 pass: each pass is recorded with who and the reason (the case officer)", stored.length === toPass.length && stored.every((s) => s.startsWith(`${officer}|Sample: checked with the client by phone`)), stored);
ok("C7.6 pass: the screen shows each passed line with its reason, who passed it and when", shownPassed.length === toPass.length && shownPassed.every((t) => /“Sample: checked with the client by phone \(\d+\)”/.test(t) && t.includes(`passed by ${nameOf(officer)}`) && /\d{4}/.test(t)), shownPassed);
await same("C7.6 / QA-229 pass (warnings passed)");
await state("warnings-passed");

// ---------------------------------------------------------------- the representative of record: Review the filing
await as(rep!); await open();
const reviewBtn = filing().getByRole("button", { name: "Review the filing" });
ok("P-155 pass: the representative of record sees \"Review the filing\"", await reviewBtn.isVisible());
await press(reviewBtn);
await state("review-open");
await press(filing().getByRole("button", { name: "Confirm the review" }));
await filing().locator("[data-reviewed]").waitFor({ timeout: 15_000 }).catch(() => null);
({ fl, rd } = await read());
const reviewed = await filing().locator("[data-reviewed]").innerText().catch(() => "");
ok("C7.6 pass (P-155): the review is recorded; \"Prepared by · Reviewed by\" names the case officer and the representative with the licence", rd?.warns.length === 0 && /Prepared by · Reviewed by/.test(reviewed) && reviewed.includes(nameOf(officer)) && reviewed.includes(nameOf(rep)) && /licence/.test(reviewed), { reviewed, warns: rd?.warns.map((w) => w.code) });
ok("C7.6 pass: the review is stored as the representative's, for the facts read", sql(`select reviewed_by || '|' || kind from filing_review where filing_id = '${fid}' order by reviewed_at desc limit 1`) === `${rep}|reviewed`);
await same("C7.6 / QA-229 pass (reviewed)");
await state("reviewed");

// ---------------------------------------------------------------- the case officer: Ready to file
await as(officer); await open();
ok("C7.6 pass: nothing stands before Ready to file now (the screen says so)", /Nothing stands before Ready to file/.test(await filing().locator("[data-standing]").innerText()));
await press(filing().locator("[data-mark-ready]"));
await p.waitForFunction((id) => document.querySelector(`[data-readiness-filing="${id}"]`)?.getAttribute("data-status") === "ready_to_file", fid, { timeout: 15_000 }).catch(() => null);
({ fl } = await read());
ok("C7.6 pass: Ready to file: the filing reads \"Ready to file\" on the screen and in /prepare", fl?.status === "ready_to_file" && (await filing().getAttribute("data-status")) === "ready_to_file" && (await filing().locator("h3 + span").first().innerText()).trim() === "Ready to file", fl?.status);
ok("keyboard: after Ready to file the focus is on the filing's heading", await filing().locator("h3").evaluate((el) => el === document.activeElement));
await same("C7.6 / QA-229 pass (Ready to file)");
await state("ready-to-file");

// ---------------------------------------------------------------- C8.2's first step
const recordBtn = p.locator("[data-submission]").getByRole("button", { name: /^Record the submission/ }).first();
ok("C8.2 pass: \"Record the submission\" is enabled once the filing is Ready to file", await recordBtn.isEnabled());
await press(recordBtn);
const dlg = p.getByRole("dialog");
await dlg.waitFor({ timeout: 10_000 }).catch(() => null);
await dlg.getByRole("button", { name: "Record the submission" }).click(); await settle();
const number = dlg.getByRole("textbox", { name: "Application number" }).first();
ok("C8.2 fail: a missing application number is refused on its field", await number.isVisible() && (await number.getAttribute("aria-invalid")) === "true", await dlg.innerText().catch(() => ""));
ok("C8.2 fail: nothing recorded (still ready_to_file)", (await read()).fl?.status === "ready_to_file");
await p.keyboard.press("Escape");

// ---------------------------------------------------------------- break F2: a review refused because the facts changed
// The representative opens the review on a second case; meanwhile a fact IMM 5257 reads changes (the API, as the case
// officer). Confirm is refused (409, the server's words, nothing stored) and the form closes, so a second press cannot send
// facts the page read in the background; pressing "Review the filing" again reviews the facts as they are now.
const c2 = await openCase(vv, [{ role: "principal", name: "Sample Client B", dob: yearsAgo(35) }], { representative: rep, caseOfficers: [officer] });
const P2 = c2.subjects["Sample Client B"];
await fillEverything(c2.id);
const fid2 = filingOf((await prepare(c2.id, officer)).p, P2)?.id ?? "";
type Q = { subjectId: string; fact: string; required: boolean; hidden: boolean; group: string | null; value_type: string; collected_from: string; fills: { form: string }[]; value?: unknown };
const q2 = ((await agent(c2.id))?.sections ?? []).flatMap((x: { questions: Q[] }) => x.questions)
  .find((q: Q) => q.subjectId === P2 && q.required && !q.hidden && !q.group && q.value_type === "text" && q.fills.some((x) => x.form === "IMM 5257"));
await as(rep!); await p.goto(`${BASE}/cases/${c2.id}`);
const filing2 = () => panel().locator(`[data-readiness-filing="${fid2}"]`);
await filing2().waitFor({ timeout: 60_000 }); await settle();
await press(filing2().getByRole("button", { name: "Review the filing" }));
const changed = q2 ? await answer(c2.id, P2, q2.fact, "Sample Changed Value", officer) : null;
if (q2) await confirmAll(c2.id, P2);
await press(filing2().getByRole("button", { name: "Confirm the review" }));
await p.waitForTimeout(1000);
const reviews2 = () => Number(sql(`select count(*) from filing_review where filing_id = '${fid2}'`) ?? -1);
const refusal2 = await filing2().locator("[data-refusal]").innerText().catch(() => "");
ok("F2 fail: a review of facts changed since the page read them is refused with the server's words, the form closes and nothing is stored",
  !!q2 && (changed?.status ?? 500) < 300 && /Not reviewed/.test(refusal2) && /changed after you read it/.test(refusal2) && (await filing2().locator("[data-review-form]").count()) === 0 && reviews2() === 0, { fact: q2?.fact, status: changed?.status, refusal2, n: reviews2() });
ok("F2 / F3 (keyboard): after the refusal the focus is on the filing's heading", await filing2().locator("h3").evaluate((el) => el === document.activeElement));
await press(filing2().getByRole("button", { name: "Review the filing" }));
await press(filing2().getByRole("button", { name: "Confirm the review" }));
await filing2().locator("[data-reviewed]").waitFor({ timeout: 15_000 }).catch(() => null);
ok("F2 pass: pressed again (the facts read now), the review is recorded and the refusal is gone", reviews2() === 1 && (await filing2().locator("[data-refusal]").count()) === 0);
await p.keyboard.press("Escape");

// ---------------------------------------------------------------- the client never reaches the panel
await as(CLIENT); await p.goto(`${BASE}/cases/${c.id}`); await p.waitForTimeout(800);
ok("roles fail: the client's view has no readiness panel", (await panel().count()) === 0);
ok("no page error or console error during the walk", errs.length === 0, errs.slice(0, 3));

await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
