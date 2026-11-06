#!/usr/bin/env node
// Flaky suites (B122, P-376 (8)): reads the retry records run-suites.sh --retry leaves in PR and merge-queue checks
// (artifacts suite-retries-<part>, one per part, uploaded only when a suite was retried), counts them, and applies the
// quarantine rule from tools/flaky-ledger.tsv. Never runs a suite, never calls a model (US$0).
//   node product/tools/flaky.mjs events [--since <ISO>] [--events <tsv>]...    the retry records, one per line
//   node product/tools/flaky.mjs count [--since <ISO>] [--events <tsv>]... [--json]
//        "retries=N passed_on_retry=A failed_twice=B" (daily-numbers.sh reads this line; default: the last 24 h)
//   node product/tools/flaky.mjs quarantine [--now <ISO>] [--events <tsv>]... [--ledger <tsv>] [--parts <1..9>]
//        the suites the rule quarantines, one line "suite|owner|fix_by|runs ..." (CI's kind job passes it to every part
//        as SUITES_QUARANTINE_AUTO, so all parts deal the same suites); the reasons on stderr
//   node product/tools/flaky.mjs report --events <retries.tsv> --logs <dir> [--part <1..9>] [--ledger <tsv>]
//        F5 (founder 6 Nov): a pass on retry is never silent. One qa/BUGS.md-style bug line per suite that passed only on
//        retry, with its 1st try's log tail (<dir>/<suite>.try1.log); run-suites.sh --retry prints it into the job
//        summary and writes it to retry-bugs.md. Prints nothing when no suite passed on retry.
//   node product/tools/flaky.mjs comment --body <file> --pr <n> [--queue]
//        posts that report as a PR comment: on the PR itself, or, for a merge-queue batch (--queue, the batch body in
//        PR_BODY), on each PR of the batch (Mergify's "pull_requests:" metadata), with a line naming the batch. The batch
//        may still merge; the comment is how a race found this way reaches its PR. CI runs it with continue-on-error.
//   node product/tools/flaky.mjs --self-test
// Without --events, the records come from GitHub's artifacts API (GITHUB_TOKEN or GH_TOKEN, else `gh auth token`;
// curl, so the proxy and the Mac's certificates work as for gh). Only runs of this repository's own branches count:
// a fork's run can upload an artifact, and must not quarantine a suite (head_repository_id is checked).
// A record (tab-separated): time_utc suite outcome exit1 exit2 commit run branch. outcome: "passed on retry" or
// "failed twice". run-suites.sh writes the first six; the artifact's run and branch are added here.
// Every API failure fails open: quarantine and count exit 2 (CI's step is continue-on-error and says "no automatic
// quarantine this run"); comment exits 2 (CI's step is continue-on-error; the job summary still carries the bug line).
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITE = /^check_[A-Za-z0-9_.-]+\.(ts|cjs)$/;
const OUTCOMES = new Set(["passed on retry", "failed twice"]);
const PARTS = 9; // ci.yml allows SHARDS 1..9 (--parts: only the first n, one list call each); the Mac path uploads part 1
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

// The rule (P-376 (8)): a suite that passed only on retry in `needs` different check runs within `window` days is
// quarantined until its fix date, the newest of those retries + `window` days. It is held to that date even after
// the older retry leaves the window: a quarantined suite is skipped in PR and queue checks, so it adds no records to
// keep itself in (review M1). Retries before the suite's newest release line (a fix landed) never count.
export function quarantine(events, L, now) {
  const W = L.window * DAY, by = new Map();
  for (const e of events) {
    if (e.outcome !== "passed on retry" || e.t > now || e.t <= now - 2 * W) continue;
    const rel = Math.max(-Infinity, ...L.releases.filter(([s]) => s === e.suite).map(([, d]) => d));
    if (e.t < rel) continue;
    if (!by.has(e.suite)) by.set(e.suite, []);
    by.get(e.suite).push(e);
  }
  const out = [];
  for (const [suite, es] of [...by].sort(([a], [b]) => a.localeCompare(b))) {
    es.sort((a, b) => b.t - a.t);
    // The newest retry whose own window holds `needs` different runs, and whose fix date is still ahead.
    for (const last of es) {
      if (last.t + W <= now) break;
      const group = es.filter((e) => e.t <= last.t && e.t > last.t - W);
      const runs = new Set(group.map((e) => e.run || `${e.time} ${e.branch}`));
      if (runs.size < L.needs) continue;
      out.push({ suite, owner: ownerOf(L, suite), fixBy: new Date(last.t + W).toISOString().slice(0, 10),
        runs: [...new Set(group.map((e) => e.run).filter(Boolean))].sort(), count: group.length, branches: new Set(group.map((e) => e.branch)).size });
      break;
    }
  }
  return out;
}
// F5: the bug line for a suite that passed only on retry, in qa/BUGS.md's columns (# · Type · Severity · Capability ·
// Req./decision · Found · last seen · What happens · Lane · Status), for qa to rate and number. A race or an order fault
// until shown otherwise: the outside review of 6 Nov found a source-trust race that a retry would have turned green.
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;
export function firstReason(log) {
  const ls = log.replace(ANSI, "").split("\n");
  const l = ls.find((x) => /^(FAIL|STOP)/.test(x)) || ls.find((x) => /Error: /.test(x)) || ls.find((x) => /Error/.test(x)) || "";
  return l.slice(0, 120);
}
const cell = (t) => String(t).replace(/\|/g, "/").replace(/[\r\n]+/g, " ").trim();
export function tail(log, n = 40, width = 300) {
  const lines = log.replace(ANSI, "").replace(/\s+$/, "").split("\n").slice(-n).map((l) => (l.length > width ? l.slice(0, width) + " …" : l));
  const ticks = Math.max(2, ...(lines.join("\n").match(/`+/g) || [""]).map((m) => m.length)) + 1; // a fence the log cannot close
  return "`".repeat(ticks) + "text\n" + lines.join("\n") + "\n" + "`".repeat(ticks);
}
export function report(events, logs, L, { part = "", runUrl = "" } = {}) {
  const passed = events.filter((e) => e.outcome === "passed on retry");
  if (!passed.length) return "";
  const where = `artifact \`suite-retries-${part || "<part>"}\`${runUrl ? ` of [this run](${runUrl})` : ""}`;
  const out = [
    `**Passed only on retry: a possible race, never silent (B122, F5).** This check stays green and a merge-queue batch may still merge, but each suite below failed its 1st try. Treat it as a race or an order fault until shown otherwise: qa rates each line and gives it a number in \`qa/BUGS.md\`. The 1st try's full log and \`api.log\` are in ${where}.`,
    "",
    "| # | Type · Severity | Capability · Req./decision | Found · last seen | What happens (short) | Lane | Status |",
    "|---|---|---|---|---|---|---|",
  ];
  const tails = [];
  for (const e of passed) {
    const f = join(logs, e.suite.replace(/\.[^.]+$/, "") + ".try1.log");
    const log = existsSync(f) ? readFileSync(f, "utf8") : "";
    const why = log ? firstReason(log) : "its 1st try's log is missing";
    out.push(`| QA-? | Bug · Major (proposed; CI retry, B122 F5) | \`${e.suite}\` · P-376 (8), F5 | commit ${cell(e.commit || "?")}${runUrl ? `, [run](${runUrl})` : ""} · ${e.time.slice(0, 16)}Z | \`${e.suite}\` failed its 1st try (exit ${cell(e.exit1)}: ${cell(why) || "no FAIL line"}) and passed on retry. A race or order fault until shown otherwise | ${ownerOf(L, e.suite)} | Open: qa rates it |`);
    tails.push("", `<details><summary>${e.suite}: 1st try, last 40 lines</summary>`, "", log ? tail(log) : "_(no log)_", "", "</details>");
  }
  return [...out, ...tails].join("\n").slice(0, 60000) + "\n";
}

// Which PRs hear about it: the PR itself; for a merge-queue batch, the PRs Mergify lists in its metadata block
// ("pull_requests:\n  - number: N"), never the PRs queued ahead (they are in their own batch). None found: the batch.
export function targets(pr, queue, body = "") {
  if (!queue) return [pr];
  const m = body.match(/^pull_requests:\s*\n((?:[ \t]+.*\n?)*)/m);
  const nums = m ? [...m[1].matchAll(/^\s*-\s*number:\s*(\d+)\s*$/gm)].map((x) => Number(x[1])) : [];
  return nums.length ? [...new Set(nums)].slice(0, 10) : [pr];
}
function postComment(n, body, tok, repo, api) {
  const dir = mkdtempSync(join(tmpdir(), "flaky-c-")), f = join(dir, "body.json");
  try {
    writeFileSync(f, JSON.stringify({ body }));
    execFileSync("curl", ["-fsS", "--retry", "2", "--max-time", "20", "-o", "/dev/null", "-X", "POST", "-H", "@-", "-H", "Accept: application/vnd.github+json",
      "--data-binary", `@${f}`, `${api}/repos/${repo}/issues/${n}/comments`], { timeout: 70e3, input: `Authorization: Bearer ${tok}\n` });
  } finally { rmSync(dir, { recursive: true, force: true }); }
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
  const args = ["-fsSL", "--retry", "2", "--max-time", "20", "-H", "@-", "-H", "Accept: application/vnd.github+json", url];
  if (out) args.splice(0, 0, "-o", out);
  return execFileSync("curl", args, { timeout: 70e3, input: `Authorization: Bearer ${tok}\n`, encoding: out ? undefined : "utf8", maxBuffer: 64 << 20 });
}
function fetchEvents(since, parts = PARTS) {
  const tok = token(), repo = repoName(), api = process.env.GITHUB_API_URL || "https://api.github.com";
  const repoId = JSON.parse(curl(`${api}/repos/${repo}`, tok)).id;
  const dir = mkdtempSync(join(tmpdir(), "flaky-")), events = [];
  try {
    for (let part = 1; part <= parts; part++) {
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
    else if (a === "--parts" && /^[1-9]$/.test(argv[i + 1] || "")) o.parts = Number(argv[++i]);
    else if (a === "--part" && /^[1-9]$/.test(argv[i + 1] || "")) o.part = argv[++i];
    else if (a === "--pr" && /^[1-9][0-9]*$/.test(argv[i + 1] || "")) o.pr = Number(argv[++i]);
    else if (a === "--queue") o.queue = true;
    else if (["--logs", "--body"].includes(a) && argv[i + 1] !== undefined) o[a.slice(2)] = argv[++i];
    else if (a === "--events" && argv[i + 1] !== undefined) o.events.push(argv[++i]);
    else throw new Error(`unknown or incomplete option ${a}`);
  }
  for (const k of ["since", "now"]) if (o[k] !== undefined && !Number.isFinite(Date.parse(o[k]))) throw new Error(`--${k} wants a date, got ${o[k]}`);
  return o;
}
const load = (o, since, parts) => o.events.length ? o.events.flatMap((f) => parseEvents(readFileSync(f, "utf8"))) : fetchEvents(since, parts);

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
  // F5: the bug line's parts.
  const t = tail("ok\n```\nFAIL | x\n");
  ok("F5: a log tail holding ``` cannot close its fence", t.startsWith("````text\n") && t.endsWith("\n````"), t);
  const d = mkdtempSync(join(tmpdir(), "flaky-t-"));
  try {
    writeFileSync(join(d, "check_a.try1.log"), "\x1b[31mFAIL a | b\x1b[0m\n");
    const r = report(parseEvents("2026-11-06T10:00:00Z\tcheck_a.ts\tpassed on retry\t1\t0\tabc1234\n2026-11-06T10:00:00Z\tcheck_b.ts\tfailed twice\t1\t1\tabc1234\n"), d, parseLedger("owner\t*\ttech-lead\n"), { part: "3" });
    const row = r.split("\n").find((l) => l.startsWith("| QA-?"));
    ok("F5: one bug line per pass on retry, none for failed twice; a | in the reason cannot break its row; colours dropped", r.split("\n").filter((l) => l.startsWith("| QA-?")).length === 1 && row.includes("exit 1: FAIL a / b)") && row.split(" | ").length === 7 && r.includes("`suite-retries-3`"), r);
    ok("F5: no pass on retry, no report", report(parseEvents("2026-11-06T10:00:00Z\tcheck_b.ts\tfailed twice\t1\t1\tabc\n"), d, parseLedger("")) === "", "a report");
  } finally { rmSync(d, { recursive: true, force: true }); }
  const mb = "Mergify ... [#1168](/o/r/pull/1168)\n### Queued ahead of this batch\n- [#1158](/o/r/pull/1158)\n```yaml\n---\npull_requests:\n  - number: 1168\n    scopes: []\n  - number: 1171\n    scopes: []\nscopes: []\n...\n```\n";
  ok("F5: a batch's comment goes to its own PRs (metadata), not the one queued ahead", targets(1170, true, mb).join() === "1168,1171", targets(1170, true, mb));
  ok("F5: a batch body without metadata: the batch PR itself", targets(1170, true, "no metadata #1158").join() === "1170", targets(1170, true, "x"));
  ok("F5: a PR's own check: that PR", targets(1145, false, mb).join() === "1145", targets(1145, false, mb));
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
    const q = quarantine(load(o, now - 2 * L.window * DAY, o.parts), L, now);
    for (const x of q) console.error(`quarantined: ${x.suite} passed only on retry in ${x.count} runs within ${L.window} days (runs ${x.runs.join(", ")}); owner ${x.owner}; fix by ${x.fixBy}`);
    if (!q.length) console.error(`no suite passed only on retry in ${L.needs}+ runs within ${L.window} days`);
    console.log(quarantineLine(q));
  } else if (cmd === "report") {
    if (!o.events.length || !o.logs) throw new Error("report wants --events <retries.tsv> and --logs <dir>");
    const L = parseLedger(readFileSync(o.ledger || join(HERE, "flaky-ledger.tsv"), "utf8"));
    const e = process.env, runUrl = e.GITHUB_RUN_ID && e.GITHUB_REPOSITORY ? `${e.GITHUB_SERVER_URL || "https://github.com"}/${e.GITHUB_REPOSITORY}/actions/runs/${e.GITHUB_RUN_ID}` : "";
    process.stdout.write(report(load(o, 0), o.logs, L, { part: o.part, runUrl }));
  } else if (cmd === "comment") {
    if (!o.body || !o.pr) throw new Error("comment wants --body <file> and --pr <n>");
    const text = existsSync(o.body) ? readFileSync(o.body, "utf8").trim() : "";
    if (!text) return console.error("comment: nothing to post (no suite passed on retry)");
    const to = targets(o.pr, o.queue, process.env.PR_BODY || ""), tok = token(), repo = repoName(), api = process.env.GITHUB_API_URL || "https://api.github.com";
    const head = o.queue && !(to.length === 1 && to[0] === o.pr) ? `Found in merge-queue batch #${o.pr}, which holds ${to.map((n) => `#${n}`).join(", ")}.\n\n` : "";
    for (const n of to) { postComment(n, head + text + "\n\n---\n_Posted by ci.yml (tools/flaky.mjs comment, B122 F5)_", tok, repo, api); console.error(`comment: posted on #${n}`); }
  } else {
    console.error("usage: flaky.mjs events|count|quarantine|report|comment [--since <ISO>] [--now <ISO>] [--events <tsv>]... [--ledger <tsv>] [--json] | --self-test");
    process.exit(2);
  }
}
main().catch((e) => { console.error(`flaky.mjs: ${e.message}`); process.exit(2); });
