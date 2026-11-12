#!/usr/bin/env node
// The protected regression set (P-320 (b), founder 4 Nov ~09:45 IST "Yes, this order"; the tech lead's brief): every
// merge-queue batch re-runs the acceptance pack of each capability that already counts as Works, on GitHub's machines,
// so a merge can no longer take away a Works row unseen (reports/bottleneck-audit-2026-11-03.md: 18 demotions in 3 days).
// Everything that decides WHAT is protected is read on the batch's base (CI's RANGE "<base>..<head>"), so the batch's
// own PRs cannot shrink the set: qa/CAPABILITIES.md, the hold file, and the list of pack files.
//   --list   the capabilities with milestone M2 (or --milestone; the merge queue and the nightly pass "all" since D3/D5)
//            and a status that starts with "Works" (any case, marks
//            and struck-out text ignored, so "Works (retest)" counts) that have an acceptance pack on the base;
//            --json prints them as a JSON array for a job matrix. A Works row without a pack is listed as such.
//   Held:    product/qa/REGRESSION-HELD.md (qa's records; tech lead, 4 Nov) names, on a list or table line, a capability
//            ("- C4.7 <reason>") or one pack file ("- C11.12-runtime.test.ts <reason>") left out with its reason, which names
//            its run or bug and says "red": red on main when it was held, sent to qa. The file must exist on the base (it may hold nothing):
//            until it does, the set cannot start (exit 2). A
//            capability with every pack held leaves the matrix; a held pack file is skipped by name in --run (gate-b
//            GATE_B_SKIP_PACKS), so the capability's other packs stay protected. A line that cannot be read is reported
//            and ignored (never a jam of every batch); a hold that matches no protected pack is reported as stale.
//   --run <C…>  runs that capability's packs, held packs skipped, through gate-b.mjs with no claim (only the packs; on
//            the six where a pack's run allows, else "fixture only"; US$0, live AI off; QUEUE, PR_TITLE, PR_BODY cleared,
//            so a batch never turns it into gate B's batch check). Every pack the base names must run: a pack missing at
//            the head, or a run of no pack, is red (a batch cannot drop a protected pack by renaming or deleting it). A
//            red run is run once more (a flaky pack is retried once); green on the retry passes and says "flaky", red
//            twice fails.
//   Data:    product/qa/REGRESSION-DATA.md (B77, P-322; qa's records, read at the base, optional) names the rows whose
//            verdict counts on the configured checkpoint ("- C4.8 checkpoint <reason>"); --run runs those on Demo › Load
//            the configured checkpoint (GATE_B_DATA=checkpoint), every other row on the six (Reset to the six).
//   --milestone all (D5, P-416, founder 8 Nov): every Works row, whatever its milestone (M2, M3, T, Parked, Team…).
//   Scoring data (D5): --groups and --pool run each row on the data its verdict counts on: qa's REGRESSION-DATA.md line
//            when there is one, else the newest data the row's own evidence names for its pack run (the first
//            "data=six|checkpoint", "GATE_B_DATA: six|checkpoint", "<pack>.test.ts on the [configured] six|checkpoint" or
//            "<n>/<n> on the [configured] six|checkpoint" in its Evidence cell, which is written newest first: C6.15
//            "nightly run … `data=checkpoint`", C5.4 "27/27 on the configured checkpoint"), else the checkpoint for an M3
//            row (P-322: later steps count on the configured checkpoint; qa scores every M3 row there), else the six.
//            --groups and --pool say where each row's data came from.
//   --groups <n>  (with --list) prints the rows with a pack as at most n JSON groups for a job matrix, balanced by packs
//            (a checkpoint pack counts double: its load is about 76 s, run 42422840997), each {caps, packs, weight}.
//   --pool <C…,C…>  runs those rows' packs in ONE gate-b run on its job slots (GATE_B_JOBS, default 3), each row on its
//            scoring data (gate-b GATE_B_DATA_OF), held packs skipped; a red row is run once more (pooled again); every
//            pack the base names must report (GATE_B_RESULTS). A pack that ran on no demo data (fixture only, or no server)
//            counts as run, as in --run (its row's Works rests on qa's gate A; 9 Works packs run so on the six, 8 Nov),
//            and is listed as NOT TESTED on its data (B131's words) with a ::warning::, never silently green.
// Usage: node studio/tools/works-set.mjs --list [--json] [--milestone M2|all] [--groups <n>] [--file <CAPABILITIES.md>] [--held <REGRESSION-HELD.md>] [--data <REGRESSION-DATA.md>]
//        node studio/tools/works-set.mjs --run C11.13 [--held <file>] [--data <file>]
//        node studio/tools/works-set.mjs --pool C1.3,C4.8,C11.13 [--file <CAPABILITIES.md>] [--held <file>] [--data <file>]
// Exit: 0 listed / green (on the first run or the retry) · 1 red twice · 2 could not run.
import { readFileSync, appendFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { packsOf } from "./gate-b.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = resolve(HERE, ".."), P = resolve(S, "../../product"), CAPS = join(P, "qa/CAPABILITIES.md"), ACC = join(S, "acceptance");
// The holds are qa's call (tech lead, 4 Nov): qa's records, a notes file, so a PR that adds or removes a hold never
// waits on the regression jobs it changes.
const HELD = join(P, "qa/REGRESSION-HELD.md");
// The data each row's verdict counts on (B77): qa's records too, read at the base; no file means every row on the six.
const DATA = join(P, "qa/REGRESSION-DATA.md");
const ID = /\b[Cc](\d{1,2})\.(\d{1,2})\b/;
const top = () => spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: S, encoding: "utf8" }).stdout.trim();
const baseOf = () => (process.env.RANGE ?? "").match(/^([0-9a-f]{7,40})\.\./)?.[1] ?? null;

/** The rows of qa/CAPABILITIES.md: id, milestone, status ("| # | Step | Capability | M | Status | …"; the M and Status
 *  columns are found by the header row, so an added column moves nothing, round 3 M2). A pipe inside a `code span` is not
 *  a column; a linked or bold id is read; struck-out text (~~…~~) is not. Every copy of a duplicate id is returned
 *  (protectedSet protects the id if any copy is a Works row). */
export function rows(md) {
  const out = [];
  let mi = 4, si = 5, ei = 7;
  for (const raw of md.split(/\r?\n/)) {
    let line = raw.trim().replace(/`[^`]*`/g, (c) => c.replace(/\|/g, "¦"));
    if (!line.includes("|")) continue;
    if (!line.startsWith("|")) line = `| ${line}`;
    const col = line.split(/(?<!\\)\|/).map((c) => c.replace(/~~[^~]*~~/g, " ").replace(/[*_`]/g, "").trim());
    const ms = col.indexOf("M"), ss = col.indexOf("Status"), es = col.findIndex((c) => /^Evidence\b/i.test(c));
    if (col[0] === "" && ms > 0 && ss > 0) { mi = ms; si = ss; ei = es > 0 ? es : ei; continue; }
    const m = (col[1] ?? "").match(ID);
    if (col[0] !== "" || !m || !/^\[?[Cc]\d/.test(col[1])) continue;
    const id = `C${m[1]}.${m[2]}`;
    out.push({ id, milestone: col[mi] ?? "", status: col[si] ?? "", note: col[ei] ?? "" });
  }
  return out;
}
const isWorks = (status) => /^[^\p{L}\p{N}]*works\b/iu.test(status.trim());   // "✅ Works" too (round 3 M2)
const inMilestone = (m, want) => want.toLowerCase() === "all" || m.split(/[\s,;/]+/).some((t) => t.toUpperCase() === want.toUpperCase());
/** The data a row's own evidence says its pack verdict ran on (D5): the first data named for a pack run in the Evidence
 *  cell (newest first), as gate B and the re-test print it; null when it names none. */
export function verdictData(note = "") {
  const m = note.replace(/[*`]/g, "").match(/\.test\.ts\s+on the (?:configured )?(six|checkpoint)\b|\bdata=(six|checkpoint)\b|GATE_?B_?DATA:?\s*(six|checkpoint)\b|\b\d+\/\d+\s+on the (?:configured )?(six|checkpoint)\b/i);
  return m ? (m[1] ?? m[2] ?? m[3] ?? m[4]).toLowerCase() : null;
}
/** Each row's scoring data and where it came from (D5): qa's REGRESSION-DATA.md line, else its evidence's
 *  (verdictData), else the checkpoint for an M3 row (P-322), else the six. */
export function scoringOf(id, md, dataFile = new Map()) {
  if (dataFile.get(id)) return { data: dataFile.get(id).data, from: "REGRESSION-DATA.md" };
  const own = rows(md).filter((r) => r.id === id), ev = own.map((r) => verdictData(r.note)).find(Boolean);
  if (ev) return { data: ev, from: "its evidence" };
  return own.some((r) => inMilestone(r.milestone, "M3")) ? { data: "checkpoint", from: "an M3 row (P-322)" } : { data: "six", from: "the default" };
}
export const scoringData = (id, md, dataFile = new Map()) => scoringOf(id, md, dataFile).data;
/** The rows' status and scoring data as on the base (CI's RANGE), for gate B's set by diff (D2): { statusOf, dataOf }. */
export function baseScoring() {
  const md = atBase(CAPS), dat = dataRows(atBase(DATA, true)).data, all = rows(md);
  // A duplicate id reads as Works when any copy is (as protectedSet), else its first status.
  const statusOf = (id) => { const own = all.filter((r) => r.id === id); return (own.find((r) => isWorks(r.status)) ?? own[0])?.status ?? null; };
  const hold = held(atBase(HELD, true));   // qa's holds (a missing file holds nothing here; the queue's set refuses it)
  return { statusOf, ids: () => [...new Set(all.map((r) => r.id))], dataOf: (id) => scoringData(id, md, dat), heldOf: (id, files) => files.filter((f) => hold.caps.has(id) || hold.packs.has(f)) };
}
/** At most n groups of rows for a job matrix, balanced by weight (a checkpoint pack 2, a six pack 1; heaviest first). */
export function groupsOf(items, n) {
  const k = Math.max(1, Math.min(n, items.length)), out = Array.from({ length: k }, () => ({ caps: [], packs: 0, weight: 0 }));
  for (const it of [...items].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id, "en", { numeric: true }))) {
    const g = out.reduce((a, b) => (b.weight < a.weight ? b : a));
    g.caps.push(it.id); g.packs += it.packs; g.weight += it.weight;
  }
  return out.filter((g) => g.caps.length);
}
/** The protected set: rows of the milestone whose status is Works, with the packs each has (packs: id → files). */
export const protectedSet = (md, milestone = "M2", packs = packsOf) =>
  [...new Set(rows(md).filter((r) => inMilestone(r.milestone, milestone) && isWorks(r.status)).map((r) => r.id))].map((id) => ({ id, packs: packs(id) }));

/** The lines of a qa notes file that start with a capability id, as plain text: fenced code (closed only by the same
 *  fence), indented code, HTML comments (an unclosed one runs to the end) and struck-out text are not read; a list, a
 *  table row, a quote, a check box, "•" and _emphasis_ around the id are. Shared by the hold file and the data file. */
function idLines(text) {
  const out = [];
  let fence = null;
  const body = text.replace(/<!--[\s\S]*?(-->|$)/g, " ");
  for (const raw of body.split(/\r?\n/)) {
    const f = raw.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
    if (f && (!fence || (f[0] === fence[0] && f.length >= fence.length))) { fence = fence ? null : f; continue; }
    if (fence || /^( {4}|\t)/.test(raw)) continue;
    let l = raw.trim().replace(/~~[^~]*~~/g, " ").replace(/[*`]/g, "");
    if (/^\|/.test(l)) l = l.split("|").map((c) => c.trim()).filter(Boolean).join(" ");
    l = l.replace(/^(>\s*)+/, "").replace(/^([-+•]|\d+[.)])\s+/, "").replace(/^\[[ xX]\]\s+/, "").replace(/^_+/, "").replace(/^(\S+?)_+(?=\s)/, "$1").trim();
    if (/^[Cc]\d/.test(l)) out.push(l);
  }
  return out;
}
/** The hold file (markdown): a list line "- <C…> <reason>" (a capability) or "- <C…-name.test.ts> <reason>" (one pack),
 *  or a table row "| <C…> | <reason> |", or the same with no bullet (a quote, a check box, "•" or _emphasis_ around the
 *  id are read); the reason says "red" and names its evidence, a run id ("run 41788362078") or a bug (QA-nnn), and is
 *  not "lifted". Fenced code (closed only by the same fence), HTML comments (an unclosed one runs to the end) and
 *  struck-out text are not read. A line that starts with a capability id but is not such a hold is returned in `bad` and
 *  holds nothing (#857 rounds 2 and 3: a history line "- C3.2 lifted 5 Nov, green in run 41799999999" or an example is
 *  never a hold). */
export function held(text) {
  const caps = new Map(), packs = new Map(), bad = [];
  for (const l of idLines(text)) {
    const m = l.match(/^([Cc]\d{1,2}\.\d{1,2})(\S*?\.test\.ts)?\s+(\S.*)$/);
    if (!m || (m[2] && !/^(-[\w.-]+)?\.test\.ts$/.test(m[2])) || !/\brun\s+\d{6,}\b|\bQA-\d+\b/i.test(m[3]) || !/\bred\b/i.test(m[3]) || /\blifted\b/i.test(m[3]) || /^-\S*\.test\.ts\b/.test(m[3])) { bad.push(l.slice(0, 120)); continue; }   // "C11.12 -runtime.test.ts": a stray space, not the whole capability
    const id = `C${m[1].slice(1)}`;
    if (m[2]) packs.set(`${id}${m[2]}`, m[3]); else caps.set(id, m[3]);
  }
  return { caps, packs, bad };
}
/** P-486 (Lead 22 on #1591): the packs qa's hold file names as a checkpoint row ("- C11.12-runtime.test.ts checkpoint
 *  row (P-322): not run on the six, where it is red …"): not run on the six, green on the configured checkpoint. Gate B
 *  runs them there on a pull request, as the nightly does; every other pack keeps its capability's data. Read like the
 *  hold file (a line that cannot be read holds nothing and moves nothing). */
export function checkpointPacks(text) {
  // Review m5 (#1609): "not a checkpoint row" moves nothing.
  return new Set([...held(text).packs].filter(([, why]) => /\bcheckpoint row\b/i.test(why) && !/\bnot a checkpoint row\b/i.test(why)).map(([f]) => f));
}
/** The same, from the hold file on the base (a pull request's own edit to qa's file moves none of its packs). */
export const checkpointPacksAtBase = () => checkpointPacks(atBase(HELD, true));
/** The data file (B77, P-322; qa's records): the demo data each protected row's verdict counts on. A line "- C4.8
 *  checkpoint <reason>" runs that row's packs on Demo › Load the configured checkpoint (gate B's GATE_B_DATA, as the
 *  nightly re-test's data=checkpoint, P-320 (a)); "six" says the default out loud. The reason names its evidence: a run
 *  id, a bug (QA-n) or a decision (P-n). Every other row runs on the six (setup rows count there). Read like the hold
 *  file; a line that cannot be read is reported and changes nothing. */
export function dataRows(text) {
  const data = new Map(), bad = [], torn = new Set();
  for (const l of idLines(text)) {
    const m = l.match(/^([Cc]\d{1,2}\.\d{1,2})\s+(six|checkpoint)\b[\s:,;—-]*(\S.*)$/i);
    // The reason names its evidence; a history or negated line ("until", "since", "back on", "lifted", "no longer", a
    // question) and a second capability on the line are reported, never read (break m2, m4).
    if (!m || !/\brun\s+\d{6,}\b|\bQA-\d+\b|\bP-\d+\b/i.test(m[3]) || /\b(until|since|back on|lifted|no longer)\b|\?/i.test(m[3]) || /\b[Cc]\d{1,2}\.\d{1,2}\b/.test(m[3])) { bad.push(l.slice(0, 120)); continue; }
    const id = `C${m[1].slice(1)}`, v = m[2].toLowerCase();
    if (torn.has(id)) { bad.push(`${l.slice(0, 100)} (this row has two answers: it runs on the six)`); continue; }
    // Two answers for one row: the row runs on the six for the rest of the file, whatever later lines say (break M1).
    if (data.has(id) && data.get(id).data !== v) { bad.push(`${l.slice(0, 100)} (another line says ${data.get(id).data}: it runs on the six)`); data.delete(id); torn.add(id); continue; }
    data.set(id, { data: v, why: m[3] });
  }
  return { data, bad };
}
/** A file as it is on the base (the working tree off CI); a file not on the base yet reads as "" when missingOk. */
function atBase(path, missingOk = false) {
  const base = baseOf();
  if (!base) { try { return readFileSync(path, "utf8"); } catch (e) { if (missingOk && e.code === "ENOENT") return ""; throw e; } }   // a file that exists but cannot be read is never "missing" (B77 break m3)
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
  // No pack at all on the base means the folder moved or the base predates it: could not run, never an empty set (N1).
  if (!files.some((f) => f.endsWith(".test.ts"))) throw new Error(`no acceptance pack under ${relative(top(), ACC)}/ at the base ${base} (the folder moved?)`);
  return (id) => files.filter((f) => f === `${id}.test.ts` || (f.startsWith(`${id}-`) && f.endsWith(".test.ts"))).sort();
}
/** One run of the capability's packs through gate B with no claim, held packs skipped, CI's PR values cleared. */
function once(id, skip, data) {
  const gate = process.env.WORKS_SET_GATE ?? join(HERE, "gate-b.mjs");   // the self-check points this at a stand-in
  const env = { ...process.env, QUEUE: "", PR_TITLE: "", PR_BODY: "", KIND: "code", GATE_B_JOBS: "1", GATE_B_SKIP_PACKS: skip.join(","), GATE_B_DATA: data, GATE_B_NO_DIFF: "1" };
  // 19 minutes an attempt, so a run and its retry fit the job's limit; a hang is red, never a pass.
  const r = spawnSync(process.execPath, [gate, "--title", id, "--kind", "code"], { cwd: S, env, encoding: "utf8", maxBuffer: 64 << 20, timeout: 1_140_000, killSignal: "SIGKILL" });
  return { status: r.status ?? (r.error ? 124 : 1), out: (r.stdout ?? "") + (r.stderr ?? "") + (r.error ? `\n(stopped: ${r.error.message})` : "") };
}
/** One pooled gate-b run (D5): the rows' packs on its job slots, each row on its data, held packs skipped; the results
 *  come back from GATE_B_RESULTS as { file → line }. */
async function pooledOnce(ids, dataOf, skip, attempt) {
  const gate = process.env.WORKS_SET_GATE ?? join(HERE, "gate-b.mjs");
  const T = mkdtempSync(join(tmpdir(), "works-pool-")), res = join(T, "results.jsonl");
  // Each attempt its own copy names and ports (a killed first attempt may leave its copies up until their ttl), and
  // NOT TESTED as a warning: the pool gives the verdict (fixture only counts as run, as in --run).
  const env = { ...process.env, QUEUE: "", PR_TITLE: "", PR_BODY: "", KIND: "code", GATE_B_JOBS: process.env.GATE_B_JOBS ?? "3", GATE_B_SKIP_PACKS: skip.join(","),
    GATE_B_DATA: "six", GATE_B_DATA_OF: ids.map((id) => `${id}=${dataOf(id)}`).join(" "), GATE_B_RESULTS: res, GATE_B_NOT_TESTED: "warn", GATE_B_NO_DIFF: "1",
    GATE_B_NAME: `pool${attempt}s`, GATE_B_PORT: String(4590 + 10 * attempt) };
  // 35 minutes a pooled attempt (two attempts and the set-up fit the job's 90): a hang is red, never a pass; the whole
  // process group is stopped (gate B, its packs and their servers), not only gate B.
  const r = await new Promise((done) => {
    const c = spawn(process.execPath, [gate, "--title", ids.join(" "), "--kind", "code"], { cwd: S, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", stopped = false;
    const t = setTimeout(() => { stopped = true; try { process.kill(-c.pid, "SIGKILL"); } catch { c.kill("SIGKILL"); } }, Number(process.env.WORKS_POOL_MS ?? 2_100_000));
    c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (out += d));
    c.on("error", (e) => { clearTimeout(t); done({ status: 127, out: out + e.message }); });
    c.on("close", (code) => { clearTimeout(t); done({ status: stopped ? 124 : code ?? 1, out: out + (stopped ? "\n(stopped: the pooled attempt ran out of time)" : "") }); });
  });
  const lines = new Map();
  if (existsSync(res)) for (const l of readFileSync(res, "utf8").split("\n").filter(Boolean)) { try { const j = JSON.parse(l); lines.set(j.file, j); } catch { /* a torn line reports as not run */ } }
  rmSync(T, { recursive: true, force: true });
  return { ...r, lines };
}
/** Each row's verdict from one pooled run: "green", "untested" (every pack it ran loaded no demo data: fixture only or no
 *  server), "red" (a pack red, or missing: renamed, deleted or not reported), or "infra" (the gate could not run it). */
export function poolVerdicts(expected, lines, status = 1) {
  const out = new Map(), crashed = lines.size === 0 && status !== 0 && status !== 1;   // the gate ran no pack at all
  if (crashed) { for (const [id, files] of expected) out.set(id, { v: "infra", why: [`the gate ran no pack (exit ${status})`], where: files.map((f) => `${f} ?`) }); return out; }
  for (const [id, files] of expected) {
    const got = files.map((f) => lines.get(f));
    const why = files.map((f, i) => (!got[i] ? `${f} did not report (missing at the head, renamed, or the gate ran no pack)` : got[i].ok ? null : `${f}: ${got[i].why}`)).filter(Boolean);
    const v = why.length ? (got.every((g) => !g || g.infra || g.ok) && got.some((g) => g?.infra) ? "infra" : "red") : got.some((g) => g.load === null) ? "untested" : "green";
    out.set(id, { v, why, where: files.map((f, i) => `${f} ${got[i]?.where ?? "?"}`) });
  }
  return out;
}
const esc = (f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The packs the base names that a run did not run on the data asked for (each pack gate B runs prints "<file> on the
 *  six", "<file> on the checkpoint" or "<file> fixture only" with its exit; a pack whose run line has setup steps runs
 *  on its own fixture whatever the data). A pack that ran on the other demo data did not run (B77 break m1). */
export const notRun = (expected, out, data = "six") => expected.filter((f) => !new RegExp(`^\\s*${esc(f)} (on the ${data}|fixture only)`, "m").test(out));
/** Where each pack ran, as gate B says it: "on the six", "on the checkpoint" or "fixture only". */
const ranWhere = (files, out) => files.map((f) => `${f} ${new RegExp(`^\\s*${esc(f)} (on the six|on the checkpoint|fixture only)`, "m").exec(out)?.[1] ?? "?"}`);

async function main(argv) {
  // In --json mode stdout is only the array (CI writes it to GITHUB_OUTPUT): every other line goes to stderr (round 3 M1).
  const say = (s) => { (opt.json ? console.error : console.log)(s); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n"); };
  const opt = { list: false, json: false, run: null, pool: null, groups: 0, milestone: "M2", file: null, held: null, data: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { if (argv[i + 1] === undefined) throw new Error(`${a} wants a value`); return argv[++i]; };
    if (a === "--list") opt.list = true; else if (a === "--json") opt.json = opt.list = true; else if (a === "--run") opt.run = v();
    else if (a === "--pool") opt.pool = v(); else if (a === "--groups") { opt.groups = Number(v()); opt.json = opt.list = true; if (!Number.isInteger(opt.groups) || opt.groups < 1 || opt.groups > 20) throw new Error("--groups wants 1 to 20"); }
    else if (a === "--milestone") opt.milestone = v(); else if (a === "--file") opt.file = v(); else if (a === "--held") opt.held = v(); else if (a === "--data") opt.data = v(); else throw new Error(`unknown option ${a}`);
  }
  // The hold file must exist (it may hold nothing): until qa's notes PR has put it on the base, the set cannot start (B1).
  let holdText;
  try { holdText = opt.held ? readFileSync(opt.held, "utf8") : atBase(HELD); }
  catch (e) {
    const missing = /ENOENT|exists on disk, but not in|does not exist in/.test(e.message);
    throw new Error(`${opt.held ?? relative(top(), HELD)} is not readable${baseOf() ? ` at the base ${baseOf()}` : ""}${missing ? ": qa's notes PR with it must land first" : ""} (${e.message.split("\n")[0]})`);
  }
  const hold = held(holdText), packs = basePacks();
  for (const l of hold.bad) say(`  hold line not read (it holds nothing): "${l}" — write "<C…> red on main, run <id> (or QA-n)" or the same with "<C…-name.test.ts>"`);
  const dat = dataRows(opt.data ? readFileSync(opt.data, "utf8") : atBase(DATA, true));
  for (const l of dat.bad) say(`  data line not read (that row runs on the six): "${l}" — write "<C…> checkpoint <reason with a run id, QA-n or P-n>"`);
  const dataOfRow = (id) => dat.data.get(id)?.data ?? "six";
  if (opt.run) {
    if (!/^C\d{1,2}\.\d{1,2}$/.test(opt.run)) throw new Error(`not a capability id: "${opt.run}" (want e.g. C11.13)`);
    const all = packs(opt.run), skip = hold.caps.has(opt.run) ? all : all.filter((f) => hold.packs.has(f)), expected = all.filter((f) => !skip.includes(f));
    if (!expected.length) { say(`**${opt.run}**: ${all.length ? "every pack is held" : "no acceptance pack on the base"}; nothing to run.`); return all.length ? 0 : 2; }
    const data = dataOfRow(opt.run);
    let lastOut = "";
    const attempt = () => { const r = once(opt.run, skip, data), miss = notRun(expected, r.out, data); lastOut = r.out; process.stdout.write(r.out); return miss.length ? { status: 1, why: `did not run ${miss.join(", ")} (missing at the head, renamed, or the gate ran no pack)` } : { status: r.status, why: `exit ${r.status}` }; };
    const first = attempt();
    // Say where each pack really ran: a pack with setup steps runs on its fixture, never on the data asked for (break M2).
    if (first.status === 0) { say(`**${opt.run}**: green (${ranWhere(expected, lastOut).join(", ")}${skip.length ? `; held: ${skip.join(", ")}` : ""}).`); return 0; }
    say(`**${opt.run}**: red on the first run, asked for the ${data} (${first.why}); running it once more (a flaky pack is retried once).`);
    const again = attempt();
    if (again.status === 0) { say(`**${opt.run}**: green on the retry — flaky (first run: ${first.why}).`); return 0; }
    say(`**${opt.run}**: red twice (${first.why}, then ${again.why}): this batch would take away a Works row.`);
    return again.status === 2 && first.status === 2 ? 2 : 1;
  }
  const md = opt.file ? readFileSync(opt.file, "utf8") : atBase(CAPS);
  const scoring = (id) => scoringData(id, md, dat.data), from = (id) => scoringOf(id, md, dat.data).from;
  if (opt.pool) {
    const ids = [...new Set(opt.pool.split(/[\s,]+/).filter(Boolean))];
    for (const id of ids) if (!/^C\d{1,2}\.\d{1,2}$/.test(id)) throw new Error(`not a capability id: "${id}" (want e.g. C11.13)`);
    if (!ids.length) throw new Error("--pool names no capability");
    const expected = new Map(), heldOut = [], noPack = [];
    for (const id of ids) {
      const all = packs(id), live = all.filter((f) => !hold.caps.has(id) && !hold.packs.has(f));
      if (!all.length) noPack.push(id); else if (!live.length) heldOut.push(id); else expected.set(id, live);
      for (const f of all.filter((f) => !live.includes(f))) heldOut.push(f);
    }
    const skip = ids.flatMap((id) => packs(id).filter((f) => !(expected.get(id) ?? []).includes(f)));
    say(`**Pooled packs** (D5): ${[...expected.keys()].map((id) => `${id} on the ${scoring(id)} (${from(id)})`).join(", ") || "none"}${heldOut.length ? `; held, not run: ${heldOut.join(", ")}` : ""}${noPack.length ? `; no pack on the base: ${noPack.join(", ")}` : ""}.`);
    if (!expected.size) return noPack.length ? 2 : 0;
    const first = await pooledOnce([...expected.keys()], scoring, skip, 0);
    process.stdout.write(first.out);
    const verdict = poolVerdicts(expected, first.lines, first.status);
    const again = [...verdict].filter(([, x]) => x.v === "red" || x.v === "infra").map(([id]) => id);
    if (again.length) {
      say(`Red on the first run: ${again.map((id) => `${id} (${verdict.get(id).why.join("; ")})`).join(" · ")}; running them once more (a flaky pack is retried once).`);
      const second = await pooledOnce(again, scoring, skip, 1);
      process.stdout.write(second.out);
      const v2 = poolVerdicts(new Map(again.map((id) => [id, expected.get(id)])), second.lines, second.status);
      for (const id of again) { const x = v2.get(id); verdict.set(id, x.v === "green" || x.v === "untested" ? { ...x, flaky: true } : x); }
    }
    const by = (v) => [...verdict].filter(([, x]) => x.v === v);
    for (const [id, x] of verdict) say(`  ${id} (${scoring(id)}): ${x.v === "green" ? (x.flaky ? "green on the retry — flaky" : "green") : x.v === "untested" ? "NOT TESTED on its data" : x.v === "infra" ? "could not run" : "red twice"} — ${x.v === "green" || x.v === "untested" ? x.where.join(", ") : x.why.join("; ")}`);
    for (const [id, x] of by("untested")) console.log(`::warning title=NOT TESTED on its data::${id} ${x.where.join(", ")} (its Works rests on qa's gate A)`);
    say(`Pooled packs: ${by("green").length} green, ${by("untested").length} green on their own fixture only (NOT TESTED on their data), ${by("red").length} red twice, ${by("infra").length} could not run.`);
    if (by("red").length) return 1;
    if (by("infra").length) return 2;
    return 0;
  }
  if (!opt.list) throw new Error("say --list, --json, --groups <n>, --run <C…> or --pool <C…,C…>");
  if (!rows(md).length) throw new Error("qa/CAPABILITIES.md has no capability row the tool can read (never an empty set)");
  const set = protectedSet(md, opt.milestone, packs);
  if (!set.length) throw new Error(`no ${opt.milestone === "all" ? "" : `${opt.milestone} `}row reads as Works (the table's format changed?): could not run, never an empty set`);
  if (!set.some((r) => r.packs.length)) throw new Error("no protected row has an acceptance pack (the pack folder moved?): could not run, never an empty set");
  const live = (r) => r.packs.filter((f) => !hold.caps.has(r.id) && !hold.packs.has(f));
  const runs = set.filter((r) => live(r).length);
  if (opt.groups) {
    const items = runs.map((r) => { const n = live(r).length; return { id: r.id, packs: n, weight: n * (scoring(r.id) === "checkpoint" ? 2 : 1) }; });
    console.log(JSON.stringify(groupsOf(items, opt.groups).map((g) => ({ caps: g.caps.join(","), packs: g.packs, weight: g.weight }))));
    for (const r of runs) say(`  ${r.id} on the ${scoring(r.id)} (${from(r.id)}): ${live(r).join(", ")}`);
    return 0;
  }
  if (opt.json) { console.log(JSON.stringify(runs.map((r) => r.id))); return 0; }
  say(`Protected regression set (${opt.milestone} · Works): ${set.length} capabilities, ${set.filter((r) => r.packs.length).length} with an acceptance pack, ${runs.length} re-run.`);
  for (const r of set) {
    if (!r.packs.length) { say(`  ${r.id}: no acceptance pack (not re-run)`); continue; }
    const h = r.packs.filter((f) => hold.caps.has(r.id) || hold.packs.has(f));
    say(`  ${r.id}${dataOfRow(r.id) === "checkpoint" ? " (on the checkpoint where its pack runs alone)" : ""}: ${live(r).join(", ") || "—"}${h.length ? `; held, not re-run: ${h.map((f) => `${f} (${hold.packs.get(f) ?? hold.caps.get(r.id)})`).join("; ")}` : ""}`);
  }
  const all = new Set(set.flatMap((r) => r.packs));
  for (const id of hold.caps.keys()) if (!set.some((r) => r.id === id && r.packs.length)) say(`  stale hold: ${id} is no longer a protected row with a pack; remove its line`);
  for (const f of hold.packs.keys()) if (!all.has(f)) say(`  stale hold: ${f} is not a pack of a protected row; remove its line`);
  for (const id of dat.data.keys()) if (!set.some((r) => r.id === id && r.packs.length)) say(`  stale data line: ${id} is not a protected row with a pack; remove its line`);
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`works-set could not run: ${e.message}`); process.exit(2); });
}
