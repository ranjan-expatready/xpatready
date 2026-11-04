// C9.1 (row C9.1-AI; P-32, P-138, P-151, P-121, P-227): the rules of AI on a held new edition, with a passing and a failing
// case each. No server, no database, no network: replay reads saved answers written for this check into p2/runs (removed
// after); the paid run's job is admitted by the guarded launcher in a stub pass (no model). NO model call (US$0).
//   C9.1 components: what a changed box's field touches (sections, document types, rules, checks), only on the form's combinations
//   C9.1 AI: only the new and reworded boxes, in a part the guard admits; an answer about another box or edition is never used
//   C9.1 replay: only for the same comparison; another comparison's saved run is out of date
//   C9.1 P-151: the accepted-until date of the previous edition, quoted from the IRCC page
//   tsx studio/tests/check_c91_impact_ai.ts
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { admitInput } from "../../p2/guard.ts";
import { PARTS_DIR } from "../../p2/policy.ts";
import { fieldComponents, type ComponentRows } from "../engine/where-used.ts";
import { answersInside, changedBoxes, compareBoxes, componentsView, impactContext, impactCost, impactPart, impactStep, IMPACT_AI_WORDS, inventoryFields, previousAcceptedUntil, staleRun, writePart } from "../api/src/impact-ai.ts";
import { RUNS, StepRunner } from "../api/src/rounds.ts";
import { C91, c91Jobs } from "../tools/c91-impact-job.ts";
import { putBackReal, setAsideReal } from "./fixtures/c91-saved-run.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const PROTOTYPE = join(import.meta.dirname, "..", "..");
const v = (o: object) => ({ version: 1, status: "PUBLISHED", ...o });
// The committed real saved run of this comparison is set aside while the rules are proved with this check's own runs.
setAsideReal(); process.on("exit", putBackReal);
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]] as const) process.on(sig, () => process.exit(code));

(async () => {
  // ── The comparison (BR-12, no AI): the boxes AI may read are exactly the new and reworded ones ──
  const rows = compareBoxes(inventoryFields(C91.held), inventoryFields(C91.library), new Map([["form1[0].removed_box", { canonicalFieldKey: "x.y", outcome: "mapped" }]]));
  const changed = changedBoxes(rows);
  const n = (c: string) => rows.filter((r) => r.change === c).length;
  ok("C9.1 BR-12: IMM 5476 11-2025 over 2021 is 30 unchanged · 7 reworded · 16 new · 6 removed; AI reads the 23 new and reworded only", n("unchanged") === 30 && n("reworded") === 7 && n("new") === 16 && n("removed") === 6 && changed.length === 23, { u: n("unchanged"), r: n("reworded"), n: n("new"), x: n("removed") });
  ok("C9.1 fail: no unchanged or removed box is sent to AI", !rows.some((r) => (r.change === "unchanged" || r.change === "removed") && changed.includes(r.dataPath)));

  // ── P-32: components touched, from the where-used rows (engine, pure) ──
  const rowsOf = (over: Partial<ComponentRows> = {}): ComponentRows => ({ boxes: [], lines: [], rules: [], docs: [], checks: [], questions: [], picks: [], facts: [], ...over });
  const cond = (f: string) => ({ op: "eq", field: f, value: true });
  const r = rowsOf({
    questions: [v({ lineageKey: "q1", sectionKey: "rep", canonicalFieldKey: "rep.name", predicateJson: null }), v({ lineageKey: "q2", sectionKey: "other", canonicalFieldKey: "a.b", predicateJson: cond("rep.uci") })] as never,
    picks: [{ sectionKey: "rep", combinationId: "VV" }, { sectionKey: "other", combinationId: "VV" }, { sectionKey: "rep", combinationId: "SP" }],
    docs: [v({ combinationId: "VV", lineageKey: "d1", documentTypeKey: "passport", predicateJson: cond("rep.uci") })] as never,
    facts: [v({ combinationId: "VV", lineageKey: "f1", canonicalFieldKey: "rep.name", documentTypeKey: "rep_letter" })] as never,
    rules: [v({ combinationId: "VV", predicateKey: "has_rep", predicateJson: cond("rep.name") }), v({ combinationId: "VV", predicateKey: "unrelated", predicateJson: cond("z.z") })] as never,
    checks: [v({ combinationId: "VV", checkKey: "rep_uci", predicateJson: cond("rep.uci") })] as never,
  });
  const uses = fieldComponents(r, ["rep.name", "rep.uci"], new Set(["VV"]));
  const has = (kind: string, key: string, how?: string) => uses.some((u) => u.kind === kind && u.key === key && u.combinationId === "VV" && (!how || u.how === how));
  ok("C9.1 P-32 pass: a section that asks the field, a section whose question condition reads it, a document line's type, a fact's document type, a rule and a check are each found", has("section", "rep", "asks") && has("section", "other", "condition") && has("document_type", "passport", "condition") && has("document_type", "rep_letter", "fact") && has("rule", "has_rep") && has("check", "rep_uci"), uses);
  ok("C9.1 P-32 fail: a rule that reads another field, and a combination that does not file the form (SP), are not listed", !has("rule", "unrelated") && !uses.some((u) => u.combinationId === "SP"));
  ok("C9.1 P-32 fail: a field no changed box fills touches nothing", fieldComponents(r, ["not.used"], new Set(["VV"])).length === 0);
  const rew = rows.find((x) => x.change === "reworded")!;
  const view = componentsView([{ ...uses.find((u) => u.kind === "rule")!, label: "Has a representative" }], [{ ...rew, field: "rep.name" }], new Map([["rep.name", "Representative's name"]]), new Map([["VV", "Visitor visa"]]), "11-2025");
  ok("C9.1 P-32 pass: each component says why in words (which box changed, its old and new caption, the field) and in which combination", view.rules.length === 1 && view.rules[0].combination === "Visitor visa" && view.rules[0].why.includes("reworded in 11-2025") && view.rules[0].why.includes("Representative's name") && view.rules[0].why.length > 10, view.rules[0]);
  ok("C9.1 P-32 fail: a use whose field no removed or reworded box fills is left out (nothing to explain)", componentsView([{ ...uses.find((u) => u.kind === "rule")!, label: "x" }], [{ ...rew, field: "other.field" }], new Map(), new Map(), "11-2025").rules.length === 0);

  // ── P-121: the part holds the changed boxes only and the guard admits it; a tampered part is refused ──
  const part = impactPart(C91.held, changed);
  writePart(part);
  let admitted = false; try { admitted = admitInput(part.rel, part.sha256).kind === "inventory_part"; } catch (e) { console.log(String(e)); }
  ok("C9.1 pass: the part of the 23 changed boxes is admitted by the guard as an exact subset of the held edition's inventory", admitted && part.fields === 23);
  const bad = JSON.parse(part.text); bad.fields[0] = { ...bad.fields[0], caption: "planted caption" };
  const badFile = join(PARTS_DIR, "c91-check-tampered.part.json"); writeFileSync(badFile, JSON.stringify(bad));
  let refused = ""; try { admitInput("prototype/p2/parts/c91-check-tampered.part.json"); } catch (e) { refused = String((e as Error).message); }
  rmSync(badFile, { force: true });
  ok("C9.1 fail: a part whose box differs from the edition's own inventory is refused before any call", /not in the parent inventory/.test(refused), refused.slice(0, 160));
  const other = impactPart(C91.held, changed.slice(1));
  ok("C9.1 key: another list of changed boxes gives another part (name and checksum), so a saved run never replays across comparisons", other.file !== part.file && other.sha256 !== part.sha256 && part.editionSha256 === JSON.parse(readFileSync(join(PROTOTYPE, "..", C91.held), "utf8")).summary.sha256);

  // ── Contract-valid output: shape, this edition, only the changed boxes ──
  const step = impactStep(C91.printed, changed);
  const entry = (dp: string) => ({ data_path: dp, outcome: "mapped", person: "applicant", row: null, fact: "person.family_name", transform: null, condition: null, confidence: "high", unresolved_reason: null, evidence_quote: "Family name" });
  const answer = (edition: string, paths: string[]) => ({ form_edition: edition, canonical_fields: [{ id: "person.family_name", meaning: "The person's family name", value_type: "text" }], entries: paths.map(entry) });
  ok("C9.1 pass: an answer of the field map's shape, for this edition, about changed boxes only, is used", step.shapeOk(answer(C91.printed, changed.slice(0, 3))));
  const outside = rows.find((x) => x.change === "unchanged")!.dataPath;
  ok("C9.1 fail: an answer that names a box which is not new or reworded is never used", !step.shapeOk(answer(C91.printed, [changed[0], outside])) && answersInside(answer(C91.printed, [outside]) as never, new Set(changed)) === outside);
  ok("C9.1 fail: an answer for another edition (the 2021 one), or of the wrong shape, is never used", !step.shapeOk(answer("IMM 5476 (11-2021)", changed.slice(0, 1))) && !step.shapeOk({ form_edition: C91.printed, entries: [] }));
  ok("C9.1 the step reuses the field map's part prompt and blind checker (no new prompt), with the part's output limit", step.template === "field-map-part.v1.md" && step.check === "field-map-check.v1.md" && step.schema === "field-map-output.v2.schema.json" && step.max_output_tokens === 4_000 + 300 * 23);

  // ── P-138 cost said first: usual below worst, both in words ──
  const cost = impactCost(step, part);
  ok("C9.1 P-138: the offer's cost is in words, usual below worst, worst inside the run cap of each round", cost.about_usd > 0 && cost.about_usd < cost.at_most_usd && /^about US\$\d+\.\d\d · at most US\$\d+\.\d\d$/.test(cost.words) && cost.at_most_usd <= 10, cost);

  // ── Replay only for the same comparison (US$0), and another comparison's run is out of date ──
  const ctx = impactContext(C91.printed, part, "c91check");
  const replay = new StepRunner({ launchOnce: async () => { throw new Error("no launch in replay"); } });
  const none = await replay.round(step, false, { ...ctx, mode: "replay", wanted: async () => false });
  ok("C9.1 fail: with no saved run of this comparison, replay says so and costs nothing", !none.ok && none.costUsd === 0 && /No saved AI run for this comparison/.test(none.reason));
  const runFile = (base: string, stem: string) => `${base}-${stem}-live-20261103t101500000z-c91chk.json`;
  const tSha = (t: string) => createHash("sha256").update(readFileSync(join(PROTOTYPE, "p2", "prompts", t))).digest("hex");
  const saved = (isCheck: boolean, inputs: { file: string; sha256: string }[], out: unknown) => ({ caller: "live", contract_valid: true, raw_output: JSON.stringify(out),
    drafting_run: { status: "completed", usage: { cost_usd: 0.2 }, inputs: { official_files: inputs, combination: ctx.contextKey } }, launch_evidence: { template_sha256: tSha(isCheck ? step.check : step.template) } });
  const written: string[] = [];
  try {
    const f1 = runFile(step.jobBase, "c91check-other"); writeFileSync(join(RUNS, f1), JSON.stringify(saved(false, [{ file: other.rel, sha256: other.sha256 }], answer(C91.printed, changed.slice(1, 3))))); written.push(f1);
    const stale = await replay.round(step, false, { ...ctx, mode: "replay", wanted: async () => false });
    ok("C9.1 fail: a saved run of another comparison of this edition is not replayed, and is named out of date", !stale.ok && staleRun(ctx.contextKey, part.sha256) === f1 && /out of date/.test(IMPACT_AI_WORDS.stale));
    const f2 = runFile(step.jobBase, "c91check-same"); writeFileSync(join(RUNS, f2), JSON.stringify(saved(false, ctx.inputs, answer(C91.printed, changed.slice(0, 2))))); written.push(f2);
    const good = await replay.round(step, false, { ...ctx, mode: "replay", wanted: async () => false });
    ok("C9.1 pass: the saved run of exactly this comparison replays at US$0", good.ok && good.costUsd === 0 && good.from === "replay" && staleRun(ctx.contextKey, part.sha256) !== null, good.ok ? good.runFile : good);
    const f3 = runFile(`${step.jobBase}-check`, "c91check-wrong"); writeFileSync(join(RUNS, f3), JSON.stringify(saved(true, ctx.inputs, answer(C91.printed, [outside])))); written.push(f3);
    const chk = await replay.round(step, true, { ...ctx, mode: "replay", wanted: async () => false });
    ok("C9.1 fail: a saved checker answer about a box that did not change is skipped, never used", !chk.ok);
  } finally { for (const f of written) rmSync(join(RUNS, f), { force: true }); }

  // ── P-151: IRCC's accepted-until date for the previous edition, quoted from its page in the official library ──
  const after = previousAcceptedUntil("IMM 5476", new Date("2026-11-03T00:00:00Z")), before = previousAcceptedUntil("IMM 5476", new Date("2026-01-10T00:00:00Z"));
  ok("C9.1 P-151 pass: IMM 5476's previous edition was accepted until 2026-03-12 (quoted, with the page address); on 3 Nov 2026 it has passed", after?.until === "2026-03-12" && after.passed && /has passed/.test(after.words) && /March 12, 2026/.test(after.quote) && /imm5476\.html$/.test(String(after.url)), after);
  ok("C9.1 P-151 fail: before that date it has not passed; a form whose page is not in the library gives no date (never guessed)", before?.passed === false && !/has passed/.test(before.words) && previousAcceptedUntil("IMM 9999") === null);

  // ── P-227: the paid run's jobs, from the app's own code, admitted by the guarded launcher (stub pass, US$0) ──
  const { jobs } = c91Jobs();
  ok("C9.1 P-227: both committed job files are exactly what the tool derives (draft and blind checker, the part pinned by checksum)", jobs.every(({ job }) => { const f = join(PROTOTYPE, "p2", "jobs", `${job.job_id}.json`); return existsSync(f) && readFileSync(f, "utf8") === JSON.stringify(job, null, 1) + "\n"; }) && jobs.every(({ job }) => job.inputs[0].sha256 === part.sha256 && (job.known as { form_edition?: string }).form_edition === C91.printed), jobs.map((j) => j.job.job_id));
  // The stub pass writes its run, a stub-pass record and a new canary digest in the repository: put back after (as
  // check_ai_launch_paths.ts does), so a run leaves the repository as it was. Its US$0 ledger lines stay (QA-90).
  const CANARY = join(PROTOTYPE, "p2", "screening", "canary-digest.json"), STUBS = join(RUNS, "stub-pass");
  const canary = existsSync(CANARY) ? readFileSync(CANARY, "utf8") : null;
  // The paid run's own stub-pass records are committed (C9.1 result PR): their bytes are put back too, never rewritten.
  const stubsBefore = new Map((existsSync(STUBS) ? readdirSync(STUBS) : []).map((f) => [f, readFileSync(join(STUBS, f))]));
  const runsBefore = new Set(readdirSync(RUNS));
  try {
  for (const { label, job } of jobs) {
    const stub = spawnSync(process.execPath, [join(PROTOTYPE, "p2", "launch.ts"), "--job", job.job_id, "--stub"], { cwd: join(PROTOTYPE, "..", "..", ".."), encoding: "utf8", timeout: 120_000 });
    const made = readdirSync(RUNS).filter((f) => !runsBefore.has(f) && f.startsWith(job.job_id));
    let rec: { caller?: string; contract_valid?: boolean; drafting_run?: { status?: string; usage?: { cost_usd?: number } } } = {};
    try { rec = JSON.parse(readFileSync(join(RUNS, made[0]), "utf8")); } catch { /* reported below */ }
    for (const f of made) rmSync(join(RUNS, f), { force: true });
    ok(`C9.1 P-227: the guarded launcher admits the ${label} job (part input, edition known fact) in a stub pass, US$0`, stub.status === 0 && rec.caller === "stub" && rec.contract_valid === true && (rec.drafting_run?.usage?.cost_usd ?? 0) === 0, { exit: stub.status, err: stub.stderr?.slice(-300), status: rec.drafting_run?.status });
  }
  } finally {
    if (canary !== null) writeFileSync(CANARY, canary);
    for (const f of existsSync(STUBS) ? readdirSync(STUBS) : []) { const was = stubsBefore.get(f); if (was === undefined) rmSync(join(STUBS, f), { force: true }); else writeFileSync(join(STUBS, f), was); }
  }

  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
