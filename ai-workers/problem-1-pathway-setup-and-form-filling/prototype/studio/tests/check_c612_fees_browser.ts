// C6.12 Fees on the case page, by screens (M3 sprint row B5, ruling R11; product/screens/B5/concept.md BR-1 to BR-8; P-247,
// P-171, BR-16, BR-18, G15), on the configured checkpoint (Demo › Reset, then Demo › Load the configured checkpoint, as
// the author). The case officer opens Visitor visa cases on /cases/:id and reads "Submission to IRCC" › Fees: each fee on
// the filing it is paid on, with its basis, the server's amount and reason; the totals' why lines and the submission's
// total; after a split, each submission's own total and the case's; a child with no date of birth "Not counted yet"; a
// person not travelling named with the server's why; each source once; no button. Every amount and word on the page is
// compared with GET /runtime/cases/:id/prepare in the same run, and each basis with samples/fee-table.json. States the
// checkpoint cannot reach (fees not worked out, a per-person or per-application line, a declared-only person, a basis
// that cannot be read) are served to the browser from the real view with the engine's own words (familyFee). Keyboard,
// axe (WCAG 2.2 A/AA) per state, 1440 and 1024 px, no sideways scroll, no duplicate ids. Screenshots:
// product/screens/C6.12/screenshots/B5-*. No model call (US$0).
//   zsh studio/tools/isolated.sh scr_c612f 4442 start && tsx studio/tests/check_c612_fees_browser.ts 4442 xr_studio_scr_c612f
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { chromium, type Locator } from "playwright";
import { cad, familyFee, FEE_TABLE } from "../engine/runtime/filings.ts";
import { CLIENT, FAMILY, OFFICER, PORT, answer, call, filingOf, needVisitorVisa, openCase, prepare, sql, yearsAgo } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "C6.12", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };

// The view as /prepare sends it (api/src/case-prepare.ts), read loosely.
type Src = { page: string; url: string; read: string };
type Total = { line: string; label: string; family_max_cents: number; total_cents: number; why: string; source: Src };
type Group = { id: string; kind: string; label: string; filings: string[]; totals: Total[]; total_cents: number | null };
type Line = { filing: string; subject: string; key: string; line: string; amount_words: string; exempt: boolean; reason: string; waiting?: string; source_detail?: Src | null };
type Filing = { id: string; label: string; owner?: { subject: string; label: string }; applicants: { subject: string; label: string; mode: string }[] };
type View = { version: string; groups: Group[]; filings: Filing[]; fees: Line[]; not_filing: { subject: string; label: string; why: string }[]; fees_worked_out: boolean; fees_why: string | null; basis: string };
const viewOf = async (id: string) => (await prepare(id)).p as unknown as View;
/** A fee's basis in P-247's words, from samples/fee-table.json itself (never from the page's code). */
const tableBasis = (key: string) => {
  const l = FEE_TABLE.lines.find((x) => x.key === key);
  return l?.basis === "family_maximum" ? `Per person, with a family maximum of ${cad(Math.round(l.family_max!.cad * 100))} from ${l.family_max!.from_people} people applying together`
    : l?.basis === "per_person_by_role" ? "Per person by role" : l?.basis === "per_application" ? "Per application" : null;
};

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
// A family of four (two adults, a child of 10, a child of 15), as the C6.12 pack's.
const c = await openCase(vv, FAMILY);
let v = await viewOf(c.id);
ok("setup: the family case has one submission of four filings, fees worked out", v?.groups?.length === 1 && v.filings.length === 4 && v.fees_worked_out === true, v?.groups?.map((g) => g.filings.length));

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage(); const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), OFFICER);
const panel = () => p.locator("[data-submission]");
const block = (g: string) => panel().locator(`[data-fees="${g}"]`);
const text = async (loc: Locator) => (await loc.innerText()).replace(/\s+/g, " ").trim();
const open = async (id: string, g: string) => { await p.goto(`${BASE}/cases/${id}`); await block(g).waitFor({ timeout: 60_000 }); await p.waitForTimeout(300); };
let n = 0;
async function state(name: string, where = "[data-submission]") {
  n++; const base = `B5-${String(n).padStart(2, "0")}-${name}`;
  await panel().scrollIntoViewIfNeeded();
  await panel().screenshot({ path: join(SHOTS, `${base}-1440.png`) });
  const x = (await new AxeBuilder({ page: p }).include(where).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`axe: ${name}: no WCAG 2.2 A/AA violation in the panel`, x.length === 0, x.map((y) => `${y.id} (${y.nodes.length}): ${y.nodes[0]?.target}`));
  ok(`ids: ${name}: no id is used twice on the page`, await p.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.length === new Set(ids).size; }));
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250); await panel().scrollIntoViewIfNeeded();
  await panel().screenshot({ path: join(SHOTS, `${base}-1024.png`) });
  ok(`1024 px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
}
/** Each fee's basis as its totals line shows it (challenge M1: once per fee, never on a person's row). */
const bases = async (g: string) => block(g).locator("[data-fee-total-line]").evaluateAll((els) => els.map((e) => ({ line: e.getAttribute("data-fee-total-line") ?? "", basis: e.querySelector("[data-fee-basis]")?.textContent?.trim() ?? null })));
/** The page's fee rows of a block: filing, fee key, person, basis (none expected), amount, why. */
const rows = async (g: string) => block(g).locator("[data-fee-line]").evaluateAll((els) => els.map((e) => ({
  filing: e.closest("[data-fee-filing]")?.getAttribute("data-fee-filing") ?? "", key: e.getAttribute("data-fee-line") ?? "", subject: e.getAttribute("data-fee-subject") ?? "",
  basis: e.querySelector("[data-fee-basis]")?.textContent?.trim() ?? null, amount: e.querySelector("[data-fee-amount]")?.textContent?.trim() ?? "", why: (e.lastElementChild?.textContent ?? "").trim() })));
const sameLines = (shown: Awaited<ReturnType<typeof rows>>, server: Line[]) => shown.length === server.length && server.every((l) => shown.some((s) => s.filing === l.filing && s.key === l.key && s.subject === l.subject && s.why === l.reason && s.amount === (l.waiting ? "Not counted yet" : l.amount_words)));

// ---------------------------------------------------------------- BR-1, BR-2, BR-3, BR-7, BR-8 on the family case
const g0 = v.groups[0];
await open(c.id, g0.id);
let shown = await rows(g0.id);
ok("C6.12-25 BR-1 pass: each fee shows under the filing it is paid on, with the server's amount and reason (8 lines: visitor visa ×4, biometrics ×4)", shown.length === 8 && sameLines(shown, v.fees), { shown, server: v.fees.map((l) => [l.filing.slice(0, 8), l.key, l.amount_words]) });
ok("C6.12-25 BR-1 fail: no fee line shows under another person's filing (the child of 10's biometrics line is on the child's filing, not the principal's)",
  shown.filter((s) => s.filing === filingOf(v as never, c.subjects["Sample Client A"])?.id).every((s) => s.subject === v.filings.find((f) => f.id === s.filing)?.owner?.subject), shown.map((s) => [s.filing.slice(0, 8), s.subject.slice(0, 8)]));
const fh = await block(g0.id).locator("[data-fee-filing] th[scope=rowgroup]").allInnerTexts();
ok("C6.12-25 BR-1 pass: each filing is named once, in the submission's own order", fh.join("|") === g0.filings.map((id) => v.filings.find((f) => f.id === id)?.label).join("|"), fh);
const b0 = await bases(g0.id);
ok("C6.12-25 BR-2 pass (P-247): each fee names its basis once, on its totals line, the same as samples/fee-table.json (visitor visa: family maximum CAD 500 from 5; biometrics: CAD 170 from 2)", b0.length === 2 && b0.every((x) => !!x.basis && x.basis === tableBasis(x.line)) && b0.some((x) => /CAD 500 from 5 people/.test(x.basis ?? "")) && b0.some((x) => /CAD 170 from 2 people/.test(x.basis ?? "")), b0);
ok("C6.12-25 BR-2 fail (challenge M1): no person's row carries a basis, so the CAD 100 rows (no maximum reached) and the under-14 child's CAD 0 row never read \"family maximum\"", shown.every((x) => x.basis === null) && (await block(g0.id).locator("[data-fee-line] th").allInnerTexts()).every((t) => !/maximum/i.test(t)), shown.map((x) => x.basis));
const tl = await block(g0.id).locator("[data-fee-total-line]").allInnerTexts();
ok("C6.12-25 BR-3 pass: each line's total with the server's why (biometrics: the family maximum CAD 170 instead of 3 × CAD 85)", tl.length === g0.totals.length && g0.totals.every((t, i) => tl[i].replace(/\s+/g, " ").trim() === `${t.label}: ${cad(t.total_cents)} · ${tableBasis(t.line)} · ${t.why}`) && tl.some((t) => /family maximum CAD 170 applies instead of 3 × CAD 85/.test(t)), { tl, totals: g0.totals.map((t) => t.why) });
const total0 = await text(block(g0.id).locator("[data-fee-total]"));
ok("C6.12-25 BR-3 pass: \"Total for this submission\" is the server's total in the engine's words (CAD 570 = 400 + 170)", total0 === `Total for this submission: ${cad(g0.total_cents ?? -1)}` && g0.total_cents === 57000, { total0, server: g0.total_cents });
ok("C6.12-25 BR-3 fail: one submission shows no separate \"Total for the case\" (its own total is the case's)", (await panel().locator("[data-case-fee-total]").count()) === 0);
const srcWords = await text(block(g0.id).locator("[data-fee-sources]"));
ok("C6.12-25 BR-7 pass: a page's own date is shown as its page date, never as the day it was read (the biometrics exemption page: page date 2026-03-30)", /page date 2026-03-30/.test(srcWords) && !/read [^)]*page date/.test(srcWords), srcWords);
const srcShown = await block(g0.id).locator("[data-fee-sources] a").evaluateAll((as) => as.map((a) => [a.textContent?.trim(), a.getAttribute("href")]));
const srcServer = [...new Map([...g0.totals.map((t) => t.source), ...v.fees.map((l) => l.source_detail)].filter((s): s is Src => !!s?.url).map((s) => [s.url, s])).values()];
ok("C6.12-25 BR-7 pass: each source once, as a link with its page name (the IRCC fee list; the biometrics exemption page)", srcShown.length === srcServer.length && srcServer.every((s) => srcShown.filter((x) => x[1] === s.url && x[0] === s.page).length === 1) && srcShown.some((x) => /ircc\.canada\.ca\/english\/information\/fees/.test(x[1] ?? "")), { srcShown, srcServer: srcServer.map((s) => s.url) });
ok("C6.12-25 BR-7 pass: the basis sentence once, saying Sample until the immigration expert confirms (P-171)", (await panel().locator("[data-fee-basis-sentence]").count()) === 1 && (await text(panel().locator("[data-fee-basis-sentence]"))) === v.basis && /Sample until the immigration expert confirms/.test(v.basis));
ok("C6.12-25 BR-8 fail: the fee block has no button (paying is not built; the receipt stays with Record the submission)", (await block(g0.id).locator("button").count()) === 0 && (await panel().getByRole("button", { name: /Record the submission/ }).count()) === 1);
const page = (await p.locator("body").innerText()).replace(/\s+/g, " ");
ok("C6.12-25 pass (the pack's own read): visitor visa fee, CAD 100, biometrics, CAD 170 on the case page", /visitor visa fee/i.test(page) && /CAD\s?100/.test(page) && /biometric/i.test(page) && /CAD\s?170/.test(page));
// Keyboard: Tab from the block's heading area reaches each source link, in order.
await block(g0.id).locator("h4").scrollIntoViewIfNeeded(); await block(g0.id).locator("[data-fee-sources] a").first().focus();
const f1 = await p.evaluate(() => document.activeElement?.textContent); await p.keyboard.press("Tab");
const f2 = await p.evaluate(() => document.activeElement?.textContent);
ok("keyboard: the source links are reached in order by Tab", f1 === srcShown[0]?.[0] && f2 === srcShown[1]?.[0], { f1, f2 });
await state("family-of-four");

// ---------------------------------------------------------------- BR-3 after a split: each submission's total, and the case's
const kid15 = filingOf(v as never, c.subjects["Sample Child A2"])?.id;
const split = await call("POST", `/runtime/groups/${g0.id}/split`, { filing: kid15, reason: "Travels on a later date (Sample)", version: v.version }, OFFICER);
v = await viewOf(c.id);
ok("setup: the child of 15 split out with a reason (two submissions)", split.status === 200 && v.groups.length === 2, split.status);
await open(c.id, v.groups[0].id); await block(v.groups[1].id).waitFor();
const totals = await panel().locator("[data-fee-total]").allInnerTexts();
ok("C6.12-25 BR-3 pass: after the split each submission shows its own total (CAD 470 = 300 + 170; CAD 185 = 100 + 85)", totals.length === 2 && v.groups.every((g, i) => totals[i].trim() === `Total for this submission: ${cad(g.total_cents ?? -1)}`) && v.groups.map((g) => g.total_cents).sort().join() === "18500,47000", { totals, server: v.groups.map((g) => g.total_cents) });
const caseTotal = await text(panel().locator("[data-case-fee-total]"));
const sum = v.groups.reduce((s, g) => s + (g.total_cents ?? 0), 0);
ok("C6.12-25 BR-3 pass (P-247): \"Total for the case\" is the two submissions' totals together, CAD 655, more than the CAD 570 before the split (the family maximum covers one submission only)", caseTotal === `Total for the case: ${cad(sum)} · 2 submissions, each priced on its own` && sum === 65500, caseTotal);
ok("C6.12-25 BR-1 fail: after the split no line is shown twice, and none under the other submission", sameLines(await rows(v.groups[0].id), v.fees.filter((l) => v.groups[0].filings.includes(l.filing))) && sameLines(await rows(v.groups[1].id), v.fees.filter((l) => v.groups[1].filings.includes(l.filing))));
ok("C6.12-25 BR-6 pass: the people with no filing are listed once, under the first submission only", (await panel().locator("[data-fee-not-filing]").count()) <= 1 && (await block(v.groups[1].id).locator("[data-fee-not-filing]").count()) === 0);
const caps = await panel().locator("[data-fees] caption").allTextContents();
ok("C6.12-25 BR-1 pass (break m4): each submission's table is named by its own filings, so two \"One submission\" groups are told apart", caps.length === 2 && new Set(caps).size === 2 && v.groups.every((g, i) => g.filings.every((id) => caps[i].includes(v.filings.find((f) => f.id === id)?.label ?? "?"))), caps);
await state("split-two-submissions");

// ---------------------------------------------------------------- BR-5: a child with no date of birth yet (G15)
const nd = await openCase(vv, [FAMILY[0], { role: "child", name: "Sample Child A9", dob: null }]);
const vd = await viewOf(nd.id), waitLine = vd.fees.find((l) => l.waiting);
await open(nd.id, vd.groups[0].id);
const wr = (await rows(vd.groups[0].id)).find((r) => r.subject === waitLine?.subject && r.key === waitLine?.key);
ok("C6.12-25 BR-5 pass: the biometrics line waiting for the date of birth reads \"Not counted yet\" with the server's reason", !!waitLine && wr?.amount === "Not counted yet" && wr.why === waitLine.reason && /date of birth/i.test(wr.why), { waitLine, wr });
ok("C6.12-25 BR-5 fail: no CAD amount in that row, although the server's line carries one (it is not counted)", !!wr && !/CAD/.test(wr.amount) && /CAD/.test(waitLine?.amount_words ?? ""), { amount: wr?.amount, server: waitLine?.amount_words });
const so = await text(block(vd.groups[0].id).locator("[data-fee-total]"));
ok("C6.12-25 BR-5 pass (challenge M2): while a fee waits the total says \"Total so far\" and how many fees are not counted (the server leaves the line out)", so === `Total so far: ${cad(vd.groups[0].total_cents ?? -1)} · 1 fee not counted yet`, { so, server: vd.groups[0].total_cents });
const bioT = vd.groups[0].totals.find((t) => t.line === waitLine?.key);
const lineSo = (await block(vd.groups[0].id).locator(`[data-fee-total-line="${waitLine?.key}"]`).innerText()).replace(/\s+/g, " ").trim();
ok("C6.12-25 BR-5 pass (break m2): the waiting fee's own total says \"so far\" and how many are not counted", !!bioT && lineSo.startsWith(`${bioT.label}: ${cad(bioT.total_cents)} so far · 1 not counted yet`), lineSo);
ok("C6.12-25 BR-5 fail (break m2): a fee with nobody waiting never says \"so far\"", (await block(vd.groups[0].id).locator("[data-fee-total-line]").allInnerTexts()).filter((t) => !t.includes(bioT?.label ?? "?")).every((t) => !/so far/.test(t)));
// Review M1 (WCAG 1.4.4): 1024 px at 200 % zoom is 512 css px; "Not counted yet" wraps in its cell and never runs into the why.
await p.setViewportSize({ width: 512, height: 800 }); await p.waitForTimeout(250);
const wrow = block(vd.groups[0].id).locator(`[data-fee-line][data-fee-waiting]`).first(); await wrow.scrollIntoViewIfNeeded();
const [ab, wb] = [await wrow.locator("[data-fee-amount]").evaluate((e) => { const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { right: b.right }; }), await wrow.locator("td").last().boundingBox()];
await p.screenshot({ path: join(SHOTS, "B5-zoom-512-waiting.png") });
ok("C6.12-25 BR-5 pass (review M1): at 512 css px (1024 px at 200 %) the waiting amount ends before its why begins (no overlap)", !!wb && ab.right <= wb.x + 0.5, { amountRight: ab.right, whyLeft: wb?.x });
ok("512 css px: the fee block causes no sideways scroll of its own", await block(vd.groups[0].id).evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
const kid9 = nd.subjects["Sample Child A9"];
const dobSet = await answer(nd.id, kid9, "person.date_of_birth", yearsAgo(15));
const vd2 = await viewOf(nd.id);
await open(nd.id, vd2.groups[0].id);
const fin = await text(block(vd2.groups[0].id).locator("[data-fee-total]"));
ok("C6.12-25 BR-5 fail (challenge M2): once the date of birth is answered (15) the line counts, the total is final and higher (no \"so far\")", dobSet.status < 300 && !vd2.fees.some((l) => l.waiting) && fin === `Total for this submission: ${cad(vd2.groups[0].total_cents ?? -1)}` && (vd2.groups[0].total_cents ?? 0) > (vd.groups[0].total_cents ?? 0), { status: dobSet.status, fin, before: vd.groups[0].total_cents, after: vd2.groups[0].total_cents });
await state("waiting-date-of-birth");

// ---------------------------------------------------------------- BR-6: a person not travelling
const nt = await openCase(vv, [...FAMILY.slice(0, 3), { role: "child", name: "Sample Child A2", dob: yearsAgo(15), applies: false }]);
const vt = await viewOf(nt.id); const away = nt.subjects["Sample Child A2"];
await open(nt.id, vt.groups[0].id);
ok("C6.12-25 BR-6 fail: the child not travelling has no fee line on the page (none in the server's view)", !(await rows(vt.groups[0].id)).some((r) => r.subject === away) && !vt.fees.some((l) => l.subject === away));
const nf = await block(vt.groups[0].id).locator("[data-fee-no-filing]").allInnerTexts();
ok("C6.12-25 BR-6 pass: the child not travelling is named once with the server's why (\"Not travelling … no filing and no fee.\")", vt.not_filing.length === 1 && vt.not_filing[0].subject === away && nf.length === 1 && vt.not_filing.every((x, i) => nf[i].replace(/\s+/g, " ").trim() === `${x.label}: no fee. ${x.why}`), { nf, server: vt.not_filing });

// ---------------------------------------------------------------- states the checkpoint cannot reach: the real view, engine words
const serve = async (id: string, edit: (x: View) => View) => {
  const real = await viewOf(id);
  await p.route(`**/api/runtime/cases/${id}/prepare*`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(edit(structuredClone(real))) }));
  await open(id, real.groups[0].id); return real;
};
// BR-4 on real data (review and break m5): the checkpoint's study permit combination has filing modes but no fee rule.
const spId = sql("select c.id from combination c join config_release r on r.combination_id=c.id where c.combination_key='sp.outside' limit 1");
const sp = spId ? await openCase(spId, [{ role: "principal", name: "Sample Student A", dob: yearsAgo(22) }]) : null;
const vs = sp?.id ? await viewOf(sp.id) : null;
if (sp && vs?.groups?.length) await open(sp.id, vs.groups[0].id);
const spText = sp && vs?.groups?.length ? await text(panel()) : "";
ok("C6.12-25 BR-4 pass (real data): a study permit case on the checkpoint shows the server's \"fees not worked out\" words once, and no amount", !!vs && vs.fees_worked_out === false && !!vs.fees_why && spText.split(vs.fees_why).length === 2 && !/CAD/.test(spText), { spId, worked: vs?.fees_worked_out, why: vs?.fees_why });
const c2 = await openCase(vv, FAMILY.slice(0, 2));
// BR-4: fees not worked out (C11.12 BR-10): the server's why, no amount, no total.
let real = await serve(c2.id, (x) => ({ ...x, fees_worked_out: false, fees_why: "Fees not worked out yet for this combination (Sample words from the engine's notWorkedOut).", fees: [], groups: x.groups.map((g) => ({ ...g, totals: [], total_cents: null })) }));
const nw = await text(block(real.groups[0].id));
ok("C6.12-25 BR-4 pass: fees not worked out shows the server's why", /Fees not worked out yet/.test(nw), nw);
ok("C6.12-25 BR-4 fail: no amount and no total where the fees are not worked out (never CAD 0)", !/CAD/.test(await text(panel())) && (await panel().locator("[data-fee-total], [data-case-fee-total]").count()) === 0);
await state("fees-not-worked-out");
await p.unroute(`**/api/runtime/cases/${c2.id}/prepare*`);
// BR-2: the two other bases, with familyFee's own words for a line on each basis.
const rule = (basis: "per_person_by_role" | "per_application", t: Total) => familyFee({ key: t.line, label: t.label, basis, perPersonCents: 10000, familyMaxCents: 0, familyFrom: Number.MAX_SAFE_INTEGER, source: t.source as never }, 2);
real = await serve(c2.id, (x) => ({ ...x, groups: x.groups.map((g) => ({ ...g, totals: [rule("per_person_by_role", g.totals[0]) as unknown as Total, rule("per_application", g.totals[1]) as unknown as Total] })) }));
const bb = await rows(real.groups[0].id);
const bx = await bases(real.groups[0].id);
ok("C6.12-25 BR-2 pass (P-247): a per-person-by-role fee reads \"Per person by role\" and a per-application fee \"Per application\" (the engine's words for each basis)",
  bx.length === 2 && bx[0].basis === "Per person by role" && bx[1].basis === "Per application" && bb.length > 0 && bb.every((r) => r.basis === null), bx);
await p.unroute(`**/api/runtime/cases/${c2.id}/prepare*`);
// BR-2 fail: a basis the page cannot read is never guessed (only the why shows).
real = await serve(c2.id, (x) => ({ ...x, groups: x.groups.map((g) => ({ ...g, totals: g.totals.map((t) => ({ ...t, family_max_cents: 0, why: "A line priced some other way (test words)." })) })) }));
ok("C6.12-25 BR-2 fail: a line whose basis cannot be read names none (no guessed basis)", (await block(real.groups[0].id).locator("[data-fee-basis]").count()) === 0 && (await block(real.groups[0].id).locator("[data-fee-line]").count()) > 0);
await p.unroute(`**/api/runtime/cases/${c2.id}/prepare*`);
// BR-6: a declared-only applicant (On the principal's application, not travelling) reads "Declared only: no fee".
real = await serve(c2.id, (x) => ({ ...x, filings: x.filings.map((f, i) => i === 0 ? { ...f, applicants: [...f.applicants, { subject: "s-declared", label: "Sample Parent A (declared only)", mode: "declared_only" }] } : f) }));
const dec = await text(block(real.groups[0].id).locator("[data-fee-declared]"));
ok("C6.12-25 BR-6 pass: a declared-only person on a filing reads \"Declared only: no fee\", with no amount", /Sample Parent A \(declared only\)/.test(dec) && /Declared only: no fee/.test(dec) && !/CAD/.test(dec), dec);
await state("declared-only");
await p.unroute(`**/api/runtime/cases/${c2.id}/prepare*`);

// The case total after a split while a fee waits: "so far" (challenge M2), from the split case's real view.
real = await serve(c.id, (x) => ({ ...x, fees: x.fees.map((l, i) => i === 0 ? { ...l, waiting: "person.date_of_birth" } : l) }));
const sofar = await text(panel().locator("[data-case-fee-total]"));
ok("C6.12-25 BR-3 pass (challenge M2): the case total says \"so far\" while a fee waits", /^Total for the case so far: CAD \d+ · 2 submissions, each priced on its own · 1 fee not counted yet$/.test(sofar), sofar);
await p.unroute(`**/api/runtime/cases/${c.id}/prepare*`);

// ---------------------------------------------------------------- roles: the client never reaches the fees
await p.evaluate((a) => localStorage.setItem("xr-actor", a), CLIENT); await p.goto(`${BASE}/cases/${c.id}`); await p.waitForTimeout(1000);
ok("roles fail: the client's view has no fee block", (await p.locator("[data-fees]").count()) === 0);
ok("no page error or console error during the walk", errs.length === 0, errs.slice(0, 3));

await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
