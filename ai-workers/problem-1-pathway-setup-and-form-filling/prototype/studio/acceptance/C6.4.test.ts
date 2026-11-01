// C6.4 Dynamic document checklist per person (M3-C; r5c BR-3; P-169; stand-in SI-14 for storage and file status).
// Visitor visa part: the release's requirements × role × conditions on that person's facts, recomputed when answers
// change, with the reason; the team's words for states; the document belongs to the person; a new passport keeps the
// old one as history. Rules: VV-R05 (passport per person), VV-R06 (proof of financial support), VV-R08 (a minor
// travelling alone or with one parent: letter of authorization), VV-R16 (medical exam for a stay over 6 months).
// Breadth, after Visitor visa: the police certificate no older than 6 months, the non-accompanying PR member 18+
// (waivable with a reason, P-171 (6)) and the Provincial nominee, Express Entry police and medical block (P-172).
//   tsx studio/acceptance/C6.4.test.ts 4440 xr_studio_accept
import { CLIENT, FAMILY, OFFICER, agent, answer, call, inDays, main, needVisitorVisa, ok, openCase, sql } from "./lib/m3.ts";

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
  ok("C6.4-7 pass: no letter of authorization for a child while \"travelling alone\" is unanswered or no", has(l, K1, /passport/i) && !has(l, K1, /authori[sz]ation/i));

  // Conditions on the person's facts recompute the list (VV-R08, VV-R16).
  await answer(c.id, K1, "person.travelling_alone_to_canada", true);
  ({ l } = await get());
  ok("C6.4-8 pass: a child travelling alone gets the letter of authorization line, with the condition as its reason (VV-R08)", has(l, K1, /authori[sz]ation/i) && /alone|both parents/i.test(of(l, K1).find((x) => /authori[sz]ation/i.test(x.label))?.reason ?? ""));
  await answer(c.id, K1, "person.travelling_alone_to_canada", false);
  ({ l } = await get());
  ok("C6.4-9 pass: answering no takes the line away again (nothing requested yet, so nothing kept)", has(l, K1, /passport/i) && !has(l, K1, /authori[sz]ation/i));
  const v = await agent(c.id);
  const stay = (f: string) => v?.sections?.flatMap((s: { questions: { subjectId: string; fact: string }[] }) => s.questions).find((q: { subjectId: string; fact: string }) => q.fact === f)?.subjectId ?? c.caseSubject;
  await answer(c.id, stay("case.intended_stay_from"), "case.intended_stay_from", inDays(60));
  await answer(c.id, stay("case.intended_stay_to"), "case.intended_stay_to", inDays(60 + 270));
  ({ l } = await get());
  ok("C6.4-10 pass: a stay over 6 months adds the medical exam line for every applicant (VV-R16)", [P, S, K1].every((s) => has(l, s, /medical/i)));
  await answer(c.id, stay("case.intended_stay_to"), "case.intended_stay_to", inDays(60 + 42));
  ({ l } = await get());
  ok("C6.4-11 pass: shortening the stay to 6 weeks removes it", has(l, P, /passport/i) && ![P, S, K1].some((s) => has(l, s, /medical/i)));

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
  ok("C6.4-18 pass (data): checklist lines are rows per filing person × requirement", Number(sql(`select count(*) from checklist_line where case_id='${c.id}'`) ?? 0) >= 6);
});
