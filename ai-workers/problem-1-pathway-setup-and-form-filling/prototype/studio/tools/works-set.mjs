#!/usr/bin/env node
// The protected regression set (P-320 (b), founder 4 Nov ~09:45 IST "Yes, this order"; the tech lead's brief): every
// merge-queue batch re-runs the acceptance pack of each capability that already counts as Works, on GitHub's machines,
// so a merge can no longer take away a Works row unseen (reports/bottleneck-audit-2026-11-03.md: 18 demotions in 3 days).
//   --list   the capabilities with milestone M2 (or --milestone) and status Works in qa/CAPABILITIES.md as it is on the
//            base branch (CI's RANGE "<base>..<head>"; --file reads a file instead) that have an acceptance pack;
//            --json prints them as a JSON array for a job matrix. A Works row without a pack is listed as such.
//   --run <C…>  runs that capability's pack(s) once through gate-b.mjs (on the six where the pack's run allows, else on
//            its fixture, labelled "fixture only"; US$0, live AI off) with no claim, so no bug check: only the pack. A
//            red run is run once more (a flaky pack is retried once, the tech lead's brief); green on the retry passes and
//            says "flaky", red twice fails. The gate's own CI values (QUEUE, PR_TITLE, PR_BODY, KIND) are cleared, so a
//            batch's QUEUE=true never turns the run into gate B's batch check.
// Usage: node studio/tools/works-set.mjs --list [--json] [--milestone M2] [--file <CAPABILITIES.md>]
//        node studio/tools/works-set.mjs --run C11.13
// Exit: 0 listed / green (on the first run or the retry) · 1 red twice · 2 could not run.
import { readFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { packsOf } from "./gate-b.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = resolve(HERE, ".."), P = resolve(S, "../../product"), CAPS = join(P, "qa/CAPABILITIES.md");

/** The rows of qa/CAPABILITIES.md: id, milestone, status (the table "| # | Step | Capability | M | Status | …"). */
export function rows(md) {
  const out = [];
  for (const line of md.split(/\r?\n/)) {
    const col = line.trim().split(/(?<!\\)\|/).map((c) => c.trim().replace(/[*_`]/g, ""));
    if (col[0] !== "" || !/^C\d{1,2}\.\d{1,2}$/.test(col[1] ?? "")) continue;
    out.push({ id: col[1], milestone: col[4] ?? "", status: col[5] ?? "" });
  }
  return out;
}
/** The protected set: rows of the milestone whose status is exactly Works, with the packs each has. */
export const protectedSet = (md, milestone = "M2", packs = packsOf) =>
  rows(md).filter((r) => r.milestone === milestone && r.status === "Works").map((r) => ({ id: r.id, packs: packs(r.id) }));

/** qa/CAPABILITIES.md as it is on the base branch, so the PRs in the batch cannot change what is protected. */
function capsText(file) {
  if (file) return readFileSync(file, "utf8");
  const base = (process.env.RANGE ?? "").match(/^([0-9a-f]{7,40})\.\./)?.[1];
  if (!base) return readFileSync(CAPS, "utf8");
  const top = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: S, encoding: "utf8" }).stdout.trim();
  const r = spawnSync("git", ["show", `${base}:${relative(top, CAPS)}`], { cwd: S, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`cannot read qa/CAPABILITIES.md at the base ${base}: ${r.stderr.trim()}`);
  return r.stdout;
}
/** One run of the capability's packs through gate B with no claim (only its packs), CI's PR values cleared. */
function once(id) {
  const gate = process.env.WORKS_SET_GATE ?? join(HERE, "gate-b.mjs");   // the self-check points this at a stand-in
  const env = { ...process.env, QUEUE: "", PR_TITLE: "", PR_BODY: "", KIND: "code", GATE_B_JOBS: "1" };
  const r = spawnSync(process.execPath, [gate, "--title", id, "--kind", "code"], { cwd: S, env, encoding: "utf8", maxBuffer: 64 << 20, timeout: 1_800_000 });
  return { status: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

function main(argv) {
  const say = (s) => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n"); };
  const opt = { list: false, json: false, run: null, milestone: "M2", file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { if (argv[i + 1] === undefined) throw new Error(`${a} wants a value`); return argv[++i]; };
    if (a === "--list") opt.list = true; else if (a === "--json") opt.json = opt.list = true; else if (a === "--run") opt.run = v();
    else if (a === "--milestone") opt.milestone = v(); else if (a === "--file") opt.file = v(); else throw new Error(`unknown option ${a}`);
  }
  if (opt.run) {
    if (!/^C\d{1,2}\.\d{1,2}$/.test(opt.run)) throw new Error(`not a capability id: "${opt.run}" (want e.g. C11.13)`);
    const first = once(opt.run);
    process.stdout.write(first.out);
    if (first.status === 0) { say(`**${opt.run}**: green.`); return 0; }
    say(`**${opt.run}**: red on the first run (exit ${first.status}); running it once more (a flaky pack is retried once).`);
    const again = once(opt.run);
    process.stdout.write(again.out);
    if (again.status === 0) { say(`**${opt.run}**: green on the retry — flaky (first run exit ${first.status}).`); return 0; }
    say(`**${opt.run}**: red twice (exit ${first.status}, then ${again.status}): this batch would take away a Works row.`);
    return again.status === 2 && first.status === 2 ? 2 : 1;
  }
  if (!opt.list) throw new Error("say --list, --json or --run <C…>");
  const set = protectedSet(capsText(opt.file), opt.milestone), runs = set.filter((r) => r.packs.length);
  if (opt.json) { console.log(JSON.stringify(runs.map((r) => r.id))); return 0; }
  say(`Protected regression set (${opt.milestone} · Works): ${set.length} capabilities, ${runs.length} with an acceptance pack.`);
  for (const r of set) say(`  ${r.id}: ${r.packs.length ? r.packs.join(", ") : "no acceptance pack (not re-run)"}`);
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error(`works-set could not run: ${e.message}`); process.exit(2); }
}
