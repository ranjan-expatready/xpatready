// QA-144 part 1 (P-318 (6), P-322; C4.11, C4.7): the Smart questionnaire tab's step "Ask them in their forms' sections"
// (POST /combinations/:id/place-from-form-parts) runs the shared placement rules for a person. On the six (the Demo
// menu's sample), after the people's own earlier steps (field maps accepted and applied, sections drafted from the forms'
// parts and accepted, a second person approving; acceptance/lib/pack2.ts questionsBySteps), Visitor visa has no question
// until the author presses the step; then every applying person role has questions. Only the author may press it; an
// unknown or malformed combination is 404 and a retired one 409, in words; two presses at once run it once (409 for the
// other); a second press places nothing and writes no history. The field-map Apply it rests on has the queue's
// transaction room: slowed past it on purpose (STUDIO_SLOW_APPLY, isolated test server only) it is a 503 in words with
// nothing applied. Rules only, no model call (US$0).
//   tsx studio/tests/check_qa144_place_step.ts [port=4441] [name=runtime_q144]   (starts its own isolated copy)
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const STUDIO = join(import.meta.dirname, "..");
const PORT = Number(process.argv[2] ?? 4441), NAME = (process.argv[3] ?? "runtime_q144").replace(/^xr_studio_/, ""), DB = `xr_studio_${NAME}`;
process.argv[2] = String(PORT); process.argv[3] = DB; // the pack helpers read the same copy
const server = (action: "start" | "restart" | "stop", env: string[] = []) => execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), action, ...env], { encoding: "utf8" });
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STEP = (id: string) => `/combinations/${id}/place-from-form-parts`;
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const questions = async (id: string) => ((await call("GET", `/combinations/${id}/workspace?tab=questionnaires`)).body?.questionnaire?.roles ?? []) as { role: string; questions: number }[];
const placements = () => Number(sql("select count(*) from section_question where status <> 'RETIRED'"));
const history = (id: string) => Number(sql(`select count(*) from audit_event where combination_id='${id}' and entity='placement step'`));

let code = 1;
try {
  // ---------------------------------------------------------------- the Apply the step rests on: its transaction room
  server("start", ["STUDIO_SLOW_APPLY=imm5475e.pdf:61000"]);
  const { pack2 } = await import("../acceptance/lib/pack2.ts");
  const T = pack2("QA-144 part 1");
  const load = await call("POST", "/demo/load", { sample: "six" }, "user-A");
  ok("setup: the six load, as from the Demo menu (2xx)", load.status < 300, load.status);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const slowJob = sql(`select j.id from drafting_job j join source_attachment a on a.id=j.attachment_id where j.combination_id='${vv}' and j.kind='field_map' and a.file_name='imm5475e.pdf'`);
  for (const it of sql(`select id from proposal_item where run_id='${slowJob}' and status='waiting'`).split("\n").filter(Boolean)) await call("POST", `/jobs/${slowJob}/items/${it}`, { decision: "ACCEPTED", note: "Accepted by a test (QA-144 part 1)." }, "user-A");
  let r = await call("POST", `/jobs/${slowJob}/apply`, {}, "user-A");
  ok("QA-144 fail: an Apply that runs past its transaction room is a 503 in plain words (no Prisma text, no path)", r.status === 503 && /took too long \(the computer is busy\), so nothing was applied/.test(words(r)) && !/prisma|Transaction API|\/Users\//i.test(words(r)), words(r));
  ok("QA-144 fail: and nothing of it is applied (the draft stays as it was)", sql(`select status from drafting_job where id='${slowJob}'`) === "COMPLETED" && sql(`select status from source_attachment where file_name='imm5475e.pdf' and combination_id='${vv}'`) !== "IN_LIBRARY");

  // ---------------------------------------------------------------- the people's earlier steps, then the step
  server("restart");
  const steps = await T.questionsBySteps(vv, { place: false });
  ok("setup: the people's earlier steps ran through the API (field maps applied, sections accepted, a second person approved)", steps.applied === 7 && steps.sections > 0 && steps.refused.length === 0, steps);
  ok("QA-144 pass: with the room, every field-map Apply goes through, IMM 5475 included", sql(`select status from drafting_job where id='${slowJob}'`) === "APPLIED");
  ok("QA-144 fail: before the step, Visitor visa asks no person anything", (await questions(vv)).every((x) => x.questions === 0), await questions(vv));

  // Who may press it, and on what
  for (const [who, want] of [["user-B", 403], ["user-C", 403], ["user-O", 403]] as const) {
    r = await call("POST", STEP(vv), {}, who);
    ok(`QA-144 fail: ${who} may not press the step (${want})`, r.status === want, r.status);
  }
  r = await call("POST", STEP(vv), {}, null);
  ok("QA-144 fail: no actor is refused (401)", r.status === 401, r.status);
  r = await call("POST", STEP("not-a-combination"), {}, "user-A");
  ok("QA-144 fail: a malformed combination id is 404, in words", r.status === 404 && /does not exist/.test(words(r)), words(r));
  r = await call("POST", STEP(randomUUID()), {}, "user-A");
  ok("QA-144 fail: an unknown combination is 404, in words", r.status === 404 && /does not exist/.test(words(r)), words(r));
  // A retired combination (setup, test only: marked retired in the database, as a retire after a release leaves it; on
  // the six nothing is released yet).
  const sp = sql("select id from combination where combination_key='sp.outside'"), p0 = placements();
  sql(`update combination set retired_at=now() where id='${sp}'`);
  r = await call("POST", STEP(sp), {}, "user-A");
  ok("QA-144 fail: a retired combination is refused (409, in words) and nothing is placed", r.status === 409 && /is retired: nothing is placed on it/.test(words(r)) && placements() === p0, words(r));
  sql(`update combination set retired_at=null where id='${sp}'`);
  ok("QA-144 fail: a refused press placed nothing", (await questions(vv)).every((x) => x.questions === 0) && history(vv) === 0);

  // The author presses it twice at once (two tabs, a double click): it runs once.
  const both = await Promise.all([call("POST", STEP(vv), {}, "user-A"), call("POST", STEP(vv), {}, "user-A")]);
  const first = both.find((x) => x.status === 200), other = both.find((x) => x.status !== 200);
  ok("QA-144 fail: two presses at once run it once; the other is 409 in words", !!first && other?.status === 409 && /already running on this combination/.test(words(other)), both.map((x) => [x.status, words(x).slice(0, 80)]));
  const placed = (first?.body?.placed ?? []) as { fact: string; section: string; repeats: string }[];
  ok("QA-144 pass: the author's press places the answers the forms need in sections (200)", placed.length > 0 && first?.body?.sections > 0, { placed: placed.length, sections: first?.body?.sections, noSection: first?.body?.noSection?.length, refused: first?.body?.refused?.slice?.(0, 3) });
  ok("QA-144 pass: each answer placed once (no placement counted twice by the second press)", new Set(placed.map((x) => x.fact)).size === placed.length && history(vv) === 1);
  const after = await questions(vv);
  const applying = after.filter((x) => x.role !== "representative");
  ok("QA-144 pass: then every applying person role has questions", applying.length >= 3 && applying.every((x) => x.questions > 0), after);
  ok("QA-144 pass: each placed answer is asked once per case or per person or per row, never another way", placed.every((x) => ["once_per_case", "per_person", "per_row"].includes(x.repeats)), [...new Set(placed.map((x) => x.repeats))]);
  const audit = sql(`select summary from audit_event where combination_id='${vv}' and entity='placement step' order by at desc limit 1`);
  ok("QA-144 pass: the step is in the activity log, in words", new RegExp(`asked ${placed.length} answers? of "Visitor visa" in the sections of their form fields`).test(audit), audit.slice(0, 200));

  // A second press
  const p1 = placements();
  r = await call("POST", STEP(vv), {}, "user-A");
  ok("QA-144 fail: a second press places nothing more (every answer is asked already)", r.status === 200 && (r.body?.placed ?? []).length === 0 && placements() === p1, { status: r.status, placed: r.body?.placed?.length });
  ok("QA-144 fail: a press that changes nothing writes no history line", history(vv) === 1, history(vv));
  ok("QA-144 pass: the questions stay as they were after the second press", JSON.stringify(await questions(vv)) === JSON.stringify(after));
  code = summary() ? 1 : 0;
} catch (e) { console.error(e); } finally { server("stop"); }
process.exit(code);
