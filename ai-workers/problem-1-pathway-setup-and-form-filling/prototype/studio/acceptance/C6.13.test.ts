// C6.13 Filing changes while preparing (B135; P-406 (1); concept screens/B135/concept.md r2, challenge.md): Make
// principal, Remove filing and Add filing back on a Visitor visa case, by the routes the case page calls (POST
// /runtime/cases/:id/filing-changes, preview then apply; GET for the reasons). The family is the pack's FAMILY (Sample
// Client A, Sample Spouse A, Sample Child A1 aged 10, Sample Child A2 aged 15), all travelling, as C6.12: visitor visa
// CAD 100 each (4 → CAD 400), biometrics CAD 85 each capped at CAD 170 for 2 or more (3 eligible → CAD 170), CAD 570 in
// all (fee table, cited VV-R13, VV-R14; Sample until the immigration expert confirms).
//   (first, on a fresh copy: tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts, as for C6.12)
//   tsx studio/acceptance/C6.13.test.ts 4440 xr_studio_accept
import { AUTHOR, CLIENT, FAMILY, OFFICER, answer, call, firms, inDays, main, needVisitorVisa, ok, openCase, prepare, readyToFile, sql, yearsAgo, type Prepare } from "./lib/m3.ts";

const payable = (p: Prepare | null) => Math.round((p?.fees ?? []).filter((f) => !f.exempt && !(f as { waiting?: string }).waiting).reduce((s, f) => s + f.amount, 0) * 100);
const words = (b: unknown) => JSON.stringify(b ?? {});
/** Every answer's confirmation in the agent view, by answer id (BR-3b: unchanged by a swap). */
function confirmations(v: unknown): Map<string, boolean> {
  const out = new Map<string, boolean>();
  const walk = (x: unknown) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { const o = x as Record<string, unknown>; if (typeof o.id === "string" && typeof o.confirmed === "boolean") out.set(o.id, o.confirmed); Object.values(o).forEach(walk); } };
  walk(v);
  return out;
}

await main("C6.13", "Filing changes while preparing (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const officer = c.officer;
  const [A, S, K1, K2] = ["Sample Client A", "Sample Spouse A", "Sample Child A1", "Sample Child A2"].map((n) => c.subjects[n]);
  const before = (await prepare(c.id)).p;
  ok("C6.13-0 pass (setup): four filings, CAD 570 payable (visa 400, biometrics 170 capped)", before?.filings.length === 4 && payable(before) === 57000, { filings: before?.filings.length, payable: payable(before) });

  // 1 · preview of removing the spouse's filing names the dependants
  let r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: S, preview: true }, officer);
  const pv = r.body;
  const line = (s: string) => (pv?.changes ?? []).find((x: { person: string }) => x.person === s)?.words?.join(" | ") ?? "";
  ok("C6.13-1 pass (BR-4): the preview names Sample Client A's and Sample Child A2's filings with the biometrics change; total CAD 570 → CAD 470",
    r.status === 200 && /Biometrics.*CAD 170 → CAD 85/i.test(line(A)) && /Biometrics.*covered by the family maximum → CAD 85/i.test(line(K2)) && /stops/.test(line(S)) && pv?.totals?.before_cents === 57000 && pv?.totals?.after_cents === 47000 && /^[0-9a-f]{64}$/.test(pv?.basis ?? ""), pv);
  ok("C6.13-1a pass (BR-4): a filing that does not change is not named (Sample Child A1, 10: no biometrics)", !(pv?.changes ?? []).some((x: { person: string }) => x.person === K1));
  ok("C6.13-1b pass: the preview changes nothing", sql(`select applies::text from case_participant where subject_id='${S}'`) === "true" && sql(`select count(*) from filing_change where case_id='${c.id}'`) === "0");

  // 2 · a reason is required
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: S, basis: pv?.basis }, officer);
  ok("C6.13-2 fail (BR-6): applying without a reason is refused on the field (400)", r.status === 400 && /reason/i.test(words(r.body)), r.body);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: S, basis: pv?.basis, reason: "\u200b\u200b" }, officer);
  ok("C6.13-2a fail (break m): a reason of invisible characters only is refused (400)", r.status === 400 && /reason/i.test(words(r.body)), r.body);

  // 3 · remove
  const ids0 = Object.fromEntries((before?.filings ?? []).map((f) => [f.applicants[0]?.subject, f.id]));
  const items0 = sql(`select string_agg(id::text, ',' order by id) from filing_item where case_id='${c.id}' and subject_id='${S}'`);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: S, basis: pv?.basis, reason: "Added by mistake (Sample)" }, officer);
  const p3 = (await prepare(c.id)).p;
  const visa3 = (p3?.fees ?? []).filter((f) => /visitor visa/i.test(f.line) && !f.exempt).reduce((s, f) => s + f.amount, 0);
  const bio3 = (p3?.fees ?? []).filter((f) => /biometric/i.test(f.line) && !f.exempt);
  ok("C6.13-3 pass (BR-1): removed: three filings, visa CAD 300, biometrics 2 × CAD 85 with no cap; the spouse's items inactive; the reason on a filing_change row",
    r.status === 200 && p3?.filings.length === 3 && visa3 === 300 && bio3.length === 2 && bio3.every((f) => f.amount === 85)
    && sql(`select count(*) from filing_item where case_id='${c.id}' and subject_id='${S}' and active`) === "0"
    && sql(`select reason from filing_change where case_id='${c.id}' and kind='remove_filing'`) === "Added by mistake (Sample)", { status: r.status, body: r.body, visa3, bio3 });
  ok("C6.13-6c pass (M7): the preview's \"after\" total equals Prepare application's after the change", payable(p3) === pv?.totals?.after_cents, { prepare: payable(p3), preview: pv?.totals?.after_cents });
  ok("C6.13-3a pass (BR-11): the answer offers the inverse change as Undo", r.body?.undo?.kind === "add_back" && r.body?.undo?.subject === S, r.body);
  const hist = await call("GET", `/runtime/cases/${c.id}/filing-changes`, undefined, officer);
  ok("C6.13-3b pass (BR-6): the reason is read back for the person's row", hist.status === 200 && hist.body?.changes?.[0]?.reason === "Added by mistake (Sample)" && hist.body?.changes?.[0]?.subject === S, hist.body);

  // 4 · add back: the same filing and items
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "add_back", subject: S, preview: true }, officer);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "add_back", subject: S, basis: r.body?.basis, reason: "Undo: Added by mistake (Sample)" }, officer);
  const p4 = (await prepare(c.id)).p;
  ok("C6.13-4 pass (BR-1): Add filing back returns the same filing id and the same items, active", r.status === 200 && p4?.filings.length === 4
    && p4.filings.find((f) => f.applicants[0]?.subject === S)?.id === ids0[S] && sql(`select string_agg(id::text, ',' order by id) from filing_item where case_id='${c.id}' and subject_id='${S}'`) === items0 && payable(p4) === 57000, { status: r.status, body: r.body });

  // 5 · the principal's filing
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: A, preview: true }, officer);
  ok("C6.13-5 fail (BR-2): removing the principal's filing → 422 \"Make someone else principal first\"", r.status === 422 && /Make someone else principal first/.test(words(r.body)), r.body);

  // 6 · make principal
  await answer(c.id, A, "person.family_name", "SAMPLE-A", CLIENT);
  await answer(c.id, S, "person.family_name", "SAMPLE-S", CLIENT);
  const conf0 = confirmations((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "make_principal", subject: S, preview: true }, officer);
  const mp = r.body, mline = (s: string) => (mp?.changes ?? []).find((x: { person: string }) => x.person === s)?.words?.join(" | ") ?? "";
  ok("C6.13-6d pass (BR-4, M6): the preview names who signs for the minor children (the new principal instead of the former)",
    r.status === 200 && /Signed for as their parent by Sample Spouse A instead of Sample Client A/.test(mline(K1)) && /Signed for as their parent by Sample Spouse A/.test(mline(K2)), mp);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "make_principal", subject: S, basis: mp?.basis, reason: "The spouse holds the job offer (Sample)" }, officer);
  const p6 = (await prepare(c.id)).p;
  const capped = (p6?.fees ?? []).filter((f) => /biometric/i.test(f.line) && !f.exempt);
  const fS = p6?.filings.find((f) => f.applicants[0]?.subject === S)?.id;
  ok("C6.13-6 pass (BR-3): Make principal swaps the roles and the capped biometrics move to the new principal's filing",
    r.status === 200 && sql(`select role from case_participant where subject_id='${S}'`) === "principal" && sql(`select role from case_participant where subject_id='${A}'`) === "spouse_or_partner"
    && capped.length === 1 && capped[0].amount === 170 && capped[0].filing === fS && sql(`select role from filing_applicant where filing_id='${fS}' and subject_id='${S}'`) === "principal", { status: r.status, body: r.body, capped });
  const conf1 = confirmations((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body);
  const view6 = (await call("GET", `/runtime/cases/${c.id}`, undefined, officer)).body;
  const flag = (x: string) => (view6?.people ?? []).find((p: { subject_id: string }) => p.subject_id === x)?.client;
  let whyS = "";
  const findWhy = (x: unknown): void => { if (Array.isArray(x)) x.forEach(findWhy); else if (x && typeof x === "object") { const o = x as Record<string, unknown>; if (o.value === "SAMPLE-S" && typeof o.why === "string") whyS = o.why; Object.values(o).forEach(findWhy); } };
  findWhy((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body);
  ok("C6.13-6e pass (break M1): after the swap the case says who the client is (Sample Client A), and the new principal's answers read \"Answered by the client\", not by the principal",
    flag(A) === true && flag(S) === false && /^Answered by the client/.test(whyS), { a: flag(A), s: flag(S), whyS });
  ok("C6.13-6b pass (BR-3b, the Blocker): no answer's confirmation changes with the swap (the client stays the same person)",
    conf0.size > 0 && conf0.size === conf1.size && [...conf0].every(([id, v]) => conf1.get(id) === v), { before: [...conf0].filter(([, v]) => v).length, after: [...conf1].filter(([, v]) => v).length, size: conf0.size });

  // 7, 8 · refusals in words
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "make_principal", subject: K2, preview: true }, officer);
  ok("C6.13-7 fail (BR-3): a child is not made principal (422, \"a child of the principal\")", r.status === 422 && /child of the principal/.test(words(r.body)), r.body);
  let q = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: A, preview: true }, officer);
  q = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: A, basis: q.body?.basis, reason: "Not travelling (Sample)" }, officer);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "make_principal", subject: A, preview: true }, officer);
  ok("C6.13-8 fail (BR-3): a person not travelling is not made principal (422, add their filing back first)", q.status === 200 && r.status === 422 && /filing back first/.test(words(r.body)), { q: q.body, r: r.body });

  // 9 · a stale preview
  const stale = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "add_back", subject: A, preview: true }, officer);
  await answer(c.id, K2, "person.date_of_birth", yearsAgo(13)); // the child is now 13: no biometrics, so the money changes
  const roles9 = sql(`select string_agg(subject_id::text || role || applies::text, ',' order by subject_id) from case_participant where case_id='${c.id}'`);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "add_back", subject: A, basis: stale.body?.basis, reason: "Travelling after all (Sample)" }, officer);
  ok("C6.13-9 fail (BR-8): applying over a preview the case has moved on from → 409, nothing changed",
    r.status === 409 && sql(`select string_agg(subject_id::text || role || applies::text, ',' order by subject_id) from case_participant where case_id='${c.id}'`) === roles9, r.body);

  // 11 · who
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: K1, preview: true }, CLIENT);
  ok("C6.13-11 fail (BR-9): a client cannot change filings (403)", r.status === 403, r.status);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "nonsense" }, CLIENT);
  ok("C6.13-11c fail (break m): a client's malformed body is still a 403, not a 400", r.status === 403, r.status);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: K1, preview: true }, AUTHOR);
  ok("C6.13-11a fail (BR-9): a configuration person cannot (403)", r.status === 403, r.status);
  r = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: K1, preview: true }, "user-S");
  ok("C6.13-11b fail (BR-9): staff of another firm do not find the case (404)", r.status === 404, r.status);

  // 12 · the PATCH door leaves the same record and refuses the principal
  r = await call("PATCH", `/runtime/cases/${c.id}/people/${K1}`, { applies: false }, officer);
  ok("C6.13-12 pass (BR-10): the travelling flag door writes a filing_change row (no reason)", r.status === 200 && sql(`select count(*) from filing_change where case_id='${c.id}' and kind='travelling_flag' and subject_id='${K1}' and reason is null`) === "1", r.body);
  r = await call("PATCH", `/runtime/cases/${c.id}/people/${S}`, { applies: false }, officer);
  ok("C6.13-12a fail (BR-10): the travelling flag door still refuses the principal", r.status === 404 || r.status === 422, r.status);
  ok("C6.13-12b pass (append-only): a filing_change row cannot be updated", sql(`update filing_change set reason='x' where case_id='${c.id}'`) === null && sql(`select count(*) from filing_change where reason='x'`) === "0");

  // 13 · Ready to file: the preview names every filing the apply takes back, and no other (review M1, M2; break M2, M4)
  const f = await firms();
  const c3 = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }, { role: "child", name: "Sample Child A1", dob: yearsAgo(10) }], { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] });
  const [A3, S3, K3] = [c3.subjects["Sample Client A"], c3.subjects["Sample Spouse A"], c3.subjects["Sample Child A1"]];
  const ready3 = await readyToFile(c3.id, f.rep);
  const st = (x: string) => sql(`select status from filing where case_id='${c3.id}' and subject_id='${x}'`);
  let q3 = await call("POST", `/runtime/cases/${c3.id}/filing-changes`, { kind: "remove_filing", subject: S3, preview: true }, c3.officer);
  const said = (x: string) => (q3.body?.changes ?? []).find((y: { person: string }) => y.person === x)?.words?.join(" | ") ?? "";
  ok("C6.13-13 pass (BR-6): with every filing Ready to file, the preview says \"Marked Ready to file → Not started\" for the principal's filing, whose fee changes, and not for the child's, which does not",
    ready3.length === 3 && /Marked Ready to file → Not started/.test(said(A3)) && !said(K3), { ready3, a: said(A3), k: said(K3) });
  r = await call("POST", `/runtime/cases/${c3.id}/filing-changes`, { kind: "remove_filing", subject: S3, basis: q3.body?.basis, reason: "Not travelling after all (Sample)" }, c3.officer);
  ok("C6.13-13a pass (BR-6): the apply takes back exactly the filings the preview named: the principal's is Not started", r.status === 200 && st(A3) === "NOT_STARTED", { status: r.status, a: st(A3) });
  ok("C6.13-13b fail (BR-6): a filing the preview did not name keeps its Ready to file mark (the child's)", st(K3) === "READY_TO_FILE", st(K3));
  r = await call("PATCH", `/runtime/cases/${c3.id}/people/${S3}`, { applies: true }, c3.officer);
  ok("C6.13-13c pass (BR-10, break M2): the travelling flag door, which has no preview, takes back every Ready to file mark of the case", r.status === 200 && st(K3) === "NOT_STARTED", { status: r.status, k: st(K3) });
  ok("C6.13-13d fail (break m): a filing_change row is not deleted while its case exists", sql(`delete from filing_change where case_id='${c3.id}'`) === null && Number(sql(`select count(*) from filing_change where case_id='${c3.id}'`)) >= 2);

  // 10 · once anything is recorded, nothing changes
  const c2 = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] });
  const [A2, S2] = [c2.subjects["Sample Client A"], c2.subjects["Sample Spouse A"]];
  const ready = await readyToFile(c2.id, f.rep);
  let p10 = (await prepare(c2.id)).p;
  const g = p10?.groups[0], [fA, fS2] = [p10?.filings.find((x) => x.applicants[0]?.subject === A2)?.id, p10?.filings.find((x) => x.applicants[0]?.subject === S2)?.id];
  const rec = await call("PATCH", `/runtime/groups/${g?.id}/record`, { filings: [{ filing: fA, our_reference: "SAMPLE-REF-1", submitted_on: inDays(0), application_number: "V300000101", fee_receipt: "SAMPLE-RECEIPT" }, { filing: fS2, our_reference: "SAMPLE-REF-2", submitted_on: inDays(0), application_number: "V300000102", fee_receipt: "SAMPLE-RECEIPT" }], ucis: [{ subject: A2, uci: "1111-1111" }, { subject: S2, uci: "2222-2222" }], version: p10?.version }, c2.officer);
  p10 = (await prepare(c2.id)).p;
  const tries = await Promise.all([["remove_filing", S2], ["make_principal", S2], ["add_back", S2]].map(([kind, subject]) => call("POST", `/runtime/cases/${c2.id}/filing-changes`, { kind, subject, preview: true }, c2.officer)));
  ok("C6.13-10 fail (BR-7): once the group is recorded as submitted, Remove filing, Make principal and Add filing back are refused (409) with the date, the number and \"case's lifecycle\"",
    ready.length === 2 && rec.status === 200 && tries.every((t) => t.status === 409 && /recorded as submitted to IRCC on \d{4}-\d{2}-\d{2} \(V30000010[12]\)/.test(words(t.body)) && /case's lifecycle/.test(words(t.body))), { ready, rec: rec.status, tries: tries.map((t) => [t.status, t.body?.detail]) });
});
