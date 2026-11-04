// C4.5 acceptance (P-220 pack 2; P-130, P-322; Lead 9's ruling, option 1, 5 Nov): an upload is a document checklist line,
// not a question; a document that supplies facts takes them out of the Smart questionnaire (SQR), and they are asked
// only when it is missing or unreadable. On the six every document type is made with no facts, so this pack makes the
// person's step "Facts this document supplies" first (US$0, no AI): the author proposes the passport's facts with
// IMM 5484's and IMM 5257's own words (samples/document-supplies.json, Sample), a second person approves on To review.
// Setup on Visitor visa of the six, through the screens' routes: its forms' questions (pack2 questionsBySteps) and its
// document lines from IMM 5484's saved reading (documentsBySteps). Each line is labelled C4.5-<n> (gate B).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.5.test.ts 4440 xr_studio_accept
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APPROVER, AUTHOR, pack2, REVIEWER, run } from "./lib/pack2.ts";

const T = pack2("C4.5");
const { call, sql, ok, words } = T;
const PASSPORT = "passport_information_page_copy";
const sample = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "document-supplies.json"), "utf8")).document_types.find((t: any) => t.documentType === PASSPORT);
/** The committed official words (prototype/expected/source-text): every quote is checked against them. */
const official = ["imm5484e", "imm5257e"].map((f) => readFileSync(join(import.meta.dirname, "..", "..", "expected", "source-text", `${f}.xfa-template.txt`), "utf8").replace(/\s+/g, " ")).join(" ");

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv);
  await T.needQuestions(vv);
  const docs = await T.documentsBySteps(vv);
  console.log(`SETUP document lines through the people's steps: ${JSON.stringify(docs).slice(0, 300)}`);
  const before = T.spent();
  const sources = async () => (await call("GET", `/combinations/${vv}/fact-sources`, undefined, AUTHOR)).body;
  const fromDocs = (fs: any, role?: string) => (fs?.facts ?? []).filter((f: any) => f.source === "DOCUMENT" && (!role || f.role === role));
  const typeRow = () => sql(`select array_to_string(supplies_facts, ',') || '|' || status from document_type where document_type_key='${PASSPORT}' order by version desc limit 1`);
  let fs = await sources();
  ok("C4.5-1 data: before the person's step the six reads 0 from documents (every document type made with no facts), and the passport is a checklist line", fromDocs(fs).length === 0 && !!sql(`select 1 from document_requirement where combination_id='${vv}' and document_type_key='${PASSPORT}' limit 1`), { from_documents: fromDocs(fs).length, counts: fs?.counts });

  // ---------------------------------------------------------------- the person's step: refusals first
  const route = `/library/document-types/${PASSPORT}/supplies`;
  let r = await call("POST", "/library/document-types/passport_information_page_copy/supplies", { facts: sample.facts, reason: sample.reason }, APPROVER);
  ok("C4.5-2 fail: only an author proposes the facts a document supplies (approver 403)", r.status === 403, r.status);
  r = await call("POST", route, { facts: [{ fact: "person.no_such_fact", source: "IMM 5484 (05-2026), page 1", quote: "The passport number;", readOn: sample.facts[0].readOn }], reason: sample.reason }, AUTHOR);
  ok("C4.5-3 fail: a fact that is not a shared field is refused (400, in words)", r.status === 400 && /not in the shared library/.test(words(r)), words(r));
  r = await call("POST", route, { facts: [{ fact: "person.passport_number", source: "IMM 5484 (05-2026), page 1", readOn: sample.facts[0].readOn }], reason: sample.reason }, AUTHOR);
  ok("C4.5-4 fail: a fact without the official words that say the document shows it is refused (400, P-170)", r.status === 400 && /quote/i.test(words(r)), words(r));
  r = await call("POST", `/library/document-types/no_such_document/supplies`, { facts: sample.facts, reason: sample.reason }, AUTHOR);
  ok("C4.5-5 fail: a document type not in the library is refused (404)", r.status === 404, r.status);
  r = await call("POST", route, { facts: [sample.facts[0], sample.facts[0]], reason: sample.reason }, AUTHOR);
  ok("C4.5-21 fail: a fact listed twice is refused (400, in words)", r.status === 400 && /listed once/.test(words(r)), words(r));
  r = await call("POST", route, { facts: [{ ...sample.facts[0], readOn: "2999-01-01" }], reason: sample.reason }, AUTHOR);
  const bad = await Promise.all([{ readOn: undefined }, { readOn: "2026-02-30" }, { readOn: "0001-01-01" }, { quote: "\u200b\u200b\u200b\u200b" }, { quote: "\u3164\u3164\u3164\u3164" }, { source: "\u202e\u200b" }, { source: "IMM 5484 (05-2026)" }].map((x) => call("POST", route, { facts: [{ ...sample.facts[0], ...x }], reason: sample.reason }, AUTHOR)));
  ok("C4.5-22 fail (P-170, break m1, m2): a date read in the future, none, not a real day or before 2000, and words of only invisible characters are refused (400)", r.status === 400 && bad.every((x) => x.status === 400), [r.status, ...bad.map((x) => `${x.status} ${words(x).slice(0, 40)}`)]);

  // ---------------------------------------------------------------- proposed: nothing changes yet
  r = await call("POST", route, { facts: sample.facts, reason: sample.reason }, AUTHOR);
  const change = r.body?.id;
  ok("C4.5-6 pass: the author proposes the passport's facts, each with its official words; it waits for a second person", r.status < 300 && !!change && sql(`select status from library_change where id='${change}'`) === "WAITING" && (r.body?.supplies?.cites ?? []).length === sample.facts.length, r.status >= 300 ? words(r) : r.body?.label);
  fs = await sources();
  ok("C4.5-7 pass: before approval nothing changes (the library type still supplies nothing, SQR still 0 from documents)", typeRow().startsWith("|") && fromDocs(fs).length === 0, typeRow());
  r = await call("POST", route, { facts: sample.facts.slice(0, 2), reason: sample.reason }, AUTHOR);
  ok("C4.5-8 fail: a second change of the same document's facts while one waits is refused (409, in words)", r.status === 409 && /already waits/.test(words(r)), words(r));
  const item = ((await call("GET", "/review-queue?filter=all", undefined, APPROVER)).body?.items ?? []).find((x: any) => x.id === `change:${change}`);
  ok("C4.5-9 pass: To review shows the second person before → after, the reason, Sample, in words", !!item && /Facts it supplies, for every combination: no fact → 9 facts/.test(item.what) && /Sample/.test(item.what) && item.state === "needs", item?.what?.slice(0, 200) ?? "not on To review");
  r = await call("POST", `/library/changes/${change}/approve`, { note: "self" }, AUTHOR);
  ok("C4.5-10 fail: the author cannot approve their own change (403, a different person decides)", r.status === 403, words(r));

  // ---------------------------------------------------------------- approved: the facts leave the SQR
  r = await call("POST", `/library/changes/${change}/approve`, { note: "Checked against IMM 5484 page 1 and IMM 5257 page 1 (C4.5 pack)." }, APPROVER);
  ok("C4.5-11 pass: a second person approves; the document type gets a draft with the 9 facts (out with the next release)", r.status < 300 && typeRow().split("|")[0].split(",").length === 9 && typeRow().endsWith("DRAFT"), r.status >= 300 ? words(r) : typeRow());
  fs = await sources();
  const roles = ["principal", "spouse_or_partner", "child"];
  ok("C4.5-12 pass: the Smart questionnaire tab reads N from documents > 0 for each applying person (the passport)", roles.every((x) => fromDocs(fs, x).length > 0) && fromDocs(fs).every((f: any) => f.document?.key === PASSPORT), Object.fromEntries(roles.map((x) => [x, fromDocs(fs, x).length])));
  const V = (await call("GET", `/combinations/${vv}/checklist`)).body;
  const pp = (V?.roles?.find((x: any) => x.role === "principal")?.lines ?? []).find((x: any) => x.document?.key === PASSPORT);
  ok("C4.5-13 pass: on the Documents tab the passport line names what it supplies, each taken out of the questionnaire; an upload is a checklist line, not a question", !!pp && pp.supplies.length >= 9 && pp.supplies.every((x: any) => x.takenOut) && !(fs?.facts ?? []).some((f: any) => /upload|copy of/i.test(f.label)), pp?.supplies?.map((x: any) => `${x.fact}:${x.takenOut}`));
  ok("C4.5-14 pass (P-130 fallback): every fact the passport supplies still has its question placed, so it can be asked when the document is missing", fromDocs(fs).length > 0 && fromDocs(fs).every((f: any) => f.placed), fromDocs(fs).filter((f: any) => !f.placed).map((f: any) => f.fact));

  // ---------------------------------------------------------------- Preview: not asked while on the checklist; asked when missing
  const preview = async (tweaks: Record<string, boolean> = {}) => (await call("GET", `/combinations/${vv}/workspace?tab=preview&person=principal&tweaks=${encodeURIComponent(JSON.stringify(tweaks))}`)).body?.preview;
  const asked = (p: any) => new Set((p?.questionnaire?.sections ?? []).filter((x: any) => x.subjectId === "principal").flatMap((x: any) => x.questions.map((q: any) => q.fact)));
  const P0 = await preview(), passport = (P0?.sets?.sqr?.fromDocuments ?? []).find((d: any) => /passport/i.test(d.document));
  const supplied = fromDocs(fs, "principal").map((f: any) => f.fact);
  ok("C4.5-15 pass: in Preview the principal's passport fills its answers and none of them is asked in the client questionnaire", !!passport && passport.facts.length > 0 && supplied.length > 0 && supplied.every((f: string) => !asked(P0).has(f)), { fills: passport?.facts?.length, asked_anyway: supplied.filter((f: string) => asked(P0).has(f)) });
  const choice = (P0?.sets?.sqr?.missing ?? []).find((m: any) => m.key.endsWith(`|${PASSPORT}`));
  const P1 = choice ? await preview({ [choice.key]: true }) : null;
  const back = supplied.filter((f: string) => asked(P1).has(f));
  ok("C4.5-16 pass: marked missing or unreadable, every one of the passport's facts comes back to the client questionnaire (asked instead)", !!choice && !!P1 && back.length === supplied.length && supplied.length > 0 && !(P1.sets.sqr.fromDocuments ?? []).some((d: any) => /passport/i.test(d.document)) && P1.sets.sqr.asked > P0.sets.sqr.asked && P1.sets.sqr.missing.find((m: any) => m.key === choice.key)?.marked === true, { choice: choice?.key, back: back.length, asked: [P0?.sets?.sqr?.asked, P1?.sets?.sqr?.asked] });
  const P2 = await preview({ "missing:nobody|x": true, ...(choice ? { [choice.key]: false } : {}) });
  ok("C4.5-17 fail-guard: a missing mark for someone not in the family, or switched off, changes nothing", JSON.stringify([...asked(P2)].sort()) === JSON.stringify([...asked(P0)].sort()), P2?.sets?.sqr?.asked);

  // ---------------------------------------------------------------- the same set again, a change since, withdraw
  r = await call("POST", route, { facts: sample.facts, reason: sample.reason }, AUTHOR);
  ok("C4.5-23 fail: proposing exactly the facts it supplies now is refused (409 Nothing changes)", r.status === 409 && /already supplies exactly/.test(words(r)), words(r));
  // Break M2: an approved change no release has carried yet never locks the type for good: its proposer withdraws it
  // (the facts go back to what they were), then the facts can be proposed again.
  r = await call("POST", route, { facts: sample.facts.slice(0, 8), reason: "Test: change it again after the approval, before any release (C4.5 pack)." }, AUTHOR);
  const locked = r;
  const notMineW = await call("POST", `/library/changes/${change}/withdraw`, { note: "Not mine (C4.5 pack)." }, APPROVER);
  const w = await call("POST", `/library/changes/${change}/withdraw`, { note: "Withdrawn after approval to change it again (C4.5 pack)." }, AUTHOR);
  const restored = typeRow();
  r = await call("POST", route, { facts: sample.facts, reason: sample.reason }, AUTHOR);
  const again = r.body?.id ? await call("POST", `/library/changes/${r.body.id}/approve`, { note: "C4.5 pack" }, APPROVER) : r;
  ok("C4.5-26 pass (break M2): approved but not released, a new change says to withdraw it first; its proposer withdraws it, the facts go back, and they can be proposed and approved again", locked.status === 409 && /withdraws it/.test(words(locked)) && notMineW.status === 403 && w.status < 300 && sql(`select status from library_change where id='${change}'`) === "WITHDRAWN" && restored.startsWith("|") && again.status < 300 && typeRow().split("|")[0].split(",").length === 9, { locked: `${locked.status} ${words(locked).slice(0, 80)}`, notMine: notMineW.status, withdraw: `${w.status} ${words(w).slice(0, 80)}`, restored, again: again.status });

  // Test-only change on another type of the six (withdrawn below): the photos line supplies nothing.
  const OTHER = "visa_application_photos", other = `/library/document-types/${OTHER}/supplies`;
  r = await call("POST", other, { facts: [{ fact: "person.date_of_birth", source: "Test words, page 1", quote: "Test: checks the Changed-since refusal", readOn: sample.facts[0].readOn }], reason: "Test only, withdrawn by the C4.5 pack." }, AUTHOR);
  const second = r.body?.id, otherRow = sql(`select id from document_type where document_type_key='${OTHER}' order by version desc limit 1`);
  // Test-only: the type changes under the waiting change (as a merge of fields would, forms.ts), so approval must refuse.
  sql(`update document_type set supplies_facts = array['person.passport_number'] where id='${otherRow}'`);
  r = await call("POST", `/library/changes/${second}/approve`, { note: "C4.5 pack" }, APPROVER);
  const waits = sql(`select status from library_change where id='${second}'`);
  sql(`update document_type set supplies_facts = '{}' where id='${otherRow}'`);
  ok("C4.5-24 fail (BR-5): a change approved after the type changed under it is refused (409 Changed since) and still waits", !!second && r.status === 409 && /changed after it was proposed/.test(words(r)) && waits === "WAITING", { status: r.status, waits, words: words(r).slice(0, 120) });
  r = await call("POST", `/library/changes/${second}/withdraw`, { note: "Withdrawn by the C4.5 pack." }, APPROVER);
  const notMine = r.status;
  r = await call("POST", `/library/changes/${second}/withdraw`, { note: "Withdrawn by the C4.5 pack." }, AUTHOR);
  ok("C4.5-25 pass: only its proposer withdraws a waiting change; nothing in the library changes", notMine === 403 && r.status < 300 && sql(`select status from library_change where id='${second}'`) === "WITHDRAWN" && sql(`select array_length(supplies_facts, 1) is null from document_type where id='${otherRow}'`) === "t", { notMine, status: r.status, words: words(r).slice(0, 120) });

  // ---------------------------------------------------------------- data and money
  ok("C4.5-18 data: every fact's quote is the official words of IMM 5484 or IMM 5257 (committed text), labelled Sample, with its page and the date read", sample.facts.every((f: any) => official.includes(f.quote) && /page \d/.test(f.source) && /^\d{4}-\d{2}-\d{2}$/.test(f.readOn)) && /Sample/.test(sql(`select coalesce(reason,'') || ' ' || coalesce(label,'') from library_change where id='${change}'`) + JSON.stringify(item?.what ?? "")), sample.facts.filter((f: any) => !official.includes(f.quote)).map((f: any) => f.fact));
  r = await call("POST", `/library/document-types/${PASSPORT}/supplies`, { facts: sample.facts, reason: sample.reason }, REVIEWER);
  ok("C4.5-19 fail: a reviewer (no author duty) cannot propose either (403)", r.status === 403, r.status);
  ok("C4.5-20 pass: the whole pack spent US$0", T.spent() === before);
  T.done();
});
