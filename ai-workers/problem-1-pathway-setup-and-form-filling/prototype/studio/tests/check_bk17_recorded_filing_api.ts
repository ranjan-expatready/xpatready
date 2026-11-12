// BK-17 (P-486, P-481; BK-15 breaker M3, PR #1591): a filing recorded as submitted keeps its label, its people, its items
// and its frozen fees when an answer changes afterwards. On the configured checkpoint, through the product's routes: a
// Study permit (outside Canada) family, a student and a child of 15. Since BK-15 and BK-16 (P-486 R-e, P-490; Guide 5269:
// family members complete their own application forms) each person files their own application: the child's
// "6 months or more" Yes makes it "Study permit: <child>" (the line adds it, M3-S2), No makes it "Visitor visa: <child>",
// the same filing (one per owner). The family is made Ready to file and recorded, then the officer changes the child's
// answer (allowed: an answer changed after filing opens a "Filed with an earlier value" task, BR-12). Before BK-17 the next
// Prepare read relabelled the child's recorded application (BK-15 breaker B3: "Study permit" → "Visitor visa").
// After: both recorded applications read as they were recorded (same ids, labels, numbers, people, items, frozen fees), on
// GET …/prepare and GET …/filings, both ways (Yes → No, No → Yes) and with no third application; an application not
// recorded still follows the answers, even beside a recorded one (the stage names it as not recorded); and an
// unrecorded family with the same answer is worked out again (control). Break B1 (an answer that moves a person onto a
// recorded filing, which takes nobody) has no route case on current data: the only line rule that adds a filing
// (samples/conditional-filings.json, sp.outside) now switches the child between two applications of their own, so
// check_bk17_keep_recorded proves B1 (keptRowsOf, keepRecorded) on its own. Case (3) keeps the breaker's set-up but
// passes on main's code too: no route check here fails on B1/B2 any more, and the sync wiring that fixed them
// (keptRowsOf feeding sync in case-prepare.ts: the kept row stays active and the stage still lists it) is proven by no
// test until a combination's line can again move a person onto another filing (review r4-m1). No model call (US$0).
//   zsh studio/tools/isolated.sh rt_bk17 4436 start && tsx studio/tests/check_bk17_recorded_filing_api.ts 4436 xr_studio_rt_bk17
import { answer, call, confirmAll, firms, inDays, openCase, prepare, readyToFile, sql, yearsAgo, type Prepare } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const AUTHOR = "user-A", STUDIES = "person.studies_six_months_or_more";
const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("sp.outside")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R";
const team = { representative: rep, caseOfficers: [officer] };
const sp = comboId("sp.outside")!;
type View = Omit<Prepare, "filings" | "groups" | "fees"> & { filings: (Prepare["filings"][number] & { label: string; owner?: { subject: string } })[]; groups: (Prepare["groups"][number] & { total_cents: number | null; fees_recorded?: { at: string } })[]; fees: (Prepare["fees"][number] & { key?: string; amount_cents?: number })[] };
const view = async (id: string) => (await prepare(id, officer)).p as View | null;
/** Each filing as a person reads it: id, label, status, number, who is on it and how, its items. */
const shape = (v: View | null) => (v?.filings ?? []).map((x) => ({ id: x.id, label: x.label, status: x.status, number: x.number ?? null, group: x.group,
  people: x.applicants.map((a) => `${a.subject}:${a.mode}`).sort(), items: (v?.items ?? []).filter((i) => i.filing === x.id).map((i) => i.id).sort() })).sort((a, b) => a.id.localeCompare(b.id));
const fees = (v: View | null) => JSON.stringify({ groups: (v?.groups ?? []).map((g) => [g.id, g.total_cents]), lines: (v?.fees ?? []).map((l) => [l.filing, l.subject, l.key ?? l.line, l.amount_cents ?? l.amount, !!l.exempt]).sort() });
const family = (name: string) => [{ role: "principal" as const, name: `Sample Student ${name}`, dob: yearsAgo(30) }, { role: "child" as const, name: `Sample Child ${name}`, dob: yearsAgo(15) }];

// (1) Recorded: the answer that decides the child's application changes after the submission is recorded.
const c = await openCase(sp, family("R"), team, `BK17-R-${Date.now().toString(36)}`);
const S = c.subjects["Sample Student R"], K = c.subjects["Sample Child R"];
// The officer answers and confirms the child's section, so the set-up's Sample fill (an unconfirmed Yes/No is No) leaves it Yes.
const yes = await answer(c.id, K, STUDIES, true, officer);
await confirmAll(c.id, K);
let v = await view(c.id);
const kidFiling = (): View["filings"][number] | undefined => v?.filings.find((x) => x.owner?.subject === K || x.applicants.some((a) => a.subject === K && a.mode === "applying"));
ok("BK-17 setup: \"6 months or more\" Yes adds the child's own Study permit application (two filings)", yes.status < 300 && v?.filings.length === 2 && /^Study permit: Sample Child R$/.test(kidFiling()?.label ?? ""), [yes.status, v?.filings.map((x) => x.label)]);
const ready = await readyToFile(c.id, rep);
v = await view(c.id);
ok("BK-17 setup: both filings reach Ready to file", ready.length === 2 && v?.filings.every((x) => x.status === "ready_to_file") === true, [ready.length, v?.filings.map((x) => [x.label, x.status])]);
const g = v!.groups[0];
const rec = await call("PATCH", `/runtime/groups/${g.id}/record`, { version: v!.version, ucis: [], filings: v!.filings.map((x, i) => ({ filing: x.id, our_reference: `SAMPLE-BK17-${i + 1}`, submitted_on: inDays(0), application_number: `S${Date.now().toString().slice(-7)}${i + 1}`, fee_receipt: "SAMPLE-RECEIPT" })) }, officer);
v = await view(c.id);
const before = shape(v), feesBefore = fees(v), kidBefore = kidFiling(), before0 = v;
ok("BK-17 setup: the submission is recorded (200), both filings read submitted with their numbers", rec.status === 200 && before.length === 2 && before.every((x) => x.status === "submitted" && !!x.number), [rec.status, rec.body?.detail, before]);

const inactive = () => [sql(`select count(*) from filing where case_id='${c.id}' and active=false`), sql(`select count(*) from filing_item where case_id='${c.id}' and active=false`), sql(`select count(*) from filing_applicant a join filing f on f.id=a.filing_id where f.case_id='${c.id}'`)];
const stillBefore = inactive();
const no = await answer(c.id, K, STUDIES, false, officer);
ok("BK-17 pass: the answer itself is still taken after filing (200; BR-12 marks what was filed with an earlier value)", no.status === 200, [no.status, no.body?.detail]);
v = await view(c.id);
const after = shape(v);
ok("BK-17 pass (fail-first): after the answer changes, the recorded filings read as recorded: same ids, labels, numbers, people and items", JSON.stringify(after) === JSON.stringify(before), { before, after });
ok("BK-17 fail: the child's recorded application is never relabelled or dropped (still \"Study permit: Sample Child R\", submitted, its number)", kidFiling()?.id === kidBefore?.id && kidFiling()?.label === "Study permit: Sample Child R" && kidFiling()?.status === "submitted" && kidFiling()?.number === kidBefore?.number, kidFiling());
ok("BK-17 fail: the child stays alone on their own recorded application, and the student's never gains the child (people as recorded)", (kidFiling()?.applicants ?? []).map((a) => `${a.subject}:${a.mode}`).join() === `${K}:applying` && (v?.filings.find((x) => x.owner?.subject === S)?.applicants ?? []).every((a) => a.subject !== K), [kidFiling()?.applicants, v?.filings.find((x) => x.owner?.subject === S)?.applicants]);
ok("BK-17 pass: the frozen fees stay (same groups, totals and lines)", fees(v) === feesBefore, { now: fees(v), before: feesBefore });
// Since BK-15 Study permit has fee lines per person (fees_by_role): the child's own Study permit fee line, frozen at the
// record, stays on the child's recorded application after "No" (a Visitor visa has another fee).
const kidSp = (f: View | null) => (f?.fees ?? []).filter((l) => l.filing === kidBefore?.id && (l.key ?? l.line) === "study_permit").map((l) => l.amount_cents ?? l.amount);
ok("BK-17 pass: the child's frozen \"study_permit\" fee line is on their recorded application before and after the answer, same amount, and the group keeps its total", kidSp(before0).length === 1 && JSON.stringify(kidSp(v)) === JSON.stringify(kidSp(before0)) && (v?.groups ?? []).every((x) => x.total_cents !== null), { before: kidSp(before0), now: kidSp(v), totals: (v?.groups ?? []).map((x) => x.total_cents) });
ok("BK-17 data: after the answer, no filing or item of the recorded case was made inactive and no applicant row was added (inactive filings, inactive items, applicant rows as before)", JSON.stringify(inactive()) === JSON.stringify(stillBefore), { before: stillBefore, after: inactive() });
const again = await view(c.id);
ok("BK-17 pass: a second read stores nothing new (same version)", String(again?.version) === String(v?.version), [again?.version, v?.version]);
ok("BK-17 data: the record stored each filing's label with the group's recorded fees (recorded_fees.labels)", sql(`select recorded_fees->'labels'->>'${kidBefore?.id}' from submission_group where id='${g.id}'`) === "Study permit: Sample Child R", sql(`select recorded_fees->'labels' from submission_group where id='${g.id}'`));
// Review m2: a record made before BK-17 whose filing an earlier read made inactive (main's behaviour). Set up in SQL, as
// that read left it: the child's filing and its items inactive, and no labels stored with the group.
const kidItems = before.find((x) => x.id === kidBefore?.id)?.items ?? [];
sql(`update filing set active=false where id='${kidBefore?.id}'; update filing_item set active=false where filing_id='${kidBefore?.id}'; update submission_group set recorded_fees = recorded_fees - 'labels' where id='${g.id}'`);
const old = await view(c.id);
const oldKid = old?.filings.find((x) => x.id === kidBefore?.id);
const filedItems = (sql(`select string_agg(f->>'item', ',' order by f->>'item') from filing_record r, jsonb_array_elements(r.filed_facts) f where r.filing_id='${kidBefore?.id}'`) ?? "").split(",").filter(Boolean);
ok("BK-17 pass (review m2): a recorded filing an earlier read made inactive is listed again, submitted, with the form items it was filed with active", !!oldKid && oldKid.status === "submitted" && filedItems.length > 0 && filedItems.every((i) => (old?.items ?? []).some((x) => x.id === i && x.filing === oldKid.id)), { kid: oldKid?.label, filedItems, items: (old?.items ?? []).filter((x) => x.filing === kidBefore?.id).map((x) => x.id), kidItems });
ok("BK-17 fail (review m2): with no label stored (a record before BK-17) it reads a derived name, never another person's application", !!oldKid && oldKid.applicants.length === 1 && oldKid.applicants[0].subject === K && oldKid.label.endsWith(": Sample Child R"), oldKid?.label);
sql(`update submission_group set recorded_fees = jsonb_set(recorded_fees, '{labels}', '${JSON.stringify(Object.fromEntries(before.map((x) => [x.id, x.label])))}'::jsonb) where id='${g.id}'`);
// GET …/filings reads the recorded filings the same way (its ids are "filing-<owner>").
type Listed = { filings: { id: string; label: string; applicants: { subject: string }[]; group: string }[]; groups: { id: string; filings: string[] }[] };
const fl = (await call("GET", `/runtime/cases/${c.id}/filings`, undefined, officer)).body as Listed;
const flKid = fl?.filings?.find((x) => x.id === `filing-${K}`), flStudent = fl?.filings?.find((x) => x.id === `filing-${S}`);
ok("BK-17 pass: GET …/filings agrees: the child's recorded application is listed as recorded, in its group, and the student's never gains the child", flKid?.label === "Study permit: Sample Child R" && flKid.applicants.length === 1 && !!flStudent && flStudent.applicants.every((a) => a.subject !== K) && fl.groups.some((x) => x.filings.includes(`filing-${K}`) && x.filings.includes(`filing-${S}`)), fl?.filings?.map((x) => [x.id, x.label, x.applicants.map((a) => a.subject)]));

// (2) The other way: recorded with "No" (the child's own "Visitor visa" application), then "Yes". The child's recorded
// application keeps its label and the child, and no third application (a Study permit) is made for them.
{
  const r = await openCase(sp, family("N"), team, `BK17-N-${Date.now().toString(36)}`);
  const NS = r.subjects["Sample Student N"], NK = r.subjects["Sample Child N"];
  await answer(r.id, NK, STUDIES, false, officer);
  await confirmAll(r.id, NK);
  const n = await readyToFile(r.id, rep);
  let nv = await view(r.id);
  const nrec = await call("PATCH", `/runtime/groups/${nv!.groups[0].id}/record`, { version: nv!.version, ucis: [], filings: nv!.filings.map((x, i) => ({ filing: x.id, our_reference: `SAMPLE-BK17N-${i + 1}`, submitted_on: inDays(0), application_number: `T${Date.now().toString().slice(-7)}${i + 1}`, fee_receipt: "SAMPLE-RECEIPT" })) }, officer);
  nv = await view(r.id);
  const nBefore = shape(nv), nFees = fees(nv), rows = () => sql(`select count(*) from filing where case_id='${r.id}'`);
  const nKid = () => nv?.filings.find((x) => x.owner?.subject === NK);
  const nKidBefore = nKid();
  ok("BK-17 setup: recorded with \"No\": two applications, the child alone on their own \"Visitor visa: Sample Child N\", both submitted", n.length === 2 && nrec.status === 200 && nBefore.length === 2 && nBefore.every((x) => x.status === "submitted") && nKidBefore?.label === "Visitor visa: Sample Child N" && nKidBefore.applicants.map((a) => `${a.subject}:${a.mode}`).join() === `${NK}:applying` && rows() === "2", [n.length, nrec.status, nrec.body?.detail, nBefore.map((x) => [x.label, x.status, x.people]), rows()]);
  const y = await answer(r.id, NK, STUDIES, true, officer);
  nv = await view(r.id);
  ok("BK-17 pass (other way): after \"Yes\" both recorded applications read as recorded (same ids, labels, numbers, people, items, frozen fees) and no third application is made", y.status === 200 && JSON.stringify(shape(nv)) === JSON.stringify(nBefore) && fees(nv) === nFees && rows() === "2", { y: y.status, before: nBefore, after: shape(nv), rows: rows() });
  ok("BK-17 fail (other way): the child's recorded application is never relabelled (still \"Visitor visa: Sample Child N\", the child alone on it) and the student's never gains the child", nKid()?.id === nKidBefore?.id && nKid()?.label === "Visitor visa: Sample Child N" && nKid()?.applicants.map((a) => a.subject).join() === NK && (nv?.filings.find((x) => x.owner?.subject === NS)?.applicants ?? []).every((a) => a.subject !== NK), [nKid()?.label, nKid()?.applicants, nv?.filings.find((x) => x.owner?.subject === NS)?.applicants]);
}

// (3) The breaker's B1/B2 set-up (no longer reaching them, see the header): the child's application is split out and only the student's group is recorded. After "No"
// the child is still on their own (unrecorded) application, never on the student's recorded one, and ending the stage
// still names it as not recorded.
{
  const r = await openCase(sp, family("X"), team, `BK17-X-${Date.now().toString(36)}`);
  const XS = r.subjects["Sample Student X"], XK = r.subjects["Sample Child X"];
  await answer(r.id, XK, STUDIES, true, officer);
  await confirmAll(r.id, XK);
  let xv = await view(r.id);
  const xKid = xv?.filings.find((x) => x.owner?.subject === XK);
  const sp1 = await call("POST", `/runtime/groups/${xv!.groups[0].id}/split`, { filing: xKid?.id, reason: "BK-17 check: sent on its own (Sample)", version: xv!.version }, officer);
  await readyToFile(r.id, rep);
  xv = await view(r.id);
  const sGroup = xv?.groups.find((g) => g.filings.includes(xv!.filings.find((x) => x.owner?.subject === XS)!.id));
  const xrec = await call("PATCH", `/runtime/groups/${sGroup?.id}/record`, { version: xv!.version, ucis: [], filings: [{ filing: sGroup?.filings[0], our_reference: "SAMPLE-BK17X-1", submitted_on: inDays(0), application_number: `X${Date.now().toString().slice(-7)}1`, fee_receipt: "SAMPLE-RECEIPT" }] }, officer);
  xv = await view(r.id);
  ok("BK-17 setup (split): the child's application is split out and only the student's group is recorded", sp1.status === 200 && xrec.status === 200 && xv?.groups.length === 2 && xv.filings.find((x) => x.owner?.subject === XK)?.status !== "submitted", [sp1.status, sp1.body?.detail, xrec.status, xrec.body?.detail, xv?.filings.map((x) => [x.label, x.status])]);
  const xBefore = shape(xv).find((x) => x.id === xKid?.id), xStudentBefore = shape(xv).find((x) => x.id === xv?.filings.find((f) => f.owner?.subject === XS)?.id);
  const xn = await answer(r.id, XK, STUDIES, false, officer);
  xv = await view(r.id);
  const xKidNow = xv?.filings.find((x) => x.id === xKid?.id);
  // On current data "No" moves the child onto no other filing (their own becomes "Visitor visa"), so the kept-as-prepared
  // reading (keptRowsOf, break B1) is not reached here; it is proven in check_bk17_keep_recorded. What a route shows:
  // the unrecorded application still follows the answer beside the recorded one, which reads as recorded.
  ok("BK-17 pass (unrecorded beside recorded): after \"No\", the child's unrecorded application follows the answer (same filing, \"Visitor visa: Sample Child X\", the child applying, with items), never on no filing", xn.status === 200 && !!xKidNow && xKidNow.label === "Visitor visa: Sample Child X" && xKidNow.applicants.some((a) => a.subject === XK && a.mode === "applying") && (xv?.items ?? []).some((i) => i.filing === xKidNow.id && i.subject === XK), { before: xBefore, now: xKidNow, items: (xv?.items ?? []).filter((i) => i.subject === XK).length });
  ok("BK-17 fail (unrecorded beside recorded): the student's recorded application reads as recorded (same id, label, number, people, items)", JSON.stringify(shape(xv).find((x) => x.id === xStudentBefore?.id)) === JSON.stringify(xStudentBefore), { before: xStudentBefore, now: shape(xv).find((x) => x.id === xStudentBefore?.id) });
  ok("BK-17 fail (unrecorded beside recorded): the student's recorded application never gains the child, and the child's row is never made inactive", (xv?.filings.find((x) => x.owner?.subject === XS)?.applicants ?? []).every((a) => a.subject !== XK) && sql(`select active::text from filing where id='${xKid?.id}'`) === "true", [xv?.filings.find((x) => x.owner?.subject === XS)?.applicants, sql(`select active::text from filing where id='${xKid?.id}'`)]);
  const xfl = (await call("GET", `/runtime/cases/${r.id}/filings`, undefined, officer)).body as { filings: { id: string; applicants: { subject: string }[] }[] };
  ok("BK-17 pass (unrecorded beside recorded): GET …/filings agrees: the child is on their own application", (xfl?.filings ?? []).some((x) => x.id === `filing-${XK}` && x.applicants.some((a) => a.subject === XK)), xfl?.filings);
  const nx = await call("GET", `/runtime/cases/${r.id}/stages/next`, undefined, officer);
  ok("BK-17 fail (unrecorded beside recorded): ending the stage still names the child's application as not recorded (so a reason is required)", nx.status !== 200 || ((nx.body?.unrecorded ?? []) as { filing: string }[]).some((u) => u.filing === xKid?.id), [nx.status, nx.body?.unrecorded ?? nx.body?.detail]);
}

// (4) Control: an unrecorded family with the same answer is worked out again (only a recorded filing is kept).
const u = await openCase(sp, family("U"), team, `BK17-U-${Date.now().toString(36)}`);
const UK = u.subjects["Sample Child U"];
await answer(u.id, UK, STUDIES, true, officer);
const u1 = await view(u.id);
await answer(u.id, UK, STUDIES, false, officer);
const u2 = await view(u.id);
const uKid = (f: View | null) => f?.filings.find((x) => x.owner?.subject === UK);
ok("BK-17 fail (control): unrecorded, \"No\" still relabels the child's own application (same filing, \"Study permit\" → \"Visitor visa: Sample Child U\", the child alone on it), the student's unchanged", u1?.filings.length === 2 && u2?.filings.length === 2 && uKid(u1)?.label === "Study permit: Sample Child U" && uKid(u2)?.id === uKid(u1)?.id && uKid(u2)?.label === "Visitor visa: Sample Child U" && uKid(u2)?.applicants.map((a) => a.subject).join() === UK && JSON.stringify(shape(u2).find((x) => x.label.startsWith("Study permit (outside Canada)"))?.people) === JSON.stringify(shape(u1).find((x) => x.label.startsWith("Study permit (outside Canada)"))?.people), [u1?.filings.map((x) => x.label), u2?.filings.map((x) => [x.label, x.applicants.map((a) => a.subject)])]);
ok("BK-17 fail: a client cannot read the recorded case (403)", (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, "user-P")).status === 403);
process.exitCode = summary() ? 1 : 0;
