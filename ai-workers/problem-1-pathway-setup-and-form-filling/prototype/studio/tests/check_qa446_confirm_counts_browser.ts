// QA-446 (walk 1, BK-6; ruling P-510 (2): P-242 and P-411 stand, P-497 kept them): one confirmation rule on every screen.
// A client's own typed answers and a minor's answers typed by the parent are Declared (no officer confirmation); an answer
// the principal typed for an adult is "to confirm"; officer confirmation is only for what is still on the Confirm list.
// On the configured checkpoint, a Visitor visa family and a Study permit family (Sample Client A, Sample Spouse A, Sample
// Child A1 aged 10, Sample Child A2 aged 15), each opened through the API as the packs do (the officer enters each date
// of birth), then Client A answers every question of the client's own questionnaire, as the client's phone does. Then:
//   1 the officer's Agent view: household line = its tabs = its sections, through the API and on screen;
//   2 Client A's and the children's own answers are Declared and never "to confirm", on both pathways (the Study permit
//     child too: walk 1's 54);
//   3 round 1 to the representative: each filing's checklist "Values" item = the Agent view's count for that filing's
//     people and their relatives (their parents' tabs): declared by whom, confirmed by whom, to confirm; on screen too;
//   4 the representative approves round 1; the officer presses Confirm section on every section; declared answers stay
//     Declared (Confirm section never turns them into the officer's), nothing is left to confirm, and a section with
//     nothing to confirm has its button disabled with words (P-497 (1));
//   5 round 2: the checklist again equals the Agent view, "0 to confirm".
// Fails on main: the checklist reads "Values confirmed: none yet" or counts only the officer's confirmations, and
// Confirm section turns declared answers into confirmed ones. Screenshots: product/screens/QA-446/screenshots/. US$0.
//   zsh studio/tools/isolated.sh scr_q446 4443 start && tsx studio/tests/check_qa446_confirm_counts_browser.ts 4443 xr_studio_scr_q446
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { agent, call, confirmAll, FAMILY, firms, openCase, PORT, sql } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "QA-446", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const AUTHOR = "user-A", CLIENT = "user-P";
type A = { id: string; confirmed: boolean; mark: string; by: string; channel: string; status: string };
type Sec = { subjectId: string; about_label: string; section: string; answered: number; confirmed: number; questions: { group: unknown; answer: A | null; rows: { answer: A | null }[] }[]; group: { rows: number; none_apply: A | null } | null };
type Values = { facts: number; declared: { by: string; facts: number }[]; confirmed: { by: string; facts: number }[]; to_confirm: number };

const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("vv.single")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R", team = { representative: rep, caseOfficers: [officer] };

/** The section's answers, as the engine counts them (sectionAnswers): each answer or row answer, and "none apply" with no rows. */
const answersOf = (s: Sec): A[] => [...s.questions.flatMap((q) => (q.group ? q.rows.map((r) => r.answer) : [q.answer])).filter((a): a is A => !!a), ...(s.group && s.group.rows === 0 && s.group.none_apply ? [s.group.none_apply] : [])];
const owner = (sid: string) => sid.split("/")[0];

/** Client A answers every question of the client's own questionnaire not yet answered, with Sample values (US$0). */
async function clientAnswersAll(caseId: string) {
  let n = 0, refused = 0;
  const cv = (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, CLIENT)).body;
  for (const s of cv?.sections ?? []) for (const q of s.questions ?? []) {
    if (q.hidden || q.group || q.answer) continue;
    const v = q.options?.length ? q.options[0].key : q.value_type === "yes_no" ? false : q.value_type === "date" ? (q.shape?.datePrecision === "month" ? "2015-01" : "2015-01-01") : q.value_type === "number" ? "5"
      : q.value_type === "address" ? { street_name: "Sample Road", city: "Sample City", country: "Canada" } : q.shape?.phone ? { country_code: "1", number: "5550100" } : q.value_type === "country" ? "India" : "SAMPLE";
    const r = await call("PUT", `/runtime/cases/${caseId}/answers/${q.subjectId}/${q.fact}`, { value: v, expectedId: null }, CLIENT); r.status < 300 ? n++ : refused++;
  }
  return { n, refused };
}

/** The Agent view's counts: household, per tab (one per subject, as toConfirmByTab), per filing (its people and relatives). */
async function countsOf(caseId: string, formSubjects: Map<string, Set<string>>, nameOf: (a: A) => string) {
  const v = await agent(caseId);
  const secs: Sec[] = v.sections;
  const tabs = new Map<string, number>();
  for (const s of secs) tabs.set(s.subjectId, (tabs.get(s.subjectId) ?? 0) + s.answered - s.confirmed);
  const filings = new Map<string, Values>();
  for (const [fid, subj] of formSubjects) {
    const as = secs.filter((s) => subj.has(s.subjectId) || subj.has(owner(s.subjectId))).flatMap(answersOf);
    const by = (keep: (a: A) => boolean) => { const m = new Map<string, number>(); for (const a of as.filter(keep)) m.set(nameOf(a), (m.get(nameOf(a)) ?? 0) + 1); return [...m].map(([b, n]) => ({ by: b, facts: n })); };
    filings.set(fid, { facts: as.length, declared: by((a) => a.confirmed && a.mark !== "confirmed"), confirmed: by((a) => a.confirmed && a.mark === "confirmed"), to_confirm: as.filter((a) => !a.confirmed).length });
  }
  const sectionsSum = secs.reduce((n, s) => n + s.answered - s.confirmed, 0), tabsSum = [...tabs.values()].reduce((n, x) => n + x, 0);
  return { v, secs, tabs, filings, household: v.summary.answered - v.summary.confirmed, sectionsSum, tabsSum, declared: secs.flatMap(answersOf).filter((a) => a.confirmed && a.mark === "declared").length };
}

const sortBy = (x: { by: string; facts: number }[]) => JSON.stringify([...x].sort((a, b) => a.by.localeCompare(b.by)));
const sameValues = (a: Values | undefined, b: Values | undefined) => !!a && !!b && a.facts === b.facts && a.to_confirm === b.to_confirm && sortBy(a.declared) === sortBy(b.declared) && sortBy(a.confirmed) === sortBy(b.confirmed);

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
async function as(actor: string): Promise<Page> { const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(String(e))); await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); return p; }

/** On screen: the household line's number and each tab's "to confirm", in the officer's Agent view. */
async function screenCounts(caseId: string, shot: string) {
  const p = await as(officer);
  await p.goto(`${BASE}/cases/${caseId}`);
  const hh = p.locator("[data-household-to-confirm]"); await hh.waitFor({ timeout: 60_000 });
  await p.locator("[data-tab]").first().waitFor({ timeout: 60_000 });
  // A tab shows "N to confirm" only when N > 0 (QA-417): no count on a tab reads as 0.
  const tabs = new Map(await p.locator("[data-tab]").evaluateAll((els) => els.map((e) => [e.getAttribute("data-tab") ?? "", Number(e.querySelector("[data-tab-to-confirm]")?.getAttribute("data-tab-to-confirm") ?? "0")] as [string, number])));
  const household = Number(await hh.getAttribute("data-household-to-confirm"));
  await p.screenshot({ path: join(SHOTS, shot) });
  return { p, household, tabs };
}

/** On screen: the representative's review of a round, every filing's "Values" item. */
async function screenChecklist(caseId: string, round: string, shot: string) {
  const p = await as(rep);
  await p.goto(`${BASE}/cases/${caseId}/representative-review/${round}`);
  const items = p.locator('[data-check="confirmations"]');
  const shown = await items.first().waitFor({ timeout: 60_000 }).then(() => true, () => false);
  await items.first().scrollIntoViewIfNeeded().catch(() => undefined);
  await p.screenshot({ path: join(SHOTS, shot) });
  const words = shown ? (await items.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim()) : [];
  await p.close();
  return words;
}

const nameOfActor = (actor: string) => ({ "user-P": "Client A", "user-O": "Case officer", "user-R": "Representative", "user-S": "Solo representative", "user-T": "Second representative" } as Record<string, string>)[actor] ?? actor;

for (const [key, label] of [["vv.single", "Visitor visa"], ["sp.outside", "Study permit"]] as const) {
  const c = await openCase(comboId(key)!, FAMILY, team);
  const answered = await clientAnswersAll(c.id);
  ok(`QA-446 ${label} setup: Client A answered the client's questionnaire (every question, Sample values)`, answered.n > 100 && answered.refused === 0, answered);
  const prep = (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, officer)).body;
  const filings: { id: string; label: string }[] = prep?.filings ?? [];
  const formSubjects = new Map(filings.map((x) => [x.id, new Set<string>((prep?.items ?? []).filter((i: { kind: string; filing: string; channel?: string }) => i.kind === "form" && i.filing === x.id && i.channel !== "NOT_NEEDED").map((i: { subject: string }) => i.subject))]));
  const caseBody = (await call("GET", `/runtime/cases/${c.id}`, undefined, officer)).body;
  const people = new Map<string, string>((caseBody?.people ?? []).map((p: { subject_id: string; label: string }) => [p.subject_id, p.label]));
  // Staff are named as the case's own team line names them (the firm record), the client by the simulated login's name.
  const staff = new Map<string, string>([...(caseBody?.team?.officers ?? []), ...(caseBody?.team?.representative ? [caseBody.team.representative] : [])].map((u: { id: string; name: string }) => [u.id, u.name]));
  const nameOf = (a: A) => a.channel === "own_link" ? "" : staff.get(a.by) ?? nameOfActor(a.by);

  // 1, 2 · the Agent view before any Confirm section
  const B = await countsOf(c.id, formSubjects, nameOf);
  ok(`QA-446 ${label} 1 pass (API): household "to confirm" = the sum of the tabs = the sum of the sections`, B.household === B.tabsSum && B.tabsSum === B.sectionsSum, { household: B.household, tabs: B.tabsSum, sections: B.sectionsSum });
  const own = [...people].filter(([, n]) => /Client A|Child A/.test(n)).map(([sid]) => sid);
  const ownTyped = B.secs.filter((s) => own.includes(s.subjectId)).flatMap(answersOf).filter((a) => a.by === CLIENT);
  ok(`QA-446 ${label} 2 pass (P-242, P-411): Client A's own answers and the children's (aged 10 and 15, typed by Client A) are Declared, never "to confirm"`, ownTyped.length > 50 && ownTyped.every((a) => a.confirmed && a.mark === "declared"), { typed: ownTyped.length, toConfirm: ownTyped.filter((a) => !a.confirmed).length });
  const spouse = [...people].find(([, n]) => n === "Sample Spouse A")?.[0] ?? "";
  const forAdult = B.secs.filter((s) => s.subjectId === spouse).flatMap(answersOf).filter((a) => a.by === CLIENT);
  ok(`QA-446 ${label} 2 fail (P-411 (1)): what Client A typed for the adult spouse stays "to confirm"`, forAdult.length > 10 && forAdult.every((a) => !a.confirmed && a.mark === "by_principal"), { typed: forAdult.length, confirmed: forAdult.filter((a) => a.confirmed).length });
  const S1 = await screenCounts(c.id, `${key}-1-agent-view-before-1440.png`);
  ok(`QA-446 ${label} 1 pass (screen): the household line and every tab show the API's counts`, S1.household === B.household && [...B.tabs].every(([sid, n]) => !S1.tabs.has(sid) || S1.tabs.get(sid) === n) && [...S1.tabs].every(([sid, n]) => B.tabs.get(sid) === n), { household: [S1.household, B.household], tabs: [...S1.tabs].map(([sid, n]) => [people.get(sid) ?? sid, n, B.tabs.get(sid)]) });
  await S1.p.close();

  // 3 · round 1: each filing's checklist = the Agent view's count for its people and relatives
  const sent = await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: filings.map((x) => x.id) }, officer);
  const r1 = sent.body?.id as string;
  let round = (await call("GET", `/runtime/reviews/${r1}`, undefined, rep)).body;
  const valuesOfRow = (row: { checks: { key: string; wording: string; live: Values }[] }) => row?.checks.find((k) => k.key === "confirmations");
  const rows1: { filing: string; checks: { key: string; wording: string; live: Values }[]; forms: { item: string; live_hash: string | null }[] }[] = round?.filings ?? [];
  const off1 = rows1.filter((r) => !sameValues(valuesOfRow(r)?.live, B.filings.get(r.filing)));
  ok(`QA-446 ${label} 3 pass (API): round 1's "Values" item of every filing equals the Agent view (declared by whom, confirmed by whom, to confirm)`, sent.status === 201 && rows1.length === filings.length && !off1.length, off1.map((r) => [filings.find((x) => x.id === r.filing)?.label, valuesOfRow(r)?.live, B.filings.get(r.filing)]));
  const principalRow = rows1.find((r) => (formSubjects.get(r.filing) ?? new Set()).has([...people].find(([, n]) => n === "Sample Client A")?.[0] ?? ""));
  ok(`QA-446 ${label} 3 pass (words): the principal's filing reads "declared by Client A", never "none yet" or "not confirmed"`, /declared by Client A/.test(valuesOfRow(principalRow!)?.wording ?? "") && rows1.every((r) => !/none yet|not confirmed/i.test(valuesOfRow(r)?.wording ?? "")), rows1.map((r) => valuesOfRow(r)?.wording));
  const W1 = await screenChecklist(c.id, r1, `${key}-3-review-round1-1440.png`);
  ok(`QA-446 ${label} 3 pass (screen): the representative's review shows each filing's "Values" words`, W1.length === rows1.length && rows1.every((r) => W1.some((w) => w.includes(valuesOfRow(r)?.wording ?? "\u0000"))), { screen: W1, api: rows1.map((r) => valuesOfRow(r)?.wording) });

  // 4 · round 1 approved; Confirm section on every section
  for (const r of rows1) {
    await call("POST", `/runtime/reviews/${r1}/open`, { filing: r.filing }, rep);
    const d = await call("POST", `/runtime/reviews/${r1}/decision`, { filing: r.filing, verdict: "approve", form_hashes: Object.fromEntries(r.forms.map((x) => [x.item, x.live_hash ?? "waits"])), confirm_unticked: true }, rep);
    if (d.status >= 300) console.log("approve", d.status, JSON.stringify(d.body).slice(0, 300));
  }
  round = (await call("GET", `/runtime/reviews/${r1}`, undefined, rep)).body;
  ok(`QA-446 ${label} setup: the representative approved round 1`, (round?.filings ?? []).every((r: { status: string }) => r.status === "approved"), (round?.filings ?? []).map((r: { status: string }) => r.status));
  const zeroBefore = B.secs.filter((s) => s.answered > 0 && s.answered === s.confirmed && answersOf(s).some((a) => a.status === "DECLARED"));
  const z = zeroBefore[0];
  const zr = z ? await call("POST", `/runtime/cases/${c.id}/sections/${z.section}/confirm`, { subjectId: z.subjectId, seen: answersOf(z).map((a) => a.id) }, officer) : null;
  ok(`QA-446 ${label} 4 fail (P-497 (1)): Confirm section on a section with "0 to confirm" confirms nothing (its declared answers stay Declared)`, !!z && !!zr && zr.status < 300 && zr.body?.confirmed === 0, { section: z && `${people.get(z.subjectId) ?? z.subjectId}|${z.section}`, reply: zr?.body });
  for (const sid of [...new Set(B.secs.map((s) => s.subjectId))]) await confirmAll(c.id, sid);
  const A2 = await countsOf(c.id, formSubjects, nameOf);
  ok(`QA-446 ${label} 4 pass: after Confirm section nothing is left to confirm, and household = tabs = sections`, A2.household === 0 && A2.tabsSum === 0 && A2.sectionsSum === 0, { household: A2.household, tabs: A2.tabsSum, sections: A2.sectionsSum });
  ok(`QA-446 ${label} 4 pass (P-510 (2)): Confirm section left every declared answer Declared (only the Confirm list became the officer's)`, A2.declared === B.declared && B.declared > 0, { before: B.declared, after: A2.declared });
  const S2 = await screenCounts(c.id, `${key}-4-agent-view-after-1440.png`);
  ok(`QA-446 ${label} 4 pass (screen): household and every tab read 0 to confirm`, S2.household === 0 && [...S2.tabs.values()].every((n) => n === 0), { household: S2.household, tabs: [...S2.tabs.values()] });
  // P-497 (1): a section with nothing to confirm says so, its button disabled (the principal's tab, its first section).
  const principal = [...people].find(([, n]) => n === "Sample Client A")?.[0] ?? "";
  await S2.p.locator(`[data-tab="${principal}"]`).click().catch(() => undefined);
  const note = S2.p.locator("[data-nothing-to-confirm]:visible").first();
  const said = await note.waitFor({ timeout: 15_000 }).then(() => true, () => false);
  const btn = S2.p.getByRole("button", { name: "Confirm section" }).first();
  ok(`QA-446 ${label} 4 pass (screen, P-497 (1)): a section with nothing to confirm says so beside a disabled Confirm section`, said && /Nothing to confirm/.test(await note.innerText().catch(() => "")) && await btn.isDisabled().catch(() => false), said ? await note.innerText() : null);
  await S2.p.screenshot({ path: join(SHOTS, `${key}-4-nothing-to-confirm-1440.png`) });
  await S2.p.close();

  // 5 · round 2: the checklist equals the Agent view again, 0 to confirm
  const sent2 = await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: filings.map((x) => x.id) }, officer);
  const r2 = sent2.body?.id as string;
  const rows2: typeof rows1 = (await call("GET", `/runtime/reviews/${r2}`, undefined, rep)).body?.filings ?? [];
  const off2 = rows2.filter((r) => !sameValues(valuesOfRow(r)?.live, A2.filings.get(r.filing)));
  ok(`QA-446 ${label} 5 pass (API): round 2's "Values" item of every filing equals the Agent view after Confirm section, 0 to confirm`, sent2.status === 201 && rows2.length === filings.length && !off2.length && rows2.every((r) => valuesOfRow(r)?.live.to_confirm === 0 && /· 0 to confirm$/.test(valuesOfRow(r)?.wording ?? "")), { off: off2.map((r) => [valuesOfRow(r)?.live, A2.filings.get(r.filing)]), words: rows2.map((r) => valuesOfRow(r)?.wording) });
  const W2 = await screenChecklist(c.id, r2, `${key}-5-review-round2-1440.png`);
  ok(`QA-446 ${label} 5 pass (screen): the representative's review shows round 2's words`, W2.length === rows2.length && rows2.every((r) => W2.some((w) => w.includes(valuesOfRow(r)?.wording ?? "\u0000"))), W2);
}
ok("QA-446: no page errors", !errors.length, errors);
await b.close();
process.exitCode = summary() ? 1 : 0;
