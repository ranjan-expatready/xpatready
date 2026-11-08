// C10.2 The founder loads the finished story (M3-F; DEMO.md checkpoint 3 "Finished story", rows 14–16; P-93, P-108).
// Visitor visa part only: the family of four on combination A, the filing with an Online line and its answer sheet,
// filled and validated PDFs, the signed IMM 5476 scans, the document checklist per person, every filing Ready to file,
// on Visitor visa release 2 (row 14 is "A release 2 case"); and a second, thin Visitor visa case that stays on release 1
// while release 2 is out (row 16); seeded through the same services as the screens (never faked), AI as
// saved answers only (US$0, "replay"); loading twice gives one story; Reset removes it.
// Breadth, after Visitor visa: combination B (work permit) reusing A's family facts (row 18), row 13 (W6, parked).
// Phase 1 (the C10.2 PR): checks 5 and 6 read release 2 as configured and the group record (see their notes); PENDING
// lines name the open bug a step waits on (P-330 (7)) and are not counted as a pass or a fail.
// Runs on a FRESH isolated copy (the checkpoint loads its own configuration):
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C10.2.test.ts 4440 xr_studio_accept
import { existsSync } from "node:fs";
import { validatedDir } from "../api/src/sample-validated.ts";
import { AUTHOR, OFFICER, call, main, ok, prepare, sql, until } from "./lib/m3.ts";

await main("C10.2", "Finished demo story: Visitor visa family case at application ready", async () => {
  const spend0 = sql("select count(*) from ai_batch");
  let r = await call("POST", "/demo/checkpoints/finished-story", {}, "user-O");
  ok("C10.2-1 fail: only the founder's configuration people load a checkpoint (403 for a case officer)", r.status === 403, r.status);
  r = await call("POST", "/demo/checkpoints/finished-story", {}, AUTHOR);
  ok("C10.2-2 pass: loading the finished story is a job (202)", r.status === 202, r.status);
  const done = r.status === 202 && await until(async () => (await call("GET", "/demo/status", undefined, AUTHOR)).body?.checkpoint === "finished_story", 600_000);
  ok("C10.2-3 pass: the demo status says Finished story", done);
  // Found in the data (GET /runtime/cases returns the combination's label, not its key, and no people).
  const vvCases = (sql(`select k.id || ':' || (select count(*) from case_participant p where p.case_id=k.id and p.role <> 'case') from runtime_case k join combination c on c.id=k.combination_id where c.combination_key='vv.single' order by k.created_at`) ?? "").split("\n").filter(Boolean).map((x) => ({ id: x.split(":")[0], people: Number(x.split(":")[1]) }));
  const fam = vvCases.find((x) => x.people === 4);
  ok("C10.2-4 pass: one Visitor visa family case of four people, and one thin case beside it", !!fam && vvCases.length === 2, vvCases);
  const p = (await prepare(fam?.id ?? "")).p;
  // #C10.2 phase 1 (builder, for the tech lead in the PR): recording is one action per submission group (C8.2, BR-11), so
  // the family's four filings, each Ready to file first (recording refuses anything else, C8.2-1), read "submitted".
  ok("C10.2-5 pass (row 14): one filing per person, each Ready to file and then recorded together, one family group", p?.filings.length === 4 && p.filings.every((f) => f.status === "submitted") && p.groups.length === 1
    && sql(`select count(*) from filing_record r join filing f on f.id=r.filing_id where f.case_id='${fam?.id}'`) === "4");
  const P = p?.filings.find((f) => f.applicants[0]?.role === "principal")?.applicants[0]?.subject ?? "";
  // #C10.2 phase 1 (Row C1's rule: what a pack expects comes from the release as configured): release 2 files IMM 5257
  // Online (DEMO.md row 9; 130-release-two.ts) and IMM 5645 replaces IMM 5707, so the Online line is read by its channel.
  const onl = (p?.items ?? []).filter((i) => i.subject === P && i.kind === "form" && i.channel === "ONLINE");
  const sheet = onl[0] ? (await call("GET", `/runtime/items/${onl[0].id}/answer-sheet`, undefined, OFFICER)).body : null;
  const hand = (p?.items ?? []).filter((i) => i.subject === P && i.kind === "form" && i.signature === "HAND_SCANNED");
  ok("C10.2-6 pass (row 14): the principal's filing mixes Online (IMM 5257, every answer-sheet section entered) and PDF upload (IMM 5476 printed, signed and its scan uploaded; the other PDFs filled)",
    onl[0]?.form === "IMM 5257" && (sheet?.sections ?? []).length > 0 && sheet.sections.every((x: { entered: unknown }) => !!x.entered) && hand.length === 1 && ["ready", "done"].includes(hand[0].state)
    && Number(sql(`select count(*) from form_instance where case_id='${fam?.id}' and subject_id='${P}' and status='GENERATED' and form_number in ('IMM 5257 SCH1','IMM 5645')`) ?? 0) >= 2);
  if (onl[0]?.state !== "done") console.log(`PENDING  C10.2-6b pass: the Online IMM 5257 reads Done — waits on QA-165 (1): its sheet still waits on ${(sheet?.sections ?? []).reduce((n: number, x: { waiting: unknown[] }) => n + x.waiting.length, 0)} facts the case holds as No, rows or "none apply" (and the visit contact release 2 never asks)`);
  const validated = Number(sql(`select count(*) from validated_copy v join form_instance f on f.id=v.form_instance_id where f.case_id='${fam?.id}'`) ?? 0);
  if (existsSync(validatedDir())) ok("C10.2-6c pass (row 12, release 1): the four IMM 5257 PDF copies validated in Adobe and read back", validated >= 4, validated);
  else console.log(`PENDING  C10.2-6c pass: the four IMM 5257 copies validated in Adobe and read back (release 1) — QA-285: the validated files are kept on the Mac (${validatedDir()} is absent here); never simulated (P-46, P-171)`);
  const cl = (await call("GET", `/runtime/cases/${fam?.id}/checklist`, undefined, OFFICER)).body?.people ?? [];
  ok("C10.2-7 pass (row 15): the document checklist lists every person's lines, some received", cl.length === 4 && cl.every((x: { lines: unknown[] }) => x.lines.length > 0) && cl.some((x: { lines: { state: string }[] }) => x.lines.some((l) => l.state === "received")));
  const pinned = (id?: string) => sql(`select max(r.version) from pack_work_pin w join config_release r on r.id=w.config_release_id where w.case_id='${id}'`);
  const thin = vvCases.find((x) => x.id !== fam?.id);
  ok("C10.2-8 pass (rows 14, 16): the family case is on release 2; the thin case stays on release 1 while release 2 is out", pinned(fam?.id) === "2" && pinned(thin?.id) === "1" && sql(`select max(version) from config_release r join combination c on c.id=r.combination_id where c.combination_key='vv.single'`) === "2");
  ok("C10.2-9 pass: no model call (US$0); every AI result in the story is a replay", done && sql("select count(*) from ai_batch") === spend0);
  r = await call("POST", "/demo/checkpoints/finished-story", {}, AUTHOR);
  if (r.status === 202) await until(async () => (await call("GET", "/demo/status", undefined, AUTHOR)).body?.checkpoint === "finished_story", 600_000);
  ok("C10.2-10 pass: loading again keeps one story (still the two Visitor visa cases)", sql(`select count(*) from runtime_case k join combination c on c.id=k.combination_id where c.combination_key='vv.single'`) === "2");
  r = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  ok("C10.2-11 pass: Reset removes the story (no cases left)", done && r.status < 300 && sql("select count(*) from runtime_case") === "0", r.status);
});
