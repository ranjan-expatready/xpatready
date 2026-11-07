// Pack 4 setup (P-220 Day 0): the Super Admin steps (M2) Visitor visa needs before an M3 case, as release 2 of
// `vv.single`, on an isolated copy where tests/runtime/setup_visitor_visa.ts made release 1. Acting as the simulated
// people through the routes the screens call. Built routes: the IRCC account, IMM 5476 from the library, line
// channels, signatures and who signs, document requirements, submit / sign off / approve. Not built yet (M3-0, M3-8;
// these lines FAIL today and the tests that need them fail with them): the filing mode per role and the eligibility
// gates as data. No model call (US$0). Every value is Sample unless compliance-trace.md cites its canada.ca source.
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept
//   tsx studio/acceptance/lib/setup_vv_m3.ts 4440 xr_studio_accept
import { AUTHOR, APPROVER, REVIEWER, call, main, needVisitorVisa, ok, sql } from "./m3.ts";

await main("Setup", "Visitor visa release 2 for the M3 path (Super Admin, M2)", async () => {
  const vv = needVisitorVisa();
  const from = sql(`select portal_key from combination where id='${vv}'`) || null;
  // VV-R12 (compliance-trace): a representative files a visitor visa in the APR portal. Founder question FQ-1 (which
  // account: APR portal or IRCC portal for representatives); Sample until answered.
  let r = await call("PATCH", `/combinations/${vv}/account`, { account: "APR_PORTAL", from }, AUTHOR);
  ok("S1 the IRCC account is the APR Portal (Sample, FQ-1)", r.status < 300 || from === "APR_PORTAL", r.body?.detail ?? r.status);

  // VV-R10: IMM 5476 when a representative is used; dependants 18+ need their own copy, the spouse a separate one;
  // signed by the applicant and the representative.
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5476", who: "each_applicant" }, AUTHOR);
  ok("S2 IMM 5476 joins the combination from the library", r.status < 300 || /already/.test(r.body?.detail ?? ""), r.body?.detail ?? r.status);
  // G8 (C1.8, C8.1): before who signs is set, the release check names IMM 5476's missing signer (a warning, not silence).
  const unsigned = ((await call("GET", `/combinations/${vv}`, undefined, AUTHOR)).body?.draft?.problems ?? []) as { level: string; item: string; message: string }[];
  ok("S2w (G8) a form line with no signer set is named by the release check before release", unsigned.some((x) => /IMM 5476/.test(`${x.item} ${x.message}`) && /sign/i.test(x.message)), unsigned.filter((x) => /IMM 5476/.test(x.item)).slice(0, 3));
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205476`, { minAge: 18, signedBy: "person_and_representative" }, AUTHOR);
  ok("S2 IMM 5476: each applicant 18 or older, signed by the person and the representative", r.status < 300, r.body?.detail ?? r.status);
  // VV-R07 and VV-R09: IMM 5707 by each person 18 or older; IMM 5257 by each person, a parent signs under 18.
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205707`, { minAge: 18, signedBy: "person" }, AUTHOR);
  ok("S3 IMM 5707: each person 18 or older signs their own", r.status < 300, r.body?.detail ?? r.status);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205257`, { signedBy: "parent_for_minor" }, AUTHOR);
  ok("S3 IMM 5257: each applicant; a parent signs for a minor", r.status < 300, r.body?.detail ?? r.status);
  // What IRCC accepts for IMM 5257 on the APR Portal (Sample, FQ-2, FQ-3: PDF upload, and Paper as an accommodation
  // only; VV-R02 "You must apply online"). The built route (C11.6 M2 part); a second person approves it in S8.
  r = await call("POST", "/library/forms/IMM%205257/accepts", { account: "APR_PORTAL", channels: ["PDF_UPLOAD", "PAPER"], reason: "Sample for the M3 path: uploaded in the APR Portal; paper only as an accommodation (FQ-2, FQ-3)" }, AUTHOR);
  ok("S4a what IRCC accepts for IMM 5257 on the APR Portal: PDF upload, Paper (Sample)", r.status < 300, r.body?.detail ?? r.status);
  // Channels (P-143, Sample, FQ-2): IMM 5257 a PDF upload with a typed name, IMM 5707 Online with a typed name, IMM 5476
  // a PDF upload signed by hand and scanned (r5c BR-10: "APR Portal: e.g. IMM 5476 signed by hand and scanned").
  for (const [form, channel, signature] of [["IMM 5257", "PDF_UPLOAD", "TYPED_NAME"], ["IMM 5707", "ONLINE", "TYPED_NAME"], ["IMM 5476", "PDF_UPLOAD", "HAND_SCANNED"]] as const) {
    const line = sql(`select lineage_key from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='${form}' order by cf.version desc limit 1`) ?? form;
    r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line)}/channel`, { channel, signature }, AUTHOR);
    ok(`S4 ${form}: ${channel}, ${signature} (Sample, FQ-2)`, r.status < 300, r.body?.detail ?? r.status);
  }

  // M3-0 / C11.12 (P-233): the filing mode per role. VV-R03: each family member completes their own application. Only
  // a role that may be an applicant takes a mode: the Representative files nothing (BR-3, challenge B1).
  const people = (await call("GET", `/combinations/${vv}/config`, undefined, AUTHOR)).body?.snapshot?.combination?.participants ?? [];
  const version = Number(sql(`select participants_version from combination where id='${vv}'`) ?? 0);
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: people.map((p: Record<string, unknown>) => ({ role: p.role, label: p.label, min: p.min, max: p.max, applies: p.applies, ...(p.applies ? { filingMode: "files_own" } : {}) })), version }, AUTHOR);
  ok("S5 (M3-0) every Visitor visa role files its own application (filing mode files_own, VV-R03), and the draft keeps it",
    r.status < 300 && (r.body?.participants ?? []).every((p: { applies?: boolean; filingMode?: string }) => (p.applies ? p.filingMode === "files_own" : !p.filingMode)), r.body?.detail ?? r.body?.participants);

  // Documents per person (VV-R05, VV-R06, VV-R08; Sample beyond the quoted lines). R3 (P-230 (3), closes FQ-4): a minor's
  // travel answers, Researched (canada.ca minor-children page, 2025-01-23, read 2026-11-02): may change. Source:
  // research_notes/visitor-visa-and-six-combinations-research-2026-11-02.md Q4, https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/minor-children-travelling-canada.html
  // ("The letter does not need to be certified."). Each line applies only under 18 (person.age_years, worked out on the
  // application date) and reads "travels with" or "custody", two facts that arrive through C3.6 with their answer values.
  // qa on #493 (Minors 1 and 2): the reason a line shows is short ("Needed: <plain>."); the source goes beside it, in the
  // line's quote (sourceQuote, with the page and date) and its link (sourceFile), never in the reason. P-170 (Devin on #521):
  // each line quotes the official instruction that calls for its document, word for word (curly apostrophes kept).
  const PAGE = "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/minor-children-travelling-canada.html";
  const IMM5881 = "https://ircc.canada.ca/english/pdf/kits/forms/IMM5881E.pdf", IMM5484 = "https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5484/01-05-2026/imm5484e.pdf";
  const ON_PAGE = "canada.ca, Minor children travelling to Canada (page dated 2025-01-23, read 2026-11-02); official page, may change";
  const N5881 = "IMM 5881 E (05-2026), New Delhi visa office checklist, page 2 (downloaded 2026-10-19; a visa office instruction, may change)";
  const CITE = {
    letter: { sourceQuote: `${N5881}: "Minors travelling alone or with a person other than their parents or legal guardians must have a letter of authorization signed by both parents and legal guardians; it must also include the name of the adult who will be responsible for the children in Canada. Minors travelling with only one parent or legal guardian must have a letter of authorization from the non-accompanying parent or guardian." ${ON_PAGE}, under "If the parents are separated or divorced and one of them has sole custody of the child": "The letter of authorization may be signed by that parent only, and they should bring a copy of the custody decree." and "The letter does not need to be certified."`, sourceFile: IMM5881 },
    birth: { sourceQuote: `${ON_PAGE}: under "If a minor child is travelling alone": "a copy of their birth certificate"; under "If a minor child is travelling with one parent only": "a copy of the child’s birth certificate".`, sourceFile: PAGE },
    absentId: { sourceQuote: `${N5881}: "You must provide a copy of the page of the passport or other government-issued identification document showing the name, photo and signature of each non-accompanying parent." ${ON_PAGE}, under "If a minor child is travelling with a person other than their parents or legal guardians": "A photocopy of the parents’ or legal guardians’ signed passports or national identity cards should be attached to the letter."`, sourceFile: IMM5881 },
    custody: { sourceQuote: `IMM 5484 (05-2026), Document checklist for a temporary resident visa, page 1: "Minors travelling alone or with one parent must provide custody documents or a letter of authorization from the other non accompanying parent or a letter of authorization signed by both parents or legal guardians." (downloaded 2026-10-19). ${ON_PAGE}: "The parent travelling with the child should carry copies of the legal custody documents."; "they should bring a copy of the custody decree."`, sourceFile: IMM5484 },
    adopt: { sourceQuote: `${ON_PAGE}, under "If a minor child is travelling with a legal guardian or adoptive parents": "The child should have a copy of the guardianship papers or the adoption papers (whichever one applies)."`, sourceFile: PAGE },
  };
  // qa Major on #493: a minor can be the principal applicant (a teenager visiting relatives files their own visitor visa),
  // so the five lines go on every applicant; the age guard (person.age_years < 18) keeps them off adults.
  const minor = (c: unknown) => ({ op: "and", subjectKind: "PERSON", args: [{ op: "lt", field: "person.age_years", value: 18 }, c] });
  const travels = (v: string[]) => minor({ op: "in", field: "person.travels_with", value: v });
  const custody = (v: string[]) => minor({ op: "in", field: "person.custody", value: v });
  // Devin on #521 (red): "sole" custody does not say which parent holds it, so the parent who stays behind may be the sole
  // custodian; the absent parent's ID is therefore always asked when a parent is not travelling (never dropped on "sole").
  // The official words (above) also ask the parents' ID copies when the child travels with another adult, and the birth
  // certificate when the child travels alone or with one parent (not with another adult): the conditions follow them.
  // Devin on #521 (yellow): with another adult both parents stay behind; the one ID line says a copy for each, in one file
  // (a line holds one file today; one line per parent is a follow-up row).
  const reqs: { name: string; who: string; mode: "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL"; condition?: unknown; plain?: string; cite?: { sourceQuote: string; sourceFile: string } }[] = [
    { name: "Passport or travel document", who: "each_applicant", mode: "COMBINATION_MANDATORY" },
    { name: "Proof of financial support", who: "principal_applicant", mode: "COMBINATION_MANDATORY" },
    { name: "Letter of authorization for a minor", who: "each_applicant", mode: "ANSWER_CONDITIONAL", condition: travels(["alone", "another_adult", "one_parent"]),
      plain: "a child under 18 travelling alone, with another adult (signed by both parents, naming the adult responsible in Canada) or with one parent (from the other parent; with sole custody, from the parent who has it)", cite: CITE.letter },
    { name: "Copy of the minor's birth certificate", who: "each_applicant", mode: "ANSWER_CONDITIONAL", condition: travels(["alone", "one_parent"]), plain: "a child under 18 travelling alone or with one parent", cite: CITE.birth },
    { name: "Copy of the absent parent's signed passport or national ID", who: "each_applicant", mode: "ANSWER_CONDITIONAL", condition: travels(["one_parent", "another_adult"]), plain: "a child under 18 travelling with one parent or with another adult: a copy for each parent not travelling (both parents when with another adult), in one file", cite: CITE.absentId },
    { name: "Custody documents", who: "each_applicant", mode: "ANSWER_CONDITIONAL", condition: custody(["sole", "shared"]), plain: "a child under 18 in sole custody (the custody decree) or shared custody", cite: CITE.custody },
    { name: "Adoption or guardianship papers", who: "each_applicant", mode: "ANSWER_CONDITIONAL", condition: custody(["adopted", "guardian"]), plain: "a child under 18 who is adopted or under guardianship", cite: CITE.adopt },
    // VV-R16 (medical exam: a stay over 6 months AND a listed country, a public-health job or a super visa) needs a
    // country-history question the library does not have: FQ-11, not set up here.
  ];
  for (const q of reqs) {
    const key = q.name.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
    const known = sql(`select count(*) from document_type where document_type_key='${key}'`) === "1";
    // C3.6 (P-158): a new name waits as a library proposal (202); the second person accepts it, then the line goes in with
    // the type it landed as. Each step must hold (review of #523, M2: a wait a setup relies on fails loudly).
    let typeKey = key;
    if (!known) {
      const named = await call("POST", `/combinations/${vv}/requirements`, { newTypeName: q.name, providedBy: "client", attachMode: q.mode, appliesToRoles: q.who, ...(q.condition ? { condition: q.condition, conditionPlain: q.plain } : {}), ...(q.cite ?? {}) }, AUTHOR);
      const acc = named.status === 202 ? await call("POST", "/review/proposals/decide", { ids: [named.body?.proposalId], action: "accept" }, REVIEWER) : named;
      typeKey = acc.body?.items?.[0]?.landedAs ?? "";
      ok(`S6 new document type proposed and accepted: ${q.name}`, named.status === 202 && acc.status === 201 && !!typeKey, [named.status, acc.status, named.body?.detail ?? acc.body?.detail]);
      // The type's library ADD is credited to the person who accepted it (appliedBy, as for the facts in S6a), so a third
      // person approves it; otherwise release 2 is refused for types waiting on To review (#573 CI, check_c69_page_browser).
      const ch = typeKey ? sql(`select id from library_change where kind='document_type' and key='${typeKey}' and status='WAITING' limit 1`) : "";
      const ap = ch ? await call("POST", `/library/changes/${ch}/approve`, {}, APPROVER) : { status: 0, body: null } as typeof r;
      ok(`S6 new document type approved into the library by a third person: ${q.name}`, !!ch && ap.status < 300, ap.body?.detail ?? ap.body?.message ?? ap.status);
    }
    r = await call("POST", `/combinations/${vv}/requirements`, { documentTypeKey: typeKey, providedBy: "client", attachMode: q.mode, appliesToRoles: q.who, ...(q.condition ? { condition: q.condition, conditionPlain: q.plain } : {}), ...(q.cite ?? {}) }, AUTHOR);
    ok(`S6 document requirement: ${q.name} (${q.who})`, r.status === 201, r.body?.detail ?? r.status);
  }
  // S6a (R3): the two facts the lines read arrive through C3.6 ("add the fact this rule needs", P-158) with their answer
  // values, are accepted by the second person, then asked per person in Your visit. Values Researched (as above).
  // qa Major on #493: the lines are on every applicant, so until the application date settles each age every applicant
  // may be asked (the release's age is worked out on that date); the words hold for an adult too.
  const facts = [
    { fact: "person.travels_with", label: "Who the child travels with", meaning: `Who a child under 18 travels to Canada with. ${ON_PAGE}.`, values: ["Both parents", "One parent", "Another adult", "Alone"], question: "If under 18: who is this person travelling to Canada with?" },
    { fact: "person.custody", label: "Custody of the child", meaning: `The custody arrangement for a child under 18. ${ON_PAGE}.`, values: ["Not applicable", "Shared", "Sole", "Adopted", "Guardian"], question: "If under 18: what is the custody arrangement for this person?" },
  ];
  const needed = ((await call("GET", `/combinations/${vv}/rule-facts`, undefined, AUTHOR)).body?.facts ?? []) as { fact: string; rules: { kind: string; key: string }[] }[];
  for (const f of facts) {
    const known = sql(`select count(*) from canonical_field where canonical_field_key='${f.fact}'`) !== "0";
    if (!known) {
      const rule = needed.find((x) => x.fact === f.fact)?.rules[0]?.key;
      r = await call("POST", `/combinations/${vv}/rule-facts`, { fact: f.fact, rule, label: f.label, meaning: f.meaning, valueType: "code", values: f.values }, AUTHOR);
      ok(`S6a (R3) ${f.fact} proposed with its ${f.values.length} answer values through C3.6`, r.status === 201, r.body?.detail ?? r.body?.message ?? r.status);
      const pid = r.body?.proposalId;
      r = await call("POST", "/review/proposals/decide", { ids: [pid], action: "accept" }, REVIEWER);
      ok(`S6a (R3) ${f.fact} accepted by the second person`, r.status < 300, r.body?.detail ?? r.body?.message ?? r.status);
      // The field's library change is credited to the person who accepted it (C3.6), so a third person approves it.
      const ch = sql(`select id from library_change where kind='field' and key='${f.fact}' and status='WAITING' limit 1`);
      r = ch ? await call("POST", `/library/changes/${ch}/approve`, {}, APPROVER) : { status: 0, body: null } as typeof r;
      ok(`S6a (R3) ${f.fact} approved into the library, its answer list with it`, !!ch && r.status < 300, r.body?.detail ?? r.body?.message ?? r.status);
    }
    r = await call("POST", `/library/fields/${f.fact}/placement`, { sectionKey: "your_visit", collectedFrom: "client_questionnaire", repeats: "per_person", tier: "case", questionText: f.question }, AUTHOR);
    ok(`S6a (R3) "${f.question}" is asked per person in Your visit`, r.status < 300, r.body?.detail ?? r.status);
  }

  // M3-8 (not built): eligibility gates as data on the release (VV-R01, Sample conditions). Only what a fact can settle
  // is a gate; "enough money" depends on the stay ("The amount of money you will need depends on how long you will
  // stay"), so it joins health, ties and leaving as the officer's judgement (FQ-5). The convictions fact is IMM 5257's
  // wider question (committed, arrested, charged or convicted): Sample.
  const gates = [
    { key: "vv.travel_document", label: "Passport number and expiry date answered (Sample)", condition: { op: "and", args: [{ op: "exists", field: "person.passport_number" }, { op: "exists", field: "person.passport_expiry_date" }] } },
    // P-230 (1) (researched 2 Nov): the background question covers committed, arrested, charged or convicted, and
    // rehabilitation, record suspension and a temporary resident permit exist, so a Yes asks for the representative's
    // review, never a hard Does not qualify (P-236; "when not met" as data).
    { key: "vv.no_convictions", label: "Answered no to the criminal history question (Sample)", condition: { op: "eq", field: "person.criminal_history", value: false }, whenNotMet: "needs_review" },
  ];
  const judgement = ["Has enough money for the stay", "Is in good health", "Ties that will take the person back home", "Will leave Canada at the end of the visit"];
  r = await call("PUT", `/combinations/${vv}/eligibility-gates`, { gates, judgement }, AUTHOR);
  ok("S7 (M3-8) eligibility gates saved as data on the draft (2 gates, 4 officer's judgement lines)", r.status < 300, r.body?.detail ?? r.status);

  // W4 / P-151 (2) (not built; C6.12): a dated fee table as data, the amounts cited (VV-R13, VV-R14, VV-R15).
  const FEES = "https://ircc.canada.ca/english/information/fees/fees.asp";
  r = await call("PUT", "/library/fees", { asOf: "2026-11-01", lines: [
    { key: "visitor_visa", label: "Visitor visa", amountCad: 100, per: "person", familyMaximum: { amountCad: 500, fromPeople: 5, within: "submission_group" }, source: FEES },
    { key: "biometrics", label: "Biometrics", amountCad: 85, per: "person", familyMaximum: { amountCad: 170, fromPeople: 2, within: "submission_group" }, exempt: { underAge: 14, overAge: 79 }, source: "https://www.canada.ca/en/immigration-refugees-citizenship/services/biometrics/when-to-give-temporary-residence.html" },
  ], combinations: { "vv.single": ["visitor_visa", "biometrics"] } }, AUTHOR);
  ok("S7a (W4, C6.12) the Visitor visa fee lines saved as a dated fee table, each with its source", r.status < 300, r.body?.detail ?? r.status);

  // G1 (C5.4; tech lead on #558): the Visitor visa is Sample, so the demo seed answers each number its draft publishes
  // ("From age 18" on IMM 5476 and IMM 5707, …) with a Sample source: it passes in the demo workspace only, and the
  // release stays a Demo release. A number nobody answered would refuse the submit, naming it.
  r = await call("POST", `/combinations/${vv}/sources/sample`, undefined, AUTHOR);
  ok("S7b (G1) the Visitor visa's numbers answered with Sample sources by the demo seed (demo workspace only)", r.status < 300 && r.body?.sources?.counts?.held_back === 0, r.body?.detail ?? r.body?.sources?.counts ?? r.status);

  // Submit, sign off, release; a release refused because the draft moved during it (library changes applied at
  // approval) is submitted again once, as a person would after "Review the change, submit it again".
  let refs: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const c of (await call("GET", "/library/changes?status=WAITING", undefined, REVIEWER)).body ?? []) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
    r = await call("POST", `/combinations/${vv}/submit`, { note: "Pack 4: Visitor visa ready for M3 cases (Sample values)" }, AUTHOR);
    if (attempt === 0) ok("S8 submitted for review", r.status < 300, r.body?.detail ?? r.status);
    const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
    refs = (sub?.changeSummary ?? sub?.change_summary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
    await call("POST", `/combinations/${vv}/signoff`, { items: refs, action: "signed" }, REVIEWER);
    r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
    if (!/changed while it was being released/.test(r.body?.detail ?? "")) break;
  }
  ok("S8 signed off by the content reviewer", refs.length > 0, refs.length);
  ok("S8 release 2 approved by a different person", r.status < 300 && sql(`select max(version) from config_release where combination_id='${vv}'`) === "2", r.body?.detail ?? r.status);
});
