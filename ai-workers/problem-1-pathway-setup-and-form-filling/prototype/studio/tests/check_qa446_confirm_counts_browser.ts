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
//     Declared (Confirm section never turns them into the officer's), nothing is left to confirm, and Confirm section on a
//     section with nothing to confirm confirms nothing and says so (P-497 (1), as QA-417 built it);
//   5 round 2: the checklist again equals the Agent view, "0 to confirm";
//   6 review M1: the officer types two application answers (staff's, on the Confirm list): one a filing's forms read,
//     and one no form reads (it decides which forms there are: release to a designated individual adds IMM 5475). The
//     household reads 2 to confirm on The application; round 3's checklist of every filing counts the second, and of
//     each filing whose forms read the first, that one too: none says "0 to confirm".
// Each filing's "Values" counts its people, their relatives (their parents' tabs), the application's answers on facts
// its forms read and those no filing's forms read (taken here from the forms the round froze); an answer waiting for the
// client is counted apart.
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
type A = { id: string; value: unknown; confirmed: boolean; mark: string; by: string; channel: string; status: string; awaits_client?: boolean };
type Q = { fact: string; group: unknown; answer: A | null; rows: { answer: A | null }[] };
type Sec = { subjectId: string; about_label: string; section: string; answered: number; confirmed: number; questions: Q[]; group: { rows: number; none_apply: A | null } | null };
type Values = { facts: number; declared: { by: string; facts: number }[]; confirmed: { by: string; facts: number }[]; to_confirm: number; waits_client: number };

const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("vv.single")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R", team = { representative: rep, caseOfficers: [officer] };

/** The answers of some of a section's questions, as the engine counts them (sectionAnswers): each answer or row answer,
 *  and the group's "none apply" while it has no rows (only when the group's questions are counted). */
const answersOfQs = (qs: Q[], group: Sec["group"]): A[] => [...qs.flatMap((q) => (q.group ? q.rows.map((r) => r.answer) : [q.answer])).filter((a): a is A => !!a), ...(group && qs.some((q) => q.group) && group.rows === 0 && group.none_apply ? [group.none_apply] : [])];
const answersOf = (s: Sec): A[] => answersOfQs(s.questions, s.group);
/** Review M1: the application's facts a filing's forms read (no filing: any filing's), from the forms frozen in a round. */
const caseFactsOf = (round: string, filing?: string) => new Set((sql(`select string_agg(distinct e->>'fact', ',') from review_round_form f join answer_snapshot s on s.id = f.snapshot_id, jsonb_array_elements(s.facts_json->'facts') e where f.round_id='${round}'${filing ? ` and f.filing_id='${filing}'` : ""} and e->>'about' = 'case'`) ?? "").split(",").filter(Boolean));
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

/** The Agent view's counts: household, per tab (one per subject, as toConfirmByTab), and the declared answers. */
async function countsOf(caseId: string) {
  const v = await agent(caseId);
  const secs: Sec[] = v.sections;
  const tabs = new Map<string, number>();
  for (const s of secs) tabs.set(s.subjectId, (tabs.get(s.subjectId) ?? 0) + s.answered - s.confirmed);
  const sectionsSum = secs.reduce((n, s) => n + s.answered - s.confirmed, 0), tabsSum = [...tabs.values()].reduce((n, x) => n + x, 0);
  return { v, secs, tabs, household: v.summary.answered - v.summary.confirmed, sectionsSum, tabsSum, declared: secs.flatMap(answersOf).filter((a) => a.confirmed && a.mark === "declared").length };
}
/** What a filing's checklist must say, from the Agent view: its people's and their relatives' sections, and the
 *  application's answers on facts its forms read (review M1); an answer waiting for the client counted apart (m2). */
function expectFor(secs: Sec[], subjects: Set<string>, caseSubject: string, caseFacts: Set<string>, readAnywhere: Set<string>, nameOf: (a: A) => string): Values {
  // Review round 2: an application fact no filing's forms read (it decides which forms there are) counts in every filing.
  const counted = (fact: string) => caseFacts.has(fact) || !readAnywhere.has(fact);
  const as = secs.flatMap((s) => { const qs = subjects.has(s.subjectId) || subjects.has(owner(s.subjectId)) ? s.questions : s.subjectId === caseSubject ? s.questions.filter((q) => counted(q.fact)) : []; return answersOfQs(qs, s.group); });
  const by = (keep: (a: A) => boolean) => { const m = new Map<string, number>(); for (const a of as.filter(keep)) m.set(nameOf(a), (m.get(nameOf(a)) ?? 0) + 1); return [...m].map(([b, n]) => ({ by: b, facts: n })); };
  return { facts: as.length, declared: by((a) => !a.awaits_client && a.confirmed && a.mark !== "confirmed"), confirmed: by((a) => !a.awaits_client && a.confirmed && a.mark === "confirmed"), to_confirm: as.filter((a) => !a.awaits_client && !a.confirmed).length, waits_client: as.filter((a) => !!a.awaits_client).length };
}

const sortBy = (x: { by: string; facts: number }[]) => JSON.stringify([...x].sort((a, b) => a.by.localeCompare(b.by)));
const sameValues = (a: Values | undefined, b: Values | undefined) => !!a && !!b && a.facts === b.facts && a.to_confirm === b.to_confirm && (a.waits_client ?? 0) === b.waits_client && sortBy(a.declared) === sortBy(b.declared) && sortBy(a.confirmed) === sortBy(b.confirmed);

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
  const caseSubject = (caseBody?.people ?? []).find((p: { role: string }) => p.role === "case")?.subject_id ?? "";
  /** Every filing's expected "Values" for a round, from the Agent view's sections now and the round's frozen forms. */
  const expectRound = (round: string, secs: Sec[]) => { const any = caseFactsOf(round); return new Map(filings.map((x) => [x.id, expectFor(secs, formSubjects.get(x.id) ?? new Set(), caseSubject, caseFactsOf(round, x.id), any, nameOf)])); };
  /** The representative opens and approves every filing of a round (unticked items confirmed), so the next can be sent. */
  async function approveAll(round: string) {
    const rows: { filing: string; forms: { item: string; live_hash: string | null }[] }[] = (await call("GET", `/runtime/reviews/${round}`, undefined, rep)).body?.filings ?? [];
    for (const r of rows) {
      await call("POST", `/runtime/reviews/${round}/open`, { filing: r.filing }, rep);
      const d = await call("POST", `/runtime/reviews/${round}/decision`, { filing: r.filing, verdict: "approve", form_hashes: Object.fromEntries(r.forms.map((x) => [x.item, x.live_hash ?? "waits"])), confirm_unticked: true }, rep);
      if (d.status >= 300) console.log("approve", d.status, JSON.stringify(d.body).slice(0, 300));
    }
    return ((await call("GET", `/runtime/reviews/${round}`, undefined, rep)).body?.filings ?? []).map((r: { status: string }) => r.status) as string[];
  }

  // 1, 2 · the Agent view before any Confirm section
  const B = await countsOf(c.id);
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
  const round = (await call("GET", `/runtime/reviews/${r1}`, undefined, rep)).body;
  const valuesOfRow = (row: { checks: { key: string; wording: string; live: Values }[] }) => row?.checks.find((k) => k.key === "confirmations");
  const rows1: { filing: string; checks: { key: string; wording: string; live: Values }[]; forms: { item: string; live_hash: string | null }[] }[] = round?.filings ?? [];
  const E1 = expectRound(r1, B.secs);
  const off1 = rows1.filter((r) => !sameValues(valuesOfRow(r)?.live, E1.get(r.filing)));
  ok(`QA-446 ${label} 3 pass (API): round 1's "Values" item of every filing equals the Agent view (its people, their relatives and the application's facts its forms read: declared by whom, confirmed by whom, to confirm)`, sent.status === 201 && rows1.length === filings.length && !off1.length, off1.map((r) => [filings.find((x) => x.id === r.filing)?.label, valuesOfRow(r)?.live, E1.get(r.filing)]));
  const principalRow = rows1.find((r) => (formSubjects.get(r.filing) ?? new Set()).has([...people].find(([, n]) => n === "Sample Client A")?.[0] ?? ""));
  ok(`QA-446 ${label} 3 pass (words): the principal's filing reads "declared by Client A", never "none yet" or "not confirmed"`, /declared by Client A/.test(valuesOfRow(principalRow!)?.wording ?? "") && rows1.every((r) => !/none yet|not confirmed/i.test(valuesOfRow(r)?.wording ?? "")), rows1.map((r) => valuesOfRow(r)?.wording));
  const W1 = await screenChecklist(c.id, r1, `${key}-3-review-round1-1440.png`);
  ok(`QA-446 ${label} 3 pass (screen): the representative's review shows each filing's "Values" words`, W1.length === rows1.length && rows1.every((r) => W1.some((w) => w.includes(valuesOfRow(r)?.wording ?? "\u0000"))), { screen: W1, api: rows1.map((r) => valuesOfRow(r)?.wording) });

  // 4 · round 1 approved; Confirm section on every section
  const d1 = await approveAll(r1);
  ok(`QA-446 ${label} setup: the representative approved round 1`, d1.length === filings.length && d1.every((x) => x === "approved"), d1);
  const zeroBefore = B.secs.filter((s) => s.answered > 0 && s.answered === s.confirmed && answersOf(s).some((a) => a.status === "DECLARED"));
  const z = zeroBefore[0];
  const zr = z ? await call("POST", `/runtime/cases/${c.id}/sections/${z.section}/confirm`, { subjectId: z.subjectId, seen: answersOf(z).map((a) => a.id) }, officer) : null;
  ok(`QA-446 ${label} 4 fail (P-497 (1)): Confirm section on a section with "0 to confirm" confirms nothing (its declared answers stay Declared)`, !!z && !!zr && zr.status < 300 && zr.body?.confirmed === 0, { section: z && `${people.get(z.subjectId) ?? z.subjectId}|${z.section}`, reply: zr?.body });
  for (const sid of [...new Set(B.secs.map((s) => s.subjectId))]) await confirmAll(c.id, sid);
  const A2 = await countsOf(c.id);
  ok(`QA-446 ${label} 4 pass: after Confirm section nothing is left to confirm, and household = tabs = sections`, A2.household === 0 && A2.tabsSum === 0 && A2.sectionsSum === 0, { household: A2.household, tabs: A2.tabsSum, sections: A2.sectionsSum });
  ok(`QA-446 ${label} 4 pass (P-510 (2)): Confirm section left every declared answer Declared (only the Confirm list became the officer's)`, A2.declared === B.declared && B.declared > 0, { before: B.declared, after: A2.declared });
  const S2 = await screenCounts(c.id, `${key}-4-agent-view-after-1440.png`);
  ok(`QA-446 ${label} 4 pass (screen): household and every tab read 0 to confirm`, S2.household === 0 && [...S2.tabs.values()].every((n) => n === 0), { household: S2.household, tabs: [...S2.tabs.values()] });
  // P-497 (1) as QA-417 built it: on a section with "0 to confirm" (the principal's tab) Confirm section asks the server,
  // which confirms nothing, and the page says "nothing to confirm"; the section's answers stay Declared.
  const principal = [...people].find(([, n]) => n === "Sample Client A")?.[0] ?? "";
  await S2.p.locator(`[role="tab"][data-tab="${principal}"]`).click().catch(() => undefined);
  const zeroSec = S2.p.locator('#agent-view section[aria-labelledby^="h-"]').filter({ hasText: / 0 to confirm/ }).filter({ hasText: "Declared" }).first();
  const reply = S2.p.waitForResponse((r) => /\/sections\/[^/]+\/confirm$/.test(r.url()) && r.request().method() === "POST", { timeout: 30_000 }).then((x) => x.json()).catch(() => null);
  const clicked = await zeroSec.getByRole("button", { name: "Confirm section" }).click({ timeout: 30_000 }).then(() => true, () => false);
  const rep0 = clicked ? await reply : null;
  const said = await S2.p.getByText(/: nothing to confirm\./).last().waitFor({ timeout: 15_000 }).then(() => true, () => false);
  const stillDeclared = clicked && await zeroSec.getByText("Declared", { exact: true }).first().isVisible().catch(() => false);
  const words = said ? await S2.p.getByText(/: nothing to confirm\./).last().innerText().catch(() => "") : "";
  ok(`QA-446 ${label} 4 pass (screen, P-497 (1)): Confirm section on a "0 to confirm" section confirms nothing, says so, and its answers stay Declared`, clicked && rep0?.confirmed === 0 && said && stillDeclared, { clicked, reply: rep0, said, stillDeclared });
  ok(`QA-446 ${label} 4 pass (review m1): its words name the declared answers ("declared by who gave them"), never only "confirmed already"`, /declared by who gave them/.test(words), words);
  await S2.p.screenshot({ path: join(SHOTS, `${key}-4-nothing-to-confirm-1440.png`) });
  await S2.p.close();

  // 5 · round 2: the checklist equals the Agent view again, 0 to confirm
  const sent2 = await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: filings.map((x) => x.id) }, officer);
  const r2 = sent2.body?.id as string;
  const rows2: typeof rows1 = (await call("GET", `/runtime/reviews/${r2}`, undefined, rep)).body?.filings ?? [];
  const E2 = expectRound(r2, A2.secs);
  const off2 = rows2.filter((r) => !sameValues(valuesOfRow(r)?.live, E2.get(r.filing)));
  ok(`QA-446 ${label} 5 pass (API): round 2's "Values" item of every filing equals the Agent view after Confirm section, 0 to confirm`, sent2.status === 201 && rows2.length === filings.length && !off2.length && rows2.every((r) => valuesOfRow(r)?.live.to_confirm === 0 && /· 0 to confirm$/.test(valuesOfRow(r)?.wording ?? "")), { off: off2.map((r) => [valuesOfRow(r)?.live, E2.get(r.filing)]), words: rows2.map((r) => valuesOfRow(r)?.wording) });
  const W2 = await screenChecklist(c.id, r2, `${key}-5-review-round2-1440.png`);
  ok(`QA-446 ${label} 5 pass (screen): the representative's review shows round 2's words`, W2.length === rows2.length && rows2.every((r) => W2.some((w) => w.includes(valuesOfRow(r)?.wording ?? "\u0000"))), W2);

  // 6 · review M1: the officer types an application answer (staff's: on the Confirm list, P-411 (2)). The household reads
  //     1 to confirm on The application, and every filing whose forms read that fact says "1 to confirm", never "0".
  const d2 = await approveAll(r2);
  ok(`QA-446 ${label} setup: the representative approved round 2`, d2.length === filings.length && d2.every((x) => x === "approved"), d2);
  const read2 = filings.map((x) => caseFactsOf(r2, x.id));
  const appQs = A2.secs.filter((s) => s.subjectId === caseSubject).flatMap((s) => s.questions).filter((q) => !q.group && q.answer && q.answer.by === CLIENT && typeof q.answer.value === "string");
  const pick = appQs.find((q) => read2.every((f) => f.has(q.fact))) ?? appQs.find((q) => read2.some((f) => f.has(q.fact)));
  const edit = pick ? await call("PUT", `/runtime/cases/${c.id}/answers/${caseSubject}/${pick.fact}`, { value: "Sample Officer Edit", expectedId: pick.answer!.id }, officer) : null;
  // Review round 2: and an application answer no filing's forms read, one that decides which forms there are (whether
  // IRCC may release information to a designated individual: Yes adds IMM 5475): it counts in every filing.
  const anyRead = caseFactsOf(r2);
  const decider = A2.secs.filter((s) => s.subjectId === caseSubject).flatMap((s) => s.questions).find((q) => !q.group && q.answer && q.answer.by === CLIENT && q.fact === "case.authorizes_release_to_designated_individual" && !anyRead.has(q.fact));
  const edit2 = decider ? await call("PUT", `/runtime/cases/${c.id}/answers/${caseSubject}/${decider.fact}`, { value: true, expectedId: decider.answer!.id }, officer) : null;
  const A3 = await countsOf(c.id);
  ok(`QA-446 ${label} 6 setup: the officer's two application answers (one a form reads, one no form reads) are on the Confirm list (household 2 to confirm, on The application)`, !!edit && edit.status === 200 && edit.body?.answer?.confirmed === false && !!edit2 && edit2.status === 200 && edit2.body?.answer?.confirmed === false && A3.household === 2 && A3.tabs.get(caseSubject) === 2, { read: pick?.fact, decider: decider?.fact, status: [edit?.status, edit2?.status], household: A3.household, app: A3.tabs.get(caseSubject) });
  const sent3 = await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: filings.map((x) => x.id) }, officer);
  const r3 = sent3.body?.id as string;
  const rows3: typeof rows1 = (await call("GET", `/runtime/reviews/${r3}`, undefined, rep)).body?.filings ?? [];
  const E3 = expectRound(r3, A3.secs);
  const off3 = rows3.filter((r) => !sameValues(valuesOfRow(r)?.live, E3.get(r.filing)));
  const reading = rows3.filter((r) => caseFactsOf(r3, r.filing).has(pick?.fact ?? ""));
  ok(`QA-446 ${label} 6 pass (review M1, API): round 3's "Values" of every filing equals the Agent view, with the application's answer`, sent3.status === 201 && rows3.length === filings.length && !off3.length, off3.map((r) => [valuesOfRow(r)?.live, E3.get(r.filing)]));
  ok(`QA-446 ${label} 6 fail (review M1): every filing counts the deciding answer no form reads, and those whose forms read the other one count both: none says "0 to confirm" while the household says 2`, reading.length > 0 && rows3.every((r) => (valuesOfRow(r)?.live.to_confirm ?? 0) === (reading.includes(r) ? 2 : 1) && !/· 0 to confirm/.test(valuesOfRow(r)?.wording ?? "")), { reading: reading.length, live: rows3.map((r) => [valuesOfRow(r)?.live.to_confirm, valuesOfRow(r)?.wording]) });
  const W3 = await screenChecklist(c.id, r3, `${key}-6-review-round3-application-1440.png`);
  ok(`QA-446 ${label} 6 pass (screen): the representative's review shows round 3's words`, W3.length === rows3.length && rows3.every((r) => W3.some((w) => w.includes(valuesOfRow(r)?.wording ?? "\u0000"))), W3);
}
ok("QA-446: no page errors", !errors.length, errors);
await b.close();
process.exitCode = summary() ? 1 : 0;
