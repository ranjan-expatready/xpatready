// C6.19 acceptance (P-419; concept product/screens/C6.19/concept.md): a returning client's confirmed facts from an
// earlier case are offered on their next case, re-confirmed before use and never copied silently (P-65: copies, not
// live links); expiring facts are checked against their dates, each rule with its official source (or Sample). One pass
// and one fail per rule, BR-1 to BR-7. Runs on the configured checkpoint (P-322: case A on the Visitor visa, case B on
// With an LMIA, as DEMO.md row 18), loaded here on a blank copy through the Demo menu's own route. Sample data, no
// model call (US$0); the demo is never used.
// The capability's acceptance pack (gate B runs it for a PR naming C6.19; it loads the checkpoint itself when needed).
//   zsh tools/isolated.sh acc_c619 4437 start && ./node_modules/.bin/tsx --tsconfig api/tsconfig.json acceptance/C6.19.test.ts 4437 xr_studio_acc_c619 ; zsh tools/isolated.sh acc_c619 4437 stop
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXPIRY_RULES, expiryFlags, latestConfirmed, matchPeople, offerFrom, personFactsAsked, sameName, type ExpiryRule } from "../engine/runtime/earlier-facts.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_acc_c619";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const REP = "user-R", OFFICER = "user-O", SOLO = "user-S", CLIENT = "user-P", AUTHOR = "user-A";
const run = Date.now().toString(36);
const NUMBER = "person.passport_number", EXPIRY = "person.passport_expiry_date", ISSUED = "person.passport_issue_date", COUNTRY = "person.passport_country_of_issue", BIRTH = "person.date_of_birth";
const POLICE = "person.police_certificate_issue_date";
const today = new Date(Date.UTC(2026, 10, 9)); // 9 Nov 2026

function pure() {
  // BR-1
  ok("C6.19 BR-1: the same name in another letter case and spacing is the same person", sameName("  Client  A ", "client a"));
  ok("C6.19 BR-1 fail: another name, or a blank one, is not", !sameName("Client A", "Client B") && !sameName(" ", " "));
  // BR-6, every rule's source checked: an official quote must be in our committed copy of the page; otherwise Sample with its reason.
  const text = (file: string) => readFileSync(fileURLToPath(new URL(`../../../${file}`, import.meta.url)), "utf8").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
  for (const r of EXPIRY_RULES) {
    if ("sample" in r.source) ok(`C6.19 BR-6 (P-170): rule ${r.key} is labelled Sample with its reason`, /^Sample: /.test(r.source.why) && /ASSUMPTIONS/.test(r.source.why), r.source);
    else ok(`C6.19 BR-6 (P-170): rule ${r.key} quotes canada.ca word for word from the committed page, with its date`, text(r.source.file).includes(r.source.quote) && /^\d{4}-\d{2}-\d{2}$/.test(r.source.recorded) && /^https:\/\/www\.canada\.ca\//.test(r.source.url), r.source);
  }
  const facts = (o: Record<string, string>) => new Map(Object.entries(o));
  const expired = expiryFlags(facts({ [EXPIRY]: "2025-01-15" }), today);
  ok("C6.19 BR-6: an expired passport flags every passport fact, blocking, with the rule's words and date", [NUMBER, COUNTRY, ISSUED, EXPIRY].every((f) => expired.get(f)?.status === "expired" && expired.get(f)!.blocks) && /expired on 15 Jan 2025/.test(expired.get(NUMBER)!.words), [...expired]);
  const soon = expiryFlags(facts({ [EXPIRY]: "2027-03-01" }), today);
  ok("C6.19 BR-6: a passport expiring within 6 months warns on its expiry date only, not blocking", soon.get(EXPIRY)?.status === "soon" && !soon.get(EXPIRY)!.blocks && !soon.has(NUMBER), [...soon]);
  ok("C6.19 BR-6 fail: a passport valid beyond 6 months, and the last day of today, are not flagged", expiryFlags(facts({ [EXPIRY]: "2031-05-09" }), today).size === 0 && expiryFlags(facts({ [EXPIRY]: "2026-11-09" }), today).get(EXPIRY)?.status === "soon");
  const notReal = expiryFlags(facts({ [EXPIRY]: "2025-02-30" }), today);
  ok("C6.19 BR-6 fail: a date that is not a real date is never read as expired or valid: it reads 'not known' (the value check refuses it)", ![...notReal.values()].some((f) => f.status !== "unknown") && notReal.get(NUMBER)?.status === "unknown", [...notReal]);
  const police = expiryFlags(facts({ [POLICE]: "2026-03-01" }), today);
  ok("C6.19 BR-6: a police certificate older than 6 months is flagged (Sample rule)", police.get(POLICE)?.status === "expired" && "sample" in police.get(POLICE)!.source, [...police]);
  ok("C6.19 BR-6 fail: a police certificate issued in the last 6 months is not", !expiryFlags(facts({ [POLICE]: "2026-10-01" }), today).has(POLICE));
  let threw = false; try { expiryFlags(facts({ [EXPIRY]: "2031-05-09" }), new Date("x")); } catch { threw = true; }
  ok("C6.19 BR-6 fail: no date for today refuses the check (fail closed), never 'not expired'", threw);
  const unknown = expiryFlags(facts({}), today);
  ok("C6.19 BR-6 (challenge m1): with no expiry date on the earlier case the passport number warns 'not known', not blocking", unknown.get(NUMBER)?.status === "unknown" && !unknown.get(NUMBER)!.blocks && !unknown.has(EXPIRY), [...unknown]);
  const onWp = expiryFlags(facts({ [EXPIRY]: "2025-01-15" }), today, EXPIRY_RULES, "wp.lmia_inside").get(NUMBER)!, onVv = expiryFlags(facts({ [EXPIRY]: "2025-01-15" }), today, EXPIRY_RULES, "vv.single").get(NUMBER)!;
  ok("C6.19 BR-6 (challenge M3): a rule cited for the Visitor visa is Sample on another combination, still blocking", "sample" in onWp.source && onWp.blocks && "quote" in onVv.source);
  const warnThenBlock: ExpiryRule[] = [{ ...EXPIRY_RULES[1], covers: [NUMBER] }, { ...EXPIRY_RULES[0] }];
  ok("C6.19 BR-6: a blocking flag wins over a warning on the same fact", expiryFlags(facts({ [EXPIRY]: "2025-01-15" }), today, warnThenBlock).get(NUMBER)?.blocks === true);

  // BR-2: which facts, which people
  const s = { placements: [{ fact: NUMBER, order: 2 }, { fact: BIRTH, order: 1 }, { fact: "case.purpose_of_visit", order: 0 }, { fact: "person.employment_from_date", repeats: "per_row", order: 3 }, { fact: "person.criminal_record", order: 4 }, { fact: "person.marital_status", repeats: "once_per_case", order: 5 }, { fact: EXPIRY, order: 6 }],
    canonical_fields: [{ id: NUMBER, label: "Passport number" }, { id: EXPIRY, label: "Passport expiry date", value_type: "date" }], field_maps: [], combination: { label: "x" } } as unknown as Snapshot;
  const asked = personFactsAsked(s, new Set(["person.criminal_record"])).map((f) => f.fact);
  ok("C6.19 BR-2: a person's single facts the release asks are offered, in question order", JSON.stringify(asked) === JSON.stringify([BIRTH, NUMBER, EXPIRY]), asked);
  ok("C6.19 BR-2 fail: an application fact, a repeating row, a once-per-case fact and a background question are not", !asked.some((f) => ["case.purpose_of_visit", "person.employment_from_date", "person.criminal_record", "person.marital_status"].includes(f)));
  const here = [{ subjectId: "c", role: "case" as const, label: "The application", applies: true }, { subjectId: "p", role: "principal" as const, label: "Client A", applies: true }, { subjectId: "s", role: "spouse_or_partner" as const, label: "Spouse A", applies: true }, { subjectId: "k", role: "child" as const, label: "Child Z", applies: true }];
  const earlier = [{ subjectId: "c0", role: "case" as const, label: "The application", applies: true }, { subjectId: "p0", role: "principal" as const, label: "Client A", applies: true }, { subjectId: "s0", role: "spouse_or_partner" as const, label: "spouse a", applies: true }, { subjectId: "k0", role: "child" as const, label: "Child C", applies: true }];
  const m = matchPeople(here, earlier);
  ok("C6.19 BR-2: the principal matches the principal, the spouse the spouse of the same name", m.get("p") === "p0" && m.get("s") === "s0", [...m]);
  ok("C6.19 BR-2 fail: a child of another name, and the application, match no one", !m.has("k") && !m.has("c"));
  const ans = (id: string, subjectId: string, field: string, value: unknown, confirmed = true) => ({ id, subjectId, field, value, confirmed, confirmedAt: "2026-11-02T10:00:00Z", confirmedBy: OFFICER });
  const o = offerFrom({ snapshot: s, here, current: [{ id: "cur1", subjectId: "p", field: NUMBER, value: "X9" }, { id: "cur2", subjectId: "s", field: BIRTH, value: "1990-01-01" }], earlier,
    earlierAnswers: [ans("a1", "p0", NUMBER, "Z7000001"), ans("a2", "p0", BIRTH, "1985-03-14", false), ans("a3", "s0", BIRTH, "1990-01-01"), ans("a4", "p0", EXPIRY, "2025-01-15", false), ans("a5", "k0", BIRTH, "2015-01-01")], today });
  const pf = o.people.find((p) => p.subject_id === "p")!.facts;
  ok("C6.19 BR-5: a different value is offered as Different with both values; the same value is not offered", pf.find((f) => f.fact === NUMBER)?.state === "different" && pf.find((f) => f.fact === NUMBER)?.current?.value === "X9" && !o.people.find((p) => p.subject_id === "s")!.facts.length, o.people);
  ok("C6.19 BR-2 fail: an earlier answer not confirmed there is not offered", !pf.some((f) => f.fact === BIRTH) && !pf.some((f) => f.fact === EXPIRY));
  ok("C6.19 BR-6: an unconfirmed expired date still flags the confirmed passport number, which is not usable", pf.find((f) => f.fact === NUMBER)?.expiry?.blocks === true && pf.find((f) => f.fact === NUMBER)?.usable === false);
  ok("C6.19 BR-2: the earlier child with no match is listed by name, nothing of theirs offered", JSON.stringify(o.unmatched) === JSON.stringify([{ label: "Child C", role: "child" }]) && o.people.find((p) => p.subject_id === "k")!.facts.length === 0);

  // QA-338: two earlier cases disagree. Case B kept a copy (BR-3) of the expiry 2031-05-09; case A was corrected to
  // 2025-01-15 and confirmed later. The newest confirmation decides, on whichever case the officer picks.
  const at = (t: string) => `2026-11-0${t}T10:00:00Z`;
  const ansAt = (id: string, subjectId: string, field: string, value: unknown, when: string) => ({ ...ans(id, subjectId, field, value), confirmedAt: when });
  const pB = [{ subjectId: "pB", role: "principal" as const, label: "Client A", applies: true }], pA = [{ subjectId: "pA", role: "principal" as const, label: "Client A", applies: true }];
  const onB = [ansAt("b1", "pB", NUMBER, "Z7000001", at(3)), ansAt("b2", "pB", EXPIRY, "2031-05-09", at(3))], onA = [ansAt("x1", "pA", NUMBER, "Z7000001", at(2)), ansAt("x2", "pA", EXPIRY, "2025-01-15", at(5))];
  const reads = [{ case_id: "B", reference: "CASE-B", match: matchPeople(here, pB), answers: onB }, { case_id: "A", reference: "CASE-A", match: matchPeople(here, pA), answers: onA }];
  const latest = latestConfirmed(reads);
  ok("C6.19 QA-338: the newest confirmed value per person is the one confirmed last, on whichever earlier case", latest.get(`p|${EXPIRY}`)?.case_id === "A" && latest.get(`p|${EXPIRY}`)?.value === "2025-01-15", [...latest]);
  const bOffer = offerFrom({ snapshot: s, here, current: [], earlier: pB, earlierAnswers: onB, today, caseId: "B", latest }).people.find((p) => p.subject_id === "p")!.facts;
  const bExp = bOffer.find((f) => f.fact === EXPIRY), bNum = bOffer.find((f) => f.fact === NUMBER);
  ok("C6.19 QA-338 (newer value): case B's stale expiry is Out of date, naming case A and its later value, and cannot be ticked", bExp?.newer?.reference === "CASE-A" && bExp.newer.value === "2025-01-15" && /another earlier case, confirmed a different value later/.test(bExp.newer.words) && !bExp.usable, bExp);
  ok("C6.19 QA-338 (expired document): case B's passport number reads Expired from the newest expiry date (case A's), not usable", bNum?.expiry?.status === "expired" && /expired on 15 Jan 2025/.test(bNum.expiry.words) && !bNum.newer && !bNum.usable, bNum);
  const aOffer = offerFrom({ snapshot: s, here, current: [], earlier: pA, earlierAnswers: onA, today, caseId: "A", latest }).people.find((p) => p.subject_id === "p")!.facts;
  ok("C6.19 QA-338 fail (newer value): the newest value itself, and a value the other case agrees with, are never Out of date", aOffer.every((f) => !f.newer) && !bNum?.newer, aOffer.map((f) => [f.fact, f.newer]));
  const valid = latestConfirmed([{ ...reads[0] }, { ...reads[1], answers: [ansAt("x2", "pA", EXPIRY, "2033-01-01", at(1))] }]);
  const bOld = offerFrom({ snapshot: s, here, current: [], earlier: pB, earlierAnswers: onB, today, caseId: "B", latest: valid }).people.find((p) => p.subject_id === "p")!.facts;
  ok("C6.19 QA-338 fail (expired document): an older, different value on another case neither marks case B's newer copy Out of date nor changes its expiry; both stay usable", bOld.every((f) => !f.newer && !f.expiry && f.usable), bOld.map((f) => [f.fact, f.newer, f.expiry?.status, f.usable]));
}

async function checkpoint() {
  const released = () => sql("select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='wp.lmia_inside'") !== "0";
  if (!released()) {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    ok("setup: Demo › Load the configured checkpoint", l.status === 201 || l.status === 200, l.status);
  }
  const id = (key: string) => sql(`select id from combination where combination_key='${key}'`);
  ok("setup: Visitor visa and With an LMIA are released on the checkpoint", released() && !!id("vv.single"));
  return { wp: id("wp.lmia_inside"), vv: id("vv.single") };
}

type Q = { subjectId: string; fact: string; answer: { id: string; value: unknown; status: string; channel: string; by: string; answered: { channel: string; by: string } | null; copied_from?: { reference: string; by: string } } | null; section: string };
const questions = async (caseId: string): Promise<Q[]> => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions);
type Case = { id: string; people: { subject_id: string; role: string }[] };
const open = async (combinationId: string, tag: string, name: string, actor = REP, clientActor = CLIENT): Promise<Case> => {
  const r = await call("POST", "/runtime/cases", { combinationId, reference: `C619-${tag}-${run}`, clientActor, principal: { displayName: name } }, actor);
  if (!(r.status === 201 || r.status === 200)) { ok(`setup: case ${tag} opens`, false, r.body); process.exit(2); }
  return r.body;
};
const principalOf = (c: Case) => c.people.find((p) => p.role === "principal")!.subject_id;
const answer = (caseId: string, subject: string, fact: string, value: unknown, expectedId: string | null = null) => call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId }, OFFICER);
const confirmAll = async (caseId: string, subject: string) => {
  const qs = (await questions(caseId)).filter((q) => q.subjectId === subject && q.answer);
  for (const section of new Set(qs.map((q) => q.section))) {
    const r = await call("POST", `/runtime/cases/${caseId}/sections/${section}/confirm`, { subjectId: subject, seen: qs.filter((q) => q.section === section).map((q) => q.answer!.id) }, OFFICER);
    if (!(r.status === 201 || r.status === 200)) ok(`setup: Confirm section ${section}`, false, r.body);
  }
};
type Offer = { earlier: { case_id: string; reference: string; people: { subject_id: string; role: string; facts: { fact: string; value: unknown; from_answer: string; state: string; current: { answer_id: string } | null; expiry: { status: string; words: string; source: { quote?: string } } | null; usable: boolean }[] }[]; unmatched: unknown[] }[] };
const offerOf = async (caseId: string, actor = OFFICER) => call("GET", `/runtime/cases/${caseId}/earlier-facts`, undefined, actor);
const copies = (caseId: string) => Number(sql(`select count(*) from client_canonical_answer a join case_participant p on p.subject_id=a.subject_id where p.case_id='${caseId}' and a.source_json ? 'earlier_case'`));
const answersOf = (caseId: string) => sql(`select coalesce(string_agg(a.id::text || '=' || a.value_json::text || '=' || coalesce(a.superseded_by_id::text,'-'), ';' order by a.id), '') from client_canonical_answer a join case_participant p on p.subject_id=a.subject_id where p.case_id='${caseId}'`);

async function api() {
  const { wp, vv } = await checkpoint();
  const NAME = `Client A ${run}`;
  // Case A (the earlier case): the Visitor visa, the officer's answers confirmed.
  const a = await open(vv, "A", NAME), pa = principalOf(a);
  const askedA = new Set((await questions(a.id)).filter((q) => q.subjectId === pa).map((q) => q.fact));
  const b0 = await open(wp, "B0", `Someone else ${run}`), askedB = new Set((await questions(b0.id)).filter((q) => q.subjectId === principalOf(b0)).map((q) => q.fact));
  const VALUES: Record<string, unknown> = { [NUMBER]: "Z7000001", [COUNTRY]: "IND", [ISSUED]: "2019-05-10", [EXPIRY]: "2031-05-09" };
  const both = Object.keys(VALUES).filter((f) => askedA.has(f) && askedB.has(f));
  ok("setup: both releases ask the principal's passport facts (the facts row 18 reuses)", both.includes(NUMBER) && both.includes(EXPIRY), both);
  const passport = both.filter((f) => f !== ISSUED);
  for (const f of passport) { const r = await answer(a.id, pa, f, VALUES[f]); if (r.status !== 200) ok(`setup: answer ${f} on case A`, false, r.body); }
  await confirmAll(a.id, pa);
  const unconfirmed = both.includes(ISSUED) ? ISSUED : null;
  if (unconfirmed) await answer(a.id, pa, ISSUED, VALUES[ISSUED]); // entered by staff after the confirm: not confirmed on case A
  // The client's own answer (a client field the principal typed) counts as confirmed on case A without staff (P-411).
  const own = askedA.has(BIRTH) && askedB.has(BIRTH) && (await call("PUT", `/runtime/cases/${a.id}/answers/${pa}/${BIRTH}`, { value: "1985-03-14", expectedId: null }, CLIENT)).status === 200 ? BIRTH : null;

  // BR-1: who is offered
  const b = await open(wp, "B", NAME.toLowerCase().replace("client", " Client "), REP), pb = principalOf(b);
  let r = await offerOf(b.id);
  const offer = r.body as Offer, e = offer.earlier?.[0];
  ok("C6.19 BR-1: case B (another combination, the same client's name in other spacing and case) is offered case A", r.status === 200 && offer.earlier.length === 1 && e?.case_id === a.id, r.body);
  ok("C6.19 BR-1 fail: a case for another client's name is offered nothing (no card)", ((await offerOf(b0.id)).body as Offer).earlier.length === 0);
  for (const [who, actor, want] of [["client", CLIENT, 403], ["configuration author", AUTHOR, 403], ["solo firm's representative (another firm's case)", SOLO, 404]] as const)
    ok(`C6.19 BR-7 fail: the ${who} cannot read the offer (${want})`, (await offerOf(b.id, actor)).status === want);
  const solo = await open(wp, "solo", NAME, SOLO);
  ok("C6.19 BR-1 fail: the solo firm's case for the same name is offered nothing from the Sample firm's case", ((await offerOf(solo.id, SOLO)).body as Offer).earlier.length === 0);

  const otherClient = await open(wp, "Q", NAME, REP, "user-Q");
  ok("C6.19 BR-1 fail (breaker M2): a case with the same name for another client login is offered nothing (another client's answers never reach it)", ((await offerOf(otherClient.id)).body as Offer).earlier.length === 0);
  ok("C6.19 BR-1 fail (breaker m3): a case opened later is never offered as earlier (case A is not offered case B)", !((await offerOf(a.id)).body as Offer).earlier.some((x) => x.case_id === b.id));

  // BR-2: what is offered
  const facts = e.people.find((p) => p.subject_id === pb)!.facts, fact = (k: string) => facts.find((f) => f.fact === k);
  const usable = passport.filter((k) => k !== COUNTRY);
  ok("C6.19 BR-2: case A's confirmed passport facts are offered for the principal, each New", passport.every((k) => fact(k)?.state === "new") && usable.every((k) => fact(k)?.usable), facts.map((f) => [f.fact, f.state, f.usable]));
  ok("C6.19 BR-2 fail (challenge M4): a value this case's release refuses (case A's passport country, not on the work permit's list) is shown with the reason and cannot be ticked", fact(COUNTRY)?.usable === false && /Choose one of/.test(JSON.stringify(fact(COUNTRY))), fact(COUNTRY));
  if (own) ok("C6.19 BR-2: the client's own answer on case A (confirmed there as the client's) is offered", !!fact(own)?.usable, fact(own));
  ok("C6.19 BR-2 fail: an answer not confirmed on case A, and any application fact, are not offered", (!unconfirmed || !fact(unconfirmed)) && !facts.some((f) => f.fact.startsWith("case.")), facts.map((f) => f.fact));

  // BR-4: nothing used until re-confirmed
  ok("C6.19 BR-4 fail: reading the offer copies nothing onto case B", copies(b.id) === 0 && !(await questions(b.id)).some((q) => q.subjectId === pb && both.includes(q.fact) && q.answer));
  // BR-5: changed since you looked; Different kept unless ticked
  const typed = await answer(b.id, pb, NUMBER, "X1234567");
  ok("setup: the officer typed another passport number on case B", typed.status === 200, typed.body);
  const take = (ks: string[], f = facts) => ks.map((k) => ({ subject_id: pb, fact: k, from: f.find((x) => x.fact === k)!.from_answer }));
  const seenNone = Object.fromEntries(usable.map((k) => [`${pb}|${k}`, null]));
  const stale = await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: a.id, take: take([NUMBER, EXPIRY]), seen: seenNone }, OFFICER);
  ok("C6.19 BR-5 fail: an answer saved after the officer looked is refused with its label; nothing copied", stale.status === 409 && /Changed since you looked/.test(JSON.stringify(stale.body)) && copies(b.id) === 0, stale.body);
  r = await offerOf(b.id);
  const f2 = (r.body as Offer).earlier.find((x) => x.case_id === a.id)!.people.find((p) => p.subject_id === pb)!.facts;
  ok("C6.19 BR-5: the typed number now reads Different, with case B's own value", f2.find((f) => f.fact === NUMBER)?.state === "different", f2.map((f) => [f.fact, f.state]));
  const seen = Object.fromEntries(f2.map((f) => [`${pb}|${f.fact}`, f.current?.answer_id ?? null]));
  ok("C6.19 fail (breaker m1): the same fact ticked twice is refused (400), nothing copied", (await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: a.id, take: [...take([EXPIRY], f2), ...take([EXPIRY], f2)], seen }, OFFICER)).status === 400 && copies(b.id) === 0);
  ok("C6.19 fail: a request with an unknown field, or nothing ticked, is refused (400)", (await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: a.id, take: take([EXPIRY], f2), seen, extra: 1 }, OFFICER)).status === 400 && (await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: a.id, take: [], seen }, OFFICER)).status === 400);
  ok("C6.19 BR-7 fail: the client cannot re-confirm (403), even with a malformed body", (await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: a.id, take: take([EXPIRY], f2), seen }, CLIENT)).status === 403 && (await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { nonsense: 1 }, CLIENT)).status === 403);
  ok("C6.19 BR-1 fail: another firm's or another person's case id is not found, and nothing is copied", (await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: b0.id, take: take([EXPIRY], f2), seen }, OFFICER)).status === 404 && copies(b.id) === 0);
  const wrongFrom = await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: a.id, take: [{ subject_id: pb, fact: EXPIRY, from: a.id }], seen }, OFFICER);
  ok("C6.19 BR-5 fail: an earlier answer that is no longer the one shown is refused (changed on the earlier case)", wrongFrom.status === 409 && /on the earlier case/.test(JSON.stringify(wrongFrom.body)) && copies(b.id) === 0, wrongFrom.body);

  // BR-3, BR-4: the copy; the earlier case never changes
  const beforeA = answersOf(a.id);
  const UNTICKED = COUNTRY; // offered, not usable, never ticked
  const rest = usable.filter((k) => k !== NUMBER);
  const ticks = [...rest, ...(own ? [own] : [])];
  const done = await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: a.id, take: take(ticks, f2), seen }, REP);
  const kept = (status: string, by: string, k: string[]) => sql(`select count(*) from client_canonical_answer a join case_participant p on p.subject_id=a.subject_id where p.case_id='${b.id}' and a.canonical_field_key in (${k.map((x) => `'${x}'`).join(",")}) and a.status='${status}' and coalesce(a.verified_by,'-')='${by}' and a.source_json->>'earlier_case'='${a.id}' and a.source_json->>'reconfirmed_by'='${REP}' and a.superseded_by_id is null`) === String(k.length);
  ok("C6.19 BR-4: only the ticked facts are written, each naming the earlier case and answer and who re-confirmed it", (done.status === 201 || done.status === 200) && JSON.stringify(done.body?.copied?.map((x: { fact: string }) => x.fact)) === JSON.stringify(ticks) && copies(b.id) === ticks.length, done.body);
  ok("C6.19 BR-4 (challenge B1): a fact Verified on case A arrives Verified by case A's verifier, never by the re-confirming press", kept("VERIFIED", OFFICER, rest));
  if (own) ok("C6.19 BR-4 fail (challenge B1): the client's own answer arrives Declared and the client's, not Verified by the tick", kept("DECLARED", "-", [own]) && (await questions(b.id)).find((q) => q.subjectId === pb && q.fact === own)?.answer?.channel === "questionnaire");
  const qb = await questions(b.id), qA = await questions(a.id);
  const giver = (q: Q | undefined) => q?.answer ? `${q.answer.answered?.channel ?? q.answer.channel}|${q.answer.answered?.by ?? q.answer.by}` : null;
  const onA = (k: string) => qA.find((q) => q.subjectId === pa && q.fact === k), onB = (k: string) => qb.find((q) => q.subjectId === pb && q.fact === k);
  ok("C6.19 BR-4 (review M1): each copy keeps who first gave it on case A (the answer sheet's source), and says apart where it came from", ticks.every((k) => giver(onB(k)) === giver(onA(k)) && onB(k)?.answer?.copied_from?.reference === `C619-A-${run}` && onB(k)?.answer?.copied_from?.by === REP), ticks.map((k) => [k, giver(onA(k)), giver(onB(k)), onB(k)?.answer?.copied_from]));
  if (own) ok("C6.19 BR-4 fail (review M1): the client's own copied answer reads as the client's, never as staff's or the re-confirming officer's", giver(onB(own)) === `questionnaire|${CLIENT}`, giver(onB(own)));
  ok("C6.19 BR-4 fail: an unticked fact stays off case B; the officer's Different number is kept", !qb.some((q) => q.subjectId === pb && q.fact === UNTICKED && q.answer) && qb.find((q) => q.subjectId === pb && q.fact === NUMBER)?.answer?.value === "X1234567", qb.filter((q) => q.subjectId === pb && both.includes(q.fact)).map((q) => [q.fact, q.answer?.value]));
  ok("C6.19 BR-3: case A did not change with the copy", answersOf(a.id) === beforeA);
  const copied = qb.find((q) => q.subjectId === pb && q.fact === EXPIRY)!.answer!;
  await answer(b.id, pb, EXPIRY, "2032-01-01", copied.id);
  ok("C6.19 BR-3 fail: a later change on case B does not reach case A (a copy, not a link)", answersOf(a.id) === beforeA && sql(`select value_json #>> '{}' from client_canonical_answer a join case_participant p on p.subject_id=a.subject_id where p.case_id='${a.id}' and a.canonical_field_key='${EXPIRY}' and a.superseded_by_id is null`) === "2031-05-09");
  const audit = sql(`select summary from audit_event where entity='case' and entity_key='${b.id}' and action='reused_facts'`);
  ok("C6.19 BR-7: one audit line names the facts and the earlier case, never a value", /re-confirmed \d+ facts? from the earlier case C619-A-/.test(audit) && !/2031-05-09|Z7000001/.test(audit), audit);
  const replace = await offerOf(b.id), f3 = (replace.body as Offer).earlier.find((x) => x.case_id === a.id)!.people.find((p) => p.subject_id === pb)!.facts;
  const swap = await call("POST", `/runtime/cases/${b.id}/earlier-facts`, { earlierCase: a.id, take: take([NUMBER], f3), seen: Object.fromEntries(f3.map((f) => [`${pb}|${f.fact}`, f.current?.answer_id ?? null])) }, OFFICER);
  ok("C6.19 BR-5: a ticked Different replaces case B's value (the old one superseded, kept in history)", (swap.status === 201 || swap.status === 200) && (await questions(b.id)).find((q) => q.subjectId === pb && q.fact === NUMBER)?.answer?.value === "Z7000001"
    && sql(`select count(*) from client_canonical_answer a join case_participant p on p.subject_id=a.subject_id where p.case_id='${b.id}' and a.canonical_field_key='${NUMBER}' and a.superseded_by_id is not null`) === "1", swap.body);

  // BR-6: an expired passport on the earlier case
  const qa = (await questions(a.id)).find((q) => q.subjectId === pa && q.fact === EXPIRY)!.answer!;
  await answer(a.id, pa, EXPIRY, "2025-01-15", qa.id);
  await confirmAll(a.id, pa);
  const c = await open(wp, "C", NAME), pc = principalOf(c);
  const fc = ((await offerOf(c.id)).body as Offer).earlier.find((x) => x.case_id === a.id)!.people.find((p) => p.subject_id === pc)!.facts;
  const flagged = fc.find((f) => f.fact === NUMBER);
  ok("C6.19 BR-6: case A's expired passport flags its number on case C as Expired, not usable", flagged?.expiry?.status === "expired" && !flagged.usable && /expired on 15 Jan 2025/.test(flagged.expiry.words), flagged);
  ok("C6.19 BR-6 (challenge M3): on the work permit the visitor visa page's rule is labelled Sample, naming the page it was cited from", /^Sample on this combination: canada\.ca states it on "Apply for a visitor visa/.test((flagged?.expiry?.source as { why?: string })?.why ?? ""), flagged?.expiry?.source);
  const v = await open(vv, "V", NAME), pv = principalOf(v);
  const fv = ((await offerOf(v.id)).body as Offer).earlier.find((x) => x.case_id === a.id)?.people.find((p) => p.subject_id === pv)?.facts.find((f) => f.fact === NUMBER);
  ok("C6.19 BR-6: on a Visitor visa case the same flag quotes canada.ca word for word", fv?.expiry?.status === "expired" && /valid \(not expired\) passport/.test(fv.expiry.source.quote ?? ""), fv?.expiry);
  const refused = await call("POST", `/runtime/cases/${c.id}/earlier-facts`, { earlierCase: a.id, take: [{ subject_id: pc, fact: NUMBER, from: flagged!.from_answer }], seen: { [`${pc}|${NUMBER}`]: null } }, OFFICER);
  ok("C6.19 BR-6 fail: re-confirming an expired passport's number is refused with the rule's words and its source (review m4); nothing copied", refused.status === 409 && /cannot be re-confirmed: The passport expired on 15 Jan 2025.*\(Sample rule\)/.test(JSON.stringify(refused.body)) && copies(c.id) === 0, refused.body);
  ok("C6.19 BR-6: every passport fact offered on case C is flagged with the expired passport", fc.filter((f) => both.includes(f.fact)).length >= 3 && fc.filter((f) => both.includes(f.fact)).every((f) => f.expiry?.blocks), fc.map((f) => [f.fact, f.expiry?.status]));
  ok("C6.19 BR-6 fail: a fact no rule covers (the date of birth) is not flagged", !own || !fc.find((f) => f.fact === own)?.expiry, fc.find((f) => f.fact === own));
  // QA-338: case B still holds its copies from before case A's correction; on case C, B's passport facts are not usable.
  const fb = ((await offerOf(c.id)).body as Offer).earlier.find((x) => x.case_id === b.id)?.people.find((p) => p.subject_id === pc)?.facts ?? [];
  const bPass = fb.filter((f) => both.includes(f.fact));
  ok("C6.19 QA-338: on case C, case B's passport copies (older than case A's correction) are each Expired or Out of date, none usable", bPass.length > 0 && bPass.every((f) => !f.usable && (f.expiry?.blocks || /another earlier case/.test(JSON.stringify(f)))), fb.map((f) => [f.fact, f.value, f.expiry?.status, f.usable]));
  const bNumber = bPass.find((f) => f.fact === NUMBER);
  const viaB = bNumber ? await call("POST", `/runtime/cases/${c.id}/earlier-facts`, { earlierCase: b.id, take: [{ subject_id: pc, fact: NUMBER, from: bNumber.from_answer }], seen: { [`${pc}|${NUMBER}`]: null } }, OFFICER) : { status: 0, body: null };
  ok("C6.19 QA-338 fail: re-confirming case B's copy of the expired passport's number is refused; nothing copied", viaB.status === 409 && /cannot be re-confirmed/.test(JSON.stringify(viaB.body)) && copies(c.id) === 0, viaB.body);
  if (own) ok("C6.19 QA-338 fail: a copy on case B that no later confirmation contradicts (the date of birth) stays usable", fb.find((f) => f.fact === own)?.usable === true, fb.find((f) => f.fact === own));

  // Breaker M1: newer empty cases of the same client never crowd out the earlier case that holds the facts.
  for (let i = 0; i < 6; i++) await open(vv, `crowd${i}`, NAME);
  const e2 = await open(wp, "E", NAME), listed = ((await offerOf(e2.id)).body as Offer).earlier;
  ok("C6.19 BR-1 (breaker M1): with six empty earlier cases of the same client, case A (the one with facts) is still offered, first", listed.length === 5 && listed.some((x) => x.case_id === a.id) && listed[0].people.some((p) => p.facts.length > 0), listed.map((x) => x.reference));

  // BR-7: a case recorded as submitted copies nothing. Set-up: case D's filings from /prepare, then its record row written
  // directly (as C8.2's "Record submission" leaves it; the full Ready to file walk is C8.2's own pack).
  const d = await open(wp, "D", NAME), pd = principalOf(d);
  const fd = ((await offerOf(d.id)).body as Offer).earlier.find((x) => x.case_id === a.id)!.people.find((p) => p.subject_id === pd)!.facts.find((f) => f.fact === own) ?? null;
  const prep = (await call("GET", `/runtime/cases/${d.id}/prepare`, undefined, OFFICER)).body as { groups?: { id: string }[]; filings?: { id: string }[] };
  const g = prep?.groups?.[0]?.id, fl = prep?.filings?.[0]?.id;
  if (g && fl) sql(`insert into filing_record (id, workspace_id, case_id, filing_id, submission_group_id, our_reference, submitted_on, application_number, prepared_by, recorded_by, filed_facts) select gen_random_uuid(), workspace_id, id, '${fl}', '${g}', 'SAMPLE-C619', current_date, 'V3000619', '${REP}', '${REP}', '[]'::jsonb from runtime_case where id='${d.id}'`);
  ok("C6.19 BR-7 (review m5): the offer says a recorded case is read-only before anyone ticks", ((await offerOf(d.id)).body as { recorded?: boolean }).recorded === true && ((await offerOf(b.id)).body as { recorded?: boolean }).recorded === false);
  ok("setup: case D is recorded as submitted", sql(`select count(*) from filing_record where case_id='${d.id}'`) === "1" && !!fd, { g, fl, fd: !!fd });
  const ro = fd ? await call("POST", `/runtime/cases/${d.id}/earlier-facts`, { earlierCase: a.id, take: [{ subject_id: pd, fact: fd.fact, from: fd.from_answer }], seen: { [`${pd}|${fd.fact}`]: null } }, OFFICER) : { status: 0, body: null };
  ok("C6.19 BR-7 fail: a case recorded as submitted copies nothing, in this capability's words", ro.status === 409 && /recorded as submitted to IRCC, so it is read-only: no facts are copied/.test(JSON.stringify(ro.body)) && copies(d.id) === 0, ro.body);
  ok("C6.19 BR-7: on a case not recorded, the officer re-confirms (case B above wrote its copies)", copies(b.id) > 0);
}

pure();
await api();
process.exit(summary() ? 1 : 0);
