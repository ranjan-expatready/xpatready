// C2.6 (F4, P-219): an official checklist is read into document requirement proposals, through the API and the database,
// on an isolated copy, a passing and a failing case per rule. No browser, no model call: the one saved real AI reading of
// IMM 5488 (10-2024) is replayed (US$0); IMM 5483 has none, so it offers the stub pass only.
//   C2.6 R1  only a checklist with a saved real reading of its exact text (checksum) replays; another answers 409 in words
//   C2.6 R2  only the lines read from this checklist are proposed; each quote is found in its text, else dropped and listed
//   C2.6 R3  each proposal is a requirement_line in the one review queue: one AI round, so Check, never Ready; Sample basis
//   C2.6 R4  a second replay returns the open one (no duplicates); the stub pass and live keep their own answers
//   C2.6 R5  each line is accepted on the review queue (the one door, P-149; QA-157), whose lander writes it as a draft
//            row with the checklist's quote; the old apply door and the checklist page's own decide answer 410
//   C2.6 R6  B82 (QA-233): the facts the lines' conditions read and the library lacks are proposed with them; one that
//            cannot be is said in words; a fact already held or already proposed is left alone
//   zsh studio/tools/isolated.sh forms_c26 4458 start && tsx studio/tests/check_forms_c26_checklist.ts 4458 xr_studio_forms_c26
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { conditionFacts, docTypeOf, linesOf, savedReading, treeOf, wordsOf } from "../api/src/checklist.ts";

const PORT = Number(process.argv[2] ?? 4458), DB = process.argv[3] ?? "xr_studio_forms_c26";
const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const intake = async (name: string, combinationId: string) => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(OFFICIAL, "checklists", name)))]), name); fd.append("combinationId", combinationId);
  const r = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  if (!r.ok) throw new Error(`intake of ${name} answered ${r.status}`);
};
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql", "/usr/bin/psql"].find((p) => { try { readFileSync(p); return true; } catch { return false; } }) ?? "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

async function main() {
  // ─────────────────────────────── R2 rules on their own (no database)
  const saved = savedReading("imm5488e.pdf");
  ok("C2.6 R1: IMM 5488 (10-2024) has a saved real AI reading of its exact text (live, contract-valid)", !!saved && /c1-requirements-live-/.test(saved.runFile), saved?.runFile);
  ok("C2.6 R1 fail: IMM 5483 has no saved reading (none was ever run live), and a stub run is never one", savedReading("imm5483e.pdf") === null && savedReading(null) === null);
  const own = saved!.docs.filter((d) => d.source_file === saved!.inventory).length;
  const base = linesOf(saved!, "IMM 5488");
  ok("C2.6 R2: only the lines read from IMM 5488 itself are proposed (the run also read the guide and IMM 5905)", saved!.docs.length > own && base.lines.length + base.dropped.length === own && base.lines.length >= 10, { all: saved!.docs.length, own, lines: base.lines.length });
  ok("C2.6 R2: every proposed quote is in the checklist's text (words compared; case, spaces and quote marks do not count)", base.lines.every((l) => wordsOf(saved!.text).includes(wordsOf(l.quote))));
  const forged = { ...saved!, docs: [...saved!.docs.filter((d) => d.source_file === saved!.inventory).slice(0, 2), { document_type: "Proof of a made-up thing", who: "principal_applicant", base_or_conditional: "base", source_file: saved!.inventory, source_quote: "This sentence is not in the checklist." }] };
  const f = linesOf(forged, "IMM 5488");
  ok("C2.6 R2 fail: a line whose quote is not in the checklist is dropped and listed with its reason", f.lines.length === 2 && f.dropped.length === 1 && /quote is not in IMM 5488/.test(f.dropped[0]), f.dropped);
  const twice = linesOf({ ...saved!, docs: [saved!.docs.find((d) => d.source_file === saved!.inventory)!, saved!.docs.find((d) => d.source_file === saved!.inventory)!] }, "IMM 5488");
  ok("C2.6 R2 fail: the same line twice for the same person is proposed once", twice.lines.length === 1 && /the same line twice/.test(twice.dropped[0] ?? ""), twice.dropped);
  const noCond = linesOf({ ...saved!, docs: [{ document_type: "Marriage certificate", who: "principal_applicant", base_or_conditional: "conditional", condition_plain: null, source_file: saved!.inventory, source_quote: "Photocopy of your Marriage license or Certificate" }] }, "IMM 5488");
  ok("C2.6 R2 fail: a conditional line with no condition is incomplete, dropped and listed", noCond.lines.length === 0 && /incomplete/.test(noCond.dropped[0] ?? ""), noCond.dropped);

  const tree = treeOf({ subject_kind: "each_applicant", tree_json: JSON.stringify({ op: "not", condition: { op: "and", conditions: [{ op: "eq", field: "person.a", value: true }] } }) }) as any;
  const lineOf = (document_type: string, quote: string) => ({ document_type, who: "each_applicant", base_or_conditional: "base" as const, condition_plain: null, condition_tree: null, provided_by: "client", quote, reason: null, note: null, office: false, part: null });
  const pp = docTypeOf(lineOf("passport_information_page_copy", "A copy of the information page of your valid passport"), "IMM 5484");
  ok("C2.6 P-134: a passport is proposed as an identity document read by its coded lines", pp.identityDocument === true && pp.readerKind === "coded_lines" && pp.name === "Passport information page copy", pp);
  const ls = docTypeOf(lineOf("proof_of_legal_status_in_country_of_residence", "If your country of residence differs from the country of citizenship listed on your passport"), "IMM 5484");
  ok("C2.6 P-134 fail: a document whose quote only mentions a passport is not an identity document", ls.identityDocument === false && ls.readerKind === "letter_or_record", ls);
  // ─────────────────────────────── R6 (B82, QA-233; no database): the facts a line's condition reads
  const reads = (field: string, value: unknown, op = "eq", office = false) => ({ ...lineOf(`doc_${field.replace(/\W/g, "_")}`, "a quote"), base_or_conditional: "conditional" as const, condition_plain: `Only when ${field} holds, in words.`, condition_tree: { subjectKind: "EACH_APPLICANT", op, field, value }, office });
  const nothing = { live: new Set<string>(), retired: new Set<string>(), named: new Map<string, string>(), waitingKeys: new Set<string>(), waitingNames: new Set<string>() };
  const asked = conditionFacts([reads("person.has_visa", true)], [{ id: "person.has_visa", meaning: "Whether the person holds a visa", plain: "Whether the person holds a visa", valueType: "yes_no", derived: false }], nothing);
  ok("C2.6 R6: a fact the reading defined is proposed with its meaning and answer type, under the key the condition reads", asked.propose.length === 1 && asked.propose[0].fact === "person.has_visa" && asked.propose[0].meaning === "Whether the person holds a visa" && asked.propose[0].valueType === "yes_no" && asked.propose[0].label === "Has visa", asked);
  const worked = conditionFacts([reads("person.differs", true)], [{ id: "person.differs", meaning: "True when two countries differ.", plain: "True when two countries differ. This compares two fields.", valueType: null, derived: true }], nothing);
  ok("C2.6 R6: a fact the reading works out is proposed as a yes or no, from how the condition tests it", worked.propose[0]?.valueType === "yes_no" && worked.propose[0]?.defined?.derived === true, worked);
  const undefinedOne = conditionFacts([reads("person.days_left", 180, "gte")], [], nothing);
  ok("C2.6 R6: a fact the reading never defined takes the condition's words, and its type from the test", undefinedOne.propose[0]?.valueType === "number" && /in words/.test(undefinedOne.propose[0]?.meaning ?? ""), undefinedOne);
  const twoLines = conditionFacts([reads("person.a_fact", true), { ...reads("person.a_fact", true), document_type: "doc_other" }], [], nothing);
  ok("C2.6 R6: two lines reading one fact propose it once, naming both", twoLines.propose.length === 1 && twoLines.propose[0].lines.length === 2, twoLines.propose.length);
  ok("C2.6 R6 fail: a fact in the library, or a derived one, is not proposed", conditionFacts([reads("person.has_visa", true)], [], { ...nothing, live: new Set(["person.has_visa"]) }).propose.length === 0);
  const waitingAlready = conditionFacts([reads("person.has_visa", true)], [], { ...nothing, waitingKeys: new Set(["person.has_visa"]) });
  ok("C2.6 R6 fail: a fact a form's draft or another checklist already proposes is not proposed again, and is no problem", waitingAlready.propose.length === 0 && waitingAlready.held.length === 0, waitingAlready);
  const retiredOne = conditionFacts([reads("person.has_visa", true)], [], { ...nothing, retired: new Set(["person.has_visa"]) });
  ok("C2.6 R6 fail: a retired fact is not added again; the job says to restore it", retiredOne.propose.length === 0 && /restore it/.test(retiredOne.held[0] ?? ""), retiredOne);
  const sameName = conditionFacts([reads("person.has_visa", true)], [], { ...nothing, named: new Map([["hasvisa", "case.has_visa"]]) });
  ok("C2.6 R6 fail: a fact with a library field's name is not a second field; the job names the field to read", sameName.propose.length === 0 && /case\.has_visa/.test(sameName.held[0] ?? ""), sameName);
  const nameWaiting = conditionFacts([reads("person.has_visa", true)], [], { ...nothing, waitingNames: new Set(["hasvisa"]) });
  ok("C2.6 R6 fail: a name already waiting on To review is decided there first", nameWaiting.propose.length === 0 && /already waiting/.test(nameWaiting.held[0] ?? ""), nameWaiting);
  const badKey = conditionFacts([reads("no_group", true)], [], nothing);
  ok("C2.6 R6 fail: a key that is not group.name is not proposed; the job says to correct the condition", badKey.propose.length === 0 && /not a fact key/.test(badKey.held[0] ?? ""), badKey);
  const twoNames = conditionFacts([reads("person.has_visa", true), reads("case.has_visa", true)], [], nothing);
  ok("C2.6 R6 fail: two facts with one name in a reading: the first is proposed, the other is said (one bad item never stops the draft)", twoNames.propose.length === 1 && twoNames.held.length === 1, twoNames);

  // QA-195 (break B2): the checklist reads the same identity list as the masters step; only a passport or travel document
  // is read by its coded lines, any other identity document by a person, never by AI; a passport-size photo by a person.
  const byName = ["copy_of_passports", "national_identity_card", "birth_certificate", "permanent_resident_card", "citizenship_certificate", "drivers_licence", "proof_of_identity"].map((t) => ({ t, d: docTypeOf(lineOf(t, "As the checklist asks"), "IMM 5484") }));
  ok("QA-195 C2.6 fail: identity documents by the shared list (plural passports, identity card, birth certificate, PR card, licence…) are never AI-read", byName.every((x) => x.d.identityDocument === true && x.d.readerKind !== "letter_or_record"), byName.map((x) => `${x.t}: ${x.d.readerKind}/${x.d.identityDocument}`));
  const photos = ["passport_size_photo", "passport_photos"].map((t) => docTypeOf(lineOf(t, "Two photos"), "IMM 5484"));
  ok("QA-195 C2.6 pass (break B7): a passport-size photo is a photo a person looks at, not an identity document read by coded lines", photos.every((d) => d.readerKind === "person_only" && d.identityDocument === false), photos.map((d) => `${d.name}: ${d.readerKind}/${d.identityDocument}`));
  ok("C2.6 R5: a saved condition becomes a condition-language root (subject kind on the root; branch keys args and arg, as p2 assemble)", tree?.subjectKind === "EACH_APPLICANT" && tree.arg?.op === "and" && tree.arg.args?.[0]?.field === "person.a" && !("condition" in tree), tree);
  ok("C2.6 R5 fail: a condition whose text does not parse, or no condition, gives no tree", treeOf({ tree_json: "{not json" }) === null && treeOf(null) === null && treeOf({ tree_json: "[1]" }) === null);

  // #277 M4: the checksum rule. The same inventory in another root still matches; a changed one gives no reading.
  const tmp = mkdtempSync(join(tmpdir(), "c26-")), inv = saved!.inventory;
  mkdirSync(join(tmp, dirname(inv)), { recursive: true });
  const SOLUTION = join(import.meta.dirname, "..", "..", "..");
  copyFileSync(join(SOLUTION, inv), join(tmp, inv));
  ok("C2.6 R1 (#277 M4): the same checklist text, read from another folder, still has its saved reading", savedReading("imm5488e.pdf", { root: tmp })?.runFile === saved!.runFile);
  writeFileSync(join(tmp, inv), readFileSync(join(SOLUTION, inv), "utf8").replace("DOCUMENT CHECKLIST", "DOCUMENT CHECK LIST"));
  ok("C2.6 R1 fail (#277 M4): a changed checklist text (another checksum) has no saved reading, so nothing is replayed", savedReading("imm5488e.pdf", { root: tmp }) === null);
  rmSync(tmp, { recursive: true, force: true });

  // ─────────────────────────────── through the API on the isolated copy
  await call("POST", "/demo/reset", { confirm: "RESET" });
  let r = await call("POST", "/demo/load");
  ok("setup: sample inputs load", r.status === 201, r.body?.seconds);
  const combo = sql("select id from combination order by combination_key limit 1");
  await intake("imm5488e.pdf", combo); await intake("imm5483e.pdf", combo);
  const atts = (await call("GET", `/combinations/${combo}/attachments`)).body as any[];
  const c5488 = atts.find((a) => a.kind === "Document checklist" && /5488/.test(a.edition ?? "")), c5483 = atts.find((a) => a.kind === "Document checklist" && /5483/.test(a.edition ?? ""));
  ok("setup: IMM 5488 and IMM 5483 are attached as recognised official checklists", !!c5488?.recognised && !!c5483?.recognised, atts.map((a) => a.edition));

  r = await call("GET", `/combinations/${combo}/checklist-readings`);
  const rd = (id: string) => (r.body as any[]).find((x) => x.attachmentId === id);
  ok("C2.6 R1: the launch panel learns which checklist has a saved reading, and how many lines it holds", r.status === 200 && rd(c5488.id)?.saved === true && rd(c5488.id)?.lines === base.lines.length && rd(c5483.id)?.saved === false, r.body);

  r = await call("POST", `/attachments/${c5483.id}/draft-checklist`, { mode: "replay" });
  ok("C2.6 R1 fail: replaying a checklist with no saved reading answers 409 in words, and nothing is queued", r.status === 409 && /No saved AI reading of IMM 5483/.test(r.body?.message ?? "") && sql(`select count(*) from drafting_job where attachment_id='${c5483.id}'`) === "0", r.body?.message);
  r = await call("POST", `/attachments/${c5488.id}/draft-checklist`, { mode: "live" });
  ok("C2.6 R4 fail: a live reading still waits for the founder's OK on its cost (409), nothing queued", r.status === 409 && /founder/.test(r.body?.message ?? "") && sql(`select count(*) from drafting_job where attachment_id='${c5488.id}'`) === "0", r.body?.message);
  r = await call("POST", `/attachments/${c5488.id}/draft-checklist`, { mode: "replay" }, "user-C");
  ok("C2.6 fail: a person without the author duty cannot replay (403)", r.status === 403, r.status);

  r = await call("POST", `/attachments/${c5488.id}/draft-checklist`, { mode: "replay" });
  const job = r.body;
  // A line the combination already has (its document type and person) is never proposed again (#277 review M2).
  const already = ((job.detail?.dropped ?? []) as string[]).filter((d) => /already on this combination/.test(d)).length, proposed = base.lines.length - already;
  ok("C2.6 R1: the replay is a checklist draft at US$0, marked replay, naming the saved run and what was dropped", r.status === 201 && job.kind === "checklist_draft" && job.mode === "REPLAY" && Number(job.costUsd) === 0 && job.detail?.runFile === saved!.runFile && job.detail?.proposed === proposed && proposed > 0 && job.detail?.dropped.length === base.dropped.length + already && /Sample/.test(job.message), { proposed, already, message: job.message });
  const rows = JSON.parse(sql(`select coalesce(json_agg(json_build_object('kind', kind, 'conf', confidence, 'agr', agreement, 'basis', basis, 'lands', lands_on, 'origin', origin, 'quote', source->>'quote', 'found', source->>'quoteFound', 'from', rounds->'draft'->>'from', 'check', rounds->'check', 'cost', rounds->'draft'->>'costUsd', 'type', payload->>'documentType', 'combo', combination_id, 'reason', reason)), '[]') from proposal_item where run_id='${job.id}' and kind='requirement_line'`));
  ok("C2.6 R3: each line is a requirement_line on this combination, from the replayed draft round at US$0, with no checker round", rows.length === proposed && rows.every((x: any) => x.kind === "requirement_line" && x.lands === "combination" && x.combo === combo && x.from === "replay" && x.check === null && Number(x.cost) === 0 && x.origin === "ai"), rows[0]);
  ok("C2.6 R3: one AI round, so every line reads Check (Decide where the checklist leaves it to the visa office; never Ready) and stays Sample until the immigration expert confirms it", rows.every((x: any) => (x.conf === "check" || (x.conf === "decide" && /visa office/i.test(x.reason ?? ""))) && x.agr === "one_round" && x.basis === "SAMPLE"), rows.map((x: any) => x.conf));
  const text = saved!.text.replace(/\s+/g, " ").toLowerCase().replace(/[‘’“”'"`]/g, "");
  ok("C2.6 R2: every queued line carries its quote, and the quote is in IMM 5488's own text", rows.every((x: any) => x.found === "true" && x.quote && text.includes(x.quote.replace(/\s+/g, " ").toLowerCase().replace(/[‘’“”'"`]/g, "").trim())), rows.filter((x: any) => !text.includes(String(x.quote).toLowerCase())).map((x: any) => x.type));

  r = await call("POST", `/attachments/${c5488.id}/draft-checklist`, { mode: "replay" });
  ok("C2.6 R4 fail: a second replay returns the open one; nothing is queued twice", r.status === 201 && r.body.id === job.id && sql(`select count(*) from proposal_item where run_id='${job.id}' and kind='requirement_line'`) === String(proposed) && sql(`select count(*) from drafting_job where attachment_id='${c5488.id}'`) === "1", r.body.id);
  r = await call("POST", `/attachments/${c5488.id}/draft-checklist`, { mode: "stub" });
  ok("C2.6 R4: the stub pass keeps its own empty draft beside the replay (it never returns the replay)", r.status === 201 && r.body.id !== job.id && r.body.mode === "STUB" && sql(`select count(*) from proposal_item where run_id='${r.body.id}'`) === "0", r.body.mode);

  r = await call("GET", `/review/proposals?group=${encodeURIComponent(`combination:${combo}`)}`);
  const check = [...(r.body.group?.bands?.check ?? []), ...(r.body.group?.bands?.decide ?? [])];
  const mine = check.filter((x: any) => x.kind === "requirement_line" && x.step === "checklist_draft");
  ok("C2.6 R3: the lines wait in the one review queue under their combination, in Check or Decide, titled by document and person, with the quote", r.status === 200 && mine.length === proposed && (r.body.group?.bands?.ready ?? []).every((x: any) => x.kind !== "requirement_line") && mine.every((x: any) => / · /.test(x.title) && x.source?.quote && x.readings?.draft?.from === "replay"), mine[0]?.title);
  ok("C2.6 R3 (QA-157): each queue line is decided on the queue itself (no other page), one at a time (Check is never bulk-accepted)", mine.every((x: any) => x.decide_on === null && /check first|leaves it to a person/.test(x.bulk_why ?? "")), mine[0]?.decide_on);
  r = await call("GET", "/review-queue", undefined, "user-C");
  const row = ((r.body?.items ?? []) as any[]).find((x) => x.kind === "proposals" && x.combination === combo);
  const queued = Number(sql(`select count(*) from proposal_item where run_id='${job.id}'`));
  ok("C2.6 R3 (#277 re-review Major): To review lists the waiting checklist lines for a reviewer, with the way to them", r.status === 200 && !!row && row.state === "needs" && row.next?.href === `/review/proposals?group=${encodeURIComponent(`combination:${combo}`)}` && new RegExp(`${queued} proposals? waiting`).test(row.what), row ?? r.body?.counts);
  r = await call("POST", `/jobs/${job.id}/items/${mine[0].id}`, { decision: "ACCEPTED" });
  ok("C2.6 R3 fail (QA-157): the checklist page's own decide is closed (410, saying to use the review queue); nothing changes", r.status === 410 && /review queue/.test(r.body?.message ?? "") && sql(`select status from proposal_item where id='${mine[0].id}'`) === "waiting", r.body?.message);

  r = await call("POST", `/jobs/${job.id}/accept-clean`, { outcome: "NEW" });
  ok("C2.6 R3 fail (review M1 on #574): accepting a checklist's lines together on its job page is closed too (410); nothing changes", r.status === 410 && /review queue/.test(r.body?.message ?? "") && sql(`select count(*) from proposal_item where run_id='${job.id}' and status<>'waiting'`) === "0", r.body?.message);

  // ─────────────────────────────── R5 accept on the queue (the old apply door is closed)
  const count = () => Number(sql(`select count(*) from document_requirement where combination_id='${combo}'`));
  const before = count();
  r = await call("POST", `/jobs/${job.id}/apply-checklist`);
  ok("C2.6 R5 fail (QA-157): the old apply door answers 410, says to use the review queue, and writes nothing", r.status === 410 && /review queue/.test(r.body?.message ?? "") && count() === before, r.body?.message);
  r = await call("POST", "/review/proposals/decide", { ids: [mine[0].id], action: "accept" }, "user-C");
  ok("C2.6 R5 fail: accepting a document line writes the combination's draft, so it needs the author duty (a reviewer gets 403); nothing is written", r.status === 403 && count() === before && sql(`select status from proposal_item where id='${mine[0].id}'`) === "waiting", r.body?.message);
  const results: { id: string; base: boolean; status: number; words: string }[] = [];
  for (const x of mine) {
    const base = sql(`select payload->>'always' from proposal_item where id='${x.id}'`) === "true";
    const d = await call("POST", "/review/proposals/decide", { ids: [x.id], action: "accept" });
    results.push({ id: x.id, base, status: d.status, words: d.body?.message ?? "" });
  }
  const landed = results.filter((x) => x.status === 201), refused = results.filter((x) => x.status !== 201);
  const conds = Number(sql(`select count(*) from document_requirement where combination_id='${combo}' and status='DRAFT' and source_file='imm5488e.pdf' and attach_mode='ANSWER_CONDITIONAL' and predicate_json is not null and condition_plain is not null`));
  const bases = Number(sql(`select count(*) from document_requirement where combination_id='${combo}' and status='DRAFT' and source_file='imm5488e.pdf' and attach_mode='COMBINATION_MANDATORY'`));
  ok("C2.6 R5: each accepted line is written as a draft requirement of this combination; each one refused says why in words", landed.length > 0 && count() - before === landed.length && landed.length === conds + bases
    && refused.every((x) => [400, 409].includes(x.status) && /condition|document type|not a choice|already on this combination/.test(x.words)), { landed: landed.length, refused: refused.map((x) => x.words.slice(0, 80)) });
  ok("C2.6 R5: every accepted base line is written as always-needed, with the checklist's quote and IMM 5488's file", bases === landed.filter((x) => x.base).length && Number(sql(`select count(*) from document_requirement where combination_id='${combo}' and status='DRAFT' and source_file='imm5488e.pdf' and source_quote is null`)) === 0, bases);
  ok("C2.6 R5 fail: a conditional line is never written without its condition (written with it, or refused in words)", conds === landed.filter((x) => !x.base).length && Number(sql(`select count(*) from document_requirement where combination_id='${combo}' and attach_mode='ANSWER_CONDITIONAL' and predicate_json is null`)) === 0, { conds });
  ok("C2.6 R5: an accepted line records what it landed as, and the decision is in the audit log", landed.every((x) => !!sql(`select decided_key from proposal_item where id='${x.id}'`)) && /accepted 1 proposal/.test(sql(`select string_agg(summary, ' | ') from audit_event where entity='proposals'`)));

  // ─────────────────────────────── #277 M2: no line twice on the combination
  const first = landed[0], edit = refused[0] ?? null;
  if (edit) {
    const p = JSON.parse(sql(`select payload from proposal_item where id='${first.id}'`));
    r = await call("POST", "/review/proposals/decide", { ids: [edit.id], action: "edit", payload: { ...p, always: true, condition: null } });
    ok("C2.6 M2 fail: a line edited into one the combination already has is refused (409 in words); nothing is written", r.status === 409 && /already on this combination/.test(r.body?.message ?? "") && count() === before + landed.length, r.body?.message);
  }
  for (const x of refused) await call("POST", "/review/proposals/decide", { ids: [x.id], action: "reject", reason: "Test: refused at accept, so returned" });
  const lineages = sql(`select count(*) from document_requirement where combination_id='${combo}' and lineage_key <> document_type_key || ':' || applies_to_roles`);
  r = await call("POST", `/attachments/${c5488.id}/draft-checklist`, { mode: "replay" });
  const again = r.body, againDropped = ((again.detail?.dropped ?? []) as string[]).filter((d) => /already on this combination/.test(d)).length;
  ok("C2.6 M2: once every line is decided, a new replay proposes only what the combination does not have yet; the rest is listed as already there", r.status === 201 && again.id !== job.id && againDropped + Number(again.detail?.proposed) === base.lines.length && againDropped === already + landed.length, { againDropped, proposed: again.detail?.proposed });
  ok("C2.6 M2 fail: no requirement is written twice (no suffixed copies)", sql(`select count(*) from document_requirement where combination_id='${combo}' and lineage_key <> document_type_key || ':' || applies_to_roles`) === lineages && count() === before + landed.length);

  ok("C2.6: the replay is in the audit log in words, with its cost", /replayed the saved AI reading of IMM 5488.*US\$0/.test(sql(`select string_agg(summary, ' | ') from audit_event where entity='checklist draft'`)));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.log(`STOP  ${e?.stack ?? e}`); process.exit(1); });
