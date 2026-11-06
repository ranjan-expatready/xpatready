#!/usr/bin/env node
// Flaky suites (B122, P-376 (8)): reads the retry records run-suites.sh --retry leaves in PR and merge-queue checks
// (artifacts suite-retries-<part>, one per part, uploaded only when a suite was retried), counts them, and applies the
// quarantine rule from tools/flaky-ledger.tsv. Never runs a suite, never calls a model (US$0).
//   node product/tools/flaky.mjs events [--since <ISO>] [--events <tsv>]...    the retry records, one per line
//   node product/tools/flaky.mjs count [--since <ISO>] [--events <tsv>]... [--json]
//        "retries=N passed_on_retry=A failed_twice=B" (daily-numbers.sh reads this line; default: the last 24 h)
//   node product/tools/flaky.mjs quarantine [--now <ISO>] [--events <tsv>]... [--ledger <tsv>]
//        the suites the rule quarantines, one line "suite|owner|fix_by|runs ..." (CI's kind job passes it to every part
//        as SUITES_QUARANTINE_AUTO, so all parts deal the same suites); the reasons on stderr
//   node product/tools/flaky.mjs --self-test
// Without --events, the records come from GitHub's artifacts API (GITHUB_TOKEN or GH_TOKEN, else `gh auth token`;
// curl, so the proxy and the Mac's certificates work as for gh). Only runs of this repository's own branches count:
// a fork's run can upload an artifact, and must not quarantine a suite (head_repository_id is checked).
// A record (tab-separated): time_utc suite outcome exit1 exit2 commit run branch. outcome: "passed on retry" or
// "failed twice". run-suites.sh writes the first six; the artifact's run and branch are added here.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITE = /^check_[A-Za-z0-9_.-]+\.(ts|cjs)$/;
const OUTCOMES = new Set(["passed on retry", "failed twice"]);
const PARTS = 9; // ci.yml allows SHARDS 1..9; the Mac path uploads part 1
const DAY = 86400e3;

export function parseEvents(text, extra = {}) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [time, suite, outcome, exit1 = "", exit2 = "", commit = "", run = extra.run ?? "", branch = extra.branch ?? ""] = line.split("\t");
    const t = Date.parse(time);
    if (!Number.isFinite(t) || !SUITE.test(suite || "") || !OUTCOMES.has(outcome)) continue; // never trust a record blindly
    out.push({ time: new Date(t).toISOString(), t, suite, outcome, exit1, exit2, commit, run: String(extra.run ?? run), branch: String(extra.branch ?? branch) });
  }
  return out;
}
const fmt = (e) => [e.time, e.suite, e.outcome, e.exit1, e.exit2, e.commit, e.run, e.branch].join("\t");

export function parseLedger(text) {
  const L = { window: 7, needs: 2, owners: [], releases: [] };
  for (const raw of text.split("\n")) {
    if (!raw.trim() || raw.startsWith("#")) continue;
    const f = raw.split("\t");
    if (f[0] === "window" && /^[1-9][0-9]*$/.test(f[1])) L.window = Number(f[1]);
    else if (f[0] === "needs" && /^[1-9][0-9]*$/.test(f[1])) L.needs = Number(f[1]);
    else if (f[0] === "owner" && f[1] && /^[a-z0-9_-]+$/.test(f[2] || "")) L.owners.push([globRe(f[1]), f[2]]);
    else if (f[0] === "release" && SUITE.test(f[1] || "") && Number.isFinite(Date.parse(f[2]))) L.releases.push([f[1], Date.parse(f[2])]);
    else throw new Error(`flaky-ledger.tsv: cannot read the line "${raw}"`);
  }
  return L;
}
const globRe = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
const ownerOf = (L, suite) => (L.owners.find(([re]) => re.test(suite)) || [null, "tech-lead"])[1];

// The rule: within the window before `now`, a suite with passes-on-retry from at least `needs` different branches
// (a builder's own branch cannot quarantine a suite for everyone) and none before its newest release line.
export function quarantine(events, L, now) {
  const from = now - L.window * DAY, by = new Map();
  for (const e of events) {
    if (e.outcome !== "passed on retry" || e.t < from || e.t > now) continue;
    const rel = Math.max(-Infinity, ...L.releases.filter(([s]) => s === e.suite).map(([, d]) => d));
    if (e.t < rel) continue;
    if (!by.has(e.suite)) by.set(e.suite, []);
    by.get(e.suite).push(e);
  }
  const out = [];
  for (const [suite, es] of [...by].sort(([a], [b]) => a.localeCompare(b))) {
    const branches = new Set(es.map((e) => e.branch || `run ${e.run}`));
    if (branches.size < L.needs) continue;
    const last = Math.max(...es.map((e) => e.t));
    out.push({ suite, owner: ownerOf(L, suite), fixBy: new Date(last + L.window * DAY).toISOString().slice(0, 10),
      runs: [...new Set(es.map((e) => e.run).filter(Boolean))].sort(), count: es.length, branches: branches.size });
  }
  return out;
}
export const quarantineLine = (q) => q.map((x) => `${x.suite}|${x.owner}|${x.fixBy}|${x.runs.join(",") || "-"}`).join(" ");

export function count(events, since, until = Infinity) {
  const es = events.filter((e) => e.t >= since && e.t <= until);
  return { retries: es.length, passed_on_retry: es.filter((e) => e.outcome === "passed on retry").length,
    failed_twice: es.filter((e) => e.outcome === "failed twice").length };
}

// Which artifacts count: this repository's own runs, not expired, recent enough, named for a part.
export function wanted(art, repoId, since) {
  const wr = art.workflow_run || {};
  return /^suite-retries-[1-9]$/.test(art.name || "") && !art.expired && Date.parse(art.created_at) >= since &&
    wr.repository_id === repoId && wr.head_repository_id === repoId;
}

function token() {
  const t = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (t) return t;
  try { return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim(); } catch { throw new Error("no GitHub token (GITHUB_TOKEN, GH_TOKEN or gh auth token)"); }
}
function repoName() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const u = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const m = u.match(/github\.com[:/]([^/]+\/[^/.]+?)(\.git)?$/) || u.match(/\/git\/([^/]+\/[^/.]+?)(\.git)?$/);
  if (!m) throw new Error(`cannot tell the repository from origin ${u}; set GITHUB_REPOSITORY`);
  return m[1];
}
function curl(url, tok, out) {
  // The token goes in on stdin (-H @-), never on the command line; -L follows the download redirect, and curl does not
  // send the Authorization header on to the other host.
  const args = ["-fsSL", "--retry", "2", "-H", "@-", "-H", "Accept: application/vnd.github+json", url];
  if (out) args.splice(0, 0, "-o", out);
  return execFileSync("curl", args, { input: `Authorization: Bearer ${tok}\n`, encoding: out ? undefined : "utf8", maxBuffer: 64 << 20 });
}
function fetchEvents(since) {
  const tok = token(), repo = repoName(), api = process.env.GITHUB_API_URL || "https://api.github.com";
  const repoId = JSON.parse(curl(`${api}/repos/${repo}`, tok)).id;
  const dir = mkdtempSync(join(tmpdir(), "flaky-")), events = [];
  try {
    for (let part = 1; part <= PARTS; part++) {
      for (let page = 1; page <= 10; page++) {
        const r = JSON.parse(curl(`${api}/repos/${repo}/actions/artifacts?name=suite-retries-${part}&per_page=100&page=${page}`, tok));
        const arts = r.artifacts || [];
        for (const a of arts.filter((a) => wanted(a, repoId, since))) {
          const zip = join(dir, `${a.id}.zip`);
          curl(a.archive_download_url, tok, zip);
          const text = execFileSync("unzip", ["-p", zip, "retries.tsv"], { encoding: "utf8" });
          events.push(...parseEvents(text, { run: a.workflow_run.id, branch: a.workflow_run.head_branch || "" }));
        }
        // Newest first: stop at the first page that reaches back past `since`, or the last page.
        if (arts.length < 100 || arts.some((a) => Date.parse(a.created_at) < since)) break;
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return events.sort((a, b) => a.t - b.t);
}

function args(argv) {
  const o = { events: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (["--since", "--now", "--ledger"].includes(a) && argv[i + 1] !== undefined) o[a.slice(2)] = argv[++i];
    else if (a === "--events" && argv[i + 1] !== undefined) o.events.push(argv[++i]);
    else throw new Error(`unknown or incomplete option ${a}`);
  }
  for (const k of ["since", "now"]) if (o[k] !== undefined && !Number.isFinite(Date.parse(o[k]))) throw new Error(`--${k} wants a date, got ${o[k]}`);
  return o;
}
const load = (o, since) => o.events.length ? o.events.flatMap((f) => parseEvents(readFileSync(f, "utf8"))) : fetchEvents(since);

function selfTest() {
  let pass = 0, fail = 0;
  const ok = (name, cond, got) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name} — got ${JSON.stringify(got)}`); } };
  const repoId = 7, since = Date.parse("2026-11-01T00:00:00Z");
  const art = (o) => ({ name: "suite-retries-2", expired: false, created_at: "2026-11-05T10:00:00Z", workflow_run: { id: 1, repository_id: 7, head_repository_id: 7, head_branch: "b" }, ...o });
  ok("B122: an artifact from this repository's own run counts", wanted(art({}), repoId, since), art({}));
  ok("B122: a fork's artifact never counts (a fork could otherwise quarantine a suite)", !wanted(art({ workflow_run: { id: 1, repository_id: 7, head_repository_id: 99 } }), repoId, since), "counted");
  ok("B122: an expired artifact does not count", !wanted(art({ expired: true }), repoId, since), "counted");
  ok("B122: an artifact older than the window does not count", !wanted(art({ created_at: "2026-10-20T00:00:00Z" }), repoId, since), "counted");
  ok("B122: only suite-retries-<1..9> artifacts count", !wanted(art({ name: "suite-logs-shard-2" }), repoId, since) && !wanted(art({ name: "suite-retries-12" }), repoId, since), "counted");
  const bad = parseEvents("2026-11-05T10:00:00Z\t../../etc/passwd\tpassed on retry\n2026-11-05T10:00:00Z\tcheck_a.ts\tmaybe\nnot-a-date\tcheck_a.ts\tpassed on retry\n");
  ok("B122: a record with a bad suite name, outcome or time is dropped", bad.length === 0, bad);
  try { parseLedger("owner\tcheck_x\n"); ok("B122: a ledger line it cannot read stops loudly", false, "accepted"); }
  catch { ok("B122: a ledger line it cannot read stops loudly", true); }
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--self-test") return selfTest();
  const o = args(rest), now = o.now ? Date.parse(o.now) : Date.now();
  if (cmd === "events") {
    const since = o.since ? Date.parse(o.since) : now - 7 * DAY;
    for (const e of load(o, since)) if (e.t >= since) console.log(fmt(e));
  } else if (cmd === "count") {
    const since = o.since ? Date.parse(o.since) : now - DAY;
    const c = count(load(o, since), since, now);
    console.log(o.json ? JSON.stringify(c) : `retries=${c.retries} passed_on_retry=${c.passed_on_retry} failed_twice=${c.failed_twice}`);
  } else if (cmd === "quarantine") {
    const L = parseLedger(readFileSync(o.ledger || join(HERE, "flaky-ledger.tsv"), "utf8"));
    const q = quarantine(load(o, now - L.window * DAY), L, now);
    for (const x of q) console.error(`quarantined: ${x.suite} passed only on retry ${x.count} times on ${x.branches} branches in ${L.window} days (runs ${x.runs.join(", ")}); owner ${x.owner}; fix by ${x.fixBy}`);
    if (!q.length) console.error(`no suite passed only on retry on ${L.needs}+ branches in the last ${L.window} days`);
    console.log(quarantineLine(q));
  } else {
    console.error("usage: flaky.mjs events|count|quarantine [--since <ISO>] [--now <ISO>] [--events <tsv>]... [--ledger <tsv>] [--json] | --self-test");
    process.exit(2);
  }
}
main().catch((e) => { console.error(`flaky.mjs: ${e.message}`); process.exit(2); });
