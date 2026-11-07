// C6.12, C11.6, C7.3, C7.7 API checks (M3-B and M3-E, runtime lane): a Visitor visa case's "Prepare application" view on an isolated copy.
// It releases the Visitor visa twice through the screens' own routes when its copy has none (setup_visitor_visa.ts, then
// pack 4's acceptance/lib/setup_vv_m3.ts: IRCC account, IMM 5476, channels, filing modes, documents), runs pack 4's
// acceptance tests C6.12, C11.6, C7.3 and C7.7 (moved into the suites by the PR that makes them pass, acceptance/README.md), and adds
// the edges they leave out: who may split, ids that are not ids, a document has no channel, two reads at once make one
// family group, and the older /filings view prices the same ages. Each rule has a passing and a failing case. No model
// call (US$0). Values Sample until the immigration expert confirms. Setup lines owned by other rows (S2w G8, S7 M3-8,
// S7a W4) may fail there; this check needs only release 2 with its filing modes (S5) and channels (S4).
//   zsh studio/tools/isolated.sh runtime_prep 4432 start && tsx studio/tests/check_vv_prepare_api.ts 4432 xr_studio_runtime_prep
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";
import { FEE_TABLE } from "../engine/runtime/filings.ts";
import * as m3 from "../acceptance/lib/m3.ts"; // pack 4's helpers (answer, confirm), on this same copy (argv port, db)

const PORT = Number(process.argv[2] ?? 4432), DB = process.argv[3] ?? "xr_studio_runtime_prep";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A";
const STUDIO = join(import.meta.dirname, "..");
const tsx = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(PORT), DB], { encoding: "utf8", timeout: 900_000 });
const releases = () => Number(sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") ?? 0);

(async () => {
  if (releases() === 0) { const r = tsx("tests/runtime/setup_visitor_visa.ts"); ok("setup: release 1 of the Visitor visa (setup_visitor_visa.ts)", r.status === 0 && releases() === 1, r.stdout.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3)); }
  if (releases() === 1) {
    const r = tsx("acceptance/lib/setup_vv_m3.ts");
    const line = (id: string) => r.stdout.split("\n").find((l) => l.includes(` ${id} `)) ?? "";
    ok("setup: release 2 (pack 4 setup_vv_m3.ts) with every role's filing mode (S5, M3-0) and the three form channels (S4)", releases() === 2 && line("S5").startsWith("PASS") && r.stdout.split("\n").filter((l) => / S4 /.test(l)).every((l) => l.startsWith("PASS")), r.stdout.split("\n").filter((l) => l.startsWith("FAIL")).map((l) => l.slice(6, 60)));
  }
  // Pack 4's acceptance tests, each line shown here; the test's exit code is the verdict.
  for (const t of ["C6.12", "C11.6", "C7.3", "C7.7"]) {
    const r = tsx(`acceptance/${t}.test.ts`);
    for (const l of r.stdout.split("\n").filter((x) => x.startsWith("FAIL"))) console.log(`  ${t}: ${l}`);
    ok(`${t}: pack 4's acceptance test passes in full (${(r.stdout.trim().split("\n").pop() ?? "").trim()})`, r.status === 0, r.stderr.slice(-300) || undefined);
  }

  // Edges the acceptance tests leave out, on one Visitor visa case of two adults.
  const vv = sql("select id from combination where combination_key='vv.single'");
  const opened = await call("POST", "/runtime/cases", { combinationId: vv, reference: `PREP-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Client P" } }, OFFICER);
  const caseId: string = opened.body?.id;
  const spouse = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse P" }, OFFICER)).body?.subject_id;
  // Two reads at the same moment on a new case: one family group, one filing per person (the case row is locked).
  const both = await Promise.all([call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER), call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)]);
  ok("C6.12: two reads at once both answer, and store one family group and two filings", both.every((r) => r.status === 200) && sql(`select count(*) from submission_group where case_id='${caseId}'`) === "1" && sql(`select count(*) from filing where case_id='${caseId}'`) === "2", both.map((r) => r.status));
  const p = both[0].body;
  ok("C6.12 (fail): a person with no date of birth yet: their biometrics line waits for it, and the view's total does not count it", p.fees.filter((f: { key: string; waiting?: string }) => f.key === "biometrics").every((f: { waiting?: string }) => f.waiting === "person.date_of_birth"));
  ok("C6.12 (fail): configuration people cannot read the prepare view (403)", (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, AUTHOR)).status === 403);
  ok("C6.12 (fail): a case id that is not an id is not found (404), never a server error", (await call("GET", "/runtime/cases/not-a-case/prepare", undefined, OFFICER)).status === 404);
  // B133 (P-247): each submission total carries its fee table line's basis, so the case page reads the field.
  type Tot = { line: string; basis?: string };
  const tableBasis = (k: string) => FEE_TABLE.lines.find((l) => l.key === k)?.basis;
  ok("B133 pass: GET /prepare gives each submission total its fee table line's basis (family_maximum for visitor visa and biometrics)", p.groups[0]?.totals?.length > 0 && p.groups[0].totals.every((t: Tot) => !!t.basis && t.basis === tableBasis(t.line)), p.groups[0]?.totals?.map((t: Tot) => [t.line, t.basis]));
  const g = p.groups[0]?.id, f2 = p.filings.find((f: { applicants: { subject: string }[] }) => f.applicants[0].subject === spouse)?.id;
  let r = await call("POST", `/runtime/groups/${g}/split`, { filing: f2, reason: "Sample", version: p.version }, CLIENT);
  ok("C6.12 (fail): a client cannot split a submission group (403)", r.status === 403, r.status);
  r = await call("POST", "/runtime/groups/not-a-group/split", { filing: f2, reason: "Sample", version: p.version }, OFFICER);
  ok("C6.12 (fail): a group id that is not an id is not found (404)", r.status === 404, r.status);
  r = await call("POST", `/runtime/groups/${g}/split`, { filing: f2, reason: "Sample: travels later", version: "0" }, OFFICER);
  ok("C6.12 (fail): a split from an older read is refused (409, Reload), nothing moved", r.status === 409 && sql(`select count(*) from submission_group where case_id='${caseId}'`) === "1", r.status);
  r = await call("POST", `/runtime/groups/${g}/split`, { filing: f2, reason: "Sample: travels later", version: p.version }, OFFICER);
  ok("C6.12: a split with a reason makes a separate group that keeps the reason, and is audited without client values", r.status === 200 && r.body.groups.length === 2 && r.body.groups.some((x: { kind: string; reason: string | null }) => x.kind === "separate" && x.reason === "Sample: travels later") && /split the spouse or partner's filing out/.test(sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity='submission group' and entity_key='${g}'`) ?? ""), r.body?.groups);
  ok("B133 fail: a split never drops the basis: both groups' totals still carry it", r.status === 200 && r.body.groups.every((x: { totals: Tot[] }) => x.totals.length > 0 && x.totals.every((t) => t.basis === tableBasis(t.line))), r.body.groups?.map((x: { totals: Tot[] }) => x.totals.map((t) => t.basis)));
  r = await call("POST", `/runtime/groups/${r.body.groups.find((x: { kind: string }) => x.kind === "separate").id}/split`, { filing: f2, reason: "again", version: r.body.version }, OFFICER);
  ok("C6.12 (fail): a group of one has nothing to split (409)", r.status === 409, r.status);
  const q = (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)).body;
  const doc = q.items.find((i: { kind: string }) => i.kind === "document");
  r = await call("PATCH", `/runtime/items/${doc?.id}/channel`, { channel: "PDF_UPLOAD", version: q.version }, OFFICER);
  ok("C11.6 (fail): a document item has no channel (422)", !!doc && r.status === 422, r.status);
  r = await call("PATCH", "/runtime/items/not-an-item/channel", { channel: "PDF_UPLOAD", version: q.version }, OFFICER);
  ok("C11.6 (fail): an item id that is not an id is not found (404)", r.status === 404, r.status);
  const form = q.items.find((i: { kind: string; form?: string }) => i.form === "IMM 5257");
  r = await call("PATCH", `/runtime/items/${form?.id}/channel`, { channel: "PDF_UPLOAD", version: q.version }, OFFICER);
  ok("C11.6 (break m1): choosing the channel the item already has is a 200 that changes nothing (nothing stored, no new version)", r.status === 200 && r.body.changed === false && r.body.item?.channel === "PDF_UPLOAD" && r.body.version === q.version && sql(`select coalesce(channel::text, 'none') from filing_item where id='${form?.id}'`) === "none", r.body?.changed);
  // The older /filings view (#283) agrees with the prepare view on ages: answer both dates of birth, then compare.
  const answerDob = async (subject: string, dob: string) => { const qs = (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections?.flatMap((x: { questions: { subjectId: string; fact: string; answer: { id: string } | null }[] }) => x.questions) ?? []; const a = qs.find((x: { subjectId: string; fact: string }) => x.subjectId === subject && x.fact === "person.date_of_birth"); return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/person.date_of_birth`, { value: dob, expectedId: a?.answer?.id ?? null }, OFFICER); };
  const principal = opened.body?.people?.find((x: { role: string }) => x.role === "principal")?.subject_id;
  await answerDob(principal, "1950-01-01"); await answerDob(spouse, "1940-01-01");
  const after = (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)).body;
  ok("C6.12 VV-R15: a person over 79 has an exempt biometrics line with IRCC's words; one aged 76 pays CAD 85", after.fees.some((f: { key: string; subject: string; exempt: boolean; reason: string }) => f.key === "biometrics" && f.subject === spouse && f.exempt && /over the age of 79/.test(f.reason)) && after.fees.some((f: { key: string; subject: string; amount: number }) => f.key === "biometrics" && f.subject === principal && f.amount === 85));
  // Review M1, break M1: two splits from one read, sent at once on a group of two: one passes, the family group is never emptied.
  const race = await call("POST", "/runtime/cases", { combinationId: vv, reference: `RACE-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Client R" } }, OFFICER);
  await call("POST", `/runtime/cases/${race.body?.id}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse R" }, OFFICER);
  const rp = (await call("GET", `/runtime/cases/${race.body?.id}/prepare`, undefined, OFFICER)).body;
  const both2 = await Promise.all(rp.filings.map((f: { id: string }) => call("POST", `/runtime/groups/${rp.groups[0].id}/split`, { filing: f.id, reason: "Sample: race", version: rp.version }, OFFICER)));
  ok("C6.12 (fail): two splits from one read at once: exactly one passes, the other is 409, and the family group keeps a filing", both2.filter((x) => x.status === 200).length === 1 && both2.filter((x) => x.status === 409).length === 1 && sql(`select count(*) from filing f join submission_group g on g.id=f.submission_group_id where f.case_id='${race.body?.id}' and g.kind='FAMILY'`) === "1", both2.map((x) => x.status));
  // Review M2, break B1: reasons stay on their rows: never in an audit line, and another firm never reads these lines.
  const PRIVATE = "Sample private reason 7Q";
  const rq = (await call("GET", `/runtime/cases/${race.body?.id}/prepare`, undefined, OFFICER)).body;
  const i5257 = rq.items.find((i: { form?: string }) => i.form === "IMM 5257");
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "PAPER", reason: PRIVATE, version: rq.version }, OFFICER);
  ok("C11.6: Paper with a reason is saved on the item, reason included", r.status === 200 && sql(`select channel_reason from filing_item where id='${i5257?.id}'`) === PRIVATE, r.status);
  ok("C6.12, C11.6 (fail): no audit line holds a split or Paper reason, in its words or its detail", sql(`select count(*) from audit_event where (summary like '%Sample: race%' or summary like '%${PRIVATE}%' or detail::text like '%${PRIVATE}%' or detail::text like '%Sample: race%')`) === "0");
  const feed = (await call("GET", "/activity", undefined, "user-S")).body;
  ok("C6.12, C11.6 (fail): the solo firm's staff never read the Sample firm's item or group lines in the activity feed", Array.isArray(feed) && !feed.some((e: { entity: string }) => ["item", "submission group"].includes(e.entity)), Array.isArray(feed) ? feed.length : feed);
  const rs = (await call("GET", `/runtime/cases/${race.body?.id}/prepare`, undefined, OFFICER)).body;
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "PAPER", reason: "again", version: rs.version }, OFFICER);
  ok("C11.6 (break m1): the same channel again changes nothing: no new version, no audit line", r.status === 200 && r.body.changed === false && r.body.version === rs.version && sql(`select count(*) from audit_event where entity='item' and entity_key='${i5257?.id}'`) === "1", r.body?.changed);
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "PDF_UPLOAD", reason: "bad\u0000reason", version: rs.version }, OFFICER);
  ok("C11.6 (break m2, fail): a reason with a control character is a 400 on the reason, nothing saved", r.status === 400 && /plain text/.test(JSON.stringify(r.body)) && sql(`select channel from filing_item where id='${i5257?.id}'`) === "PAPER", r.status);
  // C7.3 edges: a PDF upload form has no answer sheet; a section that is not on the sheet is not found; the tick's audit
  // line names the section and the form, never a value.
  const i5257p = q.items.find((i: { form?: string; channel?: string }) => i.form === "IMM 5257");
  ok("C7.3 (fail): a PDF upload form item has no answer sheet (409, in words)", (await call("GET", `/runtime/items/${i5257p?.id}/answer-sheet`, undefined, OFFICER)).status === 409);
  // Row C9 (QA-246): with no date of birth the principal's IMM 5707 (from 18) is not yet known, so it is in `waiting`.
  const i5707p = [...q.items, ...(q.waiting ?? [])].find((i: { form?: string; subject: string }) => i.form === "IMM 5707" && i.subject === principal);
  ok("C7.3 (fail): a section that is not on the sheet is not found (404)", (await call("POST", `/runtime/items/${i5707p?.id}/screens/SectionZ/entered`, {}, OFFICER)).status === 404);
  const sheetA = async () => (await call("GET", `/runtime/items/${i5707p?.id}/answer-sheet`, undefined, OFFICER)).body?.sections?.[0];
  r = await call("POST", `/runtime/items/${i5707p?.id}/screens/SectionA/entered`, {}, OFFICER);
  ok("C7.3 (review M3, fail): a tick without the section's version is a 400; with an older one a 409 (Reload)", r.status === 400 && (await call("POST", `/runtime/items/${i5707p?.id}/screens/SectionA/entered`, { version: "0" }, OFFICER)).status === 409, r.status);
  r = await call("POST", `/runtime/items/${i5707p?.id}/screens/SectionA/entered`, { version: (await sheetA())?.version }, OFFICER);
  ok("C7.3: the tick is audited by section and form, without values", r.status === 201 && /ticked "Applicant, spouse and parents" of IMM 5707 as entered in the portal/.test(sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity='item' and entity_key='${i5707p?.id}'`) ?? "") && !/Sample Client P/.test(sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity='item' and entity_key='${i5707p?.id}'`) ?? ""), r.status);
  // Review M2: ticking every section while facts still wait never makes the item Done.
  for (const k of ["SectionB", "SectionC"]) { const v = (await call("GET", `/runtime/items/${i5707p?.id}/answer-sheet`, undefined, OFFICER)).body?.sections?.find((x: { key: string }) => x.key === k)?.version; await call("POST", `/runtime/items/${i5707p?.id}/screens/${k}/entered`, { version: v }, OFFICER); }
  const allTicked = (await call("GET", `/runtime/items/${i5707p?.id}/answer-sheet`, undefined, OFFICER)).body?.sections ?? [];
  const pNow = (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)).body;
  const itemNow = [...(pNow?.items ?? []), ...(pNow?.waiting ?? [])].find((i: { id: string }) => i.id === i5707p?.id);
  ok("C7.3 (review M2, fail): every section ticked but facts still waiting: the item is not Done", allTicked.length === 3 && allTicked.every((x: { entered: unknown }) => !!x.entered) && allTicked.some((x: { waiting: unknown[] }) => x.waiting.length > 0) && itemNow?.state !== "done", itemNow?.state);
  // Review M1: an out-of-date section ticked again freezes the new answers; the old tick stays as history.
  await m3.answer(caseId, principal, "person.family_name", "SAMPLEFN", OFFICER); await m3.confirmAll(caseId, principal);
  let a1 = await sheetA();
  r = await call("POST", `/runtime/items/${i5707p?.id}/screens/SectionA/entered`, { version: a1?.version }, OFFICER);
  await m3.answer(caseId, principal, "person.family_name", "SAMPLEFN2", OFFICER); await m3.confirmAll(caseId, principal);
  a1 = await sheetA();
  const outOfDate = a1?.out_of_date === true;
  r = await call("POST", `/runtime/items/${i5707p?.id}/screens/SectionA/entered`, { version: a1?.version }, OFFICER);
  a1 = await sheetA();
  ok("C7.3 (review M1): an out-of-date section ticked again is current again (201), and the earlier ticks stay as history", outOfDate && r.status === 201 && a1?.out_of_date === false && sql(`select count(*) from entered_section where item_id='${i5707p?.id}' and section_key='SectionA' and superseded_at is not null`) === "2" && sql(`select count(*) from entered_section where item_id='${i5707p?.id}' and section_key='SectionA' and superseded_at is null`) === "1", { outOfDate, status: r.status });
  const fl = (await call("GET", `/runtime/cases/${caseId}/filings`, undefined, OFFICER)).body;
  const cents = (x: { fees: { line?: string; key?: string; amount_cents: number; waiting?: string }[] }, k: string) => x.fees.filter((f) => (f.key ?? f.line) === k && !f.waiting).reduce((n, f) => n + f.amount_cents, 0);
  ok("C6.12: the /filings view (#283) prices the same as the prepare view: same ages, same split groups", fl.groups?.length === after.groups.length && ["visitor_visa", "biometrics"].every((k) => cents(fl, k) === cents(after, k)) && cents(fl, "biometrics") === 85_00, { filings: fl.groups?.length, prepare: after.groups.length });
  ok("C6.12: the item list follows: no biometrics step for the person over 79", !after.items.some((i: { kind: string; subject: string }) => i.kind === "step" && i.subject === spouse) && after.items.some((i: { kind: string; subject: string }) => i.kind === "step" && i.subject === principal));

  // C7.7 (review m1): "has any children" is asked while no child is on the case, and not asked once a child is (worked
  // out); C7.7 (review M1): the client's questionnaire never shows the representative's parts (the firm record's).
  const qsOf = async (mode: string, actor: string) => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=${mode}`, undefined, actor)).body?.sections ?? []) as { about_label: string; questions: { subjectId: string; fact: string; answer: { channel: string } | null }[] }[];
  const asksChildren = async () => (await qsOf("agent", OFFICER)).flatMap((x) => x.questions).some((q) => q.fact === "person.has_children" && [principalId, spouse].includes(q.subjectId));
  const principalId = sql(`select subject_id from case_participant where case_id='${caseId}' and role='principal'`);
  const before = await asksChildren();
  // D4 (P-229 (3)): the principal says No to "has any children" before a child is added to the case.
  const said = await call("PUT", `/runtime/cases/${caseId}/answers/${principalId}/person.has_children`, { value: false, expectedId: null }, OFFICER);
  const d4 = async (mode: string, actor: string) => (((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=${mode}`, undefined, actor)).body?.checks ?? []) as { id: string; subjectId: string; message: string }[]).filter((c) => c.id === "derived.person.has_children.overrides_no");
  const d4Before = await d4("agent", OFFICER);
  // QA-164 (golden journey 1, step 4): the client answers the spouse's "has any children" (No) before the child is on the
  // case; the section it sits in is the one the officer confirms once the child is added.
  type Sec = { subjectId: string; section: string; questions: { subjectId: string; fact: string; answer: { id: string } | null; rows?: { answer: { id: string } | null }[] }[]; group?: { none_apply?: { id?: string } | null } | null };
  const secsOf = async () => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []) as Sec[];
  const spouseSays = await call("PUT", `/runtime/cases/${caseId}/answers/${spouse}/person.has_children`, { value: false, expectedId: null }, CLIENT);
  const famSec = (await secsOf()).find((x) => x.subjectId === spouse && x.questions.some((q) => q.fact === "person.has_children"))?.section;
  await call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: "Sample Child P" }, OFFICER);
  {
    // The officer confirms that section as the screen does: every answer it shows is sent as seen (questionnaire.tsx).
    const sec = (await secsOf()).find((x) => x.subjectId === spouse && x.section === famSec);
    const seen = (sec?.questions ?? []).flatMap((q) => (q.rows ? q.rows.map((r) => r.answer) : [q.answer])).filter((x): x is { id: string } => !!x).map((x) => x.id);
    const conf = await call("POST", `/runtime/cases/${caseId}/sections/${famSec}/confirm`, { subjectId: spouse, seen }, OFFICER);
    const stillDeclared = sql(`select status from client_canonical_answer where subject_id='${spouse}' and canonical_field_key='person.has_children' and superseded_by_id is null`);
    ok("QA-164 (pass and fail): with a child on the case, the officer confirms the spouse's section although the client's \"has any children\" answer in it is not shown (worked out from the case); before the fix: 409 \"changed\" person.has_children, every time", spouseSays.status < 300 && !!famSec && !!sec && !sec.questions.some((q) => q.fact === "person.has_children") && conf.status < 300, { put: spouseSays.status, section: famSec, confirm: conf.status, detail: conf.body?.detail, changed: conf.body?.changed });
    ok("QA-164: the hidden answer is neither confirmed nor changed by that confirm (the officer never saw it)", stillDeclared === "DECLARED", stillDeclared);
  }
  const d4After = await d4("agent", OFFICER), d4Client = await d4("sqr", CLIENT);
  ok("D4 (P-229 (3), pass and fail): a No that a child on the case overrides is a check on that person in the officer's Agent view (the principal and, since the QA-164 step, the spouse: one each); none before the child, none in the client's view", said.status < 300 && d4Before.length === 0 && d4After.filter((x) => x.subjectId === principalId).length === 1 && d4After.length === 2 && d4After.some((x) => x.subjectId === spouse) /* QA-164 step: the spouse said No too */ && /'s answer to "Whether the person has any children[^"]*" is No, but a child is on this case/.test(d4After[0].message) && d4Client.length === 0, { said: said.status, before: d4Before.length, after: d4After.length, client: d4Client.length });
  const afterChild = await asksChildren();
  ok("C7.7 (review m1, pass and fail): \"has any children\" is asked with no child on the case, and not asked once the case holds a child", before === true && afterChild === false, { before, afterChild });
  const agentRep = (await qsOf("agent", OFFICER)).flatMap((x) => x.questions).filter((q) => q.subjectId === "representative");
  const clientRep = (await qsOf("sqr", CLIENT)).filter((x) => /representative/i.test(x.about_label));
  ok("C7.7 (review M1): the officer sees the representative's facts as from the firm record; the client's questionnaire has no representative part", agentRep.some((q) => q.answer?.channel === "firm_record") && clientRep.length === 0, { agent: agentRep.length, client: clientRep.map((x) => x.about_label) });

  // C7.7 review B1: an IMM 5476 copy holds the representative's firm-record facts (the phone is an object) and is current
  // right after it is made: not "out of date", so locking it is never refused for that.
  const gen5476 = await call("POST", `/runtime/cases/${caseId}/forms/${encodeURIComponent("IMM 5476")}/${opened.body?.principal?.subject_id ?? sql(`select subject_id from case_participant where case_id='${caseId}' and role='principal'`)}/generate`, { idempotencyKey: `b1-${Date.now().toString(36)}` }, OFFICER);
  const copyId: string | undefined = gen5476.body?.id;
  for (let i = 0; i < 180 && copyId && !["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body?.status); i++) await new Promise((r) => setTimeout(r, 500));
  const made = copyId ? (await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body : null;
  const phone = sql(`select count(*) from form_instance f, jsonb_array_elements(f.result_json->'boxes') b where f.id='${copyId}' and b->>'fact' = 'person.telephone_number' and b->>'box' like '%SectionB%question7%' and b->>'result' = 'written'`);
  const country = sql(`select b->>'result' from form_instance f, jsonb_array_elements(f.result_json->'boxes') b where f.id='${copyId}' and b->>'fact' = 'person.mailing_address_country' and b->>'box' like '%SectionB%question7%'`);
  ok("C7.7 (review B1, M2): a new IMM 5476 copy writes the representative's phone from the firm record and nothing has changed since it was made", made?.status === "GENERATED" && Array.isArray(made?.changed) && made.changed.length === 0 && Number(phone) === 2 && country === "written", { status: made?.status, changed: made?.changed, phone, country });
  const lk = copyId ? await call("POST", `/runtime/form-copies/${copyId}/lock`, { kind: "filed" }, OFFICER) : null;
  ok("C7.7 (review B1, fail before the fix): locking that copy is never refused as out of date", !!lk && !/out of date/i.test(lk.body?.detail ?? ""), lk?.body?.detail);

  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; });
