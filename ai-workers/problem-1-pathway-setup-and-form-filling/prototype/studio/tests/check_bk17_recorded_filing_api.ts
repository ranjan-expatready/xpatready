// BK-17 (P-486, P-481; BK-15 breaker M3, PR #1591): a filing recorded as submitted keeps its label, its people, its items
// and its frozen fees when an answer changes afterwards. On the configured checkpoint, through the product's routes: a
// Study permit (outside Canada) family, a student and a child of 15 who studies 6 months or more (the child's line adds
// their own Study permit application, M3-S2), is made Ready to file and recorded. Then the officer answers "No" to the
// child's "6 months or more" (allowed: an answer changed after filing opens a "Filed with an earlier value" task, BR-12).
// Before BK-17 the next Prepare read dropped the child's recorded application (made inactive: the child moved onto the
// student's recorded application, with new items there), so a submitted filing vanished and another changed its people.
// After: both recorded applications read as they were recorded (same ids, labels, numbers, people, items, fees), on
// GET …/prepare and GET …/filings; the other way round (recorded with No, then Yes) makes no new application; and an
// unrecorded family with the same answer is worked out again as before (control). No model call (US$0).
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
const before = shape(v), feesBefore = fees(v), kidBefore = kidFiling();
ok("BK-17 setup: the submission is recorded (200), both filings read submitted with their numbers", rec.status === 200 && before.length === 2 && before.every((x) => x.status === "submitted" && !!x.number), [rec.status, rec.body?.detail, before]);

const inactive = () => [sql(`select count(*) from filing where case_id='${c.id}' and active=false`), sql(`select count(*) from filing_item where case_id='${c.id}' and active=false`), sql(`select count(*) from filing_applicant a join filing f on f.id=a.filing_id where f.case_id='${c.id}'`)];
const stillBefore = inactive();
const no = await answer(c.id, K, STUDIES, false, officer);
ok("BK-17 pass: the answer itself is still taken after filing (200; BR-12 marks what was filed with an earlier value)", no.status === 200, [no.status, no.body?.detail]);
v = await view(c.id);
const after = shape(v);
ok("BK-17 pass (fail-first): after the answer changes, the recorded filings read as recorded: same ids, labels, numbers, people and items", JSON.stringify(after) === JSON.stringify(before), { before, after });
ok("BK-17 fail: the child's recorded application is never relabelled or dropped (still \"Study permit: Sample Child R\", submitted, its number)", kidFiling()?.id === kidBefore?.id && kidFiling()?.label === "Study permit: Sample Child R" && kidFiling()?.status === "submitted" && kidFiling()?.number === kidBefore?.number, kidFiling());
ok("BK-17 fail: the student's recorded application never gains the child (its people are those recorded)", (v?.filings.find((x) => x.owner?.subject === S)?.applicants ?? []).every((a) => a.subject !== K), v?.filings.find((x) => x.owner?.subject === S)?.applicants);
ok("BK-17 pass: the frozen fees stay (same groups, totals and lines; Study permit has no fee lines on the checkpoint, so the pure check_bk17_keep_recorded proves the fee rule and check_b152 the frozen amounts)", fees(v) === feesBefore, { now: fees(v), before: feesBefore });
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

// (2) The other way: recorded with "No" (the child applying on the student's application), then "Yes". The recorded
// application keeps the child and no new application is made for them.
{
  const r = await openCase(sp, family("N"), team, `BK17-N-${Date.now().toString(36)}`);
  const NS = r.subjects["Sample Student N"], NK = r.subjects["Sample Child N"];
  await answer(r.id, NK, STUDIES, false, officer);
  await confirmAll(r.id, NK);
  const n = await readyToFile(r.id, rep);
  let nv = await view(r.id);
  const nrec = await call("PATCH", `/runtime/groups/${nv!.groups[0].id}/record`, { version: nv!.version, ucis: [], filings: nv!.filings.map((x, i) => ({ filing: x.id, our_reference: `SAMPLE-BK17N-${i + 1}`, submitted_on: inDays(0), application_number: `T${Date.now().toString().slice(-7)}${i + 1}`, fee_receipt: "SAMPLE-RECEIPT" })) }, officer);
  nv = await view(r.id);
  const nBefore = shape(nv);
  ok("BK-17 setup: recorded with \"No\": one application, the child applying on the student's", n.length === 1 && nrec.status === 200 && nBefore.length === 1 && nBefore[0].status === "submitted" && nBefore[0].people.includes(`${NK}:applying`), [n.length, nrec.status, nrec.body?.detail, nBefore]);
  const y = await answer(r.id, NK, STUDIES, true, officer);
  nv = await view(r.id);
  ok("BK-17 pass (other way): after \"Yes\" the recorded application reads as recorded (the child still on it) and no new application is made for the child", y.status === 200 && JSON.stringify(shape(nv)) === JSON.stringify(nBefore) && sql(`select count(*) from filing where case_id='${r.id}'`) === "1", { y: y.status, before: nBefore, after: shape(nv), rows: sql(`select count(*) from filing where case_id='${r.id}'`) });
  ok("BK-17 fail (other way): the student's recorded application never loses the child to a new one", nv?.filings.find((x) => x.owner?.subject === NS)?.applicants.some((a) => a.subject === NK && a.mode === "applying") === true, nv?.filings);
}

// (3) Break B1/B2 (BK-17 breaker): the child's application is split out and only the student's group is recorded. "No"
// would put the child on the student's recorded application, which takes nobody: the child stays on their own
// (unrecorded) application, so they never vanish and ending the stage still names it as not recorded.
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
  const xBefore = shape(xv).find((x) => x.id === xKid?.id);
  const xn = await answer(r.id, XK, STUDIES, false, officer);
  xv = await view(r.id);
  const xKidNow = xv?.filings.find((x) => x.id === xKid?.id);
  ok("BK-17 pass (break B1): after \"No\", the child stays on their own application (same filing, still applying, with items), not on no filing", xn.status === 200 && !!xKidNow && xKidNow.applicants.some((a) => a.subject === XK && a.mode === "applying") && (xv?.items ?? []).some((i) => i.filing === xKidNow.id && i.subject === XK), { before: xBefore, now: xKidNow, items: (xv?.items ?? []).filter((i) => i.subject === XK).length });
  ok("BK-17 fail (break B1): the student's recorded application never gains the child, and the child's row is never made inactive", (xv?.filings.find((x) => x.owner?.subject === XS)?.applicants ?? []).every((a) => a.subject !== XK) && sql(`select active::text from filing where id='${xKid?.id}'`) === "true", [xv?.filings.find((x) => x.owner?.subject === XS)?.applicants, sql(`select active::text from filing where id='${xKid?.id}'`)]);
  const xfl = (await call("GET", `/runtime/cases/${r.id}/filings`, undefined, officer)).body as { filings: { id: string; applicants: { subject: string }[] }[] };
  ok("BK-17 pass (break B1): GET …/filings agrees: the child is on their own application", (xfl?.filings ?? []).some((x) => x.id === `filing-${XK}` && x.applicants.some((a) => a.subject === XK)), xfl?.filings);
  const nx = await call("GET", `/runtime/cases/${r.id}/stages/next`, undefined, officer);
  ok("BK-17 fail (break B2): ending the stage still names the child's application as not recorded (so a reason is required)", nx.status !== 200 || ((nx.body?.unrecorded ?? []) as { filing: string }[]).some((u) => u.filing === xKid?.id), [nx.status, nx.body?.unrecorded ?? nx.body?.detail]);
}

// (4) Control: an unrecorded family with the same answer is worked out again (only a recorded filing is kept).
const u = await openCase(sp, family("U"), team, `BK17-U-${Date.now().toString(36)}`);
const UK = u.subjects["Sample Child U"];
await answer(u.id, UK, STUDIES, true, officer);
const u1 = await view(u.id);
await answer(u.id, UK, STUDIES, false, officer);
const u2 = await view(u.id);
ok("BK-17 fail (control): unrecorded, \"No\" still moves the child onto the student's application (one filing, the child applying on it)", u1?.filings.length === 2 && u2?.filings.length === 1 && u2.filings[0].applicants.some((a) => a.subject === UK && a.mode === "applying") && u2.filings[0].label === u1.filings.find((x) => x.owner?.subject === u.subjects["Sample Student U"])?.label, [u1?.filings.map((x) => x.label), u2?.filings.map((x) => [x.label, x.applicants])]);
ok("BK-17 fail: a client cannot read the recorded case (403)", (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, "user-P")).status === 403);
process.exitCode = summary() ? 1 : 0;
