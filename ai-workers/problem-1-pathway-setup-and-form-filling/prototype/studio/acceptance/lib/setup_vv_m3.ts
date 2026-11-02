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

  // Documents per person (VV-R05, VV-R06, VV-R08; Sample beyond the quoted lines; FQ-4 for the minor's letter).
  const reqs: { name: string; who: string; mode: "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL"; condition?: unknown; plain?: string }[] = [
    { name: "Passport or travel document", who: "each_applicant", mode: "COMBINATION_MANDATORY" },
    { name: "Proof of financial support", who: "principal_applicant", mode: "COMBINATION_MANDATORY" },
    { name: "Letter of authorization for a minor", who: "each_dependent_child", mode: "ANSWER_CONDITIONAL", condition: { op: "eq", field: "person.travelling_alone_to_canada", value: true, subjectKind: "PERSON" }, plain: "when the child travels alone or without both parents (Sample, FQ-4)" },
    // VV-R16 (medical exam: a stay over 6 months AND a listed country, a public-health job or a super visa) needs a
    // country-history question the library does not have: FQ-11, not set up here.
  ];
  // The minor's travel question is in the library but asked of nobody yet (FQ-4: "alone" only, not "with one parent").
  r = await call("POST", "/library/fields/person.travelling_alone_to_canada/placement", { sectionKey: "your_visit", collectedFrom: "client_questionnaire", repeats: "per_person", tier: "case", questionText: "Is this person travelling to Canada alone? (Sample)" }, AUTHOR);
  ok("S6a the travel-alone question is asked per person in Your visit (Sample, FQ-4)", r.status < 300, r.body?.detail ?? r.status);
  for (const q of reqs) {
    const key = q.name.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
    const known = sql(`select count(*) from document_type where document_type_key='${key}'`) === "1";
    r = await call("POST", `/combinations/${vv}/requirements`, { ...(known ? { documentTypeKey: key } : { newTypeName: q.name, providedBy: "client" }), attachMode: q.mode, appliesToRoles: q.who, ...(q.condition ? { condition: q.condition, conditionPlain: q.plain } : {}) }, AUTHOR);
    ok(`S6 document requirement: ${q.name} (${q.who})`, r.status < 300, r.body?.detail ?? r.status);
  }

  // M3-8 (not built): eligibility gates as data on the release (VV-R01, Sample conditions). Only what a fact can settle
  // is a gate; "enough money" depends on the stay ("The amount of money you will need depends on how long you will
  // stay"), so it joins health, ties and leaving as the officer's judgement (FQ-5). The convictions fact is IMM 5257's
  // wider question (committed, arrested, charged or convicted): Sample.
  const gates = [
    { key: "vv.travel_document", label: "Passport number and expiry date answered (Sample)", condition: { op: "and", args: [{ op: "exists", field: "person.passport_number" }, { op: "exists", field: "person.passport_expiry_date" }] } },
    { key: "vv.no_convictions", label: "Answered no to the criminal history question (Sample)", condition: { op: "eq", field: "person.criminal_history", value: false } },
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
