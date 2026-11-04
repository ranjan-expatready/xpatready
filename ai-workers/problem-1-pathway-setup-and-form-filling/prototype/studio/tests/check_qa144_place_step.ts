// QA-144 part 1 (P-318 (6), P-322; C4.11, C4.7): the Smart questionnaire tab's step "Ask them in their form's sections"
// (POST /combinations/:id/place-from-form-parts) runs the shared placement rules for a person. On Demo › Reset to the six,
// after the people's own earlier steps (field maps accepted and applied, sections drafted from the forms' parts and
// accepted, a second person approving; acceptance/lib/pack2.ts questionsBySteps), Visitor visa has no question until the
// author presses the step; then every applying person role has questions. Only the author may press it; an unknown or
// malformed combination is 404 in words; a second press places nothing more; the step is audited in words. Rules only,
// no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_q144 4441 start && tsx studio/tests/check_qa144_place_step.ts 4441 xr_studio_runtime_q144
import { randomUUID } from "node:crypto";
import { client, recorder } from "./runtime/api.ts";

process.argv[2] ??= "4441"; process.argv[3] ??= "xr_studio_runtime_q144";
const { pack2 } = await import("../acceptance/lib/pack2.ts");
const PORT = Number(process.argv[2]), DB = process.argv[3];
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const T = pack2("QA-144 part 1");
const STEP = (id: string) => `/combinations/${id}/place-from-form-parts`;
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const questions = async (id: string) => ((await call("GET", `/combinations/${id}/workspace?tab=questionnaires`)).body?.questionnaire?.roles ?? []) as { role: string; questions: number }[];

const reset = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, "user-A");
ok("setup: Demo › Reset to the six (2xx)", reset.status < 300, reset.status);
const vv = sql("select id from combination where combination_key='vv.single'");
const steps = await T.questionsBySteps(vv, { place: false });
ok("setup: the people's earlier steps ran through the API (field maps applied, sections accepted, a second person approved)", steps.applied > 0 && steps.sections > 0 && steps.refused.length === 0, steps);
ok("QA-144 fail: before the step, Visitor visa asks no person anything", (await questions(vv)).every((r) => r.questions === 0), await questions(vv));

// Who may press it, and on what
for (const [who, want] of [["user-B", 403], ["user-C", 403], ["user-O", 403]] as const) {
  const r = await call("POST", STEP(vv), {}, who);
  ok(`QA-144 fail: ${who} may not press the step (${want})`, r.status === want, r.status);
}
let r = await call("POST", STEP(vv), {}, null);
ok("QA-144 fail: no actor is refused (401)", r.status === 401, r.status);
r = await call("POST", STEP("not-a-combination"), {}, "user-A");
ok("QA-144 fail: a malformed combination id is 404, in words", r.status === 404 && /does not exist/.test(words(r)), words(r));
r = await call("POST", STEP(randomUUID()), {}, "user-A");
ok("QA-144 fail: an unknown combination is 404, in words", r.status === 404 && /does not exist/.test(words(r)), words(r));
ok("QA-144 fail: a refused press placed nothing", (await questions(vv)).every((x) => x.questions === 0));

// The author presses it
r = await call("POST", STEP(vv), {}, "user-A");
const placed = (r.body?.placed ?? []) as { fact: string; section: string; repeats: string }[];
ok("QA-144 pass: the author's press places the answers the forms need in sections (200)", r.status === 200 && placed.length > 0 && r.body?.sections > 0, { status: r.status, placed: placed.length, sections: r.body?.sections, noSection: r.body?.noSection?.length, refused: r.body?.refused?.slice?.(0, 3) });
const after = await questions(vv);
const applying = after.filter((x) => x.role !== "representative");
ok("QA-144 pass: then every applying person role has questions", applying.length >= 3 && applying.every((x) => x.questions > 0), after);
ok("QA-144 pass: each placed answer is asked once per case or per person or per row, never another way", placed.every((x) => ["once_per_case", "per_person", "per_row"].includes(x.repeats)), [...new Set(placed.map((x) => x.repeats))]);
const audit = sql(`select summary from audit_event where combination_id='${vv}' and entity='placement step' order by at desc limit 1`);
ok("QA-144 pass: the step is in the activity log, in words", new RegExp(`asked ${placed.length} answers? of "Visitor visa" in the sections of their form fields`).test(audit), audit.slice(0, 200));

// A second press
r = await call("POST", STEP(vv), {}, "user-A");
ok("QA-144 fail: a second press places nothing more (every answer is asked already)", r.status === 200 && (r.body?.placed ?? []).length === 0, { status: r.status, placed: r.body?.placed?.length });
ok("QA-144 pass: the questions stay as they were after the second press", JSON.stringify(await questions(vv)) === JSON.stringify(after));

process.exit(summary() ? 1 : 0);
