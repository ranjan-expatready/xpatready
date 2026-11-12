// A24-3 (P-492; design product/design/case-structure-a24-2026-11-12.md §5.1, CS-4, CS-8, CS-10): the case page names the
// case's client person ("Client: <name>", one client per case, the same person after Make principal), and People and
// filings names each filing's principal applicant (Filing.subjectId, IRCC's principal applicant per application, S12).
// On the configured checkpoint (the six, configured; on the six alone no combination is released, so no case opens):
// a Visitor visa family (four own filings) and a Study permit family (the spouse's Work permit filing is the spouse's,
// not the client's), each opened through the API as the pack does, plus Make principal on the Visitor visa case.
// Every screen value is compared with the API (GET /runtime/cases, /runtime/cases/:id, …/prepare) and the database
// (filing.subject_id) in the same run. Fails on main's web: no client person's name in the header, no Principal applicant
// column. Screenshots: product/screens/A24-3/screenshots/. US$0.
//   zsh studio/tools/isolated.sh scr_a243 4443 start && tsx studio/tests/check_a24_3_client_principal_browser.ts 4443 xr_studio_scr_a243
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { call, FAMILY, firms, openCase, PORT, sql } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "A24-3", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const AUTHOR = "user-A";
type Person = { subject_id: string; role: string; label: string; client?: boolean };
type Filing = { id: string; label: string; owner?: { subject: string; label: string }; applicants: { subject: string; label: string; mode: string }[] };

const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("vv.single")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const vv = comboId("vv.single"), sp = comboId("sp.outside");
if (!vv || !sp) { console.error("STOP  the configured checkpoint has no released vv.single or sp.outside"); process.exit(2); }
const f = await firms();
const officer = f.officer ?? "user-O", team = f.rep ? { representative: f.rep, caseOfficers: [officer] } : undefined;

/** What the API says: the case's client person (the person flagged `client` after a swap, else the principal), the
 *  list's client_name, and per person the principal applicant of the filing they are on (its owner). */
async function apiOf(id: string) {
  const c = (await call("GET", `/runtime/cases/${id}`, undefined, officer)).body;
  const people: Person[] = (c?.people ?? []).filter((p: Person) => p.role !== "case");
  const client = people.find((p) => p.client === true) ?? people.find((p) => p.role === "principal");
  const list = (await call("GET", "/runtime/cases?take=100", undefined, officer)).body?.cases ?? [];
  const row = list.find((r: { id: string }) => r.id === id);
  const filings: Filing[] = (await call("GET", `/runtime/cases/${id}/prepare`, undefined, officer)).body?.filings ?? [];
  const owners = new Map(people.map((p) => { const fl = filings.find((x) => x.applicants.some((a) => a.subject === p.subject_id)); return [p.subject_id, fl?.owner ?? null] as const; }));
  const dbOwner = (fid: string) => sql(`select subject_id from filing where id='${fid}'`);
  return { people, client, row, filings, owners, dbOwner };
}

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors: string[] = []; p.on("pageerror", (e) => errors.push(String(e)));
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), officer);

/** What the screen says: the header's client name, and per person row the Principal applicant cell (subject and words). */
async function screenOf(page: Page, id: string, people: Person[], shot: string) {
  await page.goto(`${BASE}/cases/${id}`);
  const name = page.locator("[data-case-client-name]");
  const shown = await name.waitFor({ timeout: 30_000 }).then(() => true, () => false);
  const rows = page.locator("[data-person-row]");
  await rows.first().waitFor({ timeout: 30_000 }).catch(() => undefined);
  // The table reads GET …/prepare after the case: wait until every row's cell is there, failing loudly on a timeout below.
  const cells = await page.waitForFunction((n) => document.querySelectorAll("[data-person-row] [data-filing-principal]").length >= n, people.length, { timeout: 30_000 }).then(() => true, () => false);
  await page.locator("[data-people-filings]").scrollIntoViewIfNeeded().catch(() => undefined);
  await page.screenshot({ path: join(SHOTS, shot), fullPage: false });
  const per = new Map<string, { subject: string | null; words: string }>();
  for (const q of people) {
    const cell = page.locator(`[data-person-row="${q.subject_id}"] [data-filing-principal]`);
    per.set(q.subject_id, (await cell.count()) ? { subject: await cell.getAttribute("data-filing-principal"), words: (await cell.innerText()).trim() } : { subject: null, words: "" });
  }
  return { header: shown ? (await name.innerText()).trim() : null, line: shown ? (await page.locator("[data-case-client-line]").innerText()).trim() : null, cells, per };
}

async function both(label: string, id: string, shot: string) {
  const a = await apiOf(id);
  const s = await screenOf(p, id, a.people, shot);
  ok(`A24-3 ${label} API (CS-8): the case's client person is named, and the list's client_name names the same person`, !!a.client && a.row?.client_name === a.client.label, { client: a.client?.label, list: a.row?.client_name });
  ok(`A24-3 ${label} API (CS-10): each filing's owner in GET …/prepare is its Filing.subjectId in the database`, a.filings.length > 0 && a.filings.every((x) => !!x.owner && a.dbOwner(x.id) === x.owner.subject), a.filings.map((x) => [x.label, x.owner?.subject, a.dbOwner(x.id)]));
  ok(`A24-3 ${label} pass (1): the header reads "Client: ${a.client?.label}"`, s.header === a.client?.label && /^Client: /.test(s.line ?? "") && (s.line ?? "").includes(a.client?.label ?? "\u0000"), { header: s.header, line: s.line });
  const wrong = a.people.filter((q) => { const o = a.owners.get(q.subject_id), c = s.per.get(q.subject_id); return !o ? (c?.subject ?? "") !== "" : c?.subject !== o.subject || c.words !== (a.people.find((x) => x.subject_id === o.subject)?.label ?? o.label); });
  ok(`A24-3 ${label} pass (2): each person's row names the principal applicant of the filing they are on (Filing.subjectId)`, s.cells && !wrong.length, { wrong: wrong.map((q) => [q.label, a.owners.get(q.subject_id), s.per.get(q.subject_id)]) });
  return { a, s };
}

// 1 · Visitor visa family: four own filings, each its own principal applicant.
const v = await openCase(vv, FAMILY, team);
const V = await both("Visitor visa", v.id, "01-visitor-visa-family-1440.png");
const subj = (n: string) => V.a.people.find((q) => q.label === n)?.subject_id ?? "";
const [A, S] = [subj("Sample Client A"), subj("Sample Spouse A")];
ok("A24-3 Visitor visa: the client is Sample Client A and each person is the principal applicant of their own visa", V.s.header === "Sample Client A" && V.a.people.every((q) => V.s.per.get(q.subject_id)?.words === q.label), [...V.s.per.values()]);

// 2 · Study permit family: the spouse's Work permit filing is the spouse's own, not the client's.
const s2 = await openCase(sp, FAMILY, team);
const SP = await both("Study permit", s2.id, "02-study-permit-family-1440.png");
const spouse = SP.a.people.find((q) => q.role === "spouse_or_partner");
const work = SP.a.filings.find((x) => x.applicants.some((y) => y.subject === spouse?.subject_id));
ok("A24-3 Study permit pass (2): the spouse's filing (subject not the client) names the spouse as its principal applicant", !!spouse && work?.owner?.subject === spouse.subject_id && spouse.subject_id !== SP.a.client?.subject_id && SP.s.per.get(spouse.subject_id)?.words === spouse.label, { filing: work?.label, owner: work?.owner, cell: spouse && SP.s.per.get(spouse.subject_id) });
ok("A24-3 Study permit fail: no row names the client as principal applicant of a filing that is not the client's", SP.a.people.filter((q) => q.subject_id !== SP.a.client?.subject_id).every((q) => SP.s.per.get(q.subject_id)?.words !== SP.a.client?.label), [...SP.s.per.values()]);

// 3 · Make principal on the Visitor visa case: the spouse becomes the case's principal; the client stays Sample Client A
//     (C6.13 BR-3b), and each filing still names its own principal applicant.
const pv = await call("POST", `/runtime/cases/${v.id}/filing-changes`, { kind: "make_principal", subject: S, preview: true }, officer);
const ap = await call("POST", `/runtime/cases/${v.id}/filing-changes`, { kind: "make_principal", subject: S, basis: pv.body?.basis, reason: "A24-3 check: the spouse holds the job offer" }, officer);
ok("A24-3 setup: Make principal on the spouse applied through the product's route", pv.status === 200 && ap.status < 300, { preview: pv.status, apply: ap.status, body: JSON.stringify(ap.body).slice(0, 300) });
const W = await both("after Make principal", v.id, "03-after-make-principal-1440.png");
ok("A24-3 after Make principal pass (CS-8): the header still names Sample Client A, now not the principal", W.s.header === "Sample Client A" && W.a.people.find((q) => q.subject_id === S)?.role === "principal" && W.a.people.find((q) => q.subject_id === A)?.role !== "principal", { header: W.s.header, roles: W.a.people.map((q) => [q.label, q.role, q.client]) });
ok("A24-3 after Make principal fail: the header does not follow the principal role to Sample Spouse A", W.s.header !== "Sample Spouse A", W.s.header);

// 4 · Phone width: the header and the table stay readable without the page scrolling sideways.
await p.setViewportSize({ width: 375, height: 800 });
await p.goto(`${BASE}/cases/${s2.id}`); await p.locator("[data-case-client-name]").waitFor({ timeout: 30_000 }).catch(() => undefined);
await p.waitForFunction(() => document.querySelectorAll("[data-person-row] [data-filing-principal]").length > 0, undefined, { timeout: 30_000 }).catch(() => undefined);
await p.screenshot({ path: join(SHOTS, "04-study-permit-375.png"), fullPage: false });
const sideways = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok("A24-3 375 px: the page does not scroll sideways (the table scrolls inside its own box)", sideways <= 1, { sideways });
ok("A24-3: no page errors", !errors.length, errors);

await b.close();
process.exitCode = summary() ? 1 : 0;
