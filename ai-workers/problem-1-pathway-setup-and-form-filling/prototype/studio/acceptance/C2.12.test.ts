// C2.12 (Partial) — An author adds a PDF form through one guided path with progress, resume and "what's left": library
// intake → AI maps form fields → review → new shared fields, sections and document types → second person → field map
// complete; each step opens the screen already built. Decisions: P-103, P-110, P-99 (resume on the first unfinished
// step), P-102 (PDF only); plan screens/F3-add-form-wizard/plan.md D2, D3, BR-3–BR-5, BR-10.
// Missing per CAPABILITIES: later slices 5–8; To review's screen ignores ?form= (the API has it: journey J2 tests the
// screen). Found writing this file: "Field map complete" (step 6) is said while form fields are still undecided — a
// carried undecided form field is only a note — so the path and the Forms list disagree (IRCC-F08: every question must
// be answered, so every form field is mapped, not a fact, or filled by hand before the map is complete); and the
// combination's validator problems carry no `forms` list (plan F3a-1, BR-10).
// API and data level only. US$0: no model call (the sample's saved field maps; SQL test input marked as such).
//   zsh tools/isolated.sh acc_b5 4568 start && ./node_modules/.bin/tsx acceptance/C2.12.test.ts 4568 xr_studio_acc_b5
// Expected today (main 25cefb67): 12 pass, 3 fail — failing: AT-5 fail case (With an LMIA's IMM 1295 has 16 undecided
// form fields, yet step 6 says "The field map is complete … To note: Not decided yet"), AT-6 (the Forms list says
// "226 of 242 form fields decided" for the same form: the two disagree), both because carried undecided form fields are a
// warning, not an open step (plan BR-10 as built); AT-8 (no validator problem has a `forms` list: plan F3a-1 not built).
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4568), DB = process.argv[3] ?? "xr_studio_acc_b5";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type R = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const stop = (why: string) => { console.error(`STOP  ${why}`); process.exit(2); };
const spend = () => sql("select coalesce(sum(cost_usd),0) from drafting_job");
type Step = { n: number; key: string; state: string; words: string; next: { label: string; href: string } | null; who: string | null };
type Progress = { form: string; steps: Step[]; current: string | null; next_for_you: { step: string } | null; whats_left: { step: string }[] };
const progress = async (combo: string, code: string, actor: string | null = "user-A") => call("GET", `/combinations/${combo}/forms/${encodeURIComponent(code)}/progress`, undefined, actor);
/** Undecided form fields of a form's current edition, newest version per form field (as the Forms list counts them). */
const undecided = (code: string) => Number(sql(`select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${code}' and m.version=(select max(v.version) from form_field_map v where v.form_edition_id=m.form_edition_id and v.data_path=m.data_path) and m.outcome='unresolved' and m.status<>'RETIRED'`));
const listRow = async (code: string) => ((await call("GET", `/library/forms/list?q=${encodeURIComponent(code)}`)).body.rows as { code: string; field_map: { kind: string; decided: number; total: number } }[]).find((r) => r.code === code);

(async () => {
  const served = (await call("GET", "/session").catch(() => ({ status: 0, body: null }))).body?.workspace?.id;
  if (!served) stop(`no copy answers on port ${PORT}: start it with zsh tools/isolated.sh acc_b5 ${PORT} start`);
  try { if (!sql(`select id from workspace where id='${served}'`)) throw new Error(); } catch { stop(`the database ${DB} is not the one the server on port ${PORT} uses`); }
  if ((await call("POST", "/demo/reset", { confirm: "RESET" })).status >= 300) stop("demo reset refused");
  if ((await call("POST", "/demo/load")).status !== 201) stop("the sample did not load");
  const wp = sql("select id from combination where combination_key='wp.family'"), vv = sql("select id from combination where combination_key='vv.single'");
  if (!wp || !vv) stop("the sample has no With an LMIA or Visitor visa");
  const spend0 = spend();

  // ── One path, six steps, resume.
  const p = await progress(wp, "IMM 5707");
  const keys = (p.body as Progress).steps?.map((s) => s.key).join();
  ok("C2.12 AT-1 pass: one form's path has the six steps in order (read and add · AI maps · review · new shared fields · second person · complete)", p.status === 200 && keys === "attach,map,review,fields,second_person,complete", keys);
  const p2 = await progress(wp, "IMM 5707");
  ok("C2.12 AT-2 pass (resume, P-99): read again it lands on the same step — current is the first step not done, or none when all are done", JSON.stringify(p.body) === JSON.stringify(p2.body) && (p.body.current === null ? p.body.steps.every((s: Step) => s.state === "done") : p.body.steps.find((s: Step) => s.state !== "done")?.key === p.body.current), { current: p.body.current, states: p.body.steps.map((s: Step) => s.state) });
  ok("C2.12 AT-3 pass (what's left): every open step is listed with who acts; a done step never is", p.body.whats_left.every((w: { step: string }) => p.body.steps.find((s: Step) => s.key === w.step)?.state !== "done"), p.body.whats_left);
  // Library first: a library form not yet on Visitor visa starts at step 1 with "Add it from the library", nothing later started.
  const notOn = await progress(vv, "IMM 1295");
  ok("C2.12 AT-4 [IRCC-F01] pass: a library form not on the combination: step 1 offers 'Add it from the library'; no later step has started", notOn.status === 200 && notOn.body.steps[0].state === "not_started" && notOn.body.steps[0].next?.label === "Add it from the library" && notOn.body.steps.slice(1).every((s: Step) => s.state === "not_started"), notOn.body.steps?.[0]);
  const notLib = await progress(vv, "IMM 9999");
  ok("C2.12 AT-4 fail case: a form that is not in the library is 404 in words (never a path made up)", notLib.status === 404, notLib.status);

  // ── Field map complete only when every form field is decided (IRCC-F08).
  const und1295 = undecided("IMM 1295");
  const p1295 = (await progress(wp, "IMM 1295")).body as Progress;
  const s6 = p1295.steps.find((s) => s.key === "complete")!;
  ok("setup: With an LMIA's IMM 1295 has undecided form fields in the sample", und1295 > 0, und1295);
  ok("C2.12 AT-5 [IRCC-F08] fail case: with undecided form fields, step 6 is not 'Field map complete' and what's left names the deciding", s6.state !== "done" && p1295.whats_left.length > 0, { und1295, s6, whats_left: p1295.whats_left });
  const row1295 = await listRow("IMM 1295");
  ok("C2.12 AT-6 [IRCC-F08] the path and the Forms list agree: step 6 done exactly when the list's field map is complete", (s6.state === "done") === (row1295?.field_map.kind === "complete"), { step6: s6.state, list: row1295?.field_map });
  // Pass case. Test input (SQL): every undecided form field of IMM 5409 is decided as "not a fact" in a newer draft version.
  sql(`insert into form_field_map select (jsonb_populate_record(null::form_field_map, to_jsonb(m) || jsonb_build_object('id', gen_random_uuid(), 'version', m.version + 1, 'status', 'DRAFT', 'outcome', 'not_a_fact', 'reason', 'Acceptance test input (Sample)'))).* from form_field_map m join form_edition e on e.id=m.form_edition_id join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5409' and m.outcome='unresolved' and m.version=(select max(v.version) from form_field_map v where v.form_edition_id=m.form_edition_id and v.data_path=m.data_path)`);
  const p5409 = (await progress(wp, "IMM 5409")).body as Progress, row5409 = await listRow("IMM 5409");
  ok("C2.12 AT-5 [IRCC-F08] pass: once every IMM 5409 form field is decided (mapped, not a fact or by hand), step 6 is done and the list agrees", undecided("IMM 5409") === 0 && p5409.steps.find((s) => s.key === "complete")?.state === "done" && row5409?.field_map.decided === row5409?.field_map.total, { s6: p5409.steps.find((s) => s.key === "complete"), list: row5409?.field_map });

  // ── Step 3 and To review name the same next step (plan D3); ?form= narrows To review (API).
  const one = (await call("GET", `/review-queue?filter=all&form=${encodeURIComponent("IMM 5707")}`)).body;
  ok("C2.12 AT-7 pass: To review ?form=IMM 5707 lists only that form's items, its counts count that set", Array.isArray(one.items) && one.items.every((i: { forms: string[] }) => i.forms.includes("IMM 5707")) && one.counts.all === one.items.length, { n: one.items?.length, counts: one.counts });
  const none = (await call("GET", `/review-queue?filter=all&form=${encodeURIComponent("IMM 1294")}`)).body;
  ok("C2.12 AT-7 fail case: a form with nothing waiting gives an empty list, never everything", none.items.length === 0 && none.counts.all === 0, none.counts);

  // ── Each problem the path shows belongs to its form (plan F3a-1, BR-10): validator problems carry forms.
  const problems = ((await call("GET", `/combinations/${wp}`)).body?.draft?.problems ?? []) as { where: string; item: string; forms?: string[] }[];
  const formProblems = problems.filter((x) => x.where === "Forms");
  ok("C2.12 AT-8 pass: every validator problem of the combination carries a forms list; a Forms problem lists its own form", problems.length > 0 && problems.every((x) => Array.isArray(x.forms)) && formProblems.every((x) => x.forms!.includes(x.item)), { n: problems.length, sample: problems.slice(0, 2).map((x) => ({ where: x.where, item: x.item, forms: x.forms })) });

  // ── Roles: the path is for configuration people only.
  const asO = await progress(wp, "IMM 5707", "user-O"), asP = await progress(wp, "IMM 5707", "user-P"), asNone = await progress(wp, "IMM 5707", null);
  ok("C2.12 AT-9 roles: case officer and client are 403, nobody named is 401", asO.status === 403 && asP.status === 403 && asNone.status === 401, [asO.status, asP.status, asNone.status]);
  const asC = await progress(wp, "IMM 5707", "user-C");
  ok("C2.12 AT-9 pass: the content reviewer reads the same path; any step not theirs says who acts and offers nothing", asC.status === 200 && asC.body.steps.every((s: Step) => s.state !== "waiting_others" || (s.next === null && !!s.who)), asC.body.steps?.map((s: Step) => [s.key, s.state, s.who]));
  ok("C2.12 AT-10 US$0: nothing in this file spent money", spend() === spend0, [spend0, spend()]);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
