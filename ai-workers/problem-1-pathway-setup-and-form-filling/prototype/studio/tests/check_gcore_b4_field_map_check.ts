// G-CORE B4 (P-121; QA-176 Part B's code row; C11.14): the field-map step's blind checker round, through the shared
// step runner, with a fake launcher (no network, no model, US$0).
//  1. In process: the checker job the paid runner would send (api/src/field-map-check.ts checkerJob → rounds.ts roundJob)
//     reads only the form's inventory with field-map-check.v1.md and never the draft's answer; StepRunner runs it with a
//     fake launcher; the comparison (engine/field-map-rounds.ts) and its rules, a pass and a fail per case.
//  2. On an isolated copy: a checker run that agrees on most fields and disagrees on two is saved as the paid runner
//     would record it; replaying IMM 5257's draft then keeps both readings, rates a disagreement Decide (Low) with both
//     reasons, and an agreed field whose rules pass is Ready (P-121). The planted run file is removed at the end.
//   zsh studio/tools/isolated.sh forms_b4 4458 start && tsx studio/tests/check_gcore_b4_field_map_check.ts 4458 xr_studio_forms_b4
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimedTwice, compareMaps, formWords, mapRules, type MapField } from "../engine/field-map-rounds.ts";
import { checkerJob, editionParts, FIELD_MAP_CHECK } from "../api/src/field-map-check.ts";
import { roundJob, RUNS, StepRunner } from "../api/src/rounds.ts";
import { PROTOTYPE, SOLUTION } from "../api/src/core.ts";
import { admitRun } from "../../p2/guard.ts";
import { buildRequest } from "../../p2/prompt.ts";

const PORT = Number(process.argv[2] ?? 4458), DB = process.argv[3] ?? "xr_studio_forms_b4";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");

const DRAFT_FILE = "studio-fieldmap-imm5257e-live-20261021t060247723z.json", EDITION = "IMM 5257 (09-2023)";
const draft = JSON.parse(readFileSync(join(RUNS, DRAFT_FILE), "utf8"));
const answer = JSON.parse(draft.raw_output) as { form_edition: string; canonical_fields: { id: string; meaning: string; value_type: string }[]; entries: { data_path: string; outcome: string; fact: string | null; person: string; row: number | null }[] };
// The checker's answer: the draft's, with one field read as another kind of answer and one field not named at all.
const used = [...new Set(answer.entries.filter((e) => e.outcome === "mapped" && e.fact).map((e) => e.fact!))];
const RETYPED = used.find((k) => answer.canonical_fields.find((c) => c.id === k)?.value_type === "text")!;
const DROPPED = used.find((k) => k !== RETYPED && /^person\./.test(k))!;
// QA-191: one more field the checker agrees on in every way but quotes words not printed on the form: "na", a part of the
// printed word "name" (review M1: any letters inside a printed word were enough with a plain substring match).
const MISQUOTED = used.find((k) => k !== RETYPED && k !== DROPPED && answer.canonical_fields.find((c) => c.id === k)?.value_type === "text")!;
const checkAnswer = { ...answer,
  canonical_fields: answer.canonical_fields.filter((c) => c.id !== DROPPED).map((c) => (c.id === RETYPED ? { ...c, value_type: "date" } : c)),
  entries: answer.entries.map((e) => (e.fact === DROPPED ? { ...e, outcome: "unresolved", fact: null, transform: null, unresolved_reason: "The checker could not tell whose fact this is." } : e.fact === MISQUOTED ? { ...e, evidence_quote: "na" } : e)) };

(async () => {
  // ───────────── 1. Blind: the checker job reads only the inventory, with the checker prompt, never the draft's answer
  const j = checkerJob(draft, EDITION)!;
  const job = roundJob(j.step, true, j.ctx);
  ok("G-CORE B4: the checker job runs field-map-check.v1.md over the draft's own inputs (the form's inventory), for this form edition", job.template === "field-map-check.v1.md" && JSON.stringify(job.inputs) === JSON.stringify(draft.drafting_run.inputs.official_files) && job.combination === "edition:IMM 5257:09-2023" && (job.known as { form_edition?: string }).form_edition === EDITION, job);
  const admitted = admitRun({ inputs: { official_files: job.inputs }, settings: job.settings as never });
  const request = JSON.stringify(buildRequest(readFileSync(join(PROTOTYPE, "p2", "prompts", job.template), "utf8"), JSON.parse(readFileSync(join(PROTOTYPE, "p2", "prompts", job.output_schema), "utf8")), admitted, job.known as never));
  const draftOnly = answer.canonical_fields.map((c) => c.id).filter((id) => !readFileSync(join(SOLUTION, job.inputs[0].file), "utf8").includes(id));
  ok("P-121 blind: the request the checker sends carries no earlier draft (no input of kind \"draft\") and none of the draft's field names or its run", admitted.every((a) => a.kind !== "draft") && draftOnly.length > 10 && draftOnly.every((id) => !request.includes(`"${id}"`)) && !request.includes(DRAFT_FILE) && !request.includes(draft.drafting_run.output_sha256 ?? "no-sha"), { kinds: admitted.map((a) => a.kind), leaked: draftOnly.filter((id) => request.includes(`"${id}"`)).slice(0, 3) });
  const leaky = request + JSON.stringify(answer.canonical_fields);
  ok("P-121 fail case: the same check is not blind to a leak: a request carrying the draft's answer is caught", draftOnly.some((id) => leaky.includes(`"${id}"`)));

  // The same runner, live, with a fake launcher: it reads the job file the runner wrote, then answers.
  const scratch = mkdtempSync(join(tmpdir(), "b4-fake-"));
  let seenJob: { template?: string; inputs?: unknown } | null = null;
  const record = (j2: { job_id: string; combination: string; inputs: unknown }) => ({ caller: "live", contract_valid: true, raw_output: JSON.stringify(checkAnswer),
    drafting_run: { run_id: `${j2.job_id}-live-test`, status: "completed", kind: "field_map", inputs: { combination: j2.combination, official_files: j2.inputs, configuration_version: "studio-add-form" }, usage: { cost_usd: 0, input_tokens: 0, output_tokens: 0 }, attempts: [{ n: 1, outcome: "ok" }] },
    launch_evidence: { template_sha256: sha(readFileSync(join(PROTOTYPE, "p2", "prompts", FIELD_MAP_CHECK.check))) } });
  const fake = { launchOnce: async (jobId: string, mode: "stub" | "live") => {
    const text = readFileSync(join(PROTOTYPE, "p2", "jobs", `${jobId}.json`), "utf8"); seenJob = JSON.parse(text);
    if (mode === "stub") return { code: 0, out: "{\"ok\":true}\n", err: "" };
    const file = join(scratch, `${jobId}.json`); writeFileSync(file, JSON.stringify(record(JSON.parse(text))));
    return { code: 0, out: `${JSON.stringify({ run_file: file })}\n`, err: "" };
  } };
  const live = await new StepRunner(fake as never).round<typeof checkAnswer>(j.step, true, { ...j.ctx, mode: "live", wanted: async () => true });
  ok("G-CORE B4: the shared step runner runs the checker round (fake launcher: stub pass, then the call) and reads its answer", live.ok && live.output.canonical_fields.length === answer.canonical_fields.length - 1, live);
  ok("P-121 blind: the job file the launcher was given names the checker prompt and only the inventory", (seenJob as { template?: string } | null)?.template === "field-map-check.v1.md" && JSON.stringify((seenJob as { inputs?: unknown } | null)?.inputs) === JSON.stringify(draft.drafting_run.inputs.official_files));
  ok("G-CORE B4: the job file is removed after the round (the run record keeps it)", !existsSync(join(PROTOTYPE, "p2", "jobs", `${job.job_id}.json`)));
  rmSync(scratch, { recursive: true, force: true });

  // ───────────── the comparison and its rules (pure)
  const f = (k: string, t: string, boxes: string[]): MapField => ({ proposedKey: k, proposedType: t, boxes: boxes.map((d) => ({ data_path: d, person: "applicant", row: null })) });
  let c = compareMaps([f("person.a", "text", ["x"])], [f("person.a", "text", ["x"])]);
  ok("P-121 pass: the same field, kind of answer and form fields in both rounds: agreed", c.byKey.get("person.a")?.agreement === "agreed" && c.byKey.get("person.a")?.why === null);
  c = compareMaps([f("person.a", "text", ["x"])], [f("person.a", "date", ["x"])]);
  ok("P-121 fail: another kind of answer: differ, both readings in the reason", c.byKey.get("person.a")?.agreement === "differ" && /draft reads it as text and the checker as date/.test(c.byKey.get("person.a")?.why ?? ""), c.byKey.get("person.a"));
  c = compareMaps([f("person.a", "text", ["x", "y"])], [f("person.a", "text", ["x"])]);
  ok("P-121 fail: other form fields: differ, with how many each fills", /draft fills 2 form fields with it and the checker 1 form field \(1 only in the draft, 0 only in the checker\)/.test(c.byKey.get("person.a")?.why ?? ""), c.byKey.get("person.a")?.why);
  c = compareMaps([f("person.a", "text", ["x"])], [f("person.b", "text", ["x"])]);
  ok("P-121 fail: a field only the draft named: differ, said so; the checker's own field is listed apart", c.byKey.get("person.a")?.agreement === "differ" && c.byKey.get("person.a")?.check === null && /Only the draft round named/.test(c.byKey.get("person.a")?.why ?? "") && c.checkOnly.map((x) => x.proposedKey).join() === "person.b");
  const paths = new Set(["x"]);
  ok("P-121 rules pass: a library-shaped key whose form fields are on the form", mapRules(f("person.a", "text", ["x"]), paths).every((r) => r.passed));
  ok("P-121 rules fail: a key of another shape, or a form field not on the form, fails with its reason", !mapRules(f("Person A", "text", ["x"]), paths)[0].passed && /not on the form/.test(mapRules(f("person.a", "text", ["z"]), paths)[1].why ?? ""));
  // QA-191 (P-121: the rules run on both rounds: quote found in its source, duplicates, type): pure, a pass and a fail each.
  const words = formWords([{ caption: "Family name (surname)", heading: "Personal details", tooltip: null }]);
  const more = (quote: string | null, twice = new Set<string>()) => ({ quote, words, claimedTwice: twice, valueTypes: new Set(["text", "date"]) });
  const byRule = (rs: { rule: string; passed: boolean }[], name: string) => rs.find((r) => r.rule === name)?.passed;
  ok("QA-191 pass: a quote printed on the form, a known kind of answer and form fields no other field fills pass the extra rules", mapRules(f("person.a", "text", ["x"]), paths, more("family name, Surname")).every((r) => r.passed));
  ok("QA-191 fail: a quote that is not printed on the form fails, and so does no quote", byRule(mapRules(f("person.a", "text", ["x"]), paths, more("zq")), "quote_on_the_form") === false && byRule(mapRules(f("person.a", "text", ["x"]), paths, more(null)), "quote_on_the_form") === false);
  ok("QA-191 fail (review M1): a part of a printed word is not a quote of the form (\"na\", \"e\", \"ily nam\" inside \"Family name\")", ["na", "e", "ily nam"].every((q) => byRule(mapRules(f("person.a", "text", ["x"]), paths, more(q)), "quote_on_the_form") === false));
  ok("QA-191 pass (review m1): a box's printed choice is a quote of the form", byRule(mapRules(f("person.a", "text", ["x"]), paths, { ...more("the province of Quebec"), words: formWords([{ caption: "Province", options: [["The province of Quebec", "QC"], ["Ontario", "ON"]] }]) }), "quote_on_the_form") === true);
  // Devin on #728: a quote runs within one printed text, never from one caption into the next; a choice list the box
  // references (options_resolved, options empty) is printed too.
  const two = formWords([{ caption: "Family name", heading: null, tooltip: null }, { caption: "Date of birth", heading: null, tooltip: null }]);
  ok("QA-191 fail (Devin on #728): words that run from one caption into the next are not a quote of the form", byRule(mapRules(f("person.a", "text", ["x"]), paths, { ...more("Family name Date of birth"), words: two }), "quote_on_the_form") === false && byRule(mapRules(f("person.a", "text", ["x"]), paths, { ...more("Date of birth"), words: two }), "quote_on_the_form") === true);
  ok("QA-191 pass (Devin on #728): a choice from the box's resolved list is a quote of the form", byRule(mapRules(f("person.a", "text", ["x"]), paths, { ...more("Annulled marriage"), words: formWords([{ caption: "Marital status", options: null, options_resolved: [["Annulled Marriage", "09"], ["Single", "02"]] }]) }), "quote_on_the_form") === true);
  ok("QA-191 fail: a kind of answer the library does not know fails", byRule(mapRules(f("person.a", "colour", ["x"]), paths, more("Family name")), "kind_of_answer_known") === false);
  const twice = claimedTwice([f("person.a", "text", ["x"]), f("person.b", "text", ["x"])]);
  ok("QA-191 fail: a form field filled by two fields of the same round fails for both (duplicates)", byRule(mapRules(f("person.a", "text", ["x"]), paths, more("Family name", twice)), "no_form_field_twice") === false && twice.size === 1);
  ok("QA-191: without the form's words the two shape rules are unchanged (callers that pass none)", mapRules(f("person.a", "text", ["x"]), paths).length === 2);
  ok("G-CORE B4: an edition label is read into its code and edition, anything else is refused", editionParts(EDITION)?.code === "IMM 5257" && editionParts("IMM 5257 SCH1 (09-2023)")?.code === "IMM 5257 SCH1" && editionParts("no edition") === null);

  // ───────────── 2. On an isolated copy: a recorded checker run replays with the draft
  const planted = join(RUNS, `${job.job_id}-live-20261103t000000000z-b4test.json`);
  try {
    // Recorded as the paid runner records it: its answer leaves a form field to a person (DROPPED), so p2/convert.ts
    // marks the run "completed_with_unresolved" (tech lead, 3 Nov: a run planted "completed" hid that such runs never paired).
    const rec = record(job as never);
    writeFileSync(planted, JSON.stringify({ ...rec, drafting_run: { ...rec.drafting_run, status: "completed_with_unresolved" } }));
    const loaded = await call("POST", "/demo/load");
    ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
    const att = sql("select a.id from source_attachment a join combination c on c.id = a.combination_id where a.file_name = 'imm5257e.pdf' order by c.label limit 1");
    const d = await call("POST", `/attachments/${att}/draft`, { mode: "replay" });
    let st = ""; for (let i = 0; i < 240 && st !== "COMPLETED" && st !== "FAILED"; i++) { await sleep(500); st = (await call("GET", `/jobs/${d.body?.id}`)).body?.status ?? ""; }
    ok("setup: IMM 5257's saved draft replays (US$0)", st === "COMPLETED", [d.status, st]);
    const row = (k: string) => sql(`select agreement || '|' || confidence || '|' || (rounds->'draft' <> 'null'::jsonb)::text || '|' || (rounds->'check' <> 'null'::jsonb)::text || '|' || coalesce(reason, '') from proposal_item where run_id = '${d.body?.id}' and payload->>'label' = '${k}'`).split("|");
    const all = sql(`select agreement || '|' || confidence || '|' || jsonb_array_length(rules)::text from proposal_item where run_id = '${d.body?.id}'`).split("\n").map((l) => l.split("|"));
    ok("C11.14 AT-2 pass: every field-map proposal now keeps the draft reading and, where the checker named it, the checker's", all.length > 0 && Number(sql(`select count(*) from proposal_item where run_id = '${d.body?.id}' and rounds->'draft' <> 'null'::jsonb`)) === all.length, all.length);
    const r1 = row(RETYPED), r2 = row(DROPPED);
    ok("P-121 fail: a field the checker reads as another kind of answer is Decide (Low) with both readings and both reasons", r1[0] === "differ" && r1[1] === "decide" && r1[2] === "true" && r1[3] === "true" && /draft reads it as text and the checker as date/.test(r1[4]), [RETYPED, r1]);
    ok("P-121 fail: a field the checker did not name is Decide with the reason, never Ready", r2[0] === "differ" && r2[1] === "decide" && /Only the draft round named/.test(r2[4]), [DROPPED, r2]);
    const r3 = row(MISQUOTED);
    ok("QA-191 fail: a field both rounds agree on, whose checker quote (\"na\", part of a printed word) is not a quote of the form, is never Ready; the reason says the checker round's quote is not on the form", r3[0] === "agreed" && r3[1] !== "ready" && /the checker round quoted \("na"\) are not printed on this form/.test(r3[4]), [MISQUOTED, r3]);
    ok("QA-191 pass: the draft's quotes are checked against the form, not assumed (IMM 5257's are printed on it: quote_found true)", sql(`select count(*) from proposal_item where run_id = '${d.body?.id}' and (source->>'quoteFound')::boolean`) === sql(`select count(*) from proposal_item where run_id = '${d.body?.id}' and source is not null`) && Number(sql(`select count(*) from proposal_item where run_id = '${d.body?.id}' and exists (select 1 from jsonb_array_elements(rules) r where r->>'rule' = 'quote_on_the_form')`)) > 0);
    const ready = all.filter((x) => x[1] === "ready");
    ok("C11.14 AT-3 pass: High (Ready) only when both rounds agree and the rules ran and passed, and some are", ready.length > 0 && ready.every((x) => x[0] === "agreed" && Number(x[2]) >= 2) && Number(sql(`select count(*) from proposal_item where run_id = '${d.body?.id}' and confidence = 'ready' and exists (select 1 from jsonb_array_elements(rules) r where (r->>'passed')::boolean = false)`)) === 0, { ready: ready.length });
    ok("P-121: no live call was made (the checker round was replayed)", sql(`select coalesce(sum(cost_usd), 0)::numeric(10,2) from drafting_job where id = '${d.body?.id}'`) === "0.00");
  } finally { rmSync(planted, { force: true }); }
  ok("cleanup: the planted checker run is removed (committed runs unchanged)", !existsSync(planted));

  console.log(`\n${pass} PASS ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP", e); process.exit(1); });
