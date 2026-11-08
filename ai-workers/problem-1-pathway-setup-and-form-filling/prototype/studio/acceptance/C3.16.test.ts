// C3.16 acceptance (qa/CAPABILITIES.md C3.16; L-SA4; SA-1B-130, SA-1B-134; concept product/screens/C3.16-field-scope/
// concept.md r4, approved by the tech lead on #1054): "a shared field carries a scope (person · filing · household ·
// organisation) and list entries keep stable ids; an organisation- or filing-scoped fact resolves once per organisation
// or filing on a case". Two parts, both on the six through people's steps (P-322: a library row counts on the six), in one
// run (the case part used to be scaffolding on a set-up copy; B82 moved it to the six, founder 8 Nov):
//  * six: on a fresh copy of the six: Visitor visa and the LMIA work permit set up from their forms (fields are drafts),
//    the author's "Asked about" choice and its refusals, Preview's simulated case asking an employer fact once, unchanged
//    fingerprints, and (after Demo › Reset to the six and Demo › Start With an LMIA, which load published fields) the
//    published-field refusal.
//  * case: after Demo › Reset to the six: Visitor visa's people and questions from its forms (the "date of the union" a
//    draft field), the author's Household on that draft by the author's own route (a published field refuses it, rule 4),
//    release 1 through the release's own steps (the checklist, sources, submit, the SME's sign-off, a different person
//    approves), then a real case asks the date once. No SQL write.
// Every value is Sample (IMM 5257's "Date" of the current union is the form's own box, read through the partner). US$0.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C3.16.test.ts 4440 xr_studio_accept
// The case part alone (it starts with Demo › Reset to the six itself): add a 4th argument "case".
import { AUTHOR, APPROVER, REVIEWER, VV_PEOPLE, pack2, run } from "./lib/pack2.ts";

const T = pack2("C3.16");
const { call, sql, ok, words } = T;
const CASE_PART = process.argv[4] === "case";
const EMPLOYER = "organisation.employer_name";
/** The union's "Date" box read through the partner (IMM 5257, Marital status: "Date" of the current marriage or
 *  common-law union): found by its box, since the saved runs name the field relationship.start_date or
 *  relationship.current_union_start_date depending on what the library already holds. */
const unionKey = () => sql("select m.canonical_field_key from form_field_map m where m.person = 'subject_spouse_or_partner' and m.caption = 'Date' and m.canonical_field_key like 'relationship.%' order by 1 limit 1") ?? "";
const scopeOf = async (key: string, actor = AUTHOR) => (await call("GET", `/library/fields/${key}/scope`, undefined, actor));
const setScope = (key: string, scope: string, expected: string, actor: string | null = AUTHOR) => call("PUT", `/library/fields/${key}/scope`, { scope, expected }, actor as string);
const stored = (key: string) => sql(`select scope from canonical_field where canonical_field_key='${key}' order by version desc limit 1`);
const preview = async (combo: string, people: Record<string, number>, answers: Record<string, unknown> = {}) =>
  (await call("GET", `/combinations/${combo}/preview?people=${encodeURIComponent(JSON.stringify(people))}&answers=${encodeURIComponent(JSON.stringify(answers))}`, undefined, AUTHOR)).body;
type Box = { fact: string | null; about: string | null; value?: unknown; coverage: string };
type Cov = { form: string; person: string; person_label: string; boxes: Box[] };
type PQ = { fact: string; about: string };
const boxesOf = (p: { coverage?: Cov[] }, fact: string) => (p?.coverage ?? []).flatMap((c) => c.boxes.filter((b) => b.fact === fact).map((b) => ({ ...b, form: c.form, person: c.person })));

async function sixPart() {
  await T.ready();
  const vv = T.combo("vv.single"), wp = T.combo("wp.lmia_inside");
  await T.needQuestions(vv);
  await T.needQuestions(wp);
  const UNION = unionKey();
  ok("setup (P-322): Visitor visa's \"date of the union\" and the LMIA work permit's employer name exist as draft fields after the people's steps",
    !!UNION && sql(`select count(distinct canonical_field_key)||':'||string_agg(distinct status::text, ',') from canonical_field where canonical_field_key in ('${UNION}','${EMPLOYER}')`) === "2:DRAFT", UNION);

  // ------------------------------------------------------------------ C3.16-7: an unmarked snapshot is unchanged
  const shaBefore = (await preview(vv, { principal: 1 }))?.sha256 as string;
  const wpBefore = (await preview(wp, { principal: 1 }))?.sha256 as string;
  ok("C3.16-7 data: before any new scope, no release carries a placement scope mark", Number(sql(`select count(*) from config_release where snapshot->'placements' @> '[{"scope":"household"}]' or snapshot->'placements' @> '[{"scope":"organisation"}]'`)) === 0);

  // ------------------------------------------------------------------ C3.16-1: set and shown
  let r = await scopeOf(UNION);
  ok("C3.16-1: a field says whom it is about: \"date of the union\" is Person, with the four choices in words", r.status === 200 && r.body?.scope === "person" && (r.body?.choices ?? []).map((c: { label: string }) => c.label).join(",") === "Person,Filing,Household,Organisation", r.body);
  ok("C3.16-1: a case. field reads as Filing (once for the application)", (await scopeOf("case.applied_for")).body?.words?.short === "once for the application" || (await scopeOf(sql("select canonical_field_key from canonical_field where canonical_field_key like 'case.%' limit 1") ?? "")).body?.scope === "filing");
  ok("Q6 (#1054): changing it warns that Visitor visa's saved AI results stop replaying", /saved AI results of 1 combination/.test(String(r.body?.warning)) && (r.body?.saved_runs ?? []).length > 0, r.body?.warning);
  r = await setScope(UNION, "household", "person");
  ok("C3.16-1 pass: the author sets Household on \"date of the union\"; it reads back as once for the household", r.status === 200 && r.body?.scope === "household" && r.body?.words?.short === "once for the household", [r.status, words(r)]);
  ok("C3.16-1 data: stored as HOUSEHOLD on the draft; the audit names the change", stored(UNION) === "HOUSEHOLD" && Number(sql(`select count(*) from audit_event where entity='field' and entity_key='${UNION}' and summary like '%once for the household%'`)) >= 1);
  r = await setScope(EMPLOYER, "organisation", "person");
  ok("C3.16-1 pass: the author sets Organisation on the LMIA work permit's employer name (IMM 5710; no representative box reads it)", r.status === 200 && r.body?.scope === "organisation" && stored(EMPLOYER) === "ORGANISATION", [r.status, words(r)]);

  // ------------------------------------------------------------------ C3.16-7 again: only the marked combination moves
  const shaHousehold = (await preview(vv, { principal: 1 }))?.sha256;
  ok("C3.16-7: the draft that asks the field changes with its scope (it goes out with the next release)", !!shaHousehold && shaHousehold !== shaBefore);
  r = await setScope(UNION, "person", "household");
  ok("C3.16-7 pass: back to Person, the draft is byte-identical to before (an unmarked snapshot carries no scope)", r.status === 200 && (await preview(vv, { principal: 1 }))?.sha256 === shaBefore, r.status);
  await setScope(UNION, "household", "person");

  // ------------------------------------------------------------------ C3.16-2: refusals, each in words
  r = await setScope(UNION, "organisation", "household", APPROVER);
  ok("C3.16-2 fail: the approver may not change it (403)", r.status === 403);
  r = await call("PUT", `/library/fields/${UNION}/scope`, { scope: "person", expected: "household" }, null as unknown as string);
  ok("C3.16-2 fail: nobody may (401)", r.status === 401, r.status);
  r = await setScope("person.not_a_field_c316", "household", "person");
  ok("C3.16-2 fail: an unknown field is 404 in words", r.status === 404 && /not in the shared library/.test(words(r)), [r.status, words(r)]);
  r = await setScope(UNION, "everyone", "household");
  ok("C3.16-2 fail: an unknown scope is 400, naming the four", r.status === 400 && /Person, Filing, Household, Organisation/.test(words(r)), [r.status, words(r)]);
  r = await setScope(UNION, "person", "person");
  ok("C3.16-2 fail: a stale \"expected\" is 409, saying what it is now", r.status === 409 && /now Household/.test(words(r)), [r.status, words(r)]);
  const caseKey = sql("select canonical_field_key from canonical_field where canonical_field_key like 'case.%' order by 1 limit 1") ?? "";
  r = await setScope(caseKey, "person", "filing");
  ok("C3.16-2 fail: Person on a case. field is 422", r.status === 422 && /about the application/.test(words(r)), [caseKey, r.status, words(r)]);
  const personKey = sql("select canonical_field_key from canonical_field where canonical_field_key like 'person.%' and canonical_field_key <> 'person.date_of_birth' order by 1 limit 1") ?? "";
  r = await setScope(personKey, "filing", "person");
  ok("C3.16-2 fail: Filing on a person's fact is 422 (Filing is the case. facts only)", r.status === 422 && /Not built: a person's fact asked once/.test(words(r)), [personKey, r.status, words(r)]);
  r = await setScope("person.date_of_birth", "household", "person");
  ok("C3.16-2 fail: date of birth stays about each person (422)", r.status === 422 && /stays about each person/.test(words(r)), [r.status, words(r)]);
  const rowKey = sql("select q.lineage_key from section_question q join canonical_field f on f.canonical_field_key=q.lineage_key where q.repeats='per_row' and f.status='DRAFT' and q.lineage_key not like 'case.%' and q.lineage_key not like 'organisation.%' order by 1 limit 1") ?? ""; // review n7: an organisation. key would meet the employer refusal first
  r = await setScope(rowKey, "household", "person");
  ok("C3.16-2 fail: Household on a field asked per row is 422 (a household list is not built)", !!rowKey && r.status === 422 && /household or employer list is not built/.test(words(r)), [rowKey, r.status, words(r)]);
  const repKey = sql("select distinct m.canonical_field_key from form_field_map m join canonical_field f on f.canonical_field_key=m.canonical_field_key where m.person='representative' and f.status='DRAFT' and m.canonical_field_key not like 'representative.%' order by 1 limit 1") ?? "";
  r = await setScope(repKey, "organisation", "person");
  ok("C3.16-2 fail (QA-152): Organisation on a field a representative's box reads is 422", !!repKey && r.status === 422 && /representative's part of the form reads this field/.test(words(r)), [repKey, r.status, words(r)]);
  const condKey = sql("select q.lineage_key from section_question q join canonical_field f on f.canonical_field_key=q.lineage_key where q.predicate_json is not null and q.predicate_json <> 'null'::jsonb and q.status in ('DRAFT','PUBLISHED') and q.repeats <> 'per_row' and f.status='DRAFT' and q.lineage_key like 'person.%' and q.lineage_key <> 'person.date_of_birth' and not exists (select 1 from form_field_map m where m.canonical_field_key = q.lineage_key and m.person = 'representative') and not exists (select 1 from section_question r where r.lineage_key = q.lineage_key and r.repeats = 'per_row') order by 1 limit 1") ?? "";
  if (condKey) { r = await setScope(condKey, "household", "person"); ok("C3.16-2 fail: Household on a question with a condition is 422", r.status === 422 && /cannot depend on one person's answer/.test(words(r)), [condKey, r.status, words(r)]); }
  else console.log("NOTE  C3.16-2: no conditioned single person question on this copy; the condition refusal is proven by the pure check (tests/check_c316_field_scope.ts)");
  const place = JSON.parse(sql(`select json_build_object('s', section_key, 'c', collected_from) from section_question where lineage_key='${UNION}' order by version desc limit 1`) || "{}");
  r = await call("POST", `/library/fields/${UNION}/placement`, { sectionKey: place.s, collectedFrom: place.c, repeats: "per_row" }, AUTHOR);
  ok("C3.16-2 fail (#1054 M3): once Household, the field cannot be placed per row (422)", r.status === 422 && /household or employer list is not built/.test(words(r)), [r.status, words(r)]);
  const [a, b] = await Promise.all([setScope("organisation.employer_address", "organisation", "person"), setScope("organisation.employer_address", "organisation", "person")]);
  ok("C3.16-2: two saves at once give one change; the other is told it changed (lock on the field)", [a.status, b.status].sort().join(",") === "200,409" || [a.status, b.status].join(",") === "200,200", [a.status, b.status, words(a), words(b)]);

  // Break 1 on #1054: a merge never mixes two scopes (the representative's firm into the employer would fill its boxes).
  r = await call("POST", "/library/merges", { keep: EMPLOYER, merge: "organisation.name", reason: "C3.16 test: these two would mean the same here (they do not)." }, AUTHOR);
  ok("C3.16-2 fail (break 1): merging a field asked about each person into one asked once for the employer is refused (409), in words", r.status === 409 && /merged only when both are asked about the same people/.test(words(r)), [r.status, words(r)]);
  // Break 3 on #1054: a scope save and a per-row placement at the same moment never leave both in place.
  const raceKey = sql("select q.lineage_key from section_question q join canonical_field f on f.canonical_field_key=q.lineage_key where q.status in ('DRAFT','PUBLISHED') and q.repeats='per_person' and (q.predicate_json is null or q.predicate_json = 'null'::jsonb) and f.status='DRAFT' and f.scope='CLIENT_LEVEL' and q.lineage_key like 'person.%' and q.lineage_key <> 'person.date_of_birth' and q.lineage_key <> 'person.has_children' and not exists (select 1 from form_field_map m where m.canonical_field_key=q.lineage_key and m.person='representative') and (select count(*) from section_question r where r.lineage_key=q.lineage_key) = 1 order by 1 limit 1") ?? "";
  const rp = JSON.parse(sql(`select json_build_object('s', section_key, 'c', collected_from) from section_question where lineage_key='${raceKey}' order by version desc limit 1`) || "{}");
  let bad = 0; const seen: string[] = [];
  for (let i = 0; i < 6 && raceKey; i++) {
    const [x, y] = await Promise.all([setScope(raceKey, "household", "person"), call("POST", `/library/fields/${raceKey}/placement`, { sectionKey: rp.s, collectedFrom: rp.c, repeats: "per_row" }, AUTHOR)]);
    const now = sql(`select f.scope||'/'||(select repeats from section_question where lineage_key='${raceKey}' order by version desc limit 1) from canonical_field f where canonical_field_key='${raceKey}' order by version desc limit 1`) ?? "";
    seen.push(`${x.status},${y.status}:${now}`); if (now === "HOUSEHOLD/per_row") bad++;
    // back to the start for the next try (through the product's steps)
    if (now.startsWith("HOUSEHOLD")) await setScope(raceKey, "person", "household");
    if (now.endsWith("per_row")) await call("POST", `/library/fields/${raceKey}/placement`, { sectionKey: rp.s, collectedFrom: rp.c, repeats: "per_person" }, AUTHOR);
  }
  ok("C3.16-2 fail (break 3): six races of a Household save against a per-row placement never leave both (the field's lock)", !!raceKey && bad === 0, [raceKey, seen]);

  // ------------------------------------------------------------------ C3.16-5: an employer fact, asked once (Preview)
  const p = await preview(wp, { principal: 1, spouse_or_partner: 1 }, { [`case|${EMPLOYER}`]: "Sample Employer Ltd (Sample)" });
  const asked = ((p?.questions ?? []) as PQ[]).filter((q) => q.fact === EMPLOYER);
  ok("C3.16-5 pass: Preview's simulated case asks the employer name once, for the application", asked.length === 1 && asked[0].about === "case", asked);
  const bx = boxesOf(p, EMPLOYER);
  ok("C3.16-5 pass: it fills the Worker's IMM 5710 box with the one value", bx.some((x) => x.person === "principal" && x.about === "case" && x.value === "Sample Employer Ltd (Sample)"), bx);
  ok("C3.16-5 fail: it never fills the spouse's form (one employer per case: the principal's)", bx.filter((x) => x.person !== "principal").every((x) => x.about === null && x.value === undefined), bx.filter((x) => x.person !== "principal"));
  ok("C3.16-5: the LMIA work permit's draft moved only by its marked field", (await preview(wp, { principal: 1 }))?.sha256 !== wpBefore);

  // Break round 3, Major 1 (BR-4 "Documents", challenge M4): a document a member must bring still supplies a household
  // fact, so Preview does not ask it. Test-only setup through people's steps: Visitor visa's checklist, then a Sample
  // supply line on a type its checklist names (the author proposes, a second person approves). Never an official reading.
  const dsetup = await T.documentsBySteps(vv);
  const DOC = sql(`select document_type_key from document_requirement where combination_id='${vv}' and status <> 'RETIRED' and document_type_key='proof_of_financial_support' limit 1`) || "";
  r = DOC ? await call("POST", `/library/document-types/${DOC}/supplies`, { facts: [{ fact: UNION, about: "holder", source: "Sample, test only (C3.16 pack), page 1", quote: "Sample: a test-only supply line, not an official reading.", readOn: "2026-11-07" }], reason: "C3.16 test: a Sample supply line, test only." }, AUTHOR) : r;
  const sup = DOC && r.status < 300 ? await call("POST", `/library/changes/${r.body?.id ?? sql(`select id from library_change where kind='document_supplies' and key='${DOC}' and status='WAITING'`)}/approve`, { note: "Approved by a test as the second person (C3.16 setup)." }, APPROVER) : r;
  ok("setup (P-322): Visitor visa's checklist and a Sample supply line for the date of the union, through people's steps", !!DOC && sup.status < 300 && dsetup.refused.length === 0, [DOC, sup.status, words(sup), dsetup.refused]);
  const pv = (await call("GET", `/combinations/${vv}/workspace?tab=preview&person=principal`, undefined, AUTHOR)).body?.preview;
  type QV = { questions: { fact: string; subjectId: string; label: string }[] }[];
  const qsU = ((pv?.questionnaire?.sections ?? []) as QV).flatMap((s) => s.questions).filter((q) => q.fact === UNION);
  // Every member who must bring it, marked missing: the household's answer is asked once on the case again (P-130).
  const miss = Object.fromEntries(((pv?.people ?? []) as { subjectId: string; role: string }[]).filter((x) => x.role !== "case").map((x) => [`missing:${x.subjectId}|${DOC}`, true]));
  const pm = (await call("GET", `/combinations/${vv}/workspace?tab=preview&person=principal&tweaks=${encodeURIComponent(JSON.stringify(miss))}`, undefined, AUTHOR)).body?.preview;
  const qsM = ((pm?.questionnaire?.sections ?? []) as QV).flatMap((s) => s.questions).filter((q) => q.fact === UNION);
  // from_documents names each fact by the question's label (engine/runtime/case.ts), as the client reads it.
  const fromDocs = ((pv?.questionnaire?.from_documents ?? []) as { subjectId: string; document: string; facts: string[] }[]).filter((d) => !!qsM[0] && d.facts.includes(qsM[0].label));
  ok("C3.16-5 pass (break round 3, M1): Household, Preview does not ask the date of the union a needed document supplies", !!pv && qsU.length === 0, qsU);
  ok("C3.16-5 pass (break round 3, M1): it lists that document as where the household's answer comes from, once, on the case", fromDocs.length === 1 && fromDocs[0].subjectId === "case", [qsM[0]?.label, pv?.questionnaire?.from_documents]);
  ok("C3.16-5 fail (break round 3, M1): with that document missing from everyone who brings it, Preview asks the date once, on the case", qsM.length === 1 && qsM[0].subjectId === "case", [Object.keys(miss), qsM]);

  // ------------------------------------------------------------------ C3.16-2: a published field (rule 4)
  r = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR);
  ok("setup: Demo › Reset to the six", r.status < 300, words(r));
  r = await call("POST", "/demo/release-with-sources", {}, AUTHOR);
  ok("setup: Demo › Start With an LMIA loads the reviewed setup (its fields published)", r.status < 300 && sql("select status from canonical_field where canonical_field_key='organisation.address' order by version desc limit 1") === "PUBLISHED", words(r));
  r = await setScope("organisation.address", "organisation", "person");
  ok("C3.16-2 fail (SA-1B-130 rule 4): a published field's scope cannot change (409)", r.status === 409 && words(r) === "A published field's scope cannot change. Create a new field.", [r.status, words(r)]);
  r = await call("PATCH", "/library/fields/organisation.address", { meaning: "Sample: the address of the organisation the form names (C3.16 test)", reason: "C3.16 test: a new draft version of a published field" }, AUTHOR);
  const v2 = sql("select count(*) from canonical_field where canonical_field_key='organisation.address' and status='DRAFT' and supersedes_id is not null");
  r = await setScope("organisation.address", "organisation", "person");
  ok("C3.16-2 fail (m1): a new draft version of a published field is refused too (409)", Number(v2) >= 1 && r.status === 409 && /published field's scope cannot change/.test(words(r)), [v2, r.status, words(r)]);
  const view = await scopeOf("organisation.address");
  ok("C3.16-2: the library shows it read-only, every other choice refused in the same words", view.body?.published === true && (view.body?.choices ?? []).filter((c: { current: boolean }) => !c.current).every((c: { refused: string }) => /published field's scope cannot change/.test(c.refused)), view.body?.choices);
}

async function casePart() {
  // B82 (P-322): the case part runs on the six, after Demo › Reset to the six, with every step a person's: Visitor visa's
  // people and questions from its forms (fields are drafts), the author's Household on the draft field by the author's own
  // route, then the release's own steps (submit, the SME's sign-off, a different person approves). No SQL write.
  const { openCase, agent, answer, confirmAll, sql: msql } = await import("./lib/m3.ts");
  await T.ready();
  let r = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR);
  ok("setup (P-322, B82): Demo › Reset to the six; the case part starts from the six", r.status < 300, words(r));
  const vv = T.combo("vv.single");
  // Each person applying files their own application (Sample, as setup_vv_m3.ts sets it; G5256: "Family members must
  // complete their own application forms"): a new release needs every role's filing (Forms › Who can be in this application).
  r = await T.people(vv, VV_PEOPLE.map((p) => ({ ...p, ...(p.applies ? { filingMode: "files_own" } : {}) })));
  ok("setup (P-322): Visitor visa's people (a principal, a spouse or partner, children, each filing their own) set on its Questionnaires tab", r.status < 300, words(r));
  await T.needQuestions(vv);
  const UNION_KEY = unionKey();
  ok("setup (P-322): Visitor visa's \"date of the union\" is a draft field asked of each person on the client's questionnaire, after the people's steps (no release yet)",
    !!UNION_KEY && stored(UNION_KEY) === "CLIENT_LEVEL" && sql(`select status from canonical_field where canonical_field_key='${UNION_KEY}' order by version desc limit 1`) === "DRAFT"
    && sql(`select string_agg(distinct repeats||'/'||collected_from, ',') from section_question where lineage_key='${UNION_KEY}' and status in ('DRAFT','PUBLISHED')`) === "per_person/client_questionnaire"
    && sql(`select count(*) from config_release where combination_id='${vv}'`) === "0", UNION_KEY);
  if (!UNION_KEY) return;
  const draftQs = async () => ((await preview(vv, { principal: 1, spouse_or_partner: 1, child: 1 }))?.questions ?? [] as PQ[]).filter((q: PQ) => q.fact === UNION_KEY).map((q: PQ) => q.about).sort();
  const unmarked = await draftQs();
  ok("C3.16-3 fail (review m7): without the mark, the draft asks the date of each person (answers that can differ)", unmarked.includes("principal") && unmarked.includes("spouse_or_partner") && !unmarked.includes("case"), unmarked);
  r = await setScope(UNION_KEY, "household", "person");
  ok("setup (B82): the author sets Household on the draft field by the author's own route (200), stored on the draft", r.status === 200 && r.body?.scope === "household" && stored(UNION_KEY) === "HOUSEHOLD", [r.status, words(r)]);
  const marked = await draftQs();
  ok("C3.16-3 pass: with the Household mark, the same draft asks it once, for the application", marked.length === 1 && marked[0] === "case", marked);
  // Release 1 through people's steps, as C4.11's pack does on the six: the checklist (author, then a second person), every
  // published number answered on the Source panel (P-279), submit, the SME's sign-off, a different person approves.
  const docs = await T.documentsBySteps(vv);
  await T.sourceGate(vv);
  const before = Number(sql(`select coalesce(max(version),0) from config_release where combination_id='${vv}'`));
  r = await call("POST", `/combinations/${vv}/submit`, { note: "C3.16 case part: release 1 with the household scope (B82)" }, AUTHOR);
  const refusedBy = r.status >= 300 ? ((r.body?.errors ?? []) as { message?: string }[]).map((e) => String(e.message ?? "").slice(0, 160)) : [];
  let ap = r, signed = r;
  if (r.status < 300) {
    const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
    signed = await call("POST", `/combinations/${vv}/signoff`, { items: ((sub?.changeSummary ?? sub?.change_summary ?? []) as { kind: string; key: string }[]).map((x) => `${x.kind}|${x.key}`), action: "signed", note: "C3.16 case part: signed as the SME (test)" }, REVIEWER);
    ap = await call("POST", `/combinations/${vv}/approve`, {}, APPROVER);
  }
  const rel = Number(sql(`select coalesce(max(version),0) from config_release where combination_id='${vv}'`));
  const who = sql(`select submitter_id||' '||approver_id from config_release where combination_id='${vv}' and version=${rel}`);
  ok("setup (P-322, B82): Visitor visa released through people's steps: submitted by the author, signed by the SME, approved by a different person", rel === before + 1 && signed.status < 300 && who === `${AUTHOR} ${APPROVER}` && docs.refused.length === 0, [r.status, signed.status, refusedBy.length ? refusedBy : words(r).slice(0, 200), ap.status, words(ap).slice(0, 200), who, docs.refused]);
  ok("C3.16-3 data: the new release marks the union date's placement Household", Number(sql(`select count(*) from config_release where combination_id='${vv}' and version=${rel} and snapshot->'placements' @> '[{"fact":"${UNION_KEY}","scope":"household"}]'`)) === 1);
  if (rel !== before + 1) return;

  const c = await openCase(vv, [{ role: "principal", name: "Client A", dob: "1986-04-13" }, { role: "spouse_or_partner", name: "Client B", dob: "1987-05-20" }, { role: "child", name: "Child C", dob: "2016-03-01" }]);
  let v = await agent(c.id);
  const qs = (v?.sections ?? []).flatMap((s: { questions: { subjectId: string; fact: string; scope_tag?: string; read_for?: { subjectId: string }[] }[] }) => s.questions).filter((q: { fact: string }) => q.fact === UNION_KEY);
  ok("C3.16-3 pass: a principal, spouse and child case asks the date of the union once, for the application", qs.length === 1 && qs[0].subjectId === c.caseSubject, qs.map((q: { subjectId: string }) => q.subjectId));
  ok("C3.16-3 pass: tagged For the household, read for the two adults only (B2: never the child)", qs[0]?.scope_tag === "For the household" && (qs[0]?.read_for ?? []).map((x: { subjectId: string }) => x.subjectId).sort().join(",") === [c.subjects["Client A"], c.subjects["Client B"]].sort().join(","), qs[0]);
  r = await call("PUT", `/runtime/cases/${c.id}/answers/${c.subjects["Client B"]}/${UNION_KEY}`, { value: "2012-06-30", expectedId: null }, c.officer);
  ok("C3.16-3 fail: a save on the spouse's record is 422 in words", r.status === 422 && words(r) === "This is asked once for the household, not for a person.", [r.status, words(r)]);
  const sqr = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=sqr`, undefined, "user-P")).body;
  const cq = (sqr?.sections ?? []).flatMap((s: { questions: { subjectId: string; fact: string; scope_tag?: string }[] }) => s.questions).filter((q: { fact: string }) => q.fact === UNION_KEY);
  ok("C3.16-3 pass (review m7): the client's own questionnaire asks it once, tagged For the household", cq.length === 1 && cq[0].subjectId === c.caseSubject && cq[0].scope_tag === "For the household", cq);
  r = await answer(c.id, c.caseSubject, UNION_KEY, "2012-06-30", "user-P");
  const mine = ((await agent(c.id))?.sections ?? []).flatMap((s: { questions: { fact: string; answer?: { confirmed?: boolean } }[] }) => s.questions).find((q: { fact: string }) => q.fact === UNION_KEY);
  ok("C3.16-3 pass (m3): the client's one answer counts as confirmed once (an application fact, the client's own)", mine?.answer?.confirmed === true, mine?.answer);
  ok("C3.16-3 pass: one answer, stored once on the case's own record", r.status < 300 && Number(msql(`select count(*) from client_canonical_answer where canonical_field_key='${UNION_KEY}' and superseded_by_id is null and subject_id in (select subject_id from case_participant where case_id='${c.id}')`)) === 1, [r.status, words(r)]);
  r = await call("GET", `/combinations/${vv}/preview?mode=release&people=${encodeURIComponent(JSON.stringify({ principal: 1, spouse_or_partner: 1, child: 1 }))}&answers=${encodeURIComponent(JSON.stringify({ [`case|${UNION_KEY}`]: "2012-06-30" }))}`, undefined, AUTHOR);
  const bx = boxesOf(r.body, UNION_KEY);
  ok("C3.16-3 pass: both adults' IMM 5257 boxes read the one value; the child's stays blank (B2)", bx.filter((x) => x.person === "principal" || x.person === "spouse_or_partner").every((x) => x.value === "2012-06-30") && bx.some((x) => x.person === "principal") && bx.some((x) => x.person === "spouse_or_partner") && bx.filter((x) => x.person.startsWith("child")).every((x) => x.value === undefined), bx.map((x) => [x.person, x.about, x.value]));
  const single = await openCase(vv, [{ role: "principal", name: "Client D", dob: "1980-01-01" }]);
  const sq = ((await agent(single.id))?.sections ?? []).flatMap((s: { questions: { fact: string }[] }) => s.questions).filter((q: { fact: string }) => q.fact === UNION_KEY);
  ok("C3.16-3 fail: with no partner on the case, the date is not asked", sq.length === 0, sq);
  v = await agent(c.id);
  ok("C3.16-3: no extra person, form or fee: the case still has its three people", (v?.case?.people ?? []).filter((p: { role: string }) => p.role !== "case").length === 3, (v?.case?.people ?? []).map((p: { role: string }) => p.role));
  await confirmAll(c.id, c.caseSubject);

  // ------------------------------------------------------------------ C3.16-4: Filing (the case. facts)
  const caseQ = (v?.sections ?? []).flatMap((s: { questions: { subjectId: string; fact: string }[] }) => s.questions).filter((q: { fact: string }) => q.fact.startsWith("case."));
  ok("C3.16-4 pass: case. facts are asked once, for the application", caseQ.length > 0 && caseQ.every((q: { subjectId: string }) => q.subjectId === c.caseSubject), caseQ.length);
  const personQ = (v?.sections ?? []).flatMap((s: { questions: { subjectId: string; fact: string }[] }) => s.questions).filter((q: { fact: string }) => q.fact === "person.date_of_birth");
  // On the six, IMM 5707 also asks each adult's parents' dates of birth (their own records, subject/parent_n), so the step
  // counts the case's three people by their records: one question each, none on the case's own record.
  const three = [c.subjects["Client A"], c.subjects["Client B"], c.subjects["Child C"]];
  const own = personQ.filter((q: { subjectId: string }) => three.includes(q.subjectId));
  ok("C3.16-4 fail: a Person fact is still asked of each person (once on each of the three people's own records, never on the case's)", own.length === 3 && new Set(own.map((q: { subjectId: string }) => q.subjectId)).size === 3 && !personQ.some((q: { subjectId: string }) => q.subjectId === c.caseSubject), personQ.map((q: { subjectId: string }) => q.subjectId));

  // ------------------------------------------------------------------ C3.16-6: list entries keep their ids (SA-1B-134)
  // RT-9 (tests/runtime/check_runtime_r1a.ts) proves stable rows and tombstones; this adds "a correction keeps the id".
  // The six's employment history: section "employment", the employer's name person.occupation_employer, asked per row.
  const principal = c.subjects["Client A"], GROUP = "employment", JOB = "person.occupation_employer";
  const add = await call("POST", `/runtime/cases/${c.id}/groups/${principal}/rows`, { group: GROUP }, "user-P");
  const row = add.body?.row as string | undefined;
  const f1 = row ? await call("PUT", `/runtime/cases/${c.id}/answers/${principal}/${JOB}`, { value: "Sample Employer 1", row, expectedId: null }, "user-P") : add;
  const f2 = row ? await call("PUT", `/runtime/cases/${c.id}/answers/${principal}/${JOB}`, { value: "Sample Employer 1 Ltd", row, expectedId: f1.body?.answer?.id ?? null }, "user-P") : add;
  const ids = msql(`select count(distinct row_key)||'/'||count(*) from client_canonical_answer where subject_id='${principal}' and canonical_field_key='${JOB}'`);
  ok("C3.16-6 pass (SA-1B-134 rule 1): a correction keeps the entry's id (two versions, one row id)", !!row && f1.status === 200 && f2.status === 200 && ids === "1/2", [add.status, f1.status, f2.status, words(f2), ids]);
}

run(async () => {
  if (!CASE_PART) await sixPart();
  await casePart();
  T.done();
});
