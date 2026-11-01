// C10.2 The founder loads the finished story (M3-F; DEMO.md checkpoint 3 "Finished story", rows 14–16; P-93, P-108).
// Visitor visa part only: the family of four on combination A, the filing with an Online line and its answer sheet,
// filled and validated PDFs, the signed IMM 5476 scans, the document checklist per person, every filing Ready to file,
// the case on its release while release 2 is out; seeded through the same services as the screens (never faked), AI as
// saved answers only (US$0, "replay"); loading twice gives one story; Reset removes it.
// Breadth, after Visitor visa: combination B (work permit) reusing A's family facts (row 18), row 13 (W6, parked).
// Runs on a FRESH isolated copy (the checkpoint loads its own configuration):
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C10.2.test.ts 4440 xr_studio_accept
import { AUTHOR, OFFICER, call, itemsOf, main, ok, prepare, sql, until } from "./lib/m3.ts";

await main("C10.2", "Finished demo story: Visitor visa family case at application ready", async () => {
  const spend0 = sql("select count(*) from ai_batch");
  let r = await call("POST", "/demo/checkpoints/finished-story", {}, "user-O");
  ok("C10.2-1 fail: only the founder's configuration people load a checkpoint (403 for a case officer)", r.status === 403, r.status);
  r = await call("POST", "/demo/checkpoints/finished-story", {}, AUTHOR);
  ok("C10.2-2 pass: loading the finished story is a job (202)", r.status === 202, r.status);
  const done = await until(async () => (await call("GET", "/demo/status")).body?.checkpoint === "finished_story", 600_000);
  ok("C10.2-3 pass: the demo status says Finished story", done);
  const cases = (await call("GET", "/runtime/cases", undefined, OFFICER)).body?.cases ?? (await call("GET", "/runtime/cases", undefined, OFFICER)).body ?? [];
  const fam = (Array.isArray(cases) ? cases : []).find((x: { combination_key?: string; people?: unknown[] }) => x.combination_key === "vv.single");
  ok("C10.2-4 pass: one Visitor visa family case of four people", !!fam && (fam.people?.filter((p: { role: string }) => p.role !== "case").length ?? 0) === 4, fam);
  const p = (await prepare(fam?.id ?? "")).p;
  ok("C10.2-5 pass (row 14): one filing per person, all Ready to file, one family group", p?.filings.length === 4 && p.filings.every((f) => f.status === "ready_to_file") && p.groups.length === 1);
  const P = p?.filings.find((f) => f.applicants[0]?.role === "principal")?.applicants[0]?.subject ?? "";
  ok("C10.2-6 pass (row 14): the principal's filing mixes Online (IMM 5707, sections entered) and PDF upload (IMM 5257 validated read back, IMM 5476 signed scan)",
    itemsOf(p, P, "IMM 5707")[0]?.channel === "ONLINE" && itemsOf(p, P, "IMM 5257")[0]?.state === "ready" && itemsOf(p, P, "IMM 5476")[0]?.state === "ready" && Number(sql(`select count(*) from validated_copy v join form_instance f on f.id=v.form_instance_id where f.case_id='${fam?.id}'`) ?? 0) >= 4);
  const cl = (await call("GET", `/runtime/cases/${fam?.id}/checklist`, undefined, OFFICER)).body?.people ?? [];
  ok("C10.2-7 pass (row 15): the document checklist lists every person's lines, some received", cl.length === 4 && cl.every((x: { lines: unknown[] }) => x.lines.length > 0) && cl.some((x: { lines: { state: string }[] }) => x.lines.some((l) => l.state === "received")));
  ok("C10.2-8 pass (row 16): the case stays on release 1 while release 2 of Visitor visa is out", sql(`select r.version from pack_work_pin w join config_release r on r.id=w.config_release_id where w.case_id='${fam?.id}'`) === "1" && sql(`select max(version) from config_release r join combination c on c.id=r.combination_id where c.combination_key='vv.single'`) === "2");
  ok("C10.2-9 pass: no model call (US$0); every AI result in the story is a replay", sql("select count(*) from ai_batch") === spend0);
  r = await call("POST", "/demo/checkpoints/finished-story", {}, AUTHOR);
  await until(async () => (await call("GET", "/demo/status")).body?.checkpoint === "finished_story", 600_000);
  ok("C10.2-10 pass: loading again keeps one story (one Visitor visa family case)", sql(`select count(*) from runtime_case k join combination c on c.id=k.combination_id where c.combination_key='vv.single'`) === "1");
  r = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  ok("C10.2-11 pass: Reset removes the story (no cases left)", r.status < 300 && sql("select count(*) from runtime_case") === "0", r.status);
});
