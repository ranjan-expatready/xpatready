// C6.17 A multi-stage case (B139): unit tests of engine/runtime/stages.ts on small synthetic routes (no database, no
// server). Each business rule of the concept has a passing and a failing case, labelled "C6.17 BR-n pass/fail". The API,
// readers and screens are proved by acceptance/C6.17.test.ts on the checkpoint; the migration by
// tests/check_c617_stages_migration.ts. Also: the Sample route file loads under the engine's own check. US$0.
//   tsx studio/tests/check_c617_stages.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { carryCounts, checkKeyDetails, deadlineOf, isDate, nextOf, onFileFrom, openingStages, routeProblems, STAGE_WORDS, type RouteDef } from "../engine/runtime/stages.ts";
import { NewCase, StartNext } from "../contracts/runtime.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const route = (): RouteDef => ({ key: "study_then_work", label: "Study, then work (Sample)", basis: "SAMPLE", stages: [
  { key: "study", staff_name: "Study permit", client_name: "Study permit", combination_key: "sp.outside", next: "work",
    key_details: [{ field: "person.uci", label: "UCI", type: "STRING", same_every_stage: true }, { field: "stage.permit_valid_until", label: "Study permit valid until", type: "DATE" }] },
  { key: "work", staff_name: "Work permit", client_name: "Work permit", combination_key: "wp.lmia_inside", next: null, key_details: [],
    deadline: { label: "Apply for the work permit by", from_stage: "study", field: "stage.permit_valid_until", add_days: 0 }, same_documents: [{ from: "passport_copy", to: "passport_photocopy" }] }] });
const known = new Set(["sp.outside", "wp.lmia_inside", "vv.single"]);

// ---------------------------------------------------------------- BR-2 the route is data
ok("C6.17 BR-2 pass: a route of 2 stages, each combination present and used once, next inside the route, loads", routeProblems(route(), known).length === 0, routeProblems(route(), known));
const one = route(); one.stages = one.stages.slice(0, 1); one.stages[0].next = null;
ok("C6.17 BR-2 fail: a route of 1 stage is refused", routeProblems(one, known).some((p) => /at least 2 stages/.test(p)));
const twice = route(); twice.stages[1].combination_key = "sp.outside";
ok("C6.17 BR-2 fail (challenge M3): a combination used twice is refused (repeatable stages are not built)", routeProblems(twice, known).some((p) => /used twice/.test(p)));
const missing = route(); missing.stages[1].combination_key = "nope.none";
ok("C6.17 BR-2 fail: a combination not in the workspace is refused", routeProblems(missing, known).some((p) => /not in the workspace/.test(p)));
const loop = route(); loop.stages[1].next = "study";
ok("C6.17 BR-2 fail: a next stage that is not the following one (a loop, a jump) is refused", routeProblems(loop, known).some((p) => /next must be/.test(p)));
const badDeadline = route(); badDeadline.stages[1].deadline!.field = "person.uci";
ok("C6.17 BR-8 fail: a deadline that reads no date key detail of an earlier stage is refused", routeProblems(badDeadline, known).some((p) => /not a date key detail/.test(p)));
const notPerson = route(); notPerson.stages[0].key_details[1].same_every_stage = true;
ok("C6.17 BR-3 fail: only a person's fact can be the same at every stage (written as the person's answer)", routeProblems(notPerson, known).some((p) => /person's fact/.test(p)));
const file = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "routes.json"), "utf8")) as { basis: string; routes: RouteDef[] };
ok("C6.17 BR-2 pass: the Sample route file loads under the engine's check against the six's combination keys, labelled Sample",
  file.basis === "SAMPLE" && file.routes.length >= 1 && file.routes.every((r) => r.basis === "SAMPLE" && /Sample/.test(r.label) && routeProblems(r, new Set(["vv.single", "sp.outside", "wp.lmia_inside", "pnp.express_entry", "fs.spouse", "lm.high_wage"])).length === 0));

// ---------------------------------------------------------------- BR-1, BR-3 opening at a later stage
const at = "2026-11-09T10:00:00.000Z";
const later = openingStages(route(), "wp.lmia_inside", [{ stage: "study", done_before: true, key_details: { "person.uci": " 12345678 ", "stage.permit_valid_until": "2027-02-03" } }], "user-O", at);
ok("C6.17 BR-3 pass: opening on the work permit with the study permit done before writes DONE_BEFORE (with its key details, trimmed, by the officer) then CURRENT",
  "rows" in later && later.rows.map((r) => `${r.ord}:${r.state}`).join(",") === "1:DONE_BEFORE,2:CURRENT" && later.rows[0].key_details["person.uci"]?.value === "12345678" && later.rows[0].key_details["person.uci"]?.by === "user-O", later);
const unticked = openingStages(route(), "wp.lmia_inside", [{ stage: "study", done_before: false }], "user-O", at);
ok("C6.17 BR-3 pass: an earlier stage left unticked is not recorded (no key details)", "rows" in unticked && unticked.rows[0].state === "NOT_RECORDED" && Object.keys(unticked.rows[0].key_details).length === 0);
const detailsUnticked = openingStages(route(), "wp.lmia_inside", [{ stage: "study", done_before: false, key_details: { "person.uci": "123" } }], "user-O", at);
ok("C6.17 BR-3 fail: key details on an unticked stage are refused on its tick (not silently dropped)", "field" in detailsUnticked && detailsUnticked.field === "earlier.0.done_before");
const first = openingStages(route(), "sp.outside", [], "user-O", at);
ok("C6.17 BR-1 pass: opening on the first stage: CURRENT then NOT_STARTED", "rows" in first && first.rows.map((r) => r.state).join(",") === "CURRENT,NOT_STARTED");
const notBefore = openingStages(route(), "sp.outside", [{ stage: "work", done_before: true }], "user-O", at);
ok("C6.17 BR-3 fail: a stage that is not before the opening stage cannot be done before", "field" in notBefore && /not a stage before/.test(notBefore.message));
const noRoute = openingStages(null, "vv.single", [{ stage: "study", done_before: true }], "user-O", at);
ok("C6.17 BR-1 fail: a combination on no route has no earlier stages (a one-stage case)", "field" in noRoute && noRoute.field === "earlier" && "rows" in openingStages(null, "vv.single", [], "u", at));

// ---------------------------------------------------------------- BR-3 key details typed by their field
ok("C6.17 BR-3 pass: a real date and text pass; blank means not given", (() => { const r = checkKeyDetails(route().stages[0].key_details, { "stage.permit_valid_until": "2027-02-03", "person.uci": "" }, "k"); return "values" in r && r.values["stage.permit_valid_until"] === "2027-02-03" && !("person.uci" in r.values); })());
const badDate = checkKeyDetails(route().stages[0].key_details, { "stage.permit_valid_until": "3 Feb 2027" }, "earlier.0.key_details");
ok("C6.17 BR-3 fail: text in a date is refused on that field", "field" in badDate && badDate.field === "earlier.0.key_details.stage.permit_valid_until" && /YYYY-MM-DD/.test(badDate.message));
ok("C6.17 breaker m5 fail: a date outside 1950-2100 (0001-01-01, 9999-12-31) is refused on its field", ["0001-01-01", "9999-12-31"].every((v) => "field" in checkKeyDetails(route().stages[0].key_details, { "stage.permit_valid_until": v }, "k")));
ok("C6.17 BR-3 fail: 31 February is not a date; a field the stage does not record is refused", !isDate("2027-02-31") && "field" in checkKeyDetails(route().stages[0].key_details, { "person.family_name": "X" }, "k"));

// ---------------------------------------------------------------- BR-8 the deadline, worked out on read, Sample
const stages = [{ stage_key: "study", staff_name: "Study permit", key_details: { "stage.permit_valid_until": { value: "2027-02-03", by: "u", at } }, defs: route().stages[0].key_details }];
const d = deadlineOf(route().stages[1].deadline, stages);
ok("C6.17 BR-8 pass: the deadline is the study permit's end date, labelled Sample", d?.due === "2027-02-03" && d.sample === true && /Sample/.test(d.why));
const d2 = deadlineOf({ ...route().stages[1].deadline!, add_days: -30 }, stages);
ok("C6.17 BR-8 pass: days before the date are counted", d2?.due === "2027-01-04");
const none = deadlineOf(route().stages[1].deadline, [{ ...stages[0], key_details: {} }]);
ok("C6.17 BR-8 fail: a missing key detail sets no date: \"Can't set: Study permit valid until is missing\"", none?.due === null && /^Can't set: Study permit valid until is missing/.test(none.why) && none.sample === true);
ok("C6.17 BR-8 pass: a stage with no rule has no deadline", deadlineOf(null, stages) === null);

// ---------------------------------------------------------------- BR-4 the next stage
const rows = [{ id: "a", ord: 1, state: "ENDED_NEXT_STARTED" as const }, { id: "b", ord: 2, state: "CURRENT" as const }, { id: "c", ord: 3, state: "NOT_STARTED" as const }];
ok("C6.17 BR-4 pass: the next stage is the one right after the current, not started", nextOf(rows).current?.id === "b" && nextOf(rows).next?.id === "c");
ok("C6.17 BR-4 fail: on the last stage there is no next stage", nextOf(rows.slice(0, 2)).next === null);
ok("C6.17 BR-4 fail: a later stage already started is not \"next\"", nextOf([rows[0], rows[1], { ...rows[2], state: "CURRENT" as const }]).next === null);

// ---------------------------------------------------------------- BR-5 what carries (challenge B3)
const cc = carryCounts(["person.family_name", "person.uci", "case.application_number", "case.submission_office_name", "person.passport_number"], new Set(["person.family_name", "person.uci"]));
ok("C6.17 BR-5 pass: person answers given are used; the application's facts are asked again; the rest are new", cc.used === 2 && cc.asked_again === 2 && cc.fresh === 1, cc);
ok("C6.17 BR-5 fail: an answer about the first application never counts as used for the next one", carryCounts(["case.application_number"], new Set(["case.application_number"])).used === 0);

// ---------------------------------------------------------------- BR-6 documents on file
const started = new Date("2026-11-09T10:00:00Z");
const ups = [{ documentType: "passport_copy", uploadedAt: new Date("2026-11-08T09:00:00Z") }, { documentType: "passport_photocopy", uploadedAt: new Date("2026-11-10T09:00:00Z") }];
ok("C6.17 BR-6 pass: an upload of the paired type made before the stage started is \"on file\"", onFileFrom("passport_photocopy", route().stages[1].same_documents!, ups.slice(0, 1), started)?.documentType === "passport_copy");
ok("C6.17 BR-6 fail: an upload made after the stage started, or of another type, is not \"on file from\" the earlier stage", onFileFrom("passport_photocopy", [], ups.slice(1), started) === null && onFileFrom("letter", route().stages[1].same_documents!, ups, started) === null);

// ---------------------------------------------------------------- the contract
ok("C6.17 contract pass: a new case may name earlier stages with key details; Start next names the stage and its version", NewCase.safeParse({ combinationId: "00000000-0000-4000-8000-000000000001", reference: "MS-1", clientActor: "user-P", principal: { displayName: "Client A" }, earlier: [{ stage: "study", done_before: true, key_details: { "person.uci": "1" } }] }).success
  && StartNext.safeParse({ from_stage: "00000000-0000-4000-8000-000000000001", stage_version: 1 }).success);
ok("C6.17 contract fail: Start next without the stage version, or a key detail that is not text, is refused", !StartNext.safeParse({ from_stage: "00000000-0000-4000-8000-000000000001" }).success
  && !NewCase.safeParse({ combinationId: "00000000-0000-4000-8000-000000000001", reference: "MS-1", clientActor: "user-P", principal: { displayName: "Client A" }, earlier: [{ stage: "study", done_before: true, key_details: { "person.uci": 1 } }] }).success);
ok("C6.17 m5: the strip's words are the team's, in sentence case", STAGE_WORDS.ENDED_NEXT_STARTED === "Ended — next stage started" && STAGE_WORDS.DONE_BEFORE === "Done before we started");
process.exit(summary() ? 1 : 0);
