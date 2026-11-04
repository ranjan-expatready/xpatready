#!/usr/bin/env node
// The protected regression set (P-320 (b), founder 4 Nov ~09:45 IST "Yes, this order"; the tech lead's brief): every
// merge-queue batch re-runs the acceptance pack of each capability that already counts as Works, on GitHub's machines,
// so a merge can no longer take away a Works row unseen (reports/bottleneck-audit-2026-11-03.md: 18 demotions in 3 days).
// Everything that decides WHAT is protected is read on the batch's base (CI's RANGE "<base>..<head>"), so the batch's
// own PRs cannot shrink the set: qa/CAPABILITIES.md, the hold file, and the list of pack files.
//   --list   the capabilities with milestone M2 (or --milestone) and a status that starts with "Works" (any case, marks
//            and struck-out text ignored, so "Works (retest)" counts) that have an acceptance pack on the base;
//            --json prints them as a JSON array for a job matrix. A Works row without a pack is listed as such.
//   Held:    the hold file (HELD below; tech lead, 4 Nov) names a capability ("C4.7 <reason>") or one pack file
//            ("C11.12-runtime.test.ts <reason>") left out with its reason: red on main when it was held, sent to qa. A
//            capability with every pack held leaves the matrix; a held pack file is skipped by name in --run (gate-b
//            GATE_B_SKIP_PACKS), so the capability's other packs stay protected. A line that cannot be read is reported
//            and ignored (never a jam of every batch); a hold that matches no protected pack is reported as stale.
//   --run <C…>  runs that capability's packs, held packs skipped, through gate-b.mjs with no claim (only the packs; on
//            the six where a pack's run allows, else "fixture only"; US$0, live AI off; QUEUE, PR_TITLE, PR_BODY cleared,
//            so a batch never turns it into gate B's batch check). Every pack the base names must run: a pack missing at
//            the head, or a run of no pack, is red (a batch cannot drop a protected pack by renaming or deleting it). A
//            red run is run once more (a flaky pack is retried once); green on the retry passes and says "flaky", red
//            twice fails.
// Usage: node studio/tools/works-set.mjs --list [--json] [--milestone M2] [--file <CAPABILITIES.md>] [--held <file>]
//        node studio/tools/works-set.mjs --run C11.13 [--held <file>]
// Exit: 0 listed / green (on the first run or the retry) · 1 red twice · 2 could not run.
import { readFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { packsOf } from "./gate-b.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = resolve(HERE, ".."), P = resolve(S, "../../product"), CAPS = join(P, "qa/CAPABILITIES.md"), ACC = join(S, "acceptance");
const HELD = join(HERE, "works-set-held.txt");
const ID = /\b[Cc](\d{1,2})\.(\d{1,2})\b/;
const top = () => spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: S, encoding: "utf8" }).stdout.trim();
const baseOf = () => (process.env.RANGE ?? "").match(/^([0-9a-f]{7,40})\.\./)?.[1] ?? null;

/** The rows of qa/CAPABILITIES.md: id, milestone, status ("| # | Step | Capability | M | Status | …"). A pipe inside a
 *  `code span` is not a column; a linked or bold id is read; struck-out text (~~…~~) is not. */
export function rows(md) {
  const out = [], seen = new Set();
  for (const raw of md.split(/\r?\n/)) {
    let line = raw.trim().replace(/`[^`]*`/g, (c) => c.replace(/\|/g, "¦"));
    if (!line.includes("|")) continue;
    if (!line.startsWith("|")) line = `| ${line}`;
    const col = line.split(/(?<!\\)\|/).map((c) => c.replace(/~~[^~]*~~/g, " ").replace(/[*_`]/g, "").trim());
    const m = (col[1] ?? "").match(ID);
    if (col[0] !== "" || !m || !/^\[?[Cc]\d/.test(col[1])) continue;
    const id = `C${m[1]}.${m[2]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, milestone: col[4] ?? "", status: col[5] ?? "" });
  }
  return out;
}
const isWorks = (status) => /^works\b/i.test(status.trim());
const inMilestone = (m, want) => m.split(/[\s,;/]+/).some((t) => t.toUpperCase() === want.toUpperCase());
/** The protected set: rows of the milestone whose status is Works, with the packs each has (packs: id → files). */
export const protectedSet = (md, milestone = "M2", packs = packsOf) =>
  rows(md).filter((r) => inMilestone(r.milestone, milestone) && isWorks(r.status)).map((r) => ({ id: r.id, packs: packs(r.id) }));

/** The hold file: "<C…> <reason>" (a capability) or "<C…-name.test.ts> <reason>" (one pack). A # at the start of a line
 *  is a comment; a line that cannot be read is returned in `bad` and holds nothing. */
export function held(text) {
  const caps = new Map(), packs = new Map(), bad = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const m = l.match(/^([Cc]\d{1,2}\.\d{1,2})(\S*?\.test\.ts)?\s+(\S.*)$/);
    if (!m || (m[2] && !/^(-[\w.-]+)?\.test\.ts$/.test(m[2]))) { bad.push(l.slice(0, 120)); continue; }
    const id = `C${m[1].slice(1)}`;
    if (m[2]) packs.set(`${id}${m[2]}`, m[3]); else caps.set(id, m[3]);
  }
  return { caps, packs, bad };
}
/** A file as it is on the base (the working tree off CI); a file not on the base yet reads as "" when missingOk. */
function atBase(path, missingOk = false) {
  const base = baseOf();
  if (!base) { try { return readFileSync(path, "utf8"); } catch (e) { if (missingOk) return ""; throw e; } }
  const r = spawnSync("git", ["show", `${base}:${relative(top(), path)}`], { cwd: S, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status === 0) return r.stdout;
  if (missingOk && /exists on disk, but not in|does not exist in/.test(r.stderr)) return "";
  throw new Error(`cannot read ${relative(top(), path)} at the base ${base}: ${r.stderr.trim()}`);
}
/** The pack files on the base (the head's folder off CI), as packsOf names them. */
function basePacks() {
  const base = baseOf();
  if (!base) return packsOf;
  const r = spawnSync("git", ["ls-tree", "--name-only", base, `${relative(top(), ACC)}/`], { cwd: top(), encoding: "utf8", maxBuffer: 16 << 20 });
  if (r.status !== 0) throw new Error(`cannot list the acceptance packs at the base ${base}: ${r.stderr.trim()}`);
  const files = r.stdout.split("\n").map((p) => p.split("/").pop()).filter(Boolean);
  return (id) => files.filter((f) => f === `${id}.test.ts` || (f.startsWith(`${id}-`) && f.endsWith(".test.ts"))).sort();
}
/** One run of the capability's packs through gate B with no claim, held packs skipped, CI's PR values cleared. */
function once(id, skip) {
  const gate = process.env.WORKS_SET_GATE ?? join(HERE, "gate-b.mjs");   // the self-check points this at a stand-in
  const env = { ...process.env, QUEUE: "", PR_TITLE: "", PR_BODY: "", KIND: "code", GATE_B_JOBS: "1", GATE_B_SKIP_PACKS: skip.join(",") };
  // 19 minutes an attempt, so a run and its retry fit the job's limit; a hang is red, never a pass.
  const r = spawnSync(process.execPath, [gate, "--title", id, "--kind", "code"], { cwd: S, env, encoding: "utf8", maxBuffer: 64 << 20, timeout: 1_140_000, killSignal: "SIGKILL" });
  return { status: r.status ?? (r.error ? 124 : 1), out: (r.stdout ?? "") + (r.stderr ?? "") + (r.error ? `\n(stopped: ${r.error.message})` : "") };
}
/** The packs the base names that a run did not run (each pack gate B runs prints "<file> on the six" or "<file> fixture
 *  only" with its exit). */
export const notRun = (expected, out) => expected.filter((f) => !new RegExp(`^\\s*${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (on the six|fixture only)`, "m").test(out));

function main(argv) {
  const say = (s) => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n"); };
  const opt = { list: false, json: false, run: null, milestone: "M2", file: null, held: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { if (argv[i + 1] === undefined) throw new Error(`${a} wants a value`); return argv[++i]; };
    if (a === "--list") opt.list = true; else if (a === "--json") opt.json = opt.list = true; else if (a === "--run") opt.run = v();
    else if (a === "--milestone") opt.milestone = v(); else if (a === "--file") opt.file = v(); else if (a === "--held") opt.held = v(); else throw new Error(`unknown option ${a}`);
  }
  const hold = held(opt.held ? readFileSync(opt.held, "utf8") : atBase(HELD, true)), packs = basePacks();
  for (const l of hold.bad) say(`  hold line not read (it holds nothing): "${l}" — write "<C…> <reason>" or "<C…-name.test.ts> <reason>"`);
  if (opt.run) {
    if (!/^C\d{1,2}\.\d{1,2}$/.test(opt.run)) throw new Error(`not a capability id: "${opt.run}" (want e.g. C11.13)`);
    const all = packs(opt.run), skip = hold.caps.has(opt.run) ? all : all.filter((f) => hold.packs.has(f)), expected = all.filter((f) => !skip.includes(f));
    if (!expected.length) { say(`**${opt.run}**: ${all.length ? "every pack is held" : "no acceptance pack on the base"}; nothing to run.`); return all.length ? 0 : 2; }
    const attempt = () => { const r = once(opt.run, skip), miss = notRun(expected, r.out); process.stdout.write(r.out); return miss.length ? { status: 1, why: `did not run ${miss.join(", ")} (missing at the head, renamed, or the gate ran no pack)` } : { status: r.status, why: `exit ${r.status}` }; };
    const first = attempt();
    if (first.status === 0) { say(`**${opt.run}**: green (${expected.join(", ")}${skip.length ? `; held: ${skip.join(", ")}` : ""}).`); return 0; }
    say(`**${opt.run}**: red on the first run (${first.why}); running it once more (a flaky pack is retried once).`);
    const again = attempt();
    if (again.status === 0) { say(`**${opt.run}**: green on the retry — flaky (first run: ${first.why}).`); return 0; }
    say(`**${opt.run}**: red twice (${first.why}, then ${again.why}): this batch would take away a Works row.`);
    return again.status === 2 && first.status === 2 ? 2 : 1;
  }
  if (!opt.list) throw new Error("say --list, --json or --run <C…>");
  const md = opt.file ? readFileSync(opt.file, "utf8") : atBase(CAPS);
  if (!rows(md).length) throw new Error("qa/CAPABILITIES.md has no capability row the tool can read (never an empty set)");
  const set = protectedSet(md, opt.milestone, packs);
  const live = (r) => r.packs.filter((f) => !hold.caps.has(r.id) && !hold.packs.has(f));
  const runs = set.filter((r) => live(r).length);
  if (opt.json) { console.log(JSON.stringify(runs.map((r) => r.id))); return 0; }
  say(`Protected regression set (${opt.milestone} · Works): ${set.length} capabilities, ${set.filter((r) => r.packs.length).length} with an acceptance pack, ${runs.length} re-run.`);
  for (const r of set) {
    if (!r.packs.length) { say(`  ${r.id}: no acceptance pack (not re-run)`); continue; }
    const h = r.packs.filter((f) => hold.caps.has(r.id) || hold.packs.has(f));
    say(`  ${r.id}: ${live(r).join(", ") || "—"}${h.length ? `; held, not re-run: ${h.map((f) => `${f} (${hold.packs.get(f) ?? hold.caps.get(r.id)})`).join("; ")}` : ""}`);
  }
  const all = new Set(set.flatMap((r) => r.packs));
  for (const id of hold.caps.keys()) if (!set.some((r) => r.id === id && r.packs.length)) say(`  stale hold: ${id} is no longer a protected row with a pack; remove its line`);
  for (const f of hold.packs.keys()) if (!all.has(f)) say(`  stale hold: ${f} is not a pack of a protected row; remove its line`);
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error(`works-set could not run: ${e.message}`); process.exit(2); }
}
