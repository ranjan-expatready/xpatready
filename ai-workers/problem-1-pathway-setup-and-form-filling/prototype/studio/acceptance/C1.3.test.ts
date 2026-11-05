// C1.3 + C11.5 part 2 acceptance (P-106, BR-13 as ruled on #1051, stand-in SI-10; concept
// product/screens/C1.3-employer-link r2): on a worker's employer-specific work-permit case the case officer picks the
// employer case it relies on, and the employer facts the worker's pinned release reads are copied in once (SA-1B-283
// r4 "Copies, not live links"). One pass and one fail per rule, BR-1 to BR-7, plus where each copy is written (M4).
// Runs on the configured checkpoint (P-322), loaded here on a blank copy through the Demo menu's own route. Sample
// data, no model call (US$0); the demo is never used.
// The capability's acceptance pack (gate B runs it for a PR naming C1.3; it loads the checkpoint itself when needed).
//   zsh tools/isolated.sh acc_c13 4436 start && ./node_modules/.bin/tsx --tsconfig api/tsconfig.json acceptance/C1.3.test.ts 4436 xr_studio_acc_c13 ; zsh tools/isolated.sh acc_c13 4436 stop
import { carriedFacts, employerFacts, employerLinkOffer, factState } from "../engine/runtime/employer.ts";
import { isFilingFact } from "../engine/resolver.ts";
import { spawn } from "node:child_process";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_c13_link";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const REP = "user-R", OFFICER = "user-O", SOLO = "user-S", CLIENT = "user-P", AUTHOR = "user-A";
const run = Date.now().toString(36);
const EMPLOYER = "sample-employer-1", SOLO_EMPLOYER = "sample-solo-employer-1";
const NAME = "organisation.employer_name", ADDRESS = "organisation.employer_address", LMIA = "case.lmia_or_offer_number";
const SAMPLE_ADDRESS = { street_number: "1", street_name: "Example Street", city: "Hamilton", province: "ON", postal_code: "L8P 0A1", country: "canada" };

function pure() {
  const entry = (fact: string, person: string | null = "form_subject", outcome = "mapped") => ({ outcome, fact, person });
  const snap = (entries: object[], client_type = "INDIVIDUAL", placements: object[] = []) => ({ combination: { label: "Employer-specific work permit", client_type }, field_maps: [{ entries }], placements, canonical_fields: [] });
  const rep = snap([entry("organisation.name", "representative"), entry("person.family_name")]);
  ok("C11.5 fail: the representative's own firm (a box read for the representative) is not an employer fact", employerFacts(rep).length === 0 && !employerLinkOffer(rep).offered, employerLinkOffer(rep));
  const wp = snap([entry("organisation.name", "representative"), entry(NAME, "none"), entry(ADDRESS, "none")]);
  ok("C11.5: the work permit counts only the employer's facts, and the words say they are copied, not read-only (M1)", employerLinkOffer(wp).reason === "Offered: the Employer-specific work permit forms read 2 employer facts; you can copy them from an employer case.", employerLinkOffer(wp).reason);
  ok("C11.5: an employer fact with no person named still counts (by person, never by key)", employerFacts(snap([entry(NAME, null)])).length === 1);
  const places = [{ fact: NAME, repeats: "per_person", order: 2 }, { fact: LMIA, repeats: "once_per_case", order: 1 }, { fact: "organisation.business_number", repeats: "per_person", order: 3 }];
  const s = snap([entry(NAME, "none"), entry(LMIA), entry("organisation.name", "representative")], "INDIVIDUAL", [...places, { fact: "organisation.name", repeats: "per_person", order: 4 }]);
  const ec = { key: "x", firm: "f", label: "x", facts: { [NAME]: "Sample Ltd", [LMIA]: "SAMPLE-1", "organisation.business_number": "SAMPLE-BN", "organisation.name": "Firm", [ADDRESS]: SAMPLE_ADDRESS } };
  const c = carriedFacts(s, ec);
  ok("C1.3 BR-2: only the facts the release reads and asks move, in question order, each on its subject (M4)", JSON.stringify(c.map((f) => [f.fact, f.on])) === JSON.stringify([[LMIA, "case"], [NAME, "principal"]]), c);
  ok("C1.3 BR-2 fail: a fact the release does not read, the representative's firm and an unasked fact stay on the employer case", !c.some((f) => ["organisation.business_number", "organisation.name", ADDRESS].includes(f.fact)));
  // Tech lead on #1051: the copy goes where the resolver reads it, by its own rule (isFilingFact), never a second rule
  // here. Today an unmarked and a marked organisation fact both read per person; once C3.16 (#1054) stores a field
  // marked Organisation on the case's own record, the same check expects it on the case.
  for (const place of [{ fact: NAME, repeats: "per_person", order: 1 }, { fact: NAME, repeats: "per_person", scope: "organisation", order: 1 }]) {
    const got = carriedFacts(snap([entry(NAME, "none")], "INDIVIDUAL", [place]), { ...ec, facts: { [NAME]: "Sample Ltd" } })[0]?.on;
    ok(`C1.3 (M4): a${place.scope ? " marked" : "n unmarked"} organisation fact is copied where the resolver reads it (${got})`, got === (isFilingFact(NAME, place) ? "case" : "principal"), got);
  }
  ok("C1.3 BR-2 fail: a blank value is not carried (blank stays blank)", carriedFacts(s, { ...ec, facts: { [NAME]: "  ", [LMIA]: "SAMPLE-1" } }).map((f) => f.fact).join() === LMIA);
  const reordered = { country: "canada", postal_code: "L8P 0A1", province: "ON", city: "Hamilton", street_name: "Example Street", street_number: "1" };
  ok("C1.3 BR-4 (M3): an equal address in another key order is Same", factState(SAMPLE_ADDRESS, { value: reordered }) === "same");
  ok("C1.3 BR-4 fail: a different value is Different, and no answer is New", factState("SAMPLE-1", { value: "A123" }) === "different" && factState("x", null) === "new");
  ok("C1.3 BR-4 (break m1): \"Canada\" and \"canada\" as the country, and a trailing space, read Same", factState(SAMPLE_ADDRESS, { value: { ...SAMPLE_ADDRESS, country: "Canada" } }) === "same" && factState("Sample Ltd", { value: "Sample Ltd " }) === "same");
  ok("C1.3 BR-4 fail (break m1): a name in another case, or another city, stays Different", factState("Sample Ltd", { value: "SAMPLE LTD" }) === "different" && factState(SAMPLE_ADDRESS, { value: { ...SAMPLE_ADDRESS, city: "Toronto" } }) === "different");
  ok("C11.5 fail: a Corporate case never links to an employer case", !employerLinkOffer(snap([entry(NAME, "none")], "CORPORATE")).offered);
}

async function checkpoint() {
  const released = () => sql("select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='wp.lmia_inside'") !== "0";
  if (!released()) {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    ok("setup: Demo › Load the configured checkpoint", l.status === 201 || l.status === 200, l.status);
  }
  const id = (key: string) => sql(`select id from combination where combination_key='${key}'`);
  ok("setup: With an LMIA – inside Canada is released on the checkpoint", released());
  return { wp: id("wp.lmia_inside"), vv: id("vv.single"), sp: id("sp.outside") };
}

type Q = { subjectId: string; fact: string; label: string; answer: { id: string; value: unknown; status: string; channel: string; answered: { channel: string } | null } | null; fills: { form: string }[]; section: string };
const questions = async (caseId: string): Promise<Q[]> => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions);
const subjects = (c: { people: { subject_id: string; role: string }[] }) => ({ principal: c.people.find((p) => p.role === "principal")!.subject_id, filing: c.people.find((p) => p.role === "case")!.subject_id });
const open = async (wp: string, tag: string) => {
  const r = await call("POST", "/runtime/cases", { combinationId: wp, reference: `C13-${tag}-${run}`, clientActor: CLIENT, principal: { displayName: "Client A" } }, REP);
  if (!(r.status === 201 || r.status === 200)) { ok(`setup: a work-permit case opens (${tag})`, false, r.body); process.exit(2); }
  return r.body as { id: string; people: { subject_id: string; role: string }[]; employer_link: { offered: boolean; reason: string } };
};
const answer = (caseId: string, subject: string, fact: string, value: unknown, expectedId: string | null = null) => call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId }, OFFICER);
const linkedCopies = (caseId: string) => Number(sql(`select count(*) from client_canonical_answer a join case_participant p on p.subject_id=a.subject_id where p.case_id='${caseId}' and a.source_json->>'channel'='linked_file'`));
const seenOf = (facts: { fact: string; current: { answer_id: string } | null }[]) => Object.fromEntries(facts.map((f) => [f.fact, f.current?.answer_id ?? null]));

async function api() {
  const { wp, vv, sp } = await checkpoint();
  // BR-1 Offer
  const offer = (await call("GET", `/runtime/combinations/${wp}/employer-link`, undefined, OFFICER)).body;
  ok("C1.3 BR-1: the work permit offers the link, counting 2 employer facts (not the representative's firm, m1)", offer?.offered === true && JSON.stringify(offer.facts) === JSON.stringify([ADDRESS, NAME]) && /read 2 employer facts; you can copy them/.test(offer.reason), offer);
  for (const [label, id] of [["Visitor visa", vv], ["Study permit", sp]] as const) {
    const o = (await call("GET", `/runtime/combinations/${id}/employer-link`, undefined, OFFICER)).body;
    ok(`C11.5 fail (m1): the ${label} on the checkpoint is not offered the link (IMM 5475's representative's firm is not an employer fact)`, o?.offered === false, o);
  }
  const c = await open(wp, "main");
  const { principal, filing } = subjects(c);
  ok("C1.3 BR-1: the case header offers it from the pinned release", c.employer_link?.offered === true);
  for (const [who, actor, want] of [["client", CLIENT, 403], ["configuration author", AUTHOR, 403], ["solo firm's representative (another firm's case)", SOLO, 404]] as const)
    ok(`C1.3 BR-1/BR-7 fail: the ${who} cannot read the employer cases (${want})`, (await call("GET", `/runtime/cases/${c.id}/employer-cases`, undefined, actor)).status === want);
  ok("C1.3 fail: a malformed case id is not found, never a server error", (await call("GET", "/runtime/cases/not-an-id/employer-cases", undefined, OFFICER)).status === 404);
  const vvCase = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C13-vv-${run}`, clientActor: CLIENT, principal: { displayName: "Client B" } }, REP);
  const vvList = await call("GET", `/runtime/cases/${vvCase.body?.id}/employer-cases`, undefined, OFFICER);
  ok("C1.3 BR-1 fail: a Visitor visa case is refused with the offer's reason", vvList.status === 409 && /Not offered: the Visitor visa has no employer facts/.test(JSON.stringify(vvList.body)), vvList.body);

  // BR-2, BR-7: what the firm sees
  let list = (await call("GET", `/runtime/cases/${c.id}/employer-cases`, undefined, OFFICER)).body;
  const ec = list?.employer_cases?.find((e: { key: string }) => e.key === EMPLOYER);
  ok("C1.3 BR-7: the Sample firm sees its own Sample employer case only", list?.employer_cases?.length === 1 && !!ec && list.stand_in?.id === "SI-10", list?.employer_cases?.map((e: { key: string }) => e.key));
  const factsOf = (e: { facts: { fact: string }[] }) => e.facts.map((f) => f.fact).sort().join();
  ok("C1.3 BR-2: exactly the employer name, address and LMIA or offer number would move", ec && factsOf(ec) === [LMIA, ADDRESS, NAME].sort().join(), ec?.facts);
  ok("C1.3 BR-2 fail: the business number (not read) and the representative's firm do not", ec && !ec.facts.some((f: { fact: string }) => f.fact === "organisation.business_number" || f.fact === "organisation.name"));
  ok("C1.3 (M4): employer facts go on the principal, the LMIA number on the application", ec && ec.facts.every((f: { fact: string; subject_id: string }) => f.subject_id === (f.fact === LMIA ? filing : principal)), ec?.facts);
  const soloKey = await call("POST", `/runtime/cases/${c.id}/employer-link`, { employerCase: SOLO_EMPLOYER, seen: seenOf(ec?.facts ?? []) }, OFFICER);
  ok("C1.3 BR-7 fail: another firm's employer case is not found, and not named", soloKey.status === 404 && !/Solo Sample Employer/.test(JSON.stringify(soloKey.body)), soloKey.body);

  // BR-4: New · Same · Different
  await answer(c.id, filing, LMIA, "A123");
  const addr = await answer(c.id, principal, ADDRESS, { country: "canada", postal_code: "L8P 0A1", province: "ON", city: "Hamilton", street_name: "Example Street", street_number: "1" });
  ok("setup: the officer typed an LMIA number and the same address in another key order", addr.status === 200, addr.body);
  list = (await call("GET", `/runtime/cases/${c.id}/employer-cases`, undefined, OFFICER)).body;
  const st = Object.fromEntries((list.employer_cases[0].facts as { fact: string; state: string }[]).map((f) => [f.fact, f.state]));
  ok("C1.3 BR-4: name New, address Same (M3), LMIA number Different", st[NAME] === "new" && st[ADDRESS] === "same" && st[LMIA] === "different", st);
  const seen = seenOf(list.employer_cases[0].facts);

  // BR-6 fail: changed since you looked (M2)
  const stale = await call("POST", `/runtime/cases/${c.id}/employer-link`, { employerCase: EMPLOYER, seen: { ...seen, [LMIA]: null } }, OFFICER);
  ok("C1.3 BR-6 fail (M2): an answer that arrived after the officer looked is refused with its label, nothing copied", stale.status === 409 && /Changed since you looked/.test(JSON.stringify(stale.body)) && linkedCopies(c.id) === 0, stale.body);
  ok("C1.3 fail: a request with an unknown field is refused (400)", (await call("POST", `/runtime/cases/${c.id}/employer-link`, { employerCase: EMPLOYER, seen, extra: 1 }, OFFICER)).status === 400);
  ok("C1.3 BR-1 fail: the client cannot link (403)", (await call("POST", `/runtime/cases/${c.id}/employer-link`, { employerCase: EMPLOYER, seen }, CLIENT)).status === 403);
  ok("C1.3 fail (break m6): a client sending a malformed body still gets 403, never 400", (await call("POST", `/runtime/cases/${c.id}/employer-link`, { nonsense: true }, CLIENT)).status === 403);
  const huge = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`organisation.f${i}`, null]));
  ok("C1.3 fail (break m6): more than 50 seen answers is refused (400), nothing copied", (await call("POST", `/runtime/cases/${c.id}/employer-link`, { employerCase: EMPLOYER, seen: huge }, OFFICER)).status === 400 && linkedCopies(c.id) === 0);

  // BR-3, BR-4, BR-5: the copy
  const addressId = seen[ADDRESS];
  const done = await call("POST", `/runtime/cases/${c.id}/employer-link`, { employerCase: EMPLOYER, seen }, OFFICER);
  ok("C1.3 BR-4: only the New fact is written; Same and an unticked Different are not", (done.status === 201 || done.status === 200) && JSON.stringify(done.body?.copied) === JSON.stringify([NAME]), done.body);
  const qs = await questions(c.id);
  const qName = qs.find((q) => q.fact === NAME && q.subjectId === principal), qLmia = qs.find((q) => q.fact === LMIA && q.subjectId === filing), qAddr = qs.find((q) => q.fact === ADDRESS && q.subjectId === principal);
  ok("C1.3 BR-4 fail: the officer's LMIA number is kept, the address answer untouched", qLmia?.answer?.value === "A123" && qAddr?.answer?.id === addressId, { lmia: qLmia?.answer?.value, addr: qAddr?.answer?.id });
  ok("C1.3 BR-3: the copied name is a stored answer with source linked_file, the employer case and the date", qName?.answer?.value === "Sample Employer Ltd (Sample)" && qName.answer.channel === "linked_file"
    && sql(`select source_json->>'employer_case' || '|' || left(source_json->>'at', 10) from client_canonical_answer where id='${qName.answer.id}'`) === `${EMPLOYER}|${new Date().toISOString().slice(0, 10)}`, qName?.answer);
  ok("C1.3 BR-5 fail: the copy is Declared (To confirm), never Verified by the copy", qName?.answer?.status === "DECLARED");
  ok("C1.3 (M4): the copied name fills the worker's IMM 5710", !!qName?.fills.some((f) => /5710/.test(f.form)), qName?.fills);
  const header = (await call("GET", `/runtime/cases/${c.id}`, undefined, OFFICER)).body?.employer_link;
  ok("C1.3: the case header names the employer case it relies on, in the team's CaseLink words", header?.linked?.to_case === EMPLOYER && header.linked.kind === "worker_permit" && header.linked.status === "ACTIVE" && header.linked.created_by === OFFICER && JSON.stringify(header.linked.facts) === JSON.stringify([NAME]), header);
  const again = await call("POST", `/runtime/cases/${c.id}/employer-link`, { employerCase: EMPLOYER, seen: seenOf((await call("GET", `/runtime/cases/${c.id}/employer-cases`, undefined, OFFICER)).body.employer_cases[0].facts) }, OFFICER);
  ok("C1.3 BR-6 fail: a second link on the same case is refused, naming the employer case", again.status === 409 && /already relies on Sample employer case/.test(JSON.stringify(again.body)), again.body);
  const fix = await answer(c.id, principal, NAME, "Sample Employer Limited (Sample)", qName!.answer!.id);
  ok("C1.3 BR-3: a copied value is corrected on the worker's case like any answer; the link stays", fix.status === 200 && (await call("GET", `/runtime/cases/${c.id}`, undefined, OFFICER)).body?.employer_link?.linked?.to_case === EMPLOYER, fix.body);
  ok("C1.3 BR-3 fail: nothing is live-linked: the copies are stored rows, one per fact copied", linkedCopies(c.id) === 1);
  const sec = qs.filter((q) => q.subjectId === principal && q.section === qName!.section);
  const fresh = await questions(c.id);
  const ids = fresh.filter((q) => q.subjectId === principal && q.section === qName!.section && q.answer).map((q) => q.answer!.id);
  const conf = await call("POST", `/runtime/cases/${c.id}/sections/${qName!.section}/confirm`, { subjectId: principal, seen: ids }, OFFICER);
  ok("C1.3 BR-5: Confirm section confirms the employer facts like any other answer", (conf.status === 201 || conf.status === 200) && sec.length > 0, conf.body);

  // BR-4 ticked: the employer case's value replaces the officer's, the old one kept in history
  const c2 = await open(wp, "replace"), s2 = subjects(c2);
  await answer(c2.id, s2.filing, LMIA, "A123");
  const l2 = (await call("GET", `/runtime/cases/${c2.id}/employer-cases`, undefined, OFFICER)).body.employer_cases[0].facts;
  const r2 = await call("POST", `/runtime/cases/${c2.id}/employer-link`, { employerCase: EMPLOYER, seen: seenOf(l2), replace: [LMIA] }, OFFICER);
  const lm2 = (await questions(c2.id)).find((q) => q.fact === LMIA && q.subjectId === s2.filing);
  ok("C1.3 BR-4: ticked, the employer case's LMIA number replaces the officer's; the officer's stays in history", (r2.status === 201 || r2.status === 200) && lm2?.answer?.value === "SAMPLE-0000000"
    && sql(`select count(*) from client_canonical_answer where subject_id='${s2.filing}' and canonical_field_key='${LMIA}' and superseded_by_id is not null and value_json #>> '{}' = 'A123'`) === "1", { r: r2.body?.copied, now: lm2?.answer?.value });

  // BR-6: two officers at once → one link
  const c3 = await open(wp, "race");
  const l3 = (await call("GET", `/runtime/cases/${c3.id}/employer-cases`, undefined, OFFICER)).body.employer_cases[0].facts;
  const both = await Promise.all([OFFICER, REP].map((a) => call("POST", `/runtime/cases/${c3.id}/employer-link`, { employerCase: EMPLOYER, seen: seenOf(l3) }, a)));
  ok("C1.3 BR-6 fail: two links at the same moment give one link and one set of copies", both.filter((r) => r.status === 201 || r.status === 200).length === 1 && both.filter((r) => r.status === 409).length === 1 && linkedCopies(c3.id) === 3
    && sql(`select count(*) from audit_event where entity='case' and entity_key='${c3.id}' and action='relied on employer case'`) === "1", both.map((r) => r.status));

  // BR-5 and M4 on copied values: Confirm section confirms them, and IMM 5710 is then filled from them.
  const s3 = subjects(c3);
  const formOf = async () => ((await call("GET", `/runtime/cases/${c3.id}/forms`, undefined, OFFICER)).body?.forms ?? []).find((f: { form: string; subject_id: string }) => /5710/.test(f.form) && f.subject_id === s3.principal);
  const before = await formOf();
  const q3 = await questions(c3.id);
  const confirmAll = async (subject: string, section: string) => call("POST", `/runtime/cases/${c3.id}/sections/${section}/confirm`, { subjectId: subject, seen: (await questions(c3.id)).filter((q) => q.subjectId === subject && q.section === section && q.answer).map((q) => q.answer!.id) }, OFFICER);
  const nameQ = q3.find((q) => q.fact === NAME && q.subjectId === s3.principal)!, lmiaQ = q3.find((q) => q.fact === LMIA && q.subjectId === s3.filing)!;
  const k1 = await confirmAll(s3.principal, nameQ.section), k2 = await confirmAll(s3.filing, lmiaQ.section);
  const after3 = await questions(c3.id);
  const verified = [NAME, ADDRESS, LMIA].map((f) => after3.find((q) => q.fact === f && q.subjectId === (f === LMIA ? s3.filing : s3.principal))?.answer);
  ok("C1.3 BR-5: Confirm section confirms the copied employer facts (Verified, still sourced from the employer case)", [k1, k2].every((k) => k.status === 201 || k.status === 200) && verified.every((a) => a?.status === "VERIFIED" && a.answered?.channel === "linked_file"), verified.map((a) => [a?.status, a?.answered?.channel]));
  const after = await formOf();
  const missing = new Set((after?.readiness?.missing ?? []).map((m: { fact: string }) => m.fact));
  ok("C1.3 (M4): once confirmed, IMM 5710 is filled from the copies (3 more boxes written, none of them still missing)", after && before && after.draft.written_now >= before.draft.written_now + 3 && ![NAME, ADDRESS, LMIA].some((f) => missing.has(f)), { before: before?.draft, after: after?.draft });

  // BR-6 (Devin review on #1051): an answer save takes no case lock, so the link locks the current answers it compared.
  // A session holding the lock on a kept (unticked Different) answer for 2 s makes the link wait for it; without the
  // lock the link would commit at once on what may by then be a stale view.
  const c5 = await open(wp, "held"), s5 = subjects(c5);
  const kept = (await answer(c5.id, s5.filing, LMIA, "A123")).body?.answer?.id as string;
  const l5 = (await call("GET", `/runtime/cases/${c5.id}/employer-cases`, undefined, OFFICER)).body.employer_cases[0].facts;
  const holder = spawn("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atq", "-c", "BEGIN", "-c", `SELECT id FROM client_canonical_answer WHERE id = '${kept}' FOR UPDATE`, "-c", "SELECT 'held'", "-c", "SELECT pg_sleep(2)", "-c", "COMMIT"], { stdio: ["ignore", "pipe", "inherit"] });
  const closed = new Promise((done) => holder.on("close", done));
  await new Promise<void>((done, failed) => { const t = setTimeout(() => failed(new Error("setup: the holding session never took the lock (10 s)")), 10_000); holder.stdout.on("data", (d: Buffer) => { if (/held/.test(String(d))) { clearTimeout(t); done(); } }); });
  const t0 = Date.now(), held = await call("POST", `/runtime/cases/${c5.id}/employer-link`, { employerCase: EMPLOYER, seen: seenOf(l5) }, OFFICER), waited = Date.now() - t0;
  await closed;
  ok("C1.3 BR-6 fail (Devin review): the link waits for a save holding a kept answer it compared, then links", (held.status === 201 || held.status === 200) && waited >= 1200, { status: held.status, waited });

  // BR-6 with nothing to write ("Link without copying"): only the case row lock keeps it to one link (review M2).
  const c4 = await open(wp, "same"), s4 = subjects(c4);
  await answer(c4.id, s4.principal, NAME, "Sample Employer Ltd (Sample)");
  await answer(c4.id, s4.principal, ADDRESS, SAMPLE_ADDRESS);
  await answer(c4.id, s4.filing, LMIA, "SAMPLE-0000000");
  const l4 = (await call("GET", `/runtime/cases/${c4.id}/employer-cases`, undefined, OFFICER)).body.employer_cases[0].facts;
  ok("setup: every fact on this case is already the same as the employer case's", l4.every((f: { state: string }) => f.state === "same"), l4.map((f: { state: string }) => f.state));
  const four = await Promise.all([OFFICER, REP, OFFICER, REP].map((a) => call("POST", `/runtime/cases/${c4.id}/employer-link`, { employerCase: EMPLOYER, seen: seenOf(l4) }, a)));
  ok("C1.3 BR-6 fail: four links at once with nothing to copy still give one link (the row lock), and nothing is written", four.filter((r) => r.status === 201 || r.status === 200).length === 1 && four.filter((r) => r.status === 409).length === 3
    && sql(`select count(*) from audit_event where entity='case' and entity_key='${c4.id}' and action='relied on employer case'`) === "1" && linkedCopies(c4.id) === 0, four.map((r) => r.status));
  const solo = await call("POST", "/runtime/cases", { combinationId: wp, reference: `C13-solo-${run}`, clientActor: CLIENT, principal: { displayName: "Client C" } }, SOLO);
  const soloList = (await call("GET", `/runtime/cases/${solo.body?.id}/employer-cases`, undefined, SOLO)).body;
  ok("C1.3 BR-7: the solo firm reads only its own Sample employer case", JSON.stringify(soloList?.employer_cases?.map((e: { key: string }) => e.key)) === JSON.stringify([SOLO_EMPLOYER]), soloList?.employer_cases?.map((e: { key: string }) => e.key));
  const crossKey = await call("POST", `/runtime/cases/${solo.body?.id}/employer-link`, { employerCase: EMPLOYER, seen: {} }, SOLO);
  ok("C1.3 BR-7 fail: the Sample firm's employer case is not found from the solo firm", crossKey.status === 404 && !/Sample Employer Ltd/.test(JSON.stringify(crossKey.body)), crossKey.body);
}

pure();
await api();
process.exit(summary() ? 1 : 0);
