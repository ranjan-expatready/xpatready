// C6.9 parts 2 and 3 (M3-D, concept screens/C6.9/concept.md BR-7…BR-18; stand-in SI-1): eligibility runs, override and review. A pass
// and a fail per rule: first the pure adapter (engine/runtime/eligibility.ts), then the routes on an isolated copy that
// it sets up when empty: the Visitor visa release 1 (tests/runtime/setup_visitor_visa.ts, no gates: a run is refused),
// then the M3 setup (acceptance/lib/setup_vv_m3.ts; its S7 and S8 lines release the gates). No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c69r 4434 start && tsx studio/tests/check_c69_runs.ts 4434 xr_studio_runtime_c69r
import { evaluate } from "../../contracts/rules.ts";
import { checkGates, eligibilityChanges, snapshotEligibility } from "../engine/eligibility-gates.ts";
import { assess, FAIL_BEATS_MISSING, gateResult, inputsOf, nowOf, outOfDate, rewriteMissing } from "../engine/runtime/eligibility.ts";
import { kkey, type Known } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { CLIENT, DB, PORT, OFFICER, answer, call, confirmAll, main, needVisitorVisa, ok, openCase, sql, yearsAgo, inDays } from "../acceptance/lib/m3.ts";

const P = "subject-1";
const GATES = [
  { key: "vv.travel_document", label: "Passport number and expiry date answered (Sample)", condition: { subjectKind: "PERSON", op: "and", args: [{ op: "exists", field: "person.passport_number" }, { op: "exists", field: "person.passport_expiry_date" }] } },
  { key: "vv.no_convictions", label: "Answered no to the criminal history question (Sample)", condition: { subjectKind: "PERSON", op: "eq", field: "person.criminal_history", value: false } },
];
const JUDGEMENT = ["Has enough money for the stay", "Is in good health", "Ties that will take the person back home", "Will leave Canada at the end of the visit"];
const snap = (gates = GATES, judgement = JUDGEMENT) => ({ combination: { key: "vv.single", label: "Visitor visa" }, derived_fields: [], eligibility: { gates, judgement, disclaimer: "Indicative only (Sample disclaimer for this check)." } }) as unknown as Snapshot;
const knownOf = (facts: Record<string, unknown>, about = P): Known => new Map(Object.entries(facts).map(([f, v]) => [kkey(f.startsWith("case.") ? "case" : about, f), { value: v, status: "answered" as const, source: "check" }]));
const ALL = { "person.passport_number": "SAMPLEP12", "person.passport_expiry_date": "2030-01-01", "person.criminal_history": false };

await main("C6.9 part 2", "Eligibility runs (stand-in SI-1 adapter and routes)", async () => {
  // ------------------------------------------------------------------ pure adapter
  {
    const or = { key: "x.doc", label: "A travel document (Sample)", condition: { subjectKind: "PERSON", op: "or", args: [{ op: "exists", field: "person.passport_number" }, { op: "exists", field: "person.refugee_travel_document_number" }] } };
    ok("C6.9 BR-9 pass: an \"or\" gate with a passport only is Met (one branch true settles it)", gateResult(snap(), knownOf({ "person.passport_number": "SAMPLEP12" }), or, P).state === "met");
    const g = gateResult(snap(), knownOf({ "person.passport_number": "SAMPLEP12" }), GATES[0], P);
    ok("C6.9 BR-9 fail: an unanswered expiry date reads Not answered (never Not met) and is listed as missing", g.state === "not_answered" && g.missing.join() === "person.passport_expiry_date", g);
    ok("C6.9 BR-9 (why the rewrite): the shared evaluate alone reads that gate as false, a false Not eligible", evaluate({ op: "exists", field: "person.passport_expiry_date" }, {}).result === false && evaluate(rewriteMissing({ op: "exists", field: "person.passport_expiry_date" }, () => true) as never, {}).result === "cannot_tell");
    ok("C6.9 BR-9 pass: each gate shows the values it read (null when unanswered)", g.values["person.passport_number"] === "SAMPLEP12" && g.values["person.passport_expiry_date"] === null, g.values);
    ok("C6.9 BR-9 pass: a case.* fact reads the case's value through a person's gate", gateResult(snap(), knownOf({ "case.funds_available_cad": 8000 }), { key: "x.case", label: "Case fact", condition: { subjectKind: "PERSON", op: "exists", field: "case.funds_available_cad" } }, P).state === "met");
  }
  {
    const r = (f: Record<string, unknown>, s = FAIL_BEATS_MISSING) => assess(snap(), knownOf(f), P, s)!;
    ok("C6.9 BR-10 pass: every gate met → Likely eligible, both lists empty", r(ALL).outcome === "LIKELY_ELIGIBLE" && !r(ALL).failedGates.length && !r(ALL).missingInputs.length);
    ok("C6.9 BR-10 pass: a gate not met with every fact answered → Not eligible, naming the gate", r({ ...ALL, "person.criminal_history": true }).outcome === "NOT_ELIGIBLE" && r({ ...ALL, "person.criminal_history": true }).failedGates.join() === "vv.no_convictions");
    ok("C6.9 BR-10 pass: facts missing and nothing failed → Possibly eligible, missing facts in gate order", r({}).outcome === "POSSIBLY_ELIGIBLE" && r({}).missingInputs.join() === "person.passport_number,person.passport_expiry_date,person.criminal_history", r({}).missingInputs);
    const both = r({ "person.criminal_history": true });
    ok("C6.9 BR-10 (P-229 (3)): FAIL_BEATS_MISSING is true: a failed gate while a fact is missing → Not eligible, both lists filled", FAIL_BEATS_MISSING === true && both.outcome === "NOT_ELIGIBLE" && both.failedGates.join() === "vv.no_convictions" && both.missingInputs.join() === "person.passport_number,person.passport_expiry_date", both);
    ok("C6.9 BR-10 fail: with the switch off (AG-03 as written) the same facts read Possibly eligible, still with both lists", r({ "person.criminal_history": true }, false).outcome === "POSSIBLY_ELIGIBLE" && r({ "person.criminal_history": true }, false).failedGates.length === 1);
    ok("C6.9 BR-10 fail: a release with no gate gives no result (never Likely eligible)", assess(snap([]), knownOf(ALL), P) === null && assess({ ...snap(), eligibility: undefined } as unknown as Snapshot, knownOf(ALL), P) === null);
    const all = r(ALL);
    ok("C6.9 BR-11 pass: no score, no cut-off, no breakdown, no advice", all.score === null && all.maxScore === null && all.passMark === null && all.gapToPass === null && !Object.keys(all.breakdown).length && !all.recommendations.length);
    ok("C6.9 BR-11 fail: the adapter never answers Eligible, below the cut-off, whatever the facts", [ALL, {}, { "person.criminal_history": true }].every((f) => r(f).outcome !== "ELIGIBLE_BELOW_CUTOFF"));
    ok("C6.9 BR-12 pass: the 4 judgement lines are copied onto the result", all.judgement.join("|") === JUDGEMENT.join("|"));
    ok("C6.9 BR-12 fail: judgement lines never change the outcome (none, or other words, same outcome)", assess(snap(GATES, []), knownOf(ALL), P)!.outcome === all.outcome && assess(snap(GATES, ["Has no money at all"]), knownOf(ALL), P)!.outcome === all.outcome);
    ok("C6.9 BR-18 pass: the result is for the case's own combination only", all.programKey === "vv.single" && assess(snap(), knownOf(ALL), P)!.programKey === "vv.single");
  }
  {
    // Concept BR-9: an answered fact counts whether or not it is confirmed, and the page names it as not confirmed yet.
    const k: Known = new Map([[kkey(P, "person.passport_number"), { value: "SAMPLEP12", status: "confirmed" as const, source: "check" }], [kkey(P, "person.passport_expiry_date"), { value: "2030-01-01", status: "answered" as const, source: "check" }]]);
    const g = gateResult(snap(), k, GATES[0], P);
    ok("C6.9 BR-9 pass: an answered, unconfirmed fact counts (Met) and is listed as not confirmed yet", g.state === "met" && g.unconfirmed.join() === "person.passport_expiry_date", g);
    ok("C6.9 BR-9 fail: a confirmed fact is never listed as not confirmed; an unanswered one neither", !g.unconfirmed.includes("person.passport_number") && gateResult(snap(), new Map(), GATES[0], P).unconfirmed.length === 0);
  }
  {
    // Review M1 on fd26c492 (AG-3-12): a fact asked once per case, of the case subject, whatever its prefix, is read as
    // the rules read it (the person's own answer, else the case's), so an answered fact never reads unanswered.
    const g = { key: "x.rel", label: "Relationship start date answered", condition: { subjectKind: "PERSON", op: "exists", field: "relationship.start_date" } };
    const caseKnown = (v: unknown): Known => new Map([[kkey("case", "relationship.start_date"), { value: v, status: "answered" as const, source: "check" }]]);
    const met = gateResult(snap([g]), caseKnown("2015-06-01"), g, P);
    ok("C6.9 M1 pass: a non-case.* fact answered on the case subject reads Met for each person (never a false Not met)", met.state === "met" && met.values["relationship.start_date"] === "2015-06-01", met);
    const ins = inputsOf(snap([g]), caseKnown("2015-06-01"), P, () => "id-1");
    ok("C6.9 M1 pass: the run records it as the case's fact, with its value and answer id", ins[0].about === "case" && ins[0].value === "2015-06-01" && ins[0].answerId === "id-1", ins);
    ok("C6.9 M1 fail: when the case's answer changes, the run is out of date (it was never compared before)", outOfDate(ins, nowOf(caseKnown("2016-01-01"), P), true).changed[0]?.now === "2016-01-01");
    ok("C6.9 M1 fail: unanswered anywhere, it is Not answered (missing), never Not met", gateResult(snap([g]), new Map(), g, P).state === "not_answered");
    // Break m1 on fd26c492 (P-229 (3)): a gate not met still names the facts it could not read.
    const mixed = { key: "x.mixed", label: "Passport and no convictions", condition: { subjectKind: "PERSON", op: "and", args: [{ op: "exists", field: "person.passport_number" }, { op: "eq", field: "person.criminal_history", value: false }] } };
    const res = assess(snap([mixed as never]), knownOf({ "person.criminal_history": true }), P)!;
    ok("C6.9 break m1 pass: a gate not met with a fact unanswered inside it → Not eligible, the missing fact listed too", res.outcome === "NOT_ELIGIBLE" && res.failedGates.join() === "x.mixed" && res.missingInputs.join() === "person.passport_number", res);
    const resRv = assess(snap([{ ...mixed, whenNotMet: "needs_review" } as never]), knownOf({ "person.criminal_history": true }), P)!;
    ok("C6.9 break m1 fail: the same as needs_review → Possibly eligible, still listing the missing fact", resRv.outcome === "POSSIBLY_ELIGIBLE" && resRv.reviewGates.join() === "x.mixed" && resRv.missingInputs.join() === "person.passport_number", resRv);
    ok("C6.9 break m1 pass: a Met gate lists nothing missing (an \"or\" settled by one branch)", assess(snap([{ key: "x.or", label: "Either", condition: { subjectKind: "PERSON", op: "or", args: [{ op: "exists", field: "person.passport_number" }, { op: "exists", field: "person.refugee_travel_document_number" }] } } as never]), knownOf({ "person.passport_number": "P1" }), P)!.missingInputs.length === 0);
  }
  {
    // P-230 (1), BACKLOG R4: "when not met" as data on the gate.
    const REVIEW = [GATES[0], { ...GATES[1], whenNotMet: "needs_review" as const }];
    const types = new Map([["person.passport_number", "text"], ["person.passport_expiry_date", "date"], ["person.criminal_history", "yes_no"]]);
    const saved = checkGates({ gates: [...REVIEW, { key: "x.plain", label: "Plain gate", condition: { op: "exists", field: "person.passport_number" }, whenNotMet: "not_eligible" }], judgement: [] }, types, new Set());
    ok("C6.9 R4 pass: a gate saves \"when not met\" = needs_review; the default (not_eligible) is not stored, so older fingerprints keep", !saved.errors.length && saved.gates[1].whenNotMet === "needs_review" && !("whenNotMet" in saved.gates[0]) && !("whenNotMet" in saved.gates[2]), saved.errors);
    const badWhen = checkGates({ gates: [{ ...GATES[1], whenNotMet: "maybe" }], judgement: [] }, types, new Set());
    ok("C6.9 R4 fail: any other \"when not met\" is refused on the field gates.0.whenNotMet", badWhen.errors.some((e) => e.field === "gates.0.whenNotMet"), badWhen.errors);
    const snapped = snapshotEligibility({ gates: saved.gates, judgement: [], disclaimer: null });
    ok("C6.9 R4 pass: the release carries it (snapshot.eligibility), and a gate without it carries nothing", snapped?.gates[1].whenNotMet === "needs_review" && !("whenNotMet" in (snapped?.gates[0] ?? {})));
    const lines = eligibilityChanges(snapshotEligibility({ gates: [GATES[1]], judgement: [], disclaimer: null }), snapshotEligibility({ gates: [REVIEW[1]], judgement: [], disclaimer: null }));
    ok("C6.9 R4 pass: changing it is a change-summary line for the expert, in words", lines.length === 1 && lines[0].change === "changed" && /when not met: the representative reviews it; was: does not qualify/.test(lines[0].label), lines);
    const r = (gates: typeof REVIEW, f: Record<string, unknown>) => assess(snap(gates as never), knownOf(f), P)!;
    const rv = r(REVIEW, { ...ALL, "person.criminal_history": true });
    ok("C6.9 R4 pass: a needs_review gate not met → Possibly eligible, listed in reviewGates (not failedGates), the gate still Not met", rv.outcome === "POSSIBLY_ELIGIBLE" && rv.reviewGates.join() === "vv.no_convictions" && !rv.failedGates.length && rv.gates[1].state === "not_met" && rv.gates[1].whenNotMet === "needs_review", rv);
    const hard = r(GATES as never, { ...ALL, "person.criminal_history": true });
    ok("C6.9 R4 fail: the same answer on a default gate is Not eligible (the outcome set is unchanged)", hard.outcome === "NOT_ELIGIBLE" && hard.failedGates.join() === "vv.no_convictions" && !hard.reviewGates.length);
    const rvMissing = r(REVIEW, { "person.criminal_history": true });
    ok("C6.9 R4 pass: needs_review not met while facts are missing → Possibly eligible with both lists (FAIL_BEATS_MISSING applies to not_eligible gates only)", rvMissing.outcome === "POSSIBLY_ELIGIBLE" && rvMissing.missingInputs.length === 2 && rvMissing.reviewGates.length === 1);
    const both = r([{ key: "x.doc", label: "Has a passport number", condition: { subjectKind: "PERSON", op: "eq", field: "person.passport_number", value: "SAMPLEP99" } } as never, REVIEW[1]], { ...ALL, "person.criminal_history": true });
    ok("C6.9 R4 fail: a not_eligible gate not met beside a needs_review one → Not eligible, each in its own list", both.outcome === "NOT_ELIGIBLE" && both.failedGates.join() === "x.doc" && both.reviewGates.join() === "vv.no_convictions");
    ok("C6.9 R4 pass: every gate met → Likely eligible, nothing to review", r(REVIEW, ALL).outcome === "LIKELY_ELIGIBLE" && !r(REVIEW, ALL).reviewGates.length);
  }
  {
    const k = knownOf(ALL), ins = inputsOf(snap(), k, P, (_a, f) => `id-${f}`);
    ok("C6.9 BR-8 pass: the inputs list every gate fact once with its value and answer id", ins.length === 3 && ins.every((i) => i.about === P && i.answerId === `id-${i.fact}`) && ins[0].value === "SAMPLEP12", ins);
    ok("C6.9 BR-13 pass: the same values (a new answer id, as Confirm section writes) → not out of date", outOfDate(ins, nowOf(knownOf({ ...ALL }), P), true).out_of_date === false);
    const ch = outOfDate(ins, nowOf(knownOf({ ...ALL, "person.passport_number": "SAMPLEP13" }), P), true);
    ok("C6.9 BR-13 fail: a changed value → out of date, naming the fact, was and now", ch.out_of_date && ch.changed.length === 1 && ch.changed[0].was === "SAMPLEP12" && ch.changed[0].now === "SAMPLEP13", ch);
    ok("C6.9 BR-13 fail: a removed answer, or a fact answered since, → out of date", outOfDate(ins, nowOf(knownOf({ "person.passport_number": "SAMPLEP12" }), P), true).changed.length === 2 && outOfDate(inputsOf(snap(), knownOf({}), P, () => null), nowOf(k, P), true).changed.length === 3);
    ok("C6.9 BR-13 fail: the case's pin moved to another release → out of date, values unchanged", (() => { const x = outOfDate(ins, nowOf(k, P), false); return x.out_of_date && x.release_changed && !x.changed.length; })());
    ok("C6.9 BR-13 pass: a number answered as 8000 or 8000 again compares equal (canonical values)", !outOfDate([{ fact: "case.f", about: "case", value: 8000, answerId: null }], () => 8000, true).out_of_date);
  }

  // ------------------------------------------------------------------ routes
  const vvRelease = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") ?? "0";
  if (vvRelease() === "0") {
    const studio = join(import.meta.dirname, "..");
    const tsx = (file: string) => spawnSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { encoding: "utf8", timeout: 600_000, maxBuffer: 1 << 26 });
    ok("setup: the Visitor visa release 1 on this copy (setup_visitor_visa.ts)", tsx("tests/runtime/setup_visitor_visa.ts").status === 0 && vvRelease() === "1", vvRelease());
    const c1 = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client Z", dob: yearsAgo(30) }]);
    const r1 = await call("POST", `/runtime/cases/${c1.id}/assessments`, { person: c1.subjects["Sample Client Z"] }, OFFICER);
    ok("C6.9 break m2 fail: on a release with no gates the list says so (has_rules: false), so the page offers no Run button", (await call("GET", `/runtime/cases/${c1.id}/assessments`, undefined, OFFICER)).body?.has_rules === false);
    ok("C6.9 BR-10 fail: a case on a release with no gates is refused 409: \"This application's release has no eligibility rules yet\" (never Likely eligible)", r1.status === 409 && /has no eligibility rules yet/.test(r1.body?.detail ?? "") && sql(`select count(*) from assessment where case_id='${c1.id}'`) === "0", r1.body);
    const m3 = tsx("acceptance/lib/setup_vv_m3.ts").stdout ?? "";
    ok("setup: M3 setup S7 and S8 pass (gates saved and released)", ["S7 (M3-8)", "S8 release 2"].every((k) => m3.split("\n").some((l) => l.startsWith("PASS") && l.includes(k))));
  }
  const vv = needVisitorVisa();
  if (!sql(`select 1 from config_release r join combination c on c.id=r.combination_id where c.combination_key='vv.single' and r.snapshot ? 'eligibility' limit 1`)) { ok("setup: the Visitor visa release carries eligibility gates (run tests/check_c69_gates.ts first)", false); return; }
  const spend0 = sql("select count(*) from ai_batch");
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }, { role: "child", name: "Sample Child A1", dob: yearsAgo(10), applies: false }]);
  const A = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], K = c.subjects["Sample Child A1"];
  const run = (person: string, extra: Record<string, unknown> = {}, actor = OFFICER) => call("POST", `/runtime/cases/${c.id}/assessments`, { person, ...extra }, actor);
  const list = async (q = "") => (await call("GET", `/runtime/cases/${c.id}/assessments${q}`, undefined, OFFICER)).body;
  const fields = (b: { errors?: { field: string }[] }) => (b?.errors ?? []).map((e) => e.field);

  let r = await run(A, {}, CLIENT);
  ok("C6.9 BR-7 fail: a client cannot run (403), list (403) or read one (403)", r.status === 403 && (await call("GET", `/runtime/cases/${c.id}/assessments`, undefined, CLIENT)).status === 403 && (await call("GET", `/runtime/assessments/${"0".repeat(8)}-0000-0000-0000-${"0".repeat(12)}`, undefined, CLIENT)).status === 403, r.status);
  r = await run(A, {}, "user-S");
  ok("C6.9 BR-7 fail: staff of another firm get 404 (the case does not exist for them)", r.status === 404 && (await call("GET", `/runtime/cases/${c.id}/assessments`, undefined, "user-S")).status === 404, r.status);
  r = await run(c.caseSubject);
  ok("C6.9 BR-7 fail: the case subject is refused on the field person (400)", r.status === 400 && fields(r.body).includes("person"), r.body);
  r = await run(K);
  ok("C6.9 BR-7 fail: a person not travelling (applies: false) is refused: \"Not travelling on this application\"", r.status === 400 && /Not travelling on this application/.test(r.body?.detail ?? ""), r.body);
  r = await run("00000000-0000-0000-0000-000000000000");
  ok("C6.9 BR-7 fail: someone not on the case is refused on person (400)", r.status === 400 && fields(r.body).includes("person"), r.body);

  r = await run(A);
  const first = r.body;
  ok("C6.9 BR-7 pass: the case officer runs a check for a traveller (201)", r.status === 201 && first?.person === A, r.status);
  ok("C6.9 BR-8 pass: the envelope carries the pin, rules as at, the disclaimer, who and when, MANUAL, source stand-in", first?.releaseId && first?.packVersion >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(first?.rulesAsOfByProgram?.["vv.single"] ?? "") && first?.disclaimerLocale === "en-CA" && first?.runType === "MANUAL" && first?.source === "stand-in" && first?.createdBy === OFFICER && first?.inputs?.length === 3, first);
  ok("C6.9 BR-8 pass: the row's result_json is the envelope, with created_at the row's own", sql(`select result_json->>'createdAt' from assessment where id='${first?.id}'`) === first?.createdAt && sql(`select run_type from assessment where id='${first?.id}'`) === "MANUAL");
  const frozen = sql(`select result_json::text from assessment where id='${first?.id}'`);
  const upd = sql(`update assessment set reason='changed' where id='${first?.id}' returning id`);
  ok("C6.9 BR-8 fail: an UPDATE on assessment is refused by the trigger; the row is byte-identical", upd === null && sql(`select result_json::text from assessment where id='${first?.id}'`) === frozen && sql(`select reason from assessment where id='${first?.id}'`) === "");
  ok("C6.9 BR-8 pass: the run wrote one audit row, with no answer value in its words", sql(`select count(*) from audit_event where entity='assessment' and entity_key='${first?.id}'`) === "1");

  r = await run(A);
  ok("C6.9 BR-14 fail: a second run without a reason is refused on the field reason (400)", r.status === 400 && fields(r.body).includes("reason"), r.body);
  r = await run(A, { reason: "   " });
  ok("C6.9 BR-14 fail: a reason of spaces only is no reason (400 on reason)", r.status === 400 && fields(r.body).includes("reason"), r.body);
  r = await run(A, { reason: "Checking again​" });
  ok("C6.9 BR-14 fail: a reason with invisible characters is refused on the field", r.status === 400 && fields(r.body).includes("reason"), r.body);
  r = await run(A, { reason: "Nothing changed, checking again (Sample)" });
  ok("C6.9 BR-14 pass: a later run with a reason, while nothing changed, is allowed (201, RERUN)", r.status === 201 && r.body?.runType === "RERUN" && r.body?.reason === "Nothing changed, checking again (Sample)", r.body?.runType);

  // BR-9 on the route: an answer its own checks reject counts as missing (AG-03 §9).
  await answer(c.id, A, "person.passport_number", "SAMPLEP12");
  await answer(c.id, A, "person.passport_expiry_date", "2031-02-30");
  await answer(c.id, A, "person.criminal_history", false);
  r = await run(A, { reason: "Facts added (Sample)" });
  const bad = r.body?.results?.[0];
  ok("C6.9 BR-9 fail: an expiry date that is not a real date counts as missing: Not answered, never Met", bad?.outcome === "POSSIBLY_ELIGIBLE" && bad?.missingInputs?.join() === "person.passport_expiry_date" && bad?.gates?.[0]?.state === "not_answered", bad);
  ok("C6.9 R4 pass: the released Visitor visa background gate carries \"when not met\" = needs_review (S7, P-230 (1))", sql(`select r.snapshot->'eligibility'->'gates'->1->>'whenNotMet' from config_release r join combination k on k.id=r.combination_id where k.combination_key='vv.single' order by r.version desc limit 1`) === "needs_review");
  await answer(c.id, A, "person.passport_expiry_date", inDays(3 * 365));
  r = await run(A, { reason: "Expiry date corrected (Sample)" });
  const good = r.body;
  ok("C6.9 BR-9 pass: with every fact answered and valid, every gate is Met: Likely eligible", good?.results?.[0]?.outcome === "LIKELY_ELIGIBLE" && good?.results?.[0]?.gates?.every((g: { state: string }) => g.state === "met"), good?.results?.[0]);

  await confirmAll(c.id, A);
  let l = await list(`?person=${A}`);
  const marked = (x: { results?: { gates: { unconfirmed?: string[] }[] }[] } | undefined) => (x?.results?.[0]?.gates ?? []).flatMap((g) => g.unconfirmed ?? []);
  ok("C6.9 BR-9 pass (review minor 6): before Confirm section the run marks the officer's answers not confirmed yet", marked(good).length > 0, marked(good));
  ok("C6.9 BR-9 fail (review minor 6): after Confirm section the same run, read again, marks none (worked out when read)", marked(l?.assessments?.find((x: { id: string }) => x.id === good?.id)).length === 0, marked(l?.assessments?.find((x: { id: string }) => x.id === good?.id)));
  ok("C6.9 BR-13 pass: Confirm section on the facts a run read (a new row, same value) leaves it up to date", l?.assessments?.find((x: { id: string }) => x.id === good?.id)?.out_of_date === false, l?.assessments?.map((x: { out_of_date: boolean }) => x.out_of_date));
  await answer(c.id, A, "person.passport_number", "SAMPLEP13");
  l = await list(`?person=${A}`);
  const stale = l?.assessments?.find((x: { id: string }) => x.id === good?.id);
  ok("C6.9 BR-13 fail: a changed passport number marks the earlier run out of date, naming the change (never written to the row)", stale?.out_of_date === true && stale?.changed?.[0]?.fact === "person.passport_number" && stale?.changed?.[0]?.was === "SAMPLEP12" && stale?.changed?.[0]?.now === "SAMPLEP13" && !/out_of_date/.test(sql(`select result_json::text from assessment where id='${good?.id}'`) ?? "out_of_date"), stale?.changed);

  r = await run(S);
  ok("C6.9 BR-14 pass: the first run for another person needs no reason (MANUAL)", r.status === 201 && r.body?.runType === "MANUAL", r.status);
  l = await list();
  const times = (l?.assessments ?? []).map((x: { createdAt: string }) => x.createdAt);
  ok("C6.9 list pass: with no person, every person's runs come back, newest first, with stand_in SI-1", l?.stand_in === "SI-1" && new Set(l.assessments.map((x: { person: string }) => x.person)).size === 2 && l.assessments.length === 5 && times.every((t: string, i: number) => i === 0 || times[i - 1] >= t), { n: l?.assessments?.length });
  r = await call("GET", `/runtime/cases/${c.id}/assessments?person=nobody`, undefined, OFFICER);
  ok("C6.9 list fail: an unknown person on the list is refused (400 on person)", r.status === 400 && fields(r.body).includes("person"), r.status);
  r = await call("GET", `/runtime/assessments/${good?.id}`, undefined, OFFICER);
  ok("C6.9 GET one pass: the officer reads one run, worked out now (out of date)", r.status === 200 && r.body?.id === good?.id && r.body?.out_of_date === true && Array.isArray(r.body?.overrides), r.status);
  ok("C6.9 GET one fail: a client reading a real run's id gets 403 (no verdict)", (await call("GET", `/runtime/assessments/${good?.id}`, undefined, CLIENT)).status === 403);
  ok("C6.9 GET one fail: another firm's staff get 404; a malformed id 404", (await call("GET", `/runtime/assessments/${good?.id}`, undefined, "user-S")).status === 404 && (await call("GET", "/runtime/assessments/not-an-id", undefined, OFFICER)).status === 404);
  ok("C6.9 BR-8 pass: no audit row of any run holds an answer value (SAMPLEP12, SAMPLEP13, the expiry date)", sql(`select count(*) from audit_event where entity in ('assessment','assessment_override') and (summary like '%SAMPLEP1%' or summary like '%${inDays(3 * 365)}%' or detail::text like '%SAMPLEP1%')`) === "0" && sql(`select count(*) from audit_event where entity='assessment'`) !== "0");
  ok("C6.9 BR-17 pass: rules only: no model call (no ai_batch row, the spend record) in any run", sql("select count(*) from ai_batch") === spend0);

  // ------------------------------------------------------------------ part 3: override and review (BR-15, BR-16; P-229 (2))
  const ov = (body: Record<string, unknown>, actor = OFFICER, id = good?.id) => call("POST", `/runtime/assessments/${id}/override`, body, actor);
  const base = { programKey: "vv.single", fromOutcome: "LIKELY_ELIGIBLE", label: "Refer to the representative", reason: "Earlier refusal (Sample)" };
  r = await ov({ ...base, reason: " " });
  ok("C6.9 BR-15 fail: an override with an empty reason is refused on the field reason (400)", r.status === 400 && fields(r.body).includes("reason"), r.body);
  r = await ov({ ...base, label: "" });
  ok("C6.9 BR-15 fail: an override with an empty label is refused on the field label (400)", r.status === 400 && fields(r.body).includes("label"), r.body);
  r = await ov({ ...base, label: "x".repeat(81) });
  ok("C6.9 BR-15 fail: a label over 80 characters is refused on label", r.status === 400 && fields(r.body).includes("label"), r.status);
  r = await ov({ ...base, programKey: "other.program" });
  ok("C6.9 BR-15 fail: a programKey not in the run is refused (400 on programKey)", r.status === 400 && fields(r.body).includes("programKey"), r.body);
  r = await ov({ ...base, fromOutcome: "NOT_ELIGIBLE" });
  ok("C6.9 BR-15 fail: a fromOutcome that is not the run's outcome is refused 409: \"The result changed since you opened it\"", r.status === 409 && /changed since you opened it/.test(r.body?.detail ?? ""), r.body);
  ok("C6.9 BR-15 fail: a client cannot override (403); another firm's staff get 404", (await ov(base, CLIENT)).status === 403 && (await ov(base, "user-S")).status === 404);
  const audit0 = Number(sql("select count(*) from audit_event where entity='assessment_override'"));
  r = await ov(base);
  ok("C6.9 BR-15 pass: an override on an out-of-date run is kept (201), with who, duty, licence and out of date; one audit row", r.status === 201 && r.body?.by === OFFICER && r.body?.duty === "Case officer" && r.body?.licence === null && r.body?.outOfDate === true && Number(sql("select count(*) from audit_event where entity='assessment_override'")) === audit0 + 1, r.body);
  const after = (await call("GET", `/runtime/assessments/${good?.id}`, undefined, OFFICER)).body;
  // Break M1 on 2572b9b0: the same override sent 20 times at once is one row, and every answer names it.
  const dup = await Promise.all(Array.from({ length: 20 }, () => ov(base)));
  ok("C6.9 break M1 fail: 20 identical overrides at once → all 201 with the same id, one row, one audit row", dup.every((x) => x.status === 201) && new Set(dup.map((x) => x.body?.id)).size === 1 && dup[0].body?.id === r.body?.id && sql(`select count(*) from assessment_override where assessment_id='${good?.id}'`) === "1" && Number(sql("select count(*) from audit_event where entity='assessment_override'")) === audit0 + 1, dup.map((x) => x.status).join(""));
  r = await ov({ ...base, label: "." });
  ok("C6.9 break m5 fail: a label with no letter or digit is refused on label", r.status === 400 && fields(r.body).includes("label"), r.body);
  r = await ov({ ...base, label: "😀".repeat(81) });
  ok("C6.9 break m5 fail: 81 characters (emoji) is refused on label; lengths count characters", r.status === 400 && fields(r.body).includes("label"));
  r = await ov({ ...base, label: "Borderline 😀" + "😀".repeat(68), reason: "Second view (Sample)" });
  ok("C6.9 break m5 pass: an 80-character label with emoji is kept", r.status === 201, r.body?.detail ?? r.status);
  ok("C6.9 BR-15 pass: the engine's outcome is unchanged and the override shows beside it", after?.results?.[0]?.outcome === "LIKELY_ELIGIBLE" && after?.overrides?.length === 1 && after.overrides[0].label === "Refer to the representative" && sql(`select result_json::text from assessment where id='${good?.id}'`)?.includes("LIKELY_ELIGIBLE"));
  r = await call("POST", `/runtime/assessments/${good?.id}/review`, { note: "Checked with the client (Sample)" }, "user-R");
  ok("C6.9 BR-16 pass (P-229 (2)): a licensed representative's review is stamped \"Reviewed\" with the licence; 200; an audit row", r.status === 200 && r.body?.stamp === "Reviewed" && r.body?.reviewedBy === "user-R" && !!r.body?.licence?.number && r.body?.outOfDate === true && sql(`select count(*) from audit_event where entity='assessment' and entity_key='${good?.id}' and action='reviewed'`) === "1", r.body);
  r = await call("POST", `/runtime/assessments/${good?.id}/review`, {}, OFFICER);
  ok("C6.9 BR-16 fail: a second review is refused 409, naming who reviewed and when", r.status === 409 && /Already reviewed by Representative \(Sample\) on \d{4}-\d{2}-\d{2}/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/assessments/${first?.id}/review`, {}, OFFICER);
  ok("C6.9 BR-16 pass (P-229 (2)): the case officer (no licence) may review too, stamped \"Seen\"", r.status === 200 && r.body?.stamp === "Seen" && r.body?.licence === null && r.body?.reviewNote === null, r.body);
  // Break m1 on 2572b9b0: an override sent from a page opened before a newer check goes nowhere silently: 409.
  r = await run(A, { reason: "Newer check (Sample)" });
  r = await ov({ ...base, label: "Late override", reason: "Opened before the newer check (Sample)" });
  ok("C6.9 break m1 fail: an override on a check that a newer one replaced is refused 409 (\"a newer check exists\"); nothing written", r.status === 409 && /newer check exists/.test(r.body?.detail ?? "") && sql(`select count(*) from assessment_override where label='Late override'`) === "0", r.body);
  ok("C6.9 break m2 pass: the list says the case's release has eligibility rules (has_rules)", (await list()).has_rules === true);
  ok("C6.9 BR-16 fail: a client cannot review (403)", (await call("POST", `/runtime/assessments/${first?.id}/review`, {}, CLIENT)).status === 403);
  // Review M2 / break M1 on fd26c492: 40 first runs at once for a new person → one first run, the rest need a reason.
  const c2 = await openCase(vv, [{ role: "principal", name: "Sample Client R", dob: yearsAgo(41) }, { role: "spouse_or_partner", name: "Sample Spouse R", dob: yearsAgo(39) }, { role: "child", name: "Sample Child R1", dob: yearsAgo(12) }, { role: "child", name: "Sample Child R2", dob: yearsAgo(9) }]);
  const R = Object.values(c2.subjects);
  const race = await Promise.all(Array.from({ length: 40 }, () => call("POST", `/runtime/cases/${c2.id}/assessments`, { person: R[0] }, OFFICER)));
  ok("C6.9 M2 fail: 40 first runs sent at once → exactly one 201 (MANUAL), 39 refused on reason; one row", race.filter((x) => x.status === 201).length === 1 && race.filter((x) => x.status === 400 && fields(x.body).includes("reason")).length === 39 && sql(`select count(*) from assessment where case_id='${c2.id}'`) === "1", race.map((x) => x.status).join(""));
  // Break m4: the reason counts characters, and needs a letter or digit.
  r = await call("POST", `/runtime/cases/${c2.id}/assessments`, { person: R[0], reason: "—" }, OFFICER);
  ok("C6.9 break m4 fail: a reason with no letter or digit (\"—\") is no reason (400 on reason)", r.status === 400 && fields(r.body).includes("reason"), r.body);
  r = await call("POST", `/runtime/cases/${c2.id}/assessments`, { person: R[0], reason: "😀".repeat(301) }, OFFICER);
  ok("C6.9 break m4 fail: 301 characters is refused on reason", r.status === 400 && fields(r.body).includes("reason"));
  r = await call("POST", `/runtime/cases/${c2.id}/assessments`, { person: R[0], reason: "Renewed 😀" + "😀".repeat(291) }, OFFICER);
  ok("C6.9 break m4 pass: 300 characters with emoji (each one character) is accepted", r.status === 201, r.body?.detail ?? r.status);
  // Break m3: a person marked not travelling after a run → that run is out of date, said as not travelling.
  r = await call("POST", `/runtime/cases/${c2.id}/assessments`, { person: R[1] }, OFFICER);
  await call("PATCH", `/runtime/cases/${c2.id}/people/${R[1]}`, { applies: false }, OFFICER);
  const gone = (await call("GET", `/runtime/cases/${c2.id}/assessments?person=${R[1]}`, undefined, OFFICER)).body?.assessments?.[0];
  ok("C6.9 break m3 fail: after the spouse is marked not travelling, their earlier run reads out of date (not travelling)", gone?.out_of_date === true && gone?.not_travelling === true, gone && { out: gone.out_of_date, nt: gone.not_travelling });
  ok("C6.9 break m3 pass: a traveller still travelling is not marked so", (await call("GET", `/runtime/cases/${c2.id}/assessments?person=${R[0]}`, undefined, OFFICER)).body?.assessments?.every((x: { not_travelling?: boolean }) => !x.not_travelling));
  await call("PATCH", `/runtime/cases/${c2.id}/people/${R[1]}`, { applies: true }, OFFICER);
  // Scale (concept §8): 4 people × 10 runs, listed in under 300 ms.
  for (const who of R) for (let i = (await call("GET", `/runtime/cases/${c2.id}/assessments?person=${who}`, undefined, OFFICER)).body?.assessments?.length ?? 0; i < 10; i++) await call("POST", `/runtime/cases/${c2.id}/assessments`, { person: who, ...(i ? { reason: `Run ${i + 1} (Sample)` } : {}) }, OFFICER);
  const n40 = sql(`select count(*) from assessment where case_id='${c2.id}'`);
  const t0 = Date.now(); const big = await call("GET", `/runtime/cases/${c2.id}/assessments`, undefined, OFFICER); const ms = Date.now() - t0;
  ok("C6.9 scale: 4 people × 10 runs are listed in under 300 ms", n40 === "40" && big.body?.assessments?.length === 40 && ms < 300, { n40, ms });
});
