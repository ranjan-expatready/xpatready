// C7.5 the saved paid reviews' tripwire (runtime lane; concept-part2.md §8 M2; P-227, P-295, P-422). Each checked paid
// review of IMM 5257 is one committed pair (a first round and a blind checker of one job): run b4936d0b (9 Nov, US$0.86)
// on the fixture's data, and, once the tech lead makes it (Lead 39, 9 Nov: a paid run happens where Works is counted), one
// on the configured checkpoint. Each is found by what it read: the form's inventory and the review sheet of
// the pack's fixed case, by checksum (rounds.ts isSameSavedRun). If the filler, the release's captions or the pack's
// answers change, the pack's case gives another sheet and the run is silently retired: C7.5-6b and every step after it
// would go red with no word of why. This check fails first, naming the run and the lines that moved, and proves the product
// never reuses the run for a changed sheet. Each rule with a passing case (the saved run as committed) and a failing one
// (a tampered input):
//   without a server: the committed pair (one first round, one blind checker of the same job, real live answers, never
//   made up) records the same inputs; the committed sheet is the file it names, with the checksum it recorded; the
//   inventory has not changed; a sheet with one value changed, or an inventory with one byte changed, is refused;
//   on an isolated copy (live AI off, no made-up runs): the pack's case gives exactly the committed sheet, so Saved is
//   offered with exactly the committed pair; one answer changed gives another sheet, Saved is not offered, a replay is
//   refused (409) and no AI finding is added. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c75tw 4439 start && tsx studio/tests/check_c75_saved_run_tripwire.ts 4439 xr_studio_runtime_c75tw
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { recorder } from "./runtime/api.ts";
import * as m3 from "../acceptance/lib/m3.ts";
import { FORM_REVIEW } from "../api/src/review-runs.ts";
import { pairOf, RUNS } from "../api/src/rounds.ts";
import { sheetText, type ReviewSheet } from "../engine/runtime/form-review.ts";
import { packLikeCase, type Plan } from "./fixtures/c75-made-up-run.ts";

const { ok, summary } = recorder();
const { call, sql } = m3;
const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", "..");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
type Rec = { test_fixture?: unknown; caller?: string; contract_valid?: boolean; raw_output?: string; drafting_run?: { status?: string; usage?: { cost_usd?: number }; inputs?: { combination?: string; official_files?: { file: string; sha256: string }[] } } };
const RUN_FIXTURE = "the saved paid review of IMM 5257 (run b4936d0b, 9 Nov)";
/** A pair's name in the messages: run b4936d0b by its run id, any later one by its job and the day it was made. */
const nameOf = (stem: string, file: string) => stem === "imm-5257-09-2023-d5c57403" ? RUN_FIXTURE : `the saved paid review of IMM 5257 (job ${stem}, ${/-live-(\d{8})t/.exec(file)?.[1] ?? "?"})`;
type Pair = { stem: string; name: string; draft: string; check: string; inputs: { file: string; sha256: string }[] };

/** The tripwire itself: why these inputs no longer are the ones the saved run read, or [] when they are. */
export function tripwire(recorded: { file: string; sha256: string }[], sheet: Buffer | null, inventory: Buffer | null, RUN = RUN_FIXTURE): string[] {
  const why: string[] = [];
  const [inv, sh] = recorded;
  if (!inv || !sh || recorded.length !== 2) return [`${RUN} does not record an inventory and a review sheet`];
  if (!inventory) why.push(`the inventory ${inv.file} is missing`);
  else if (sha(inventory) !== inv.sha256) why.push(`the inventory ${inv.file} changed since ${RUN} read it (${sha(inventory).slice(0, 12)} ≠ ${inv.sha256.slice(0, 12)})`);
  if (!sheet) why.push(`the review sheet ${sh.file} is not committed`);
  else if (sha(sheet) !== sh.sha256) why.push(`the review sheet ${sh.file} is not the one ${RUN} read (${sha(sheet).slice(0, 12)} ≠ ${sh.sha256.slice(0, 12)})`);
  return why;
}
/** The lines that differ between two sheets, in words (box: before → after), for the failure message. */
const moved = (a: ReviewSheet["fields"], b: ReviewSheet["fields"]) => {
  const at = new Map(a.map((x) => [x.box, x])), bt = new Map(b.map((x) => [x.box, x]));
  return [...new Set([...at.keys(), ...bt.keys()])].filter((k) => JSON.stringify(at.get(k)) !== JSON.stringify(bt.get(k)))
    .map((k) => `${k}: ${at.get(k)?.value ?? "(none)"} → ${bt.get(k)?.value ?? "(none)"}`).slice(0, 12);
};
const read = (rel: string) => { try { return readFileSync(join(SOLUTION, rel)); } catch { return null; } };

(async () => {
  // ── without a server: every committed saved pair and its inputs ──
  const files = readdirSync(RUNS).filter((f) => /^studio-form-review-.+-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/.test(f)).sort();
  const draftF = files.filter((f) => !f.startsWith("studio-form-review-check-")), checkF = files.filter((f) => f.startsWith("studio-form-review-check-"));
  const rec = (f: string) => JSON.parse(readFileSync(join(RUNS, f), "utf8")) as Rec;
  const pairs: Pair[] = draftF.map((d) => { const stem = pairOf(FORM_REVIEW, false, d); const k = checkF.find((x) => pairOf(FORM_REVIEW, true, x) === stem) ?? ""; return { stem, name: nameOf(stem, d), draft: d, check: k, inputs: rec(d).drafting_run?.inputs?.official_files ?? [] }; });
  ok(`C7.5 saved runs: each committed first round has the blind checker round of the same job, and no round is alone (${pairs.length} pair${pairs.length === 1 ? "" : "s"}; ${RUN_FIXTURE} among them)`,
    pairs.length >= 1 && pairs.every((x) => !!x.check) && checkF.length === pairs.length && pairs.some((x) => x.name === RUN_FIXTURE), files);
  for (const x of pairs) {
    const d = rec(x.draft), k = x.check ? rec(x.check) : ({} as Rec), cost = (d.drafting_run?.usage?.cost_usd ?? 0) + (k.drafting_run?.usage?.cost_usd ?? 0);
    ok(`C7.5 saved run (${x.name}): both rounds are real live answers (caller live, finished, contract-valid), never made up (no test_fixture), at a cost within the job's worst case (US$${cost.toFixed(2)}${x.name === RUN_FIXTURE ? ", as the PR says, US$0.86" : ""})`,
      [d, k].every((r) => r.caller === "live" && r.drafting_run?.status === "completed" && r.contract_valid === true && !("test_fixture" in r) && typeof r.raw_output === "string")
      && cost > 0 && cost <= 4.8 && (x.name !== RUN_FIXTURE || Math.abs(cost - 0.86) < 0.005), [d, k].map((r) => ({ caller: r.caller, status: r.drafting_run?.status, cost: r.drafting_run?.usage?.cost_usd })));
    ok(`C7.5 saved run (${x.name}): both rounds read the same inputs, for the IMM 5257 (09-2023) edition`, JSON.stringify(x.inputs) === JSON.stringify(k.drafting_run?.inputs?.official_files) && d.drafting_run?.inputs?.combination === "edition:IMM 5257:09-2023" && x.inputs.length === 2, x.inputs);
    const bytes = read(x.inputs[1]?.file ?? ""), sheet = bytes ? JSON.parse(bytes.toString("utf8")) as ReviewSheet : null;
    const why = tripwire(x.inputs, bytes, read(x.inputs[0]?.file ?? ""), x.name);
    ok(`C7.5 tripwire pass: the committed sheet and the inventory are exactly what ${x.name} read`, why.length === 0, why);
    ok(`C7.5 tripwire (${x.name}): its committed sheet is a review-sheet/v1 of IMM 5257 (09-2023), written as the product writes it (same text, same checksum)`, !!sheet && sheet.contract === "review-sheet/v1" && sheet.form_edition === "IMM 5257 (09-2023)" && sheetText(sheet) === bytes!.toString("utf8"));
  }
  ok("C7.5 saved runs: no two pairs read the same sheet (each data set has its own)", new Set(pairs.map((x) => x.inputs[1]?.sha256)).size === pairs.length);
  // Tampered inputs, on run b4936d0b: one value of the sheet, one byte of the inventory, a missing sheet.
  const fx = pairs.find((x) => x.name === RUN_FIXTURE)!;
  const inputs = fx?.inputs ?? [];
  const sheetBytes = read(inputs[1]?.file ?? ""), invBytes = read(inputs[0]?.file ?? "");
  const committed = sheetBytes ? JSON.parse(sheetBytes.toString("utf8")) as ReviewSheet : null;
  const tampered = committed ? { ...committed, fields: committed.fields.map((f, i) => i === 0 ? { ...f, value: `${f.value} (changed)` } : f) } : null;
  const whyT = tripwire(inputs, tampered ? Buffer.from(sheetText(tampered)) : null, invBytes);
  ok("C7.5 tripwire fail: a sheet with one value changed is not the one the run read, said in words naming the run", whyT.length === 1 && /review sheet .* is not the one the saved paid review of IMM 5257 \(run b4936d0b/.test(whyT[0]), whyT);
  const whyI = tripwire(inputs, sheetBytes, invBytes ? Buffer.concat([invBytes, Buffer.from(" ")]) : null);
  ok("C7.5 tripwire fail: an inventory with one byte added is caught, naming the run", whyI.length === 1 && /inventory .* changed since the saved paid review/.test(whyI[0]), whyI);
  ok("C7.5 tripwire fail: a missing sheet is caught", tripwire(inputs, null, invBytes).some((x) => /is not committed/.test(x)));

  // ── on an isolated copy: the pack's case gives the sheet of exactly one committed pair, and nothing else replays ──
  const releases = () => Number(sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") ?? 0);
  const tsx = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(m3.PORT), m3.DB], { encoding: "utf8", timeout: 900_000 });
  if (releases() === 0) ok("setup: release 1 of the Visitor visa", tsx("tests/runtime/setup_visitor_visa.ts").status === 0 && releases() === 1);
  if (releases() === 1) { tsx("acceptance/lib/setup_vv_m3.ts"); ok("setup: release 2 (pack 4 setup)", releases() === 2); }
  const { c, P } = await packLikeCase();
  const plan = (await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P })).body as Plan & { forms: (Plan["forms"][number] & { lines: ReviewSheet["fields"] })[] };
  const f0 = plan?.forms?.[0];
  const mine = pairs.find((x) => x.inputs[1]?.sha256 === f0?.sheet_sha256);
  if (!mine) for (const x of pairs) {
    const b = read(x.inputs[1]?.file ?? ""), lines = b && f0?.lines ? moved((JSON.parse(b.toString("utf8")) as ReviewSheet).fields, f0.lines) : [];
    console.log(`      ${x.name} does not match this data: the pack's case gives ${f0?.sheet ?? "no sheet"}. Lines that differ (first 12):\n${lines.map((l) => `        ${l}`).join("\n")}`);
  }
  ok(`C7.5 tripwire pass (pack's case): on this data the pack's fixed answers give exactly the sheet one committed pair read (${mine?.name ?? "none"}); if this fails the filler, the captions, the data or the pack's answers moved, and no saved run serves this data`,
    !!mine && f0?.sheet === mine.inputs[1]?.file, { plan_sheet: f0?.sheet, recorded: pairs.map((x) => x.inputs[1]?.file) });
  ok("C7.5 tripwire pass: Saved is offered with exactly that pair, not made up", !!mine && plan?.replay_available === true && plan.made_up === false && JSON.stringify([...(f0?.saved.files ?? [])].sort()) === JSON.stringify([`prototype/p2/runs/${mine.draft}`, `prototype/p2/runs/${mine.check}`].sort()), f0?.saved);
  // Tampered: one of the pack's answers changed → another sheet, no Saved, a replay refused, nothing added.
  const before = Number(sql(`select count(*) from review_finding where case_id='${c.id}' and source='ai'`));
  await m3.answer(c.id, P, "person.applying_from_country", "Canada"); await m3.confirmAll(c.id, P);
  const plan2 = (await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P })).body as Plan;
  const r = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay" });
  ok("C7.5 tripwire fail (a changed answer): another sheet, Saved not offered, a replay refused (409) at US$0, no AI finding added: the run is never reused for other answers",
    !pairs.some((x) => x.inputs[1]?.sha256 === plan2?.forms?.[0]?.sheet_sha256) && plan2?.replay_available === false && r.status === 409 && /No saved review of this form edition with these values yet/.test(JSON.stringify(r.body))
    && Number(sql(`select count(*) from review_finding where case_id='${c.id}' and source='ai'`)) === before, { sha: plan2?.forms?.[0]?.sheet_sha256, status: r.status });
  process.exitCode = summary() ? 1 : 0;
})();
