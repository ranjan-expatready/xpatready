// C10.2 The founder loads the finished story (M3-F; DEMO.md checkpoint 3 "Finished story", rows 14–16; P-93, P-108).
// Visitor visa part only: the family of four on combination A, the filing with an Online line and its answer sheet,
// filled and validated PDFs, the signed IMM 5476 scans, the document checklist per person, every filing Ready to file,
// on Visitor visa release 2 (row 14 is "A release 2 case"); and a second, thin Visitor visa case that stays on release 1
// while release 2 is out (row 16); seeded through the same services as the screens (never faked), AI as
// saved answers only (US$0, "replay"); loading twice gives one story; Reset removes it.
// Breadth, after Visitor visa: combination B (work permit) reusing A's family facts (row 18), row 13 (W6, parked).
// Phase 1 (the C10.2 PR): checks 5 and 6 read release 2 as configured and the group record (see their notes); PENDING
// lines name the open bug a step waits on (P-330 (7)) and are not counted as a pass or a fail.
// Runs on a fresh isolated copy, or one with data (gate B's fixture): the story empties the demo and loads its own data.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C10.2.test.ts 4440 xr_studio_accept
import { readFileSync } from "node:fs";
import { AUTHOR, OFFICER, call, main, ok, prepare, sql, until } from "./lib/m3.ts";

await main("C10.2", "Finished demo story: Visitor visa family case at application ready", async () => {
  let r = await call("POST", "/demo/checkpoints/finished-story", {}, "user-O");
  ok("C10.2-1 fail: only the founder's configuration people load a checkpoint (403 for a case officer)", r.status === 403, r.status);
  // #C10.2 phase 1 (gate B, #1330 shard 1 on b34a9ccc2): the story loads its own data, emptying the demo first, so it
  // runs the same on a blank copy and on a copy that already holds data (gate B adds the Visitor visa setups to a pack on
  // lib/m3.ts, "fixture only"). On a copy with content the route needs RESET typed (400 otherwise, proved in
  // tests/check_c102_finished_story_refusals.ts); on an empty copy RESET changes nothing.
  r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" }, AUTHOR);
  ok("C10.2-2 pass: loading the finished story is a job (202)", r.status === 202, r.status);
  // #C10.2 (Lead 37, 9 Nov): the job's own end, not only the label: a copy that already holds a story reads
  // "finished_story" before this load ends (the Mac's demo, a re-run), and the checks below must read this load's case.
  const done = r.status === 202 && await until(async () => { const b = (await call("GET", "/demo/status", undefined, AUTHOR)).body; return b?.story?.state === "done" && b?.checkpoint === "finished_story"; }, 600_000);
  ok("C10.2-3 pass: the demo status says Finished story", done);
  const stagesOf = async () => ((await call("GET", "/demo/status", undefined, AUTHOR)).body?.story?.stages ?? []).map((x: { key: string; status: string }) => `${x.key}:${x.status}`).join(" ");
  const firstStages = await stagesOf();
  console.log(`NOTE  the story's stages: ${firstStages}`);
  // Found in the data (GET /runtime/cases returns the combination's label, not its key, and no people).
  const vvCases = (sql(`select k.id || ':' || (select count(*) from case_participant p where p.case_id=k.id and p.role <> 'case') from runtime_case k join combination c on c.id=k.combination_id where c.combination_key='vv.single' order by k.created_at`) ?? "").split("\n").filter(Boolean).map((x) => ({ id: x.split(":")[0], people: Number(x.split(":")[1]) }));
  const fam = vvCases.find((x) => x.people === 4);
  ok("C10.2-4 pass: one Visitor visa family case of four people, and one thin case beside it", !!fam && vvCases.length === 2, vvCases);
  const p = (await prepare(fam?.id ?? "")).p;
  // #C10.2 phase 1 (Lead 34 ruling 2, Lead 33's 09:44 IST ruling): one person's IMM 5257 is on Paper with a reason
  // (P-380 Q3) and waits for its validated copy, which blocks Ready to file (P-315); it is split out of the family's
  // group and the others are recorded together in one action (C8.2, BR-11), each Ready to file before that recording.
  const ADOBE = "waits for its copy validated in Adobe on the Mac and read back (P-349 row 12b's method; the file stays on the Mac, QA-285); never simulated (P-46, P-171)";
  const paperLine: { person: string; form: string } = JSON.parse(readFileSync(new URL("../samples/finished-story.json", import.meta.url), "utf8")).paper_line, paperPerson = paperLine.person;
  const paperSubject = ((p as unknown as { people?: { subject: string; label: string }[] } | null)?.people ?? []).find((x) => x.label === paperPerson)?.subject ?? "";
  const paperFiling = p?.filings.find((f) => f.applicants.some((a) => a.subject === paperSubject));
  const recordedFilings = (p?.filings ?? []).filter((f) => f !== paperFiling);
  const readyFirst = sql(`select count(*) from filing_record r join filing f on f.id=r.filing_id where f.case_id='${fam?.id}' and exists (select 1 from audit_event a where a.action='ready_to_file' and a.entity_key=r.filing_id::text and a.at < (select min(b.at) from audit_event b where b.action='recorded' and b.entity='submission group'))`);
  // #C10.2 phase 1 (Lead 34 on 6c): the line reads the copy this case files: the Paper IMM 5257's copy, not release 1's.
  const paperCopy = sql(`select id from form_instance where case_id='${fam?.id}' and subject_id='${paperSubject}' and form_number='${paperLine.form}' and status='GENERATED' and config_release_id=(select config_release_id from pack_work_pin where case_id='${fam?.id}' order by revision desc limit 1) order by created_at desc limit 1`) || null;
  ok("C10.2-6c pass (C11.6, P-380 Q3): the Paper IMM 5257 carries its written reason and its copy is made on release 2",
    !!paperCopy && (sql(`select channel || '|' || coalesce(channel_reason, '') from filing_item where case_id='${fam?.id}' and subject_id='${paperSubject}' and item_key='${paperLine.form}' and active`) ?? "").startsWith("PAPER|Sample"), paperCopy);
  const validatedPaper = paperCopy ? Number(sql(`select count(*) from validated_copy where form_instance_id='${paperCopy}'`) ?? 0) : 0;
  // #C10.2 (Lead 37, 9 Nov): with the Paper copy validated in Adobe and read back, every filing is Ready and the family's
  // four are recorded together (5, 5b); without it, the Paper filing is split out and waits (5; 5b PENDING, QA-316 words).
  if (validatedPaper) {
    ok("C10.2-5 pass (row 14): one filing per person, each Ready to file, then recorded together in one family group",
      p?.filings.length === 4 && p.filings.every((f) => f.status === "submitted") && new Set(p.filings.map((f) => f.group)).size === 1 && readyFirst === "4", { readyFirst });
    ok(`C10.2-5b pass: ${paperPerson}'s filing (IMM 5257 on Paper) Ready to file and recorded with the family`, paperFiling?.status === "submitted");
  } else {
    ok("C10.2-5 pass (row 14): one filing per person; all but the Paper one each Ready to file, then recorded together in one group; the Paper one split out, waiting for its validated copy",
      p?.filings.length === 4 && !!paperFiling && paperFiling.status !== "submitted" && (p.readiness.find((r) => r.filing === paperFiling.id)?.blocks ?? []).some((b) => b.code === "barcode_not_validated")
      && recordedFilings.every((f) => f.status === "submitted") && new Set(recordedFilings.map((f) => f.group)).size === 1 && !recordedFilings.some((f) => f.group === paperFiling.group)
      && readyFirst === "3", { paper: paperFiling?.status, readyFirst });
    console.log(`PENDING  C10.2-5b pass: ${paperPerson}'s filing (IMM 5257 on Paper) Ready to file and recorded — ${ADOBE}`);
  }
  const P = p?.filings.find((f) => f.applicants[0]?.role === "principal")?.applicants[0]?.subject ?? "";
  // #C10.2 phase 1 (Row C1's rule: what a pack expects comes from the release as configured): release 2 files IMM 5257
  // Online (DEMO.md row 9; 130-release-two.ts) and IMM 5645 replaces IMM 5707, so the Online line is read by its channel.
  const onl = (p?.items ?? []).filter((i) => i.subject === P && i.kind === "form" && i.channel === "ONLINE");
  const sheet = onl[0] ? (await call("GET", `/runtime/items/${onl[0].id}/answer-sheet`, undefined, OFFICER)).body : null;
  const hand = (p?.items ?? []).filter((i) => i.subject === P && i.kind === "form" && i.signature === "HAND_SCANNED");
  // Lead 33 (09:44 IST, P-319): the lines are read from the release's own lines (by channel and signature), never by
  // form number: the principal's other PDF-upload lines each have a copy filled from the confirmed facts.
  const pdfs = [...new Set((p?.items ?? []).filter((i) => i.subject === P && i.kind === "form" && i.channel === "PDF_UPLOAD" && i.signature !== "HAND_SCANNED").map((i) => i.form ?? ""))];
  const filled = pdfs.filter((form) => Number(sql(`select count(*) from form_instance where case_id='${fam?.id}' and subject_id='${P}' and status='GENERATED' and form_number='${form.replace(/'/g, "''")}'`) ?? 0) > 0);
  ok("C10.2-6 pass (row 14): the principal's filing mixes Online (every answer-sheet section entered) and PDF upload (the hand-signed form printed, signed and its scan uploaded; the other PDFs filled)",
    onl.length === 1 && (sheet?.sections ?? []).length > 0 && sheet.sections.every((x: { entered: unknown }) => !!x.entered) && hand.length === 1 && ["ready", "done"].includes(hand[0].state)
    && pdfs.length > 0 && filled.length === pdfs.length, { online: onl.map((i) => i.form), hand: hand.map((i) => i.form), pdfs, filled });
  // QA-309 (was PENDING on QA-165 (1)): a section waits only for what the form's readiness names, so the sheet, every
  // section entered, reads Done; a "none apply" fact, an answered row fact or the contact release 2 never asks never waits.
  ok("C10.2-6b pass (QA-309): the Online IMM 5257 reads Done, its sheet waiting for nothing", onl[0]?.state === "done" && (sheet?.sections ?? []).every((x: { waiting: unknown[] }) => !x.waiting.length),
    { state: onl[0]?.state, reason: onl[0]?.reason, waiting: (sheet?.sections ?? []).reduce((n: number, x: { waiting: unknown[] }) => n + x.waiting.length, 0) });
  // #C10.2 (Lead 37, 9 Nov; QA-316): 6d passes once the Lead's Adobe-validated file is read back (P-349 row 12b's
  // method); without the file it waits, in words with no fixed count.
  if (validatedPaper) ok("C10.2-6d pass (row 12): the Paper IMM 5257's copy validated in Adobe and read back", true);
  else console.log(`PENDING  C10.2-6d pass: the Paper IMM 5257's copy validated in Adobe and read back — ${ADOBE}`);
  const cl = (await call("GET", `/runtime/cases/${fam?.id}/checklist`, undefined, OFFICER)).body?.people ?? [];
  ok("C10.2-7 pass (row 15): the document checklist lists every person's lines, some received", cl.length === 4 && cl.every((x: { lines: unknown[] }) => x.lines.length > 0) && cl.some((x: { lines: { state: string }[] }) => x.lines.some((l) => l.state === "received")));
  const pinned = (id?: string) => sql(`select max(r.version) from pack_work_pin w join config_release r on r.id=w.config_release_id where w.case_id='${id}'`);
  const thin = vvCases.find((x) => x.id !== fam?.id);
  ok("C10.2-8 pass (rows 14, 16): the family case is on release 2; the thin case stays on release 1 while release 2 is out", pinned(fam?.id) === "2" && pinned(thin?.id) === "1" && sql(`select max(version) from config_release r join combination c on c.id=r.combination_id where c.combination_key='vv.single'`) === "2");
  // #C10.2 phase 1: the checkpoint's saved AI answers are replayed as ai_batch rows of mode REPLAY (DEMO.md), so the line
  // counts the batches that are not replays, as C10.1 does.
  ok("C10.2-9 pass: no model call (US$0); every AI result in the story is a replay", done && sql("select count(*) from ai_batch where mode <> 'REPLAY'") === "0" && sql("select count(*) from drafting_job where mode = 'LIVE'") === "0");
  // #C10.2 phase 1: the demo has content now, so the load empties it first only with RESET typed (as Reset does).
  r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" }, AUTHOR);
  ok("C10.2-10a pass: loading again is a job too (202, the demo emptied first)", r.status === 202, r.status);
  if (r.status === 202) await until(async () => (await call("GET", "/demo/status", undefined, AUTHOR)).body?.story?.state !== "running", 600_000);
  if (r.status === 202) await until(async () => (await call("GET", "/demo/status", undefined, AUTHOR)).body?.checkpoint === "finished_story", 600_000);
  const againStages = await stagesOf();
  ok("C10.2-10 pass: loading again keeps one story (still the two Visitor visa cases, the same stages)", sql(`select count(*) from runtime_case k join combination c on c.id=k.combination_id where c.combination_key='vv.single'`) === "2" && againStages === firstStages, againStages);
  r = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  ok("C10.2-11 pass: Reset removes the story (no cases left)", done && r.status < 300 && sql("select count(*) from runtime_case") === "0", r.status);
});
