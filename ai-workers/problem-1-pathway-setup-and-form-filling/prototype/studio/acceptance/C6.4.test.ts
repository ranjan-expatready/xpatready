// C6.4 Dynamic document checklist per person (M3-C; r5c BR-3; P-169; stand-in SI-14 for storage and file status).
// Visitor visa part: the release's requirements × role × conditions on that person's facts, recomputed when answers
// change, with the reason; the team's words for states; the document belongs to the person; a new passport keeps the
// old one as history. Rules: VV-R05 (passport per person), VV-R06 (proof of financial support), VV-R08 and R3 (P-230 (3),
// closes FQ-4): a minor's "travels with" (both parents, one parent, another adult, alone) and custody decide the letter
// of authorization, the birth certificate copy, the absent parent's ID copy, custody documents and adoption or
// guardianship papers, under 18 only (Researched, canada.ca minor-children page, 2025-01-23, read 2026-11-02).
// Breadth, after Visitor visa: the police certificate no older than 6 months, the non-accompanying PR member 18+
// (waivable with a reason, P-171 (6)) and the Provincial nominee, Express Entry police and medical block (P-172); the
// visitor medical exam (VV-R16: a stay over 6 months AND a listed country, a public-health job or a super visa; FQ-11).
//   tsx studio/acceptance/C6.4.test.ts 4440 xr_studio_accept
import { CLIENT, FAMILY, OFFICER, answer, call, main, needVisitorVisa, ok, openCase, sql, yearsAgo } from "./lib/m3.ts";

type Line = { id: string; document_type: string; label: string; state: string; reason: string; required: boolean; documents?: { id: string; current: boolean }[] };
type Checklist = { stand_in?: string; people: { subject: string; lines: Line[] }[] };
const STATES = ["not_requested", "requested", "received", "being_checked", "approved", "rejected", "not_applicable"];

await main("C6.4", "Document checklist per person (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], K1 = c.subjects["Sample Child A1"];
  const get = async (actor = OFFICER) => { const r = await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, actor); return { r, l: r.status === 200 ? r.body as Checklist : null }; };
  const of = (l: Checklist | null, s: string) => l?.people.find((x) => x.subject === s)?.lines ?? [];
  const has = (l: Checklist | null, s: string, re: RegExp) => of(l, s).some((x) => re.test(x.label));
  let { r, l } = await get();
  ok("C6.4-1 pass: GET /runtime/cases/:id/checklist answers per person for the case officer; storage marked Stand-in SI-14", r.status === 200 && l?.people.length === 4 && l?.stand_in === "SI-14", r.status);
  ok("C6.4-2 fail: another client cannot read the checklist (403 or 404) while the officer can", r.status === 200 && [403, 404].includes((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, "user-Q")).status));
  ok("C6.4-3 pass: every person has a passport line (VV-R05)", [P, S, K1, c.subjects["Sample Child A2"]].every((s) => has(l, s, /passport/i)));
  ok("C6.4-4 pass: proof of financial support is on the principal only (VV-R06, Sample: the principal shows money for the family)", has(l, P, /financial support/i) && !has(l, S, /financial support/i) && !has(l, K1, /financial support/i));
  ok("C6.4-5 pass: each line says why it is there (requirement, role, condition)", of(l, P).length >= 2 && of(l, P).every((x) => typeof x.reason === "string" && x.reason.length > 5));
  ok("C6.4-6 pass: every line starts in one of the team's states, Not requested", (l?.people ?? []).flatMap((p) => p.lines).length >= 5 && (l?.people ?? []).flatMap((p) => p.lines).every((x) => STATES.includes(x.state) && x.state === "not_requested"));
  // R3 (P-230 (3), closes FQ-4): a minor's travel answers decide five lines, each only under 18 (worked out on the
  // application date). Researched (canada.ca minor-children page, 2025-01-23, read 2026-11-02): may change.
  const LETTER = /authori[sz]ation/i, BIRTH = /birth certificate/i, ABSENT = /absent parent/i, CUSTODY = /custody documents/i, ADOPT = /adoption or guardianship/i;
  const minorLines = [LETTER, BIRTH, ABSENT, CUSTODY, ADOPT];
  await answer(c.id, c.caseSubject, "case.application_date", new Date().toISOString().slice(0, 10), OFFICER);
  ({ l } = await get());
  ok("C6.4-7 fail (R3): with \"travels with\" and custody unanswered, the child has a passport line and none of the five minor lines", has(l, K1, /passport/i) && minorLines.every((re) => !has(l, K1, re)), of(l, K1).map((x) => x.label));
  const travels = async (v: string) => { await answer(c.id, K1, "person.travels_with", v, CLIENT); return (await get()).l; }; // the principal answers for a minor (P-78)
  l = await travels("alone");
  ok("C6.4-8 pass (R3): travelling alone, the child gets the letter of authorization and a copy of the birth certificate, each saying why (Researched)", has(l, K1, LETTER) && has(l, K1, BIRTH) && !has(l, K1, ABSENT) && /alone/i.test(of(l, K1).find((x) => LETTER.test(x.label))?.reason ?? "") && /Researched/.test(of(l, K1).find((x) => BIRTH.test(x.label))?.reason ?? ""), of(l, K1).map((x) => x.label));
  l = await travels("another_adult");
  ok("C6.4-8a pass (R3): with another adult, the same two lines (the letter names the adult responsible in Canada)", has(l, K1, LETTER) && has(l, K1, BIRTH) && !has(l, K1, ABSENT) && /adult responsible/i.test(of(l, K1).find((x) => LETTER.test(x.label))?.reason ?? ""), of(l, K1).map((x) => x.label));
  l = await travels("one_parent");
  ok("C6.4-8b pass (R3): with one parent, the letter from the absent parent and a copy of that parent's signed passport or ID, no birth certificate", has(l, K1, LETTER) && has(l, K1, ABSENT) && !has(l, K1, BIRTH), of(l, K1).map((x) => x.label));
  l = await travels("both_parents");
  ok("C6.4-8c fail (R3): with both parents, none of the three travel lines", !has(l, K1, LETTER) && !has(l, K1, BIRTH) && !has(l, K1, ABSENT), of(l, K1).map((x) => x.label));
  const custody = async (v: string) => { await answer(c.id, K1, "person.custody", v, CLIENT); return (await get()).l; };
  l = await custody("sole");
  ok("C6.4-8d pass (R3): sole custody adds the custody documents; shared custody too", has(l, K1, CUSTODY) && !has(l, K1, ADOPT) && has(await custody("shared"), K1, CUSTODY), of(l, K1).map((x) => x.label));
  l = await custody("guardian");
  ok("C6.4-8e pass (R3): under guardianship (or adopted), the adoption or guardianship papers, not the custody documents", has(l, K1, ADOPT) && !has(l, K1, CUSTODY), of(l, K1).map((x) => x.label));
  l = await custody("not_applicable");
  ok("C6.4-8f fail (R3): custody not applicable: neither custody line", !has(l, K1, CUSTODY) && !has(l, K1, ADOPT), of(l, K1).map((x) => x.label));
  // Only under 18: the older child, made 19 here, travelling alone gets none of the lines.
  const K2 = c.subjects["Sample Child A2"];
  await answer(c.id, K2, "person.date_of_birth", yearsAgo(19), OFFICER);
  await answer(c.id, K2, "person.travels_with", "alone", OFFICER, { onBehalfOf: K2, reason: "Entered from the person's signed form (Sample)" });
  ({ l } = await get());
  ok("C6.4-8g fail (R3): a dependent child of 19 travelling alone gets no letter or birth certificate line (the lines are for under 18)", !has(l, K2, LETTER) && !has(l, K2, BIRTH), of(l, K2).map((x) => x.label));
  // QA-149: the answer stays on the case, so it can be changed back; nothing requested yet, so nothing is kept.
  await travels("alone");
  l = await travels("both_parents");
  ok("C6.4-9 pass (R3, QA-149): changing \"alone\" back to \"both parents\" takes the letter and birth certificate away again (nothing requested yet, so nothing kept)", has(l, K1, /passport/i) && !has(l, K1, LETTER) && !has(l, K1, BIRTH));
  // Request, receive, not applicable; the document is the person's (SI-14 thin stand-in).
  const pass = of(l, P).find((x) => /passport/i.test(x.label));
  r = await call("POST", `/runtime/checklist-lines/${pass?.id}/request`, {}, OFFICER);
  ok("C6.4-12 pass: the officer requests the principal's passport: state Requested", r.status === 200 && r.body?.state === "requested", r.body);
  ok("C6.4-13 fail: a client cannot request documents (403)", (await call("POST", `/runtime/checklist-lines/${pass?.id}/request`, {}, CLIENT)).status === 403);
  const up = async (lineId: string | undefined, name: string) => {
    const fd = new FormData(); fd.append("file", new Blob([new TextEncoder().encode(`%PDF-1.4\n% Sample synthetic passport ${name}\n`)]), name);
    const res = await fetch(`http://127.0.0.1:${process.argv[2] ?? 4440}/api/runtime/checklist-lines/${lineId}/documents`, { method: "POST", headers: { "x-actor": OFFICER }, body: fd }).catch(() => null);
    return { status: res?.status ?? 0, body: await res?.json().catch(() => null) };
  };
  let u = await up(pass?.id, "sample-passport-1.pdf");
  ok("C6.4-14 pass: uploading a file moves the line to Received; the document is stored against the person, not the case", u.status === 201 && u.body?.state === "received" && sql(`select subject_id from case_document where id='${u.body?.document?.id}'`) === P, u.body);
  u = await up(pass?.id, "sample-passport-2.pdf");
  ({ l } = await get());
  const docs = of(l, P).find((x) => x.id === pass?.id)?.documents ?? [];
  ok("C6.4-15 pass: a new passport keeps the old one as history (two documents, one current)", docs.length === 2 && docs.filter((d) => d.current).length === 1);
  const sl = of(l, S).find((x) => /passport/i.test(x.label));
  r = await call("POST", `/runtime/checklist-lines/${sl?.id}/not-applicable`, {}, OFFICER);
  ok("C6.4-16 fail: Not applicable without a reason is refused on the field (400)", r.status === 400 && /reason/i.test(JSON.stringify(r.body)), r.status);
  r = await call("POST", `/runtime/checklist-lines/${sl?.id}/not-applicable`, { reason: "Sample: officer's test" }, OFFICER);
  ok("C6.4-17 pass: Not applicable with a reason; the line stays on the list with its reason (file kept)", r.status === 200 && r.body?.state === "not_applicable" && of((await get()).l, S).some((x) => x.id === sl?.id));
  ok("C6.4-18 pass (data): checklist lines are rows per filing person × requirement", Number(sql(`select count(*) from checklist_line where case_id='${c.id}'`) ?? 0) >= 5);
});
