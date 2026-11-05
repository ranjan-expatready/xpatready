#!/usr/bin/env node
// CI memory (P-371 (3), 6 Nov): a pull request's check remembers which suites passed, so a later run of the SAME pull
// request on the SAME base re-runs only the suites its new changes can affect. The merge queue and the nightly run never
// use it: they run their full sets as before. Files, not a database: each shard of a PR run uploads its results as an
// artifact "memory-s<shard>-a<attempt>" and the ci job its verdict as "memory-verdict-a<attempt>"; the next run's "kind"
// job downloads the artifacts of the PR's earlier runs (gh run download) and asks this tool what may be skipped.
//   record   --suites <run-suites.sh table> --base <sha> --head <sha> --run <id> --attempt <n> --out <file>
//            the suites that passed (PASS, or remembered again) at this head on this base
//   verdict  --verdict success|failure --base <sha> --head <sha> --run <id> --attempt <n> --out <file>
//   verdict-of --dir <downloads> --base <sha> --head <sha>
//            the newest verdict recorded for exactly this head on this base: "success <run>", "failure <run>" or nothing
//   reuse    --dir <downloads> --base <sha> --head <sha>
//            "<suite>\t<why>" per suite that passed at an earlier head Hk on this base, where the files changed from Hk
//            to this head choose none of it (select-suites.mjs, its full rules: a shared file, the lockfile, ci.yml or a
//            suite tool chooses everything, so nothing is remembered). The smoke set added to every choice does not
//            count as chosen: a smoke suite whose inputs did not change is remembered like any other. The three runtime
//            R1 suites share one copy: remembered only all together. Any doubt (no git diff, no memory) remembers nothing.
//   --self-test  the rules above on made-up memories (no git, no network)
// Reads files and git only; US$0.
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNTIME_GROUP = ["check_runtime_r1a.ts", "check_runtime_r1c.cjs", "check_runtime_r1d.ts"];
const SUITE = /^check_[A-Za-z0-9_.-]+\.(ts|cjs)$/;
const SHA = /^[0-9a-f]{40}$/;

const arg = (name, args = process.argv) => { const i = args.indexOf(`--${name}`); return i > 0 ? args[i + 1] : undefined; };
const need = (name, re) => { const v = arg(name); if (!v || (re && !re.test(v))) { console.error(`ci-memory: --${name} missing or malformed`); process.exit(2); } return v; };

// A run-suites.sh summary table → the suites that passed or were remembered again.
export function passed(table) {
  const out = [];
  for (const line of table.split("\n")) {
    const m = /^\| (check_[^ |]+) \| (PASS|remembered) \|/.exec(line);
    if (m && SUITE.test(m[1])) out.push(m[1]);
  }
  return [...new Set(out)];
}

export function parse(text) {
  const m = { base: "", head: "", run: 0, attempt: 0, verdict: "", suites: [] };
  for (const line of text.split("\n")) {
    let x;
    if ((x = /^#base ([0-9a-f]{40})$/.exec(line))) m.base = x[1];
    else if ((x = /^#head ([0-9a-f]{40})$/.exec(line))) m.head = x[1];
    else if ((x = /^#run (\d+) (\d+)$/.exec(line))) { m.run = Number(x[1]); m.attempt = Number(x[2]); }
    else if ((x = /^#verdict (success|failure)$/.exec(line))) m.verdict = x[1];
    else if ((x = /^(check_[^\t]+)\tPASS$/.exec(line)) && SUITE.test(x[1])) m.suites.push(x[1]);
  }
  return m.base && m.head ? m : null;
}

const files = (d) => !existsSync(d) ? [] : readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? files(p) : /\.tsv$/.test(n) ? [p] : []; });
const load = (dir) => files(dir).map((f) => parse(readFileSync(f, "utf8"))).filter(Boolean);

export function verdictOf(memories, base, head) {
  const v = memories.filter((m) => m.verdict && m.base === base && m.head === head).sort((a, b) => b.run - a.run || b.attempt - a.attempt);
  return v.length ? `${v[0].verdict} ${v[0].run}` : "";
}

// diff(hk) → changed paths or null (unknown); choose(paths) → { all: bool, names: Set } from select-suites.mjs.
export function reuse(memories, base, head, diff, choose) {
  const byHead = new Map();
  for (const m of memories) {
    if (m.verdict || m.base !== base) continue;
    const e = byHead.get(m.head) ?? { run: 0, suites: new Set() };
    m.suites.forEach((s) => e.suites.add(s)); e.run = Math.max(e.run, m.run); byHead.set(m.head, e);
  }
  const out = new Map();
  for (const [hk, e] of [...byHead].sort((a, b) => a[1].run - b[1].run)) {
    const changed = hk === head ? [] : diff(hk);
    if (changed === null) continue;
    const c = changed.length ? choose(changed) : { all: false, names: new Set() };
    if (c.all) continue;
    for (const s of e.suites) if (!c.names.has(s)) out.set(s, `green on ${hk.slice(0, 12)} (run ${e.run}), same base; ${changed.length} files changed since, none it depends on`);
  }
  if (!RUNTIME_GROUP.every((s) => out.has(s))) RUNTIME_GROUP.forEach((s) => out.delete(s));
  return out;
}

const gitDiff = (hk, head) => {
  try { return execFileSync("git", ["-c", "core.quotePath=false", "diff", "--no-renames", "--name-only", hk, head], { encoding: "utf8" }).split("\n").filter(Boolean); }
  catch { return null; }
};
const selectSuites = (paths) => {
  const out = execFileSync("node", [join(HERE, "select-suites.mjs")], { input: paths.join("\n") + "\n", encoding: "utf8" });
  const lines = out.split("\n").filter(Boolean).map((l) => l.split("\t"));
  if (lines.length && lines[0][0] === "ALL") return { all: true, names: new Set() };
  return { all: false, names: new Set(lines.filter(([, why]) => why !== "smoke").map(([n]) => n)) };
};

function selfTest() {
  let bad = 0;
  const ok = (what, cond, got) => { console.log(`${cond ? "PASS" : "FAIL"}  ${what}${cond ? "" : ` — got ${JSON.stringify(got)}`}`); if (!cond) bad++; };
  const B = "b".repeat(40), B2 = "c".repeat(40), H1 = "1".repeat(40), H2 = "2".repeat(40), H3 = "3".repeat(40);
  const mem = (head, suites, run = 10, base = B, verdict = "") => ({ base, head, run, attempt: 1, verdict, suites });
  const none = () => ({ all: false, names: new Set() });
  const diffOf = (map) => (hk) => (hk in map ? map[hk] : null);
  const T = mkdtempSync(join(tmpdir(), "ci-memory-"));
  const table = "| Suite | Result | Time | Last line |\n|---|---|---|---|\n| check_a.ts | PASS | 3 s | 4 passed |\n| check_b.cjs | FAIL | 9 s | exit 1: FAIL x |\n| check_c.ts | remembered | | green on 111 |\n| check_q.ts | quarantined | | fails at random |\n| (none) | PASS | | 0 units |";
  ok("a run's table: PASS and remembered rows are kept; FAIL, quarantined and (none) are not", JSON.stringify(passed(table)) === JSON.stringify(["check_a.ts", "check_c.ts"]), passed(table));
  writeFileSync(join(T, "m.tsv"), `#ci-memory 1\n#base ${B}\n#head ${H1}\n#run 7 2\ncheck_a.ts\tPASS\nnot a suite\tPASS\n`);
  const [m1] = load(T);
  ok("a memory file reads back its base, head, run and suites; junk lines are ignored", m1 && m1.run === 7 && m1.attempt === 2 && JSON.stringify(m1.suites) === '["check_a.ts"]', m1);
  ok("same head, same base: every green suite is remembered", reuse([mem(H2, ["check_a.ts", "check_b.ts"])], B, H2, diffOf({}), none).size === 2);
  ok("another base: nothing is remembered", reuse([mem(H1, ["check_a.ts"], 10, B2)], B, H2, diffOf({ [H1]: ["x.md"] }), none).size === 0);
  ok("the new files choose a suite: that suite runs again, the others are remembered",
    (() => { const r = reuse([mem(H1, ["check_a.ts", "check_b.ts"])], B, H2, diffOf({ [H1]: ["api/src/b.ts"] }), () => ({ all: false, names: new Set(["check_b.ts"]) })); return r.has("check_a.ts") && !r.has("check_b.ts"); })());
  ok("the new files choose everything (a shared file, the lockfile, ci.yml): nothing is remembered",
    reuse([mem(H1, ["check_a.ts"])], B, H2, diffOf({ [H1]: ["package-lock.json"] }), () => ({ all: true, names: new Set() })).size === 0);
  ok("no git diff from the earlier head (a force-push removed it): nothing is remembered", reuse([mem(H1, ["check_a.ts"])], B, H2, diffOf({}), none).size === 0);
  ok("a suite that failed is never remembered (only PASS rows are written)", !reuse([mem(H1, ["check_a.ts"])], B, H2, diffOf({ [H1]: [] }), none).has("check_b.ts"));
  ok("the runtime R1 suites are remembered only all three together",
    (() => { const r1 = reuse([mem(H1, ["check_runtime_r1a.ts", "check_runtime_r1c.cjs"])], B, H2, diffOf({ [H1]: [] }), none);
      const r3 = reuse([mem(H1, RUNTIME_GROUP)], B, H2, diffOf({ [H1]: [] }), none); return r1.size === 0 && r3.size === 3; })());
  ok("two earlier heads: a suite green at either and unchanged since is remembered",
    (() => { const r = reuse([mem(H1, ["check_a.ts"], 5), mem(H3, ["check_b.ts"], 9)], B, H2, diffOf({ [H1]: ["a"], [H3]: ["b"] }), none); return r.has("check_a.ts") && r.has("check_b.ts"); })());
  ok("verdict files never count as suite memories", reuse([mem(H1, ["check_a.ts"], 10, B, "success")], B, H2, diffOf({ [H1]: [] }), none).size === 0);
  ok("verdict-of: the newest verdict for exactly this head and base", verdictOf([mem(H2, [], 5, B, "failure"), mem(H2, [], 9, B, "success"), mem(H2, [], 12, B2, "failure")], B, H2) === "success 9");
  ok("verdict-of: nothing for another head", verdictOf([mem(H1, [], 5, B, "success")], B, H2) === "");
  ok("select-suites.mjs: the smoke set added to every choice does not block memory", (() => { const c = selectSuites(["ai-workers/problem-1-pathway-setup-and-form-filling/product/STATE.md"]); return !c.all && c.names.size === 0; })());
  ok("select-suites.mjs: the lockfile chooses everything", selectSuites(["ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/package-lock.json"]).all);
  ok("select-suites.mjs: this tool itself chooses everything", selectSuites(["ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/ci-memory.mjs"]).all);
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
}

const cmd = process.argv[2];
if (cmd === "--self-test") selfTest();
else if (cmd === "record") {
  const base = need("base", SHA), head = need("head", SHA), run = need("run", /^\d+$/), attempt = need("attempt", /^\d+$/), out = need("out");
  const s = passed(readFileSync(need("suites"), "utf8"));
  writeFileSync(out, [`#ci-memory 1`, `#base ${base}`, `#head ${head}`, `#run ${run} ${attempt}`, ...s.map((x) => `${x}\tPASS`)].join("\n") + "\n");
  console.log(`remembered ${s.length} green suites at ${head.slice(0, 12)} on base ${base.slice(0, 12)}`);
} else if (cmd === "verdict") {
  const v = need("verdict", /^(success|failure)$/), base = need("base", SHA), head = need("head", SHA), run = need("run", /^\d+$/), attempt = need("attempt", /^\d+$/);
  writeFileSync(need("out"), `#ci-memory 1\n#base ${base}\n#head ${head}\n#run ${run} ${attempt}\n#verdict ${v}\n`);
} else if (cmd === "verdict-of") {
  const v = verdictOf(load(need("dir")), need("base", SHA), need("head", SHA)); if (v) console.log(v);
} else if (cmd === "reuse") {
  const head = need("head", SHA);
  const r = reuse(load(need("dir")), need("base", SHA), head, (hk) => gitDiff(hk, head), selectSuites);
  for (const [s, why] of [...r].sort()) console.log(`${s}\t${why}`);
} else {
  console.error("usage: ci-memory.mjs record|verdict|verdict-of|reuse ... | --self-test"); process.exit(2);
}
