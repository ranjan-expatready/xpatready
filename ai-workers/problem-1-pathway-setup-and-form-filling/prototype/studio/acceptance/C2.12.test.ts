// C2.12 (Partial) — An author adds a PDF form through one guided path with progress, resume and "what's left": library
// intake → AI maps form fields → review → new shared fields, sections and document types → second person → field map
// complete; each step opens the screen already built (AT-11: every next.href is a route of web/src/App.tsx). Decisions: P-103, P-110, P-99 (resume on the first unfinished
// step), P-102 (PDF only); plan screens/F3-add-form-wizard/plan.md D2, D3, BR-3–BR-5, BR-10.
// Missing per CAPABILITIES: later slices 5–8; To review's screen ignores ?form= (the API has it: journey J2 tests the
// screen). Found writing this file: "Field map complete" (step 6) is said while form fields are still undecided — a
// carried undecided form field is only a note — so the path and the Forms list disagree (IRCC-F08: every question must
// be answered, so every form field is mapped, not a fact, or filled by hand before the map is complete); and the
// combination's validator problems carry no `forms` list (plan F3a-1, BR-10).
// API and data level only. US$0: no model call (the sample's saved field maps; SQL test input marked as such).
//   zsh tools/isolated.sh acc_b5 4568 start && ./node_modules/.bin/tsx acceptance/C2.12.test.ts 4568 xr_studio_acc_b5
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 13 pass, 3 fail — failing: AT-5 fail case
// (With an LMIA's IMM 1295 has 16 undecided form fields, yet step 6 says "The field map is complete … To note: Not
// decided yet"), AT-6 (the Forms list says "226 of 242 form fields decided" for the same form: the two disagree), both
// because carried undecided form fields are a warning, not an open step (plan BR-10 as built); AT-8 (no validator
// problem has a `forms` list: plan F3a-1 not built). AT-2 (resume after a decision) and AT-11 (every next.href opens a
// screen already built) pass.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TABS } from "../contracts/workspace.ts";
import { checkCopy, guard, needCombo, sqlFor, stop } from "./lib/pack1.ts";
const PORT = Number(process.argv[2] ?? 4568), DB = process.argv[3] ?? "xr_studio_acc_b5";
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type R = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const spend = () => sql("select coalesce(sum(cost_usd),0) from drafting_job");
type Step = { n: number; key: string; state: string; words: string; next: { label: string; href: string } | null; who: string | null };
type Progress = { form: string; steps: Step[]; current: string | null; next_for_you: { step: string } | null; whats_left: { step: string }[] };
const progress = async (combo: string, code: string, actor: string | null = "user-A") => call("GET", `/combinations/${combo}/forms/${encodeURIComponent(code)}/progress`, undefined, actor);
/** Undecided form fields of a form's current edition, newest version per form field (as the Forms list counts them). */
const undecided = (code: string) => Number(sql(`select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${code}' and m.version=(select max(v.version) from form_field_map v where v.form_edition_id=m.form_edition_id and v.data_path=m.data_path) and m.outcome='unresolved' and m.status<>'RETIRED'`));
const listRow = async (code: string) => ((await call("GET", `/library/forms/list?q=${encodeURIComponent(code)}`)).body.rows as { code: string; field_map: { kind: string; decided: number; total: number } }[]).find((r) => r.code === code);

(async () => {
  await checkCopy(PORT, DB);
  if ((await call("POST", "/demo/reset", { confirm: "RESET" })).status >= 300) stop("demo reset refused");
  if ((await call("POST", "/demo/load")).status !== 201) stop("the sample did not load");
  const wp = await needCombo(PORT, DB, "lmia_work_permit"), vv = await needCombo(PORT, DB, "visitor_visa");
  const spend0 = spend();

  // ── One path, six steps, resume.
  const p = await progress(wp, "IMM 5707");
  const keys = (p.body as Progress).steps?.map((s) => s.key).join();
  ok("C2.12 AT-1 pass: one form's path has the six steps in order (read and add · AI maps · review · new shared fields · second person · complete)", p.status === 200 && keys === "attach,map,review,fields,second_person,complete", keys);
  ok("C2.12 AT-3 pass (what's left): every open step is listed with who acts; a done step never is", p.body.whats_left.every((w: { step: string }) => p.body.steps.find((s: Step) => s.key === w.step)?.state !== "done"), p.body.whats_left);
  // Library first: a library form not yet on Visitor visa starts at step 1 with "Add it from the library", nothing later started.
  const notOn = await progress(vv, "IMM 1295");
  ok("C2.12 AT-4 [IRCC-F01] pass: a library form not on the combination: step 1 offers 'Add it from the library'; no later step has started", notOn.status === 200 && notOn.body.steps[0].state === "not_started" && notOn.body.steps[0].next?.label === "Add it from the library" && notOn.body.steps.slice(1).every((s: Step) => s.state === "not_started"), notOn.body.steps?.[0]);
  // Resume (P-99) after a decision moves the step: add IMM 1295 from the library to Visitor visa, then read the path again.
  const add1295 = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 1295" });
  const after = (await progress(vv, "IMM 1295")).body as Progress;
  const firstOpen = after.steps?.find((s) => s.state !== "done")?.key ?? null;
  ok("C2.12 AT-2 pass (resume, P-99): after a decision (the form added from the library) the path moves on: step 1 is done and current is the first step not done (or none when all are done), read the same twice",
    add1295.status === 201 && after.steps?.[0]?.state === "done" && after.current === firstOpen && after.current !== "attach" && JSON.stringify((await progress(vv, "IMM 1295")).body) === JSON.stringify(after), { add: add1295.status, current: after.current, states: after.steps?.map((s) => s.state) });
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

  // ── Each step opens the screen already built: every next.href is a route of the web app (web/src/App.tsx), a
  // combination's tab is one of its tabs, and an id in it is a real one (never a made-up page).
  const routes = [...readFileSync(join(import.meta.dirname, "..", "web", "src", "App.tsx"), "utf8").matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]).filter((r) => r !== "*");
  const asRe = (r: string) => new RegExp(`^${r.replace(/:[a-zA-Z]+/g, "[^/?#]+")}(?:[?#].*)?$`);
  const tabs = new Set(TABS.map((t) => t.key as string));
  const known = (href: string) => {
    if (!routes.some((r) => asRe(r).test(href))) return false;
    const c = /^\/c\/([^/?#]+)(?:\/([^/?#]+))?/.exec(href);
    if (c && (sql(`select count(*) from combination where id::text='${c[1].replace(/'/g, "")}'`) !== "1" || (c[2] && c[2] !== "jobs" && !tabs.has(c[2])))) return false;
    return true;
  };
  const hrefs: { form: string; step: string; href: string }[] = [];
  for (const [combo, code] of [[vv, "IMM 1295"], [vv, "IMM 5802"], [vv, "IMM 5476"], [wp, "IMM 5707"], [wp, "IMM 1295"], [wp, "IMM 5409"]] as const) {
    const pr = (await progress(combo, code)).body as Progress;
    for (const st of pr.steps ?? []) if (st.next?.href) hrefs.push({ form: code, step: st.key, href: st.next.href });
  }
  if (!hrefs.length) stop("no step of the sampled paths offers a next step");
  ok("C2.12 AT-11 pass: each step's next step opens a screen already built (a route of the web app; a combination's tab and id are real ones)", hrefs.every((h) => known(h.href)), hrefs.filter((h) => !known(h.href)).concat(hrefs.slice(0, 2)));

  // ── Roles: the path is for configuration people only.
  const asO = await progress(wp, "IMM 5707", "user-O"), asP = await progress(wp, "IMM 5707", "user-P"), asNone = await progress(wp, "IMM 5707", null);
  ok("C2.12 AT-9 roles: case officer and client are 403, nobody named is 401", asO.status === 403 && asP.status === 403 && asNone.status === 401, [asO.status, asP.status, asNone.status]);
  const asC = await progress(wp, "IMM 5707", "user-C");
  ok("C2.12 AT-9 pass: the content reviewer reads the same path; any step not theirs says who acts and offers nothing", asC.status === 200 && asC.body.steps.every((s: Step) => s.state !== "waiting_others" || (s.next === null && !!s.who)), asC.body.steps?.map((s: Step) => [s.key, s.state, s.who]));
  ok("C2.12 AT-10 US$0: nothing in this file spent money", spend() === spend0, [spend0, spend()]);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
