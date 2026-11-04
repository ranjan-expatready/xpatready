// C6.12 Filings and fees derived from the case (M3-B; r5c BR-1, BR-16, BR-18; P-135, P-171). Visitor visa part:
// each person files their own application (VV-R03), the family's filings go in one submission group, the visitor visa
// fee is CAD 100 per person with CAD 500 for a family of 5 or more (VV-R13), biometrics CAD 85 per person with CAD 170
// for a family of 2 or more eligible people (VV-R14), no biometrics under 14 or over 79 (VV-R15). Splitting one filing
// out of the group warns that the family maximum is lost and needs a reason.
// Breadth, after Visitor visa: the sponsorship + PR pair, the "will this child study 6 months or more?" question, no
// cap on extensions, study or work permits.
// The parts C6.12 is Partial for are checked in acceptance/C6.12-breadth.test.ts (red until built, P-290); this pack is the
// Visitor visa part, which tests/check_vv_prepare_api.ts runs as a regression check and needs green.
//   (first, on a fresh copy: tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts, as for C6.9)
//   tsx studio/acceptance/C6.12.test.ts 4440 xr_studio_accept
import { CLIENT, FAMILY, OFFICER, call, filingOf, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo, type Person, type Prepare } from "./lib/m3.ts";

const total = (p: Prepare | null, line: RegExp, filings?: string[]) => (p?.fees ?? []).filter((f) => line.test(f.line) && (!filings || filings.includes(f.filing))).reduce((s, f) => s + (f.exempt || (f as { waiting?: string }).waiting ? 0 : f.amount), 0); // a line waiting for a fact is not charged yet
const VISA = /visitor visa/i, BIO = /biometric/i;

await main("C6.12", "Filings and fees derived from the case (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  // A family of four: two adults, a child of 10, a child of 15.
  const c = await openCase(vv, FAMILY);
  const { res, p } = await prepare(c.id);
  ok("C6.12-1 pass: GET /runtime/cases/:id/prepare answers 200 for the case officer", res.status === 200, res.status);
  ok("C6.12-2 fail: a client cannot read the prepare view (403)", (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, CLIENT)).status === 403);
  ok("C6.12-3 pass: four people who each file their own application give four filings, one applicant each, mode files_own (VV-R03)",
    p?.filings.length === 4 && p.filings.every((f) => f.applicants.length === 1 && (f as { mode?: string }).mode === "files_own" && f.applicants[0].mode === "applying"), p?.filings.map((f) => f.applicants));
  ok("C6.12-3a pass (qa-2 #296): the filings follow the RELEASED filing mode, not a rule in code: the case's pinned release lists files_own for every role", ["principal", "spouse_or_partner", "child"].every((role) => sql(`select x->>'filingMode' from pack_work_pin w join config_release r on r.id=w.config_release_id, jsonb_array_elements(r.snapshot->'combination'->'participants') x where w.case_id='${c.id}' and x->>'role'='${role}' limit 1`) === "files_own"));
  ok("C6.12-4 pass: the four filings form one family submission group, which can be split", p?.groups.length === 1 && p.groups[0].kind === "family" && p.groups[0].filings.length === 4 && p.groups[0].splittable === true, p?.groups);
  ok("C6.12-5 pass (data): filing, filing_applicant and submission_group rows match the view", sql(`select count(*) from filing where case_id='${c.id}'`) === "4" && sql(`select count(*) from filing_applicant fa join filing f on f.id=fa.filing_id where f.case_id='${c.id}'`) === "4" && sql(`select count(distinct submission_group_id) from filing where case_id='${c.id}'`) === "1");
  ok("C6.12-6 fail: the officer never creates a filing by hand (POST …/filings is not a route: 404 or 405)", res.status === 200 && [404, 405].includes((await call("POST", `/runtime/cases/${c.id}/filings`, { subject: c.subjects["Sample Client A"] })).status));
  ok("C6.12-7 pass: visitor visa fee CAD 100 per person, CAD 400 for four (under 5, no family maximum; VV-R13)", total(p, VISA) === 400 && (p?.fees ?? []).filter((f) => VISA.test(f.line)).length === 4, p?.fees);
  const child10 = filingOf(p, c.subjects["Sample Child A1"])?.id, child15 = filingOf(p, c.subjects["Sample Child A2"])?.id;
  ok("C6.12-8 pass: biometrics CAD 170 for the family (three people 14–79; maximum for 2 or more; VV-R14); the child of 10 has no biometrics line, with the reason \"under 14\" (VV-R15)",
    total(p, BIO) === 170 && !(p?.fees ?? []).some((f) => BIO.test(f.line) && f.filing === child10 && !f.exempt) && (p?.fees ?? []).some((f) => f.filing === child15 && BIO.test(f.line)), p?.fees?.filter((f) => BIO.test(f.line)));
  ok("C6.12-9 pass: the visitor visa and biometrics fee lines cite the IRCC fee list (VV-R13, VV-R14); any other line says Sample", (p?.fees ?? []).length > 0 && (p?.fees ?? []).every((f) => (VISA.test(f.line) || BIO.test(f.line)) ? /ircc\.canada\.ca\/english\/information\/fees|canada\.ca/.test(f.source ?? "") : /Sample/.test(f.source ?? "")), p?.fees?.map((f) => f.source));

  // The studio and the case name the same release (G13, QA-140).
  const studioRel = (await call("GET", `/combinations/${vv}`, undefined, "user-A")).body?.releases?.[0];
  const caseRel = (await call("GET", `/runtime/cases/${c.id}`, undefined, OFFICER)).body?.release;
  ok("C6.12-9a pass (G13): the case names its release in the studio's words (same label and number)", !!caseRel?.label && caseRel.label === studioRel?.label, { studio: studioRel?.label, case: caseRel?.label });

  // Six people: the family maximum applies to the group, once, on the principal's filing (BR-18).
  const six: Person[] = [...FAMILY, { role: "child", name: "Sample Child A3", dob: yearsAgo(6) }, { role: "child", name: "Sample Child A4", dob: yearsAgo(3) }];
  const c6 = await openCase(vv, six);
  let q = (await prepare(c6.id)).p;
  const principal6 = filingOf(q, c6.subjects["Sample Client A"])?.id;
  ok("C6.12-10 pass: six people in one group pay the CAD 500 family maximum, once, on the principal's filing; the others are fee-exempt with the reason",
    total(q, VISA) === 500 && (q?.fees ?? []).filter((f) => VISA.test(f.line) && !f.exempt).every((f) => f.filing === principal6) && (q?.fees ?? []).filter((f) => VISA.test(f.line) && f.exempt).length === 5 && (q?.fees ?? []).filter((f) => f.exempt).every((f) => !!f.reason), q?.fees);
  ok("C6.12-11 fail: a seventh person is refused (a child is at most 4 in this combination's \"Who can be in this application\")", [409, 422].includes((await call("POST", `/runtime/cases/${c6.id}/people`, { role: "child", displayName: "Sample Child A5" }, OFFICER)).status));

  // Split the child of 15 out: warning, reason required, the maximum recomputed per group.
  const g = q?.groups[0]?.id, split = filingOf(q, c6.subjects["Sample Child A2"])?.id;
  const ids6 = Object.fromEntries(Object.entries(c6.subjects).map(([n, sub]) => [n, filingOf(q, sub)?.id]));
  let r = await call("POST", `/runtime/groups/${g}/split`, { filing: split, version: q?.version }, OFFICER);
  ok("C6.12-12 fail: splitting without a reason is refused on the field and says the family maximum would be lost (400)", r.status === 400 && /reason/i.test(JSON.stringify(r.body)) && /family (fee )?(cap|maximum)/i.test(JSON.stringify(r.body)), r.body);
  r = await call("POST", `/runtime/groups/${g}/split`, { filing: split, reason: "Travels on a later date (Sample)", version: q?.version }, OFFICER);
  q = (await prepare(c6.id)).p;
  const rest = q?.groups.find((x) => x.filings.includes(principal6 ?? ""))?.filings ?? [];
  ok("C6.12-13 pass: after the split there are two groups; visa fees CAD 500 (five) + CAD 100 (one); biometrics CAD 170 + CAD 85",
    r.status === 200 && q?.groups.length === 2 && total(q, VISA, rest) === 500 && total(q, VISA, [split ?? ""]) === 100 && total(q, BIO, rest) === 170 && total(q, BIO, [split ?? ""]) === 85, { groups: q?.groups, fees: q?.fees });
  ok("C6.12-13a pass (qa-2 #296): a split keeps every filing's identity (same filing id for each person)", Object.entries(c6.subjects).every(([n, sub]) => !!ids6[n] && filingOf(q, sub)?.id === ids6[n]), { before: ids6 });
  r = await call("POST", `/runtime/groups/${g}/split`, { filing: split, reason: "again", version: q?.version }, OFFICER);
  ok("C6.12-14 fail: splitting a filing that is no longer in the group is refused (409 or 422)", [409, 422].includes(r.status), r.status);

  // Biometrics age edges (VV-R15): exactly 14 gives biometrics; 79 gives; 80 does not.
  // Two days either side of each birthday, so the server's time zone and 29 February never decide it (FQ-7 open).
  const edge = async (years: number, days: number) => { const x = await openCase(vv, [{ role: "principal", name: `Sample Client E${years}`, dob: yearsAgo(years, days) }]); return (await prepare(x.id)).p; };
  const [justOver14, justUnder14, age79, justOver80] = [await edge(14, 2), await edge(14, -2), await edge(80, -2), await edge(80, 2)];
  ok("C6.12-15 pass: just past the 14th birthday, and aged 79, a person pays visa CAD 100 and biometrics CAD 85; two days before turning 14, no biometrics", total(justOver14, VISA) === 100 && total(justOver14, BIO) === 85 && total(age79, BIO) === 85 && total(justUnder14, VISA) === 100 && total(justUnder14, BIO) === 0);
  ok("C6.12-16 pass: a person just past 80 has no biometrics line (\"over 79\")", total(justOver80, VISA) === 100 && total(justOver80, BIO) === 0 && !(justOver80?.fees ?? []).some((f) => BIO.test(f.line) && !f.exempt));

  // A date of birth corrected later recomputes the derived fees before filing (BR-12: drafts recompute).
  const kid = c.subjects["Sample Child A1"];
  await call("PUT", `/runtime/cases/${c.id}/answers/${kid}/person.date_of_birth`, { value: yearsAgo(16), expectedId: (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`)).body?.sections?.flatMap((s: { questions: { subjectId: string; fact: string; answer: { id: string } | null }[] }) => s.questions).find((x: { subjectId: string; fact: string }) => x.subjectId === kid && x.fact === "person.date_of_birth")?.answer?.id ?? null }, OFFICER);
  const p2 = (await prepare(c.id)).p;
  ok("C6.12-17 pass: correcting the child's date of birth to 16 adds a biometrics line for them; the family total stays at the CAD 170 maximum", (p2?.fees ?? []).some((f) => f.filing === child10 && BIO.test(f.line)) && total(p2, BIO) === 170);
  // A person on the case who is not travelling (P-209: the roles read "(travelling)"; #283 builds applies: false).
  const nt = await openCase(vv, [...FAMILY.slice(0, 3), { role: "child", name: "Sample Child A2", dob: yearsAgo(15), applies: false }]);
  let n = (await prepare(nt.id)).p;
  const K2 = nt.subjects["Sample Child A2"];
  ok("C6.12-18 pass: a child who is not travelling has no filing and no fee, and the view says why", !!n && n.filings.length === 3 && !filingOf(n, K2) && !(n.fees ?? []).some((f) => f.subject === K2) && /not travelling/i.test(JSON.stringify((n as unknown as { people?: unknown }).people ?? n)), n?.filings.length);
  const before = Object.fromEntries(FAMILY.slice(0, 3).map((x) => [x.name, filingOf(n, nt.subjects[x.name])?.id]));
  let r2 = await call("PATCH", `/runtime/cases/${nt.id}/people/${K2}`, { applies: true }, OFFICER);
  n = (await prepare(nt.id)).p;
  ok("C6.12-19 pass: marking the child as travelling adds their filing and fees; everyone else keeps the same filing id", r2.status === 200 && n?.filings.length === 4 && !!filingOf(n, K2) && FAMILY.slice(0, 3).every((x) => !!before[x.name] && filingOf(n, nt.subjects[x.name])?.id === before[x.name]), { before, status: r2.status });
  r2 = await call("PATCH", `/runtime/cases/${nt.id}/people/${nt.subjects["Sample Child A1"]}`, { applies: false }, OFFICER);
  n = (await prepare(nt.id)).p;
  ok("C6.12-20 fail (qa-2 #296): taking the child of 10 off the trip never moves another person's filing to them (ids are not positions)", r2.status === 200 && !filingOf(n, nt.subjects["Sample Child A1"]) && ["Sample Client A", "Sample Spouse A"].every((x) => filingOf(n, nt.subjects[x])?.id === before[x]) && filingOf(n, K2)?.id !== before["Sample Child A1"]);

  // G15: a person added with no date of birth yet: the biometrics line waits for it, never charged or exempt in silence.
  const nd = await openCase(vv, [FAMILY[0], { role: "child", name: "Sample Child A9", dob: null }]);
  const pd = (await prepare(nd.id)).p;
  const kid9 = filingOf(pd, nd.subjects["Sample Child A9"])?.id;
  const bioLine = (pd?.fees ?? []).find((f) => f.filing === kid9 && BIO.test(f.line)) as (Prepare["fees"][number] & { waiting?: string }) | undefined;
  ok("C6.12-21 pass (G15): a child with no date of birth has a biometrics line that waits for the date of birth, not counted in the total and not exempt", !!bioLine && bioLine.waiting === "person.date_of_birth" && !bioLine.exempt && /date of birth/i.test(bioLine.reason ?? "") && total(pd, BIO, [kid9 ?? ""]) === 0, bioLine);
});
