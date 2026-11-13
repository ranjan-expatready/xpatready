// B151 ("B5b", screens; Devin on #1233, Lead 31): the fee block names the people with no fee when the fees are not worked
// out, and says where a recorded group's fees come from. On the configured checkpoint: a real Provincial nominees ›
// Express Entry stream case (pnp.express_entry: no fee lines in the fee table, so the fees are not worked out; a child
// not travelling is declared only on the principal's application) shows the server's words once, names the
// declared-only child and each person with no filing with the server's words, and no amount, at 1440 and 1024 px. M3-S1
// (P-425) priced the spouse sponsorship this check first used (fs.spouse), so it moved to a combination with no fee row. A
// recorded Visitor visa group reads "Fees as recorded on <day>" when /prepare says it was frozen (B152), else "Fees as
// worked out today, not the amount recorded". Every word compared with GET /prepare in the same run; axe (WCAG 2.2 A/AA),
// no sideways scroll, no duplicate ids. Screenshots: product/screens/C6.12/screenshots/B151-*. No model call (US$0).
//   zsh studio/tools/isolated.sh scr_b151 4443 start && tsx studio/tests/check_b151_unpriced_browser.ts 4443 xr_studio_scr_b151
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { chromium, type Locator, type Route } from "playwright";
import { CLIENT, OFFICER, PORT, call, firms, inDays, needVisitorVisa, openCase, prepare, readyToFile, sql, yearsAgo, type Person } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "C6.12", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Applicant = { subject: string; label: string; mode: string };
type View = { version: string; derived: boolean; fees_worked_out: boolean; fees_why: string | null; fees: unknown[]; not_filing: { subject: string; label: string; why: string }[];
  groups: { id: string; filings: string[]; total_cents: number | null; fees_recorded?: { at: string } }[]; filings: { id: string; status: string; applicants: Applicant[] }[] };
const viewOf = async (id: string, actor = OFFICER) => (await prepare(id, actor)).p as unknown as View;

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

// A real pnp.express_entry case: the principal, and a child who is not travelling (on the principal's application).
const fsId = sql("select c.id from combination c join config_release r on r.combination_id=c.id where c.combination_key='pnp.express_entry' limit 1");
const people = [{ role: "principal", name: "Sample Applicant E", dob: yearsAgo(33) }, { role: "child", name: "Sample Child E1", dob: yearsAgo(8), applies: false }] as unknown as Person[];
const fs = fsId ? await openCase(fsId, people) : null;
const v = fs ? await viewOf(fs.id) : null;
const declared = (v?.filings ?? []).flatMap((f) => f.applicants.filter((a) => a.mode === "declared_only"));
ok("setup: the Express Entry stream case is released on the checkpoint, its fees are not worked out (no fee lines in the table), and the child not travelling is declared only", !!v?.derived && v.fees_worked_out === false && !!v.fees_why && declared.some((a) => a.subject === fs?.subjects["Sample Child E1"]), { fsId, worked: v?.fees_worked_out, declared, not_filing: v?.not_filing });

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage(); const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), OFFICER);
const panel = () => p.locator("[data-submission]");
const text = async (loc: Locator) => (await loc.innerText()).replace(/\s+/g, " ").trim();
// Serve /prepare rewritten from the real answer. Each fulfil is awaited; a route the page already dropped (a navigation
// or a second /prepare from open()) is left alone, never handled twice (B151 flake: "Route is already handled!", 13 Nov).
const serve = (rewrite: (real: View) => unknown) => async (rt: Route) => {
  try { const real = (await (await rt.fetch()).json()) as View; await rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rewrite(real)) }); }
  catch (e) { if (!/already handled|has been closed|disposed|Request context/i.test(String(e))) throw e; }
};
// Remove the /prepare route only after any handler still in flight has finished (unroute alone does not wait).
const unserve = () => p.unrouteAll({ behavior: "wait" });
const open = async (id: string) => { await p.goto(`${BASE}/cases/${id}`); await p.locator("[data-fees]").first().waitFor({ timeout: 60_000 }); await p.waitForTimeout(300); };
async function state(name: string) {
  await panel().scrollIntoViewIfNeeded(); await panel().screenshot({ path: join(SHOTS, `B151-${name}-1440.png`) });
  const x = (await new AxeBuilder({ page: p }).include("[data-submission]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`axe: ${name}: no WCAG 2.2 A/AA violation in the panel`, x.length === 0, x.map((y) => `${y.id} (${y.nodes.length}): ${y.nodes[0]?.target}`));
  ok(`ids: ${name}: no id is used twice on the page`, await p.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.length === new Set(ids).size; }));
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250); await panel().scrollIntoViewIfNeeded();
  await panel().screenshot({ path: join(SHOTS, `B151-${name}-1024.png`) });
  ok(`1024 px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  const blockAt1024 = await text(p.locator("[data-fees]").first());
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
  return blockAt1024;
}

// ---------------------------------------------------------------- the unpriced state names the people (Express Entry stream)
if (fs && v) {
  await open(fs.id);
  const blk = p.locator('[data-fees][data-fees-worked-out="false"]');
  const words = await text(blk);
  ok("B151 pass: fees not worked out: the server's words, once on the page", (await blk.count()) === 1 && words.split(v.fees_why ?? "?").length === 2 && (await p.locator("body").innerText()).split(v.fees_why ?? "?").length === 2, words);
  const dec = await blk.locator("[data-fee-declared]").evaluateAll((els) => els.map((e) => [e.getAttribute("data-fee-declared"), (e.textContent ?? "").replace(/\s+/g, " ").trim()]));
  ok("B151 pass: each declared-only person is named with \"Declared only: no fee\" (the child not travelling)", dec.length === declared.length && declared.every((a) => dec.some(([s, t]) => s === a.subject && t === `${a.label}: Declared only: no fee`)), { dec, declared });
  const nf = await blk.locator("[data-fee-no-filing]").evaluateAll((els) => els.map((e) => [e.getAttribute("data-fee-no-filing"), (e.textContent ?? "").replace(/\s+/g, " ").trim()]));
  ok("B151 pass: each person with no filing in the server's view is named once with the server's why", nf.length === v.not_filing.length && v.not_filing.every((x) => nf.some(([s, t]) => s === x.subject && t === `${x.label}: no fee. ${x.why}`)), { nf, server: v.not_filing });
  ok("B151 fail: no amount, no total and no basis anywhere in the panel while the fees are not worked out (never CAD 0)", !/CAD/.test(await text(panel())) && (await panel().locator("[data-fee-total], [data-case-fee-total], [data-fee-basis]").count()) === 0);
  const at1024 = await state("unpriced-pnp-express-entry");
  ok("B151 pass (1024 px): the same people and words at 1024 px", at1024 === words, { at1024, words });
} else ok("B151: the Express Entry stream case could not be opened on the checkpoint", false, { fsId });

// Review M1: a real case where /prepare names a person with no filing while the fees are not worked out: With an LMIA
// (wp.lmia_inside) with the partner not applying. The check fails if the unpriced block drops not_filing[].
const wpId = sql("select c.id from combination c join config_release r on r.combination_id=c.id where c.combination_key='wp.lmia_inside' limit 1");
const wp = wpId ? await openCase(wpId, [{ role: "principal", name: "Sample Worker L", dob: yearsAgo(31) }, { role: "spouse_or_partner", name: "Sample Partner L", dob: yearsAgo(30), applies: false }]) : null;
const wv = wp ? await viewOf(wp.id) : null;
ok("setup (review M1): the With an LMIA case's fees are not worked out and /prepare names at least one person with no filing", !!wv && wv.fees_worked_out === false && wv.not_filing.length > 0, { wpId, worked: wv?.fees_worked_out, not_filing: wv?.not_filing });
if (wp && wv) {
  await open(wp.id);
  const wb = p.locator('[data-fees][data-fees-worked-out="false"]');
  const wnf = await wb.locator("[data-fee-no-filing]").evaluateAll((els) => els.map((e) => [e.getAttribute("data-fee-no-filing"), (e.textContent ?? "").replace(/\s+/g, " ").trim()]));
  ok("B151 pass (review M1, real data): with the fees not worked out, each person with no filing is named once with the server's why (the partner not applying)", wv.not_filing.length > 0 && wnf.length === wv.not_filing.length && wv.not_filing.every((x) => wnf.filter(([s, t]) => s === x.subject && t === `${x.label}: no fee. ${x.why}`).length === 1), { wnf, server: wv.not_filing });
  ok("B151 fail (review M1): no amount in that block either", !/CAD/.test(await text(wb)));
  await state("unpriced-wp-lmia-partner");
}
// Review m: a person declared only on two filings is named once (the real view, served with the child on two filings:
// this case has one, so the served view adds a second filing in the same group with the child on it).
if (fs && v && declared.length) {
  const kid = declared[0];
  await p.route(`**/api/runtime/cases/${fs.id}/prepare*`, serve((real) => {
    const extra = real.filings.length > 1 ? null : { ...real.filings[0], id: `${real.filings[0].id}-b151-second`, applicants: [kid] };
    const filings = [...real.filings.map((x) => x.applicants.some((a) => a.subject === kid.subject) ? x : { ...x, applicants: [...x.applicants, kid] }), ...(extra ? [extra] : [])];
    return { ...real, filings, groups: real.groups.map((g, i) => (extra && i === 0 ? { ...g, filings: [...g.filings, extra.id] } : g)) };
  }));
  await open(fs.id);
  ok("B151 pass (review m): a person declared only on two filings is named once", (await p.locator(`[data-fee-declared="${kid.subject}"]`).count()) === 1);
  await unserve();
}

// A Visitor visa case: no "declared only" line where nobody is declared only (the priced branch is B5's, unchanged).
const vv = needVisitorVisa(), f = await firms();
const c = await openCase(vv, [{ role: "principal", name: "Sample Client T", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse T", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] });
await open(c.id);
ok("B151 fail: a priced case with nobody declared only and nobody without a filing has no no-fee line, and no recorded note before recording", (await p.locator("[data-fee-declared], [data-fee-no-filing], [data-fees-recorded]").count()) === 0);

// ---------------------------------------------------------------- a recorded group says where its fees come from
await readyToFile(c.id, f.rep);
let cv = await viewOf(c.id, f.officer ?? OFFICER);
const r = await call("PATCH", `/runtime/groups/${cv.groups[0].id}/record`, { version: cv.version, ucis: [], filings: cv.filings.map((x, i) => ({ filing: x.id, our_reference: `SAMPLE-B151-${i + 1}`, submitted_on: inDays(0), application_number: `V30015100${i + 1}`, fee_receipt: "SAMPLE-RECEIPT" })) }, f.officer ?? OFFICER);
cv = await viewOf(c.id, f.officer ?? OFFICER);
ok("setup: the Visitor visa submission is recorded (200)", r.status === 200, [r.status, r.body?.detail]);
await open(c.id);
const note = await p.locator("[data-fees-recorded]").allInnerTexts();
const frozen = cv.groups[0].fees_recorded?.at;
const day = frozen ? new Date(frozen).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" }) : "";
ok(frozen ? "B151 pass (B152 on main): a recorded group reads \"Fees as recorded on <day>\", the day /prepare says" : "B151 pass (before B152): a recorded group reads \"Fees as worked out today, not the amount recorded\"",
  note.length === 1 && note[0].trim() === (frozen ? `Fees as recorded on ${day}` : "Fees as worked out today, not the amount recorded"), { note, frozen });
await state(frozen ? "recorded-as-recorded" : "recorded-worked-out-today");
// The other wording, from the real view with fees_recorded set or removed (so both branches are checked on any main).
await p.route(`**/api/runtime/cases/${c.id}/prepare*`, serve((real) => ({ ...real, groups: real.groups.map((g) => frozen ? (({ fees_recorded: _x, ...rest }) => rest)(g) : { ...g, fees_recorded: { at: "2026-11-05T10:00:00.000Z" } }) })));
await open(c.id);
const other = (await p.locator("[data-fees-recorded]").allInnerTexts()).map((t) => t.trim());
ok(frozen ? "B151 pass: a recorded group without a snapshot (recorded before B152) reads \"Fees as worked out today, not the amount recorded\"" : "B151 pass: a recorded group with a snapshot reads \"Fees as recorded on 5 November 2026\"",
  other.length === 1 && other[0] === (frozen ? "Fees as worked out today, not the amount recorded" : `Fees as recorded on ${new Date("2026-11-05T10:00:00.000Z").toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" })}`), other);
await unserve();

await p.evaluate((a) => localStorage.setItem("xr-actor", a), CLIENT); await p.goto(`${BASE}/cases/${c.id}`); await p.waitForTimeout(800);
ok("roles fail: the client's view has no fee block", (await p.locator("[data-fees]").count()) === 0);
ok("no page error or console error during the walk", errs.length === 0, errs.slice(0, 3));
await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
