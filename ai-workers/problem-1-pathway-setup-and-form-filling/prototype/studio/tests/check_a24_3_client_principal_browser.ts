// A24-3 (P-492; design product/design/case-structure-a24-2026-11-12.md §5.1, CS-4, CS-8, CS-10): the case page names the
// case's client person ("Client: <name>", one client per case, the same person after Make principal), and People and
// filings names each filing's principal applicant (Filing.subjectId, IRCC's principal applicant per application, S12).
// On the configured checkpoint (the six, configured; on the six alone no combination is released, so no case opens):
//   1 a Visitor visa family (four own filings), 2 a Study permit family (the spouse's Work permit is the spouse's, not the
//   client's), 3 Make principal on the Visitor visa case, 4 an Express Entry family (spouse and children on the
//   principal's one application: their rows name the principal, never themselves), 5 Make principal there, 6 a spouse
//   sponsorship with its sponsor added (review M1: the co-filed sponsorship has no applicants, so the sponsor is never
//   named principal applicant; the row names the principal applicant of the application it is sent with, and says the
//   sponsor is not an applicant), 7 375 px.
// Every screen value is compared with the API (GET /runtime/cases, /runtime/cases/:id, …/prepare) and the database
// (filing.subject_id) in the same run. Fails on main's web: no client person's name in the header, no Principal applicant
// column. Screenshots: product/screens/A24-3/screenshots/. US$0.
//   zsh studio/tools/isolated.sh scr_a243 4443 start && tsx studio/tests/check_a24_3_client_principal_browser.ts 4443 xr_studio_scr_a243
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { call, FAMILY, firms, openCase, PORT, sql, yearsAgo } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "A24-3", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const AUTHOR = "user-A";
type Person = { subject_id: string; role: string; label: string; client?: boolean };
type Filing = { id: string; label: string; group: string; owner?: { subject: string; label: string }; applicants: { subject: string; label: string; mode: string }[] };
type Expect = { subject: string; label: string; notApplicant: boolean } | null;

const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("vv.single")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const [vv, sp, ee, fs] = ["vv.single", "sp.outside", "pnp.express_entry", "fs.spouse"].map(comboId);
if (!vv || !sp || !ee || !fs) { console.error("STOP  the configured checkpoint lacks a released vv.single, sp.outside, pnp.express_entry or fs.spouse", { vv, sp, ee, fs }); process.exit(2); }
const f = await firms();
const officer = f.officer ?? "user-O", team = f.rep ? { representative: f.rep, caseOfficers: [officer] } : undefined;

/** What the API says: the case's client person (the person flagged `client` after a swap, else the principal), the
 *  list's client_name, and per person the principal applicant the row must name: the owner (Filing.subjectId) of the
 *  filing they apply on; for a filing with no applicants (a co-filed sponsorship), the owner of the filing of its
 *  submission group that has applicants, marked "not an applicant". */
async function apiOf(id: string) {
  const c = (await call("GET", `/runtime/cases/${id}`, undefined, officer)).body;
  const people: Person[] = (c?.people ?? []).filter((p: Person) => p.role !== "case");
  const client = people.find((p) => p.client === true) ?? people.find((p) => p.role === "principal");
  const list = (await call("GET", "/runtime/cases?take=100", undefined, officer)).body?.cases ?? [];
  const row = list.find((r: { id: string }) => r.id === id);
  const filings: Filing[] = (await call("GET", `/runtime/cases/${id}/prepare`, undefined, officer)).body?.filings ?? [];
  const label = (s: string, fb: string) => people.find((p) => p.subject_id === s)?.label ?? fb;
  const expect = new Map<string, Expect>(people.map((p) => {
    const fl = filings.find((x) => x.applicants.some((a) => a.subject === p.subject_id)) ?? filings.find((x) => x.owner?.subject === p.subject_id);
    if (!fl?.owner) return [p.subject_id, null];
    if (fl.applicants.length) return [p.subject_id, { subject: fl.owner.subject, label: label(fl.owner.subject, fl.owner.label), notApplicant: false }];
    const w = filings.find((x) => x !== fl && x.group === fl.group && x.applicants.length > 0);
    return [p.subject_id, w?.owner ? { subject: w.owner.subject, label: label(w.owner.subject, w.owner.label), notApplicant: true } : null];
  }));
  const dbOwner = (fid: string) => sql(`select subject_id from filing where id='${fid}'`);
  return { people, client, row, filings, expect, dbOwner, byLabel: (n: string) => people.find((q) => q.label === n) };
}

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors: string[] = []; p.on("pageerror", (e) => errors.push(String(e)));
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), officer);

/** What the screen says: the header's client name and link, and per person row the Principal applicant cell. */
async function screenOf(page: Page, id: string, people: Person[], shot: string) {
  await page.goto(`${BASE}/cases/${id}`);
  const name = page.locator("[data-case-client-name]");
  const shown = await name.waitFor({ timeout: 30_000 }).then(() => true, () => false);
  // The table reads GET …/prepare after the case: wait until every row's cell is there, failing loudly below on a timeout.
  const cells = await page.waitForFunction((n) => document.querySelectorAll("[data-person-row] [data-filing-principal]").length >= n, people.length, { timeout: 30_000 }).then(() => true, () => false);
  await page.locator("[data-people-filings]").scrollIntoViewIfNeeded().catch(() => undefined);
  await page.screenshot({ path: join(SHOTS, shot), fullPage: false });
  const per = new Map<string, { subject: string | null; words: string; notApplicant: boolean }>();
  for (const q of people) {
    const cell = page.locator(`[data-person-row="${q.subject_id}"] [data-filing-principal]`);
    if (!(await cell.count())) { per.set(q.subject_id, { subject: null, words: "", notApplicant: false }); continue; }
    const note = cell.locator("[data-not-applicant]");
    const all = (await cell.innerText()).trim(), extra = (await note.count()) ? (await note.innerText()).trim() : "";
    per.set(q.subject_id, { subject: await cell.getAttribute("data-filing-principal"), words: (extra ? all.slice(0, all.length - extra.length) : all).trim(), notApplicant: !!extra });
  }
  const link = page.locator("[data-case-client]");
  return { header: shown ? (await name.innerText()).trim() : null, line: shown ? (await page.locator("[data-case-client-line]").innerText()).trim() : null, link: (await link.count()) ? (await link.innerText()).trim() : null, cells, per };
}

async function both(label: string, id: string, shot: string) {
  const a = await apiOf(id);
  const s = await screenOf(p, id, a.people, shot);
  ok(`A24-3 ${label} API (CS-8): the case's client person is named, and the list's client_name names the same person`, !!a.client && a.row?.client_name === a.client.label, { client: a.client?.label, list: a.row?.client_name });
  ok(`A24-3 ${label} API (CS-10): each filing's owner in GET …/prepare is its Filing.subjectId in the database`, a.filings.length > 0 && a.filings.every((x) => !!x.owner && a.dbOwner(x.id) === x.owner.subject), a.filings.map((x) => [x.label, x.owner?.subject, a.dbOwner(x.id)]));
  ok(`A24-3 ${label} pass (1): the header reads "Client: ${a.client?.label}", then a link that says where it goes (review m2)`, s.header === a.client?.label && /^Client: /.test(s.line ?? "") && s.link === "Client A's cases", { header: s.header, line: s.line, link: s.link });
  const wrong = a.people.filter((q) => { const e = a.expect.get(q.subject_id), c = s.per.get(q.subject_id); return !e ? (c?.subject ?? "") !== "" : c?.subject !== e.subject || c.words !== e.label || c.notApplicant !== e.notApplicant; });
  ok(`A24-3 ${label} pass (2): each person's row names the principal applicant of the application they are on (Filing.subjectId)`, s.cells && !wrong.length, { wrong: wrong.map((q) => [q.label, a.expect.get(q.subject_id), s.per.get(q.subject_id)]) });
  return { a, s };
}

// 1 · Visitor visa family: four own filings, each its own principal applicant.
const v = await openCase(vv, FAMILY, team);
const V = await both("Visitor visa", v.id, "01-visitor-visa-family-1440.png");
const S = V.a.byLabel("Sample Spouse A")?.subject_id ?? "", A = V.a.byLabel("Sample Client A")?.subject_id ?? "";
ok("A24-3 Visitor visa: the client is Sample Client A and each person is the principal applicant of their own visa", V.s.header === "Sample Client A" && V.a.people.every((q) => V.s.per.get(q.subject_id)?.words === q.label), [...V.s.per.values()]);

// 2 · Study permit family: the spouse's Work permit filing is the spouse's own, not the client's.
const s2 = await openCase(sp, FAMILY, team);
const SP = await both("Study permit", s2.id, "02-study-permit-family-1440.png");
const spouse = SP.a.people.find((q) => q.role === "spouse_or_partner");
const work = SP.a.filings.find((x) => x.applicants.some((y) => y.subject === spouse?.subject_id));
ok("A24-3 Study permit pass (2): the spouse's filing (subject not the client) names the spouse as its principal applicant", !!spouse && work?.owner?.subject === spouse.subject_id && spouse.subject_id !== SP.a.client?.subject_id && SP.s.per.get(spouse.subject_id)?.words === spouse.label, { filing: work?.label, owner: work?.owner, cell: spouse && SP.s.per.get(spouse.subject_id) });

// 3 · Make principal on the Visitor visa case: the spouse becomes the case's principal; the client stays Sample Client A
//     (C6.13 BR-3b), and each filing still names its own principal applicant.
async function makePrincipal(id: string, subject: string) {
  const pv = await call("POST", `/runtime/cases/${id}/filing-changes`, { kind: "make_principal", subject, preview: true }, officer);
  const ap = await call("POST", `/runtime/cases/${id}/filing-changes`, { kind: "make_principal", subject, basis: pv.body?.basis, reason: "A24-3 check: the spouse holds the job offer" }, officer);
  return { pv: pv.status, ap: ap.status, body: JSON.stringify(ap.body).slice(0, 300) };
}
const m1 = await makePrincipal(v.id, S);
ok("A24-3 setup: Make principal on the Visitor visa spouse applied through the product's route", m1.pv === 200 && m1.ap < 300, m1);
const W = await both("Visitor visa after Make principal", v.id, "03-after-make-principal-1440.png");
ok("A24-3 after Make principal pass (CS-8): the header still names Sample Client A, now not the principal", W.s.header === "Sample Client A" && W.a.people.find((q) => q.subject_id === S)?.role === "principal" && W.a.people.find((q) => q.subject_id === A)?.role !== "principal", { header: W.s.header, roles: W.a.people.map((q) => [q.label, q.role, q.client]) });
ok("A24-3 after Make principal fail: the header does not follow the principal role to Sample Spouse A", W.s.header !== "Sample Spouse A", W.s.header);

// 4 · Express Entry family (review m1): the spouse and children are on the principal's one application, so their rows
//     name the principal, never themselves; the column is not the Person column.
const e = await openCase(ee, FAMILY, team);
const E = await both("Express Entry", e.id, "07-express-entry-family-1440.png");
const eA = E.a.byLabel("Sample Client A"), eS = E.a.byLabel("Sample Spouse A");
const others = E.a.people.filter((q) => q.subject_id !== eA?.subject_id);
ok("A24-3 Express Entry setup: the family is on one application, Sample Client A's", E.a.filings.length >= 1 && others.length >= 1 && others.every((q) => E.a.expect.get(q.subject_id)?.subject === eA?.subject_id), E.a.filings.map((x) => [x.label, x.owner?.label, x.applicants.map((y) => `${y.label}:${y.mode}`)]));
ok("A24-3 Express Entry pass (2): every other person's row names Sample Client A, the application's principal applicant", others.every((q) => E.s.per.get(q.subject_id)?.words === "Sample Client A"), others.map((q) => [q.label, E.s.per.get(q.subject_id)]));
ok("A24-3 Express Entry fail (review m1): no family member's row names themselves as principal applicant", others.every((q) => E.s.per.get(q.subject_id)?.words !== q.label), others.map((q) => [q.label, E.s.per.get(q.subject_id)?.words]));

// 5 · Make principal on the Express Entry spouse: the application is now the spouse's; every row names the spouse,
//     and the header still names the client.
const m2 = await makePrincipal(e.id, eS?.subject_id ?? "");
ok("A24-3 setup: Make principal on the Express Entry spouse applied through the product's route", m2.pv === 200 && m2.ap < 300, m2);
const E2 = await both("Express Entry after Make principal", e.id, "08-express-entry-after-make-principal-1440.png");
ok("A24-3 Express Entry after Make principal pass: every row names Sample Spouse A; the header still names Sample Client A", E2.s.header === "Sample Client A" && E2.a.people.every((q) => E2.s.per.get(q.subject_id)?.words === "Sample Spouse A"), { header: E2.s.header, cells: E2.a.people.map((q) => [q.label, E2.s.per.get(q.subject_id)?.words]) });

// 6 · Spouse sponsorship with its sponsor (review M1): the sponsorship is co-filed and has no applicants.
const fsCase = await openCase(fs, [{ role: "principal", name: "Sample Principal S", dob: yearsAgo(32) }], team);
const add = await call("POST", `/runtime/cases/${fsCase.id}/people`, { role: "sponsor", displayName: "Sample Sponsor S" }, officer);
ok("A24-3 setup: the sponsor is added through the product's route", add.status < 300 && !!add.body?.subject_id, { status: add.status, body: JSON.stringify(add.body).slice(0, 200) });
const F = await both("Spouse sponsorship", fsCase.id, "09-sponsorship-sponsor-1440.png");
const sponsor = F.a.byLabel("Sample Sponsor S"), principal = F.a.byLabel("Sample Principal S");
const sFiling = F.a.filings.find((x) => x.owner?.subject === sponsor?.subject_id);
ok("A24-3 Spouse sponsorship API: the sponsorship's Filing.subjectId is the sponsor's, and it has no applicants", !!sFiling && sFiling.applicants.length === 0 && F.a.dbOwner(sFiling.id) === sponsor?.subject_id, sFiling);
const sc = sponsor && F.s.per.get(sponsor.subject_id);
ok("A24-3 Spouse sponsorship pass (M1): the sponsor's row names Sample Principal S (the application it is sent with) and says the sponsor is not an applicant", sc?.words === "Sample Principal S" && sc.subject === principal?.subject_id && sc.notApplicant, sc);
ok("A24-3 Spouse sponsorship fail (M1): the sponsor is never named a principal applicant", F.a.people.every((q) => F.s.per.get(q.subject_id)?.words !== "Sample Sponsor S"), F.a.people.map((q) => [q.label, F.s.per.get(q.subject_id)]));

// 7 · Phone width: the header and the table stay readable without the page scrolling sideways.
await p.setViewportSize({ width: 375, height: 800 });
await p.goto(`${BASE}/cases/${s2.id}`); await p.locator("[data-case-client-name]").waitFor({ timeout: 30_000 }).catch(() => undefined);
await p.waitForFunction(() => document.querySelectorAll("[data-person-row] [data-filing-principal]").length > 0, undefined, { timeout: 30_000 }).catch(() => undefined);
await p.screenshot({ path: join(SHOTS, "04-study-permit-375.png"), fullPage: false });
const sideways = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok("A24-3 375 px: the page does not scroll sideways (the table scrolls inside its own box)", sideways <= 1, { sideways });

// 8 · Review m3: the Principal applicant tip shows its words on keyboard focus, not only on hover.
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(`${BASE}/cases/${s2.id}`);
const tip = p.locator("[data-applicant-tip]"); await tip.waitFor({ timeout: 30_000 });
await tip.focus();
const shownTip = await p.getByRole("tooltip").first().waitFor({ timeout: 5_000 }).then(() => true, () => false);
ok("A24-3 tip pass (review m3): focusing the Principal applicant tip shows its words", shownTip && /its own principal applicant/.test(await p.getByRole("tooltip").first().innerText().catch(() => "")));
ok("A24-3: no page errors", !errors.length, errors);

await b.close();
process.exitCode = summary() ? 1 : 0;
