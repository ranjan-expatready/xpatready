#!/usr/bin/env node
// Gate B (P-214 CI tooling; founder 4 Nov "Yes, as amended"; reports/bottleneck-audit-2026-11-03.md: 18 Works → Partial
// demotions in 3 days): a product PR may no longer merge silently with work that has not passed the test qa counts it by.
//   1. The PR names the capabilities it works on: C<n.n> in its title, a "Capabilities:" line, or a "Claims Works:"
//      line in its body (also as a list under it, a heading, a table row or with a note before the colon), where a pack
//      that is green only in part names its steps: "Capabilities: C7.5 (steps 1-4, 10-14)". Only a capability on a
//      "Claims Works: C<n.n>" line (the PR says it now Works; the same line triggers gate A) is checked against qa/BUGS.md
//      (tech lead, 4 Nov: incremental work is not stopped by the row's bugs), and its whole pack must pass (steps never
//      narrow a Works claim). The check fails while it has an open Blocker, Critical or Major there, or a row whose
//      severity cannot be read, unless the PR's body names that bug on a strict "Fixes: QA-nnn[, QA-nnn]" line (nothing
//      else on the line); prose, the title and "Fix:" never count. BUGS.md is read as it is on the base branch (CI's RANGE), so a PR's own edit to it counts for
//      nothing. A line that says "Claims Works" but names nothing the gate can read refuses (never a silent pass).
//   2. Each named capability with an acceptance pack (prototype/studio/acceptance/<id>.test.ts and <id>-*.test.ts) runs
//      on a fresh isolated copy, US$0, live AI off, by its own documented run: on the demo data (Demo › Reset to the
//      six, POST /api/demo/reset-to-six as the author, then the pack) when its run is the pack alone; on its fixture
//      when its run line has setup steps (they build a combination from an empty workspace, which the six already
//      holds), labelled "fixture only": a PR claiming Works on such a pack still needs the qa lane's demo-data PASS
//      (gate A, tech lead 4 Nov). A pack passes on exit 0 with no FAIL line; with named steps, on exit 0 or 1 when every
//      named step has a PASS line and no FAIL line. A capability with several packs (C6.5, C6.5-screen, C6.5-counts)
//      holds each pack to the named steps it prints a line for, and a pack that prints none of them to its whole run;
//      each named step must be green in one of them (a step no pack prints is refused). Step labels are unique across a
//      capability's packs (each pack prints only its own). Up to GATE_B_JOBS packs (default 3) run side by side, one copy and
//      port per slot; each copy's database and folder are removed after its run.
//   3. Skipped: notes and records PRs (KIND from change-kind.sh, as CI already sorts them) and a PR that names no
//      capability. A merge-queue batch (QUEUE) re-runs part 1 for each PR it names (#nnn in its title), with that PR's
//      title and body as they are now (GITHUB_TOKEN, GITHUB_REPOSITORY), so a "Claims Works:" line added after the PR's
//      own run, or a Major filed since, is still checked before the merge.
// Usage (CI, part 1, its own step after Chromium): PR_TITLE, PR_BODY, KIND, QUEUE, RANGE from the job;
//   node ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/gate-b.mjs
//   node studio/tools/gate-b.mjs --title "<t>" [--body-file <f>] [--kind code] [--bugs <BUGS.md>] [--no-packs] [--plan]
//   --no-packs: only part 1 (and the packs it would run); --plan: print each named pack's run and stop. Off CI, packs
//   run only with GATE_B_PORT (and GATE_B_NAME) set to the copy's own ports (WAY-OF-WORKING; never :4400).
//   GATE_B_DATA=checkpoint (P-294 (a), tech lead 4 Nov; B125, 7 Nov): every pack runs on Demo › Load the configured
//   checkpoint (a blank copy, then the checkpoint, as the author) and says "on the checkpoint". The setups the checkpoint
//   already holds are skipped: setup_visitor_visa.ts and lib/setup_vv_m3.ts (also when the gate adds them for a pack on
//   lib/m3.ts); nightly 42335507309 ran C6.9, C8.2 and C6.4 "fixture only" because of them. A pack's own other setup
//   (C4.4's setup_c44_types.ts, which the checkpoint lacks) still runs after the load, and the line names it. A pack whose
//   run uses no server (an engine-only run line; check-gate-b.mjs uses a fixture pack, C99.9) loads nothing. Unset or "six" is the six, where a pack with setup steps stays on
//   its own fixture.
//   GATE_B_DATA_OF="C4.8=checkpoint C1.1=six" (D5, P-416, 8 Nov): each named capability's packs run on that data and the
//   rest on GATE_B_DATA, so one gate run pools packs on different data across its job slots (works-set.mjs --pool).
//   GATE_B_ACCEPTANCE=<folder>: the packs' folder in place of studio/acceptance (check-gate-b.mjs only, for a fixture
//   pack whose run truly uses no server; #1369 gave C6.5, the old example, its server run).
//   GATE_B_BATCH_PRS=<file>: a batch's PRs as JSON [{n, title, body, head}] in place of GitHub's API (check-gate-b.mjs
//   only, for the QA-366 batch re-check on real commits).
//   GATE_B_RESULTS=<file>: one JSON line per pack run ({id, file, data, where, load, ok, why, infra}) for a caller. A
//   named step that no pack of its capability printed is a refusal of the capability, not of a pack: it is in the gate's
//   own reasons and exit code, never in these lines (works-set.mjs names no steps).
//   BY DIFF (D2, P-416, founder 8 Nov; #1251 merged a red C7.3 step because its title did not name C7.3): on a pull
//   request (RANGE set, not a batch) the capabilities the change touches are tested too, from the suites' reference
//   graph (product/tools/select-suites.mjs --packs: a pack, or a set-up script its run line names, that is or reads a
//   changed file). Which ones (review of #1337: shared files reach 30 rows, several Partial and red on main):
//     * a pack the PR itself changes (acceptance/<C>*.test.ts): its row, if built (Works or Partial on the base);
//     * a pack that only reads a changed file: its row only if it is Works (protected: it must stay green);
//     * the rest are listed, not run ("name it with its green steps to run it": a named capability runs here, in part 1).
//   An added capability's whole pack must pass. --diff-groups <n> prints that set, minus the named capabilities, as at
//   most n JSON groups ({caps, data, skip, packs}; about 6 pack weights a machine) for CI's job "packs", which runs each group pooled on 3 slots (GATE_B_NO_DIFF
//   there, and in part 1). Off CI, without GATE_B_NO_DIFF, the gate adds the set itself. On a pull request every
//   capability runs on its scoring data (works-set.mjs: qa's REGRESSION-DATA.md, else the row's evidence, else the
//   checkpoint for an M3 row, else the six) unless GATE_B_DATA or GATE_B_DATA_OF is set. A deleted pack is named. The
//   nightly re-test and works-set's runs are unchanged.
//   BATCH RE-CHECK (QA-366, 10 Nov; C7.5 went red on main 0e0ccbb64: #1396's CI ran C7.5 on main 1d07807c8, before #1435
//   gated three IMM 5257 boxes C7.5's pack reads; #1435's CI could not see it, because the saved run its change retired
//   arrived only with #1396; the batch re-ran part 1 only): in a merge-queue batch, after part 1, each capability a
//   batch PR names runs again, with the same steps, when its pack reads a file the batch adds to what that PR's own run
//   saw: main since the PR's branch point (git merge-base <its head> <the batch's base>, an older base than its CI's
//   test merge, so it can only run more) and every other PR of the batch. A Works row is left to the protected set (job
//   "regression"), which runs it in the same batch. A PR's run base is not in git, so the branch point stands in for it.
//   It never runs a row nobody named, so an unrelated red Partial still refuses nothing (D2's rule above, STATE F15).
//   NOT TESTED (B131, founder 7 Nov ~15:20 IST, P-405; re-test 42357755876 went green on C3.16, C11.5 with no pack and on
//   C6.5 with no server): a named capability with no acceptance pack to run, or a pack that runs "on no demo data (its run
//   uses no server)" or "fixture only", ran no test on the data asked for. Each prints "NOT TESTED: <cap> has no
//   acceptance pack" or "NOT TESTED on the <six|checkpoint>: <cap> <file> runs <where>" before anything else, and goes
//   into the step summary. The mode comes from GITHUB_EVENT_NAME: a re-test run (workflow_dispatch or schedule, i.e.
//   nightly.yml) exits 3, so its job is red with that reason, never green; anywhere else (a pull request, a merge-queue
//   run, off CI) it is a ::warning:: and the exit stays as it was. Which packs run, and their lines, do not change.
// Exit: 0 pass or skipped · 1 the gate refuses (the reasons are printed) · 2 the gate could not run · 3 NOT TESTED in a
//   re-test run (nothing refused, but a named capability ran no test on the data asked for; B131). 1 and 2 win over 3.
import { readFileSync, readdirSync, existsSync, appendFileSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { request } from "node:http";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = resolve(HERE, ".."), PROTO = resolve(S, ".."), P = resolve(PROTO, "../product");
const ID = /\b[Cc](\d{1,2})\.(\d{1,2})(?![\d.]*\d)\b/g, BUG = /\bQA-\d+\b/gi, GATING = new Set(["Blocker", "Critical", "Major"]);
const ids = (s) => [...s.matchAll(ID)].map((m) => `C${m[1]}.${m[2]}`);
// A key, an optional short note ("(after this PR)"), then its colon. The note never holds another key or a capability,
// so "Claims Works on C11.13 · Capabilities: C11.10" is two claims, not one key over both (scoped check, 4 Nov).
const KEY = /\b(capabilit(?:y|ies)|claims?\s+works?)\b(?:(?!capabilit|claims?\s+works?|[Cc]\d)[^:|\n]){0,40}:/gi;

/** The text a person writes as prose: a fenced block (``` or ~~~) and an inline `code span` that holds a capability or
 *  a placeholder ("C7.5 (steps 1-4)", "C<n.n>") are examples, not claims (#804's own description quoted the syntax and
 *  was read as a claim); a code span with only words in it ("`Claims Works:` C11.13") is unwrapped and read (review
 *  R2-M2). The line count stays the same. A "Claims Works" line whose ids sit only in code names nothing readable, so it
 *  refuses. */
export const prose = (text) => {
  let fence = false;
  return text.split(/\r?\n/).map((l) => {
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; return ""; }
    return fence ? "" : l.replace(/`([^`]*)`/g, (_, c) => (/[Cc]\d|<|QA-\d/i.test(c) ? " " : c)).replace(/~~[^~]*~~/g, " ");
  }).join("\n");
};
/** A body line in plain words: markdown marks, quotes, list bullets and headings gone; a table row "| key | value |"
 *  becomes "key: value". */
const plain = (line) => {
  let t = line.replace(/[ \t]/g, " ").replace(/[*_`~]/g, "").trim();
  if (/^\|/.test(t)) { const c = t.split("|").map((x) => x.trim()).filter(Boolean); if (c.length >= 2) t = `${c[0]}: ${c.slice(1).join(" ")}`; }
  return t.replace(/^(>\s*)+/, "").replace(/^#+\s*/, "").replace(/^([-+]|\d+[.)])\s+/, "").trim();
};
/** The bugs the PR body says it fixes: only a line that is "Fixes:" followed by nothing but bug ids ("Fixes: QA-192,
 *  QA-169"). Prose, a title, "Fix:" with words, or a note after the ids is never a fix (review R2-M1: "closes QA-169 and
 *  QA-192 stays open", "Fixes: none (QA-192 …)", "**Fix:** … QA-192 settled" were all read as fixes). */
export function fixedIn(text) {
  const out = new Set();
  for (const raw of prose(text).split(/\r?\n/)) {
    const m = plain(raw).match(/^fixes\s*:\s*(QA-\d+(?:\s*(?:,|and|&)\s*QA-\d+)*)\s*\.?$/i);
    if (m) for (const b of m[1].match(BUG) ?? []) out.add(b.toUpperCase());
  }
  return out;
}
/** What the PR names: capability → named steps (null = the whole pack), the capabilities it claims Works, the bugs
 *  it says it fixes, and the "Claims Works" lines it could not read. */
export function claims(title = "", body = "") {
  const caps = new Map(), works = new Set(), unread = [];
  title = prose(title); body = prose(body);
  const add = (id, steps) => caps.set(id, steps ? [...new Set([...(caps.get(id) ?? []), ...steps])] : caps.has(id) ? caps.get(id) : null);
  for (const id of ids(title)) add(id, null);
  const raw = body.split(/\r?\n/), lines = raw.map(plain);
  // The list under line i: its list items, after any blank lines (markdown renders both the same; #850 review M2).
  const listUnder = (i) => { const out = []; let j = i + 1; while (j < lines.length && !raw[j].trim()) j++; for (; j < lines.length && /^\s*([-*+]|\d+[.)])\s/.test(raw[j]); j++) out.push(lines[j]); return out; };
  for (let i = 0; i < lines.length; i++) {
    // A key alone on its line ("## Claims Works", "**Claims Works**", "Capabilities") takes the list under it (R2-M3).
    const line = /^(capabilit(?:y|ies)|claims?\s+works?)\s*:?$/i.test(lines[i]) ? `${lines[i].replace(/:$/, "")}:` : lines[i], keys = [...line.matchAll(KEY)];
    for (const [k, m] of keys.entries()) {
      let value = line.slice(m.index + m[0].length, keys[k + 1]?.index ?? line.length);
      const isWorks = /works?/i.test(m[1]);
      if (!isWorks) value = value.split(/\s·\s/)[0];
      // A list under the key: the next lines that are list items (the raw line starts with a bullet or a number).
      // A Works key always reads the list under it, also when its own value names an id ("Claims Works: C11.10" over
      // "- C11.13"; #850 round 2 M4); a capabilities key only when its value names none.
      if (isWorks || !ids(value).length) for (const t of listUnder(i)) value += " " + t;
      const named = ids(value);
      if (isWorks && !named.length && !/^\s*(none|nothing|no capability)\b/i.test(value)) unread.push(line.slice(0, 120));
      for (const id of named) if (isWorks) works.add(id);
      for (const c of value.matchAll(/\b[Cc](\d{1,2})\.(\d{1,2})\b(?:\s*\(\s*steps?\s+([^)]*)\))?/g)) {
        const steps = c[3] !== undefined ? expand(c[3]) : null;
        add(`C${c[1]}.${c[2]}`, steps);
      }
    }
    // "Claims Works" said without a colon the gate can read ("## Claims Works (as built)", "This PR claims Works on",
    // "Claims Works —"), each time it is said outside a key: the ids after each phrase (up to the line's next key), else
    // every id on the line ("C11.13 … claims Works on it"), and always the list under it, a blank line between allowed
    // (r4-m1, #850 review M1, M2), ARE a Works claim, so the bug check runs; a heading or a short label with none
    // refuses as unread; a prose sentence that names nothing claims nothing (R3-M1).
    const inKey = (x) => keys.some((m) => x >= m.index && x < m.index + m[0].length);
    const phrases = [...line.matchAll(/\bclaims?\s+works?\b/gi)].filter((p) => !inKey(p.index));
    if (phrases.length) {
      let named = [];
      for (const phrase of phrases) { const from = phrase.index, to = keys.find((m) => m.index > from)?.index ?? line.length; named.push(...ids(line.slice(from, to))); }
      if (!named.length) named = ids(line);
      for (const t of listUnder(i)) named.push(...ids(t));
      for (const id of named) { works.add(id); add(id, null); }
      if (!named.length && (/^\s*#/.test(raw[i]) || line.split(/\s+/).length <= 6)) unread.push(line.slice(0, 120));
    }
  }
  for (const id of works) caps.set(id, null);   // a Works claim is the whole pack: steps never narrow it
  return { caps, works, fixes: fixedIn(body), unread };
}
/** "1-4, 10, 6b, AT-3" → 1 2 3 4 10 6b AT-3 (a range only between two numbers; - – — … and .. all work). */
export function expand(list) {
  const out = [];
  for (const t of list.split(/[,;\s]+/).map((x) => x.trim().replace(/[–—…]/g, "-")).filter(Boolean)) {
    const r = t.match(/^(\d+)(?:-|\.\.\.?)(\d+)$/);
    if (r && +r[1] <= +r[2] && +r[2] - +r[1] < 100) for (let i = +r[1]; i <= +r[2]; i++) out.push(String(i));
    else out.push(t);
  }
  return out;
}
const RANK = { Minor: 1, Major: 2, Critical: 3, Blocker: 4 };
/** The open rows of qa/BUGS.md: id, severity (the highest named in the "Type · Severity" cell outside brackets, so
 *  "Minor → Major (raised)" is Major and "Minor (Major if …)" stays Minor; "unknown" when none), and capabilities
 *  (before the first "·": C<n.n>, C<n>.x or C<n>.*, any case). A row is closed only when its status starts with
 *  Closed or Withdrawn and does not say it reopened. */
export function openBugs(md) {
  const rows = [];
  for (const line of md.split(/\r?\n/)) {
    const col = line.trim().split(/(?<!\\)\|/).map((c) => c.trim());
    if (col[0] !== "" || col.length < 4) continue;
    const id = col[1].match(/QA-\d+/i)?.[0]?.toUpperCase();
    if (!id) continue;
    const kind = col[2].replace(/[*_`]/g, ""), status = col[col.length - 1] === "" ? col[col.length - 2] : col[col.length - 1];
    if (/^(closed|withdrawn)\b/i.test(status.replace(/[*_`]/g, "")) && !/reopen/i.test(status)) continue;
    const outside = kind.replace(/\([^)]*\)/g, " ").split("·").slice(1).join(" ");
    const named = [...outside.matchAll(/\b(Blocker|Critical|Major|Minor)\b/gi)].map((m) => m[1][0].toUpperCase() + m[1].slice(1).toLowerCase());
    const severity = named.sort((a, b) => RANK[b] - RANK[a])[0] ?? "unknown";
    const head = (col[3] ?? "").split("·")[0];
    const caps = [...ids(head), ...[...head.matchAll(/\b[Cc](\d{1,2})\.[x*]/g)].map((m) => `C${m[1]}.x`)];
    rows.push({ id, severity, caps });
  }
  return rows;
}
const covers = (bugCap, id) => bugCap === id || (bugCap.endsWith(".x") && id.startsWith(bugCap.slice(0, -1)));
/** Part 1: the open bugs that stop a Works claim (Blocker, Critical, Major, or a severity that cannot be read) on a
 *  capability the PR claims Works and does not say it fixes. */
export function blockers(cl, bugs) {
  const out = [];
  for (const id of cl.works) for (const b of bugs)
    if ((GATING.has(b.severity) || b.severity === "unknown") && b.caps.some((c) => covers(c, id)) && !cl.fixes.has(b.id)) out.push({ cap: id, bug: b.id, severity: b.severity });
  return out;
}
/** The packs' folder: studio/acceptance, or GATE_B_ACCEPTANCE (check-gate-b.mjs only: a folder holding a fixture pack
 *  whose run truly uses no server, so the gate's no-server rules are proved without a real pack, #1369). */
const ACC_DIR = () => (process.env.GATE_B_ACCEPTANCE ? resolve(process.env.GATE_B_ACCEPTANCE) : join(S, "acceptance"));
export const packsOf = (id, dir = ACC_DIR()) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f === `${id}.test.ts` || (f.startsWith(`${id}-`) && f.endsWith(".test.ts"))).sort() : [];

/** A pack's documented run, from its header: the isolated.sh line and the tsx lines that follow it (continuations
 *  joined, split on && and ;). The copy's start and stop are the gate's; each tsx step keeps its own folder (a path
 *  that starts with studio/ runs from prototype/, else from studio/), the documented port and database become the
 *  gate's, and an optional [argument] is dropped. A pack on the M3 helpers (acceptance/lib/m3.ts) with no setup line
 *  gets the M3 setup its helpers need (tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts). */
export function runPlan(file, text) {
  const head = [];
  for (const l of text.split(/\r?\n/)) { if (!l.startsWith("//")) break; head.push(l.replace(/^\/\/\s?/, "").trim()); }
  const isCmd = (t) => /^(zsh\s.*isolated\.sh|tsx\s|\.\/node_modules\/\.bin\/tsx\s|node\s|&&)/.test(t);
  let i = head.findIndex((t) => /isolated\.sh\s+\S+\s+\d+\s+start/.test(t));
  if (i < 0) i = head.findIndex((t) => isCmd(t) && t.includes(`acceptance/${file}`));
  if (i < 0) return { error: `no run line in its header (want "zsh studio/tools/isolated.sh <name> <port> start && tsx studio/acceptance/${file} <port> <db>")` };
  // One command per line, or continued with a trailing \ or &&; a trailing "(note)" after a command is a remark.
  let block = "";
  for (let j = i; j < head.length; j++) {
    const t = head[j].replace(/\s+\((?![^)]*\.(ts|cjs|mjs)\b).*$/, "");
    const continued = /(\\|&&)$/.test(block.trim());
    if (j > i && !isCmd(t) && !continued) break;
    block += (j > i && !continued ? " ; " : " ") + t;
  }
  block = block.replace(/\\\s*/g, " ");
  let port = null, db = null; const steps = [];
  for (const piece of block.split(/\s*(?:&&|;)\s*/).map((x) => x.trim()).filter(Boolean)) {
    const iso = piece.match(/isolated\.sh\s+(\S+)\s+(\d+)\s+(start|stop)/);
    if (iso) { port ??= iso[2]; db ??= `xr_studio_${iso[1]}`; continue; }
    const tok = piece.split(/\s+/);
    if (!/^(tsx|\.\/node_modules\/\.bin\/tsx|node)$/.test(tok[0])) return { error: `a run step the gate cannot read: "${piece}"` };
    const script = tok.find((x) => /\.(ts|cjs|mjs)$/.test(x) && !x.endsWith("tsconfig.json"));
    if (!script) return { error: `a run step without a script: "${piece}"` };
    const fromProto = script.startsWith("studio/");
    if (port === null) { const k = tok.indexOf(script); if (/^\d+$/.test(tok[k + 1] ?? "")) port = tok[k + 1]; }
    if (db === null) db = tok.find((x) => /^xr_studio_\w+$/.test(x)) ?? null;
    steps.push({ cwd: fromProto ? "prototype" : "studio", tool: tok[0] === "node" ? "node" : "tsx", args: tok.slice(1).filter((x) => !/^\[.*\]$/.test(x)), script });
  }
  if (!steps.some((s) => s.script.endsWith(`acceptance/${file}`))) return { error: `its run line does not run acceptance/${file}` };
  if (/from\s+["']\.\/lib\/m3\.ts["']/.test(text) && steps.length === 1)
    steps.unshift(
      { cwd: "prototype", tool: "tsx", args: ["studio/tests/runtime/setup_visitor_visa.ts", "PORT", "DB"], script: "studio/tests/runtime/setup_visitor_visa.ts" },
      { cwd: "prototype", tool: "tsx", args: ["studio/acceptance/lib/setup_vv_m3.ts", "PORT", "DB"], script: "studio/acceptance/lib/setup_vv_m3.ts" });
  for (const s of steps) s.args = s.args.map((a) => (a === port || a === "PORT" ? "{PORT}" : a === db || a === "DB" ? "{DB}" : a));
  return { steps };
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Did the named steps pass? A step passes on a PASS line labelled "<id>-<step>" or "<id> <step>" and no FAIL line. */
export function stepsVerdict(id, steps, out) {
  const missing = [];
  for (const s of steps) {
    const re = (w) => new RegExp(`^${w}\\s+${esc(id)}[- ]${esc(s)}(?![0-9A-Za-z])`, "m");
    if (!re("PASS").test(out) || re("FAIL").test(out) || re("HELD").test(out)) missing.push(s);   // a held step is not green (QA-215 break 1)
  }
  return missing;
}
/** Which named steps one pack's run prints a line for (PASS, FAIL or HELD): a capability with several packs holds each
 *  pack to its own steps, and a pack that prints none of the named steps to its whole run. */
export function stepsPrinted(id, steps, out) {
  return steps.filter((s) => new RegExp(`^(?:PASS|FAIL|HELD)\\s+${esc(id)}[- ]${esc(s)}(?![0-9A-Za-z])`, "m").test(out));
}
/** What one pack is judged on (review m6 on 155e03cb8: the wiring, testable): null = no steps named (whole run); [] = an
 *  empty list (refused, it names no step); the named steps it printed; or null when it printed none (its whole run). */
export function packSteps(id, wanted, out) {
  if (!wanted || !wanted.length) return wanted;
  const printed = stepsPrinted(id, wanted, out);
  return printed.length ? printed : null;
}
/** Whether a capability's named steps were all printed by one of its packs: the reason to refuse, or null. Skipped when a
 *  pack of it could not run (the gate already stops with exit 2, review m3). results: { printed, infra } per pack. */
export function unprintedReason(id, steps, results) {
  if (!steps || !steps.length || !results.length || results.some((r) => r.infra)) return null;
  const unseen = stepsUnprinted(steps, results.map((r) => r.printed ?? []));
  return unseen.length ? `${id}: named steps no pack printed: ${unseen.map((s) => `${id}-${s}`).join(", ")}` : null;
}
/** The named steps no pack of the capability printed (each pack's printed list), so a named step is never unseen. */
export function stepsUnprinted(steps, printedByPack) {
  return steps.filter((s) => !printedByPack.some((p) => p.includes(s)));
}
/** The verdict on one pack's run: null when it passed, else why. Exit 0 with no FAIL line passes the whole pack; with
 *  named steps (never empty) exit 0 or 1 passes when each named step is green; a crash, a timeout or exit 2 never does. */
export function packVerdict(id, steps, status, out) {
  const failLines = /^FAIL\s/m.test(out);
  if (steps) {
    if (!steps.length) return "the steps list names no step";
    if (status !== 0 && status !== 1) return `exit ${status} (a crash, a timeout or missing setup is never green)`;
    const missing = stepsVerdict(id, steps, out);
    return missing.length ? `named steps not green: ${missing.map((s) => `${id}-${s}`).join(", ")}` : null;
  }
  if (status !== 0) return `exit ${status}`;
  return failLines ? "exit 0 but it printed FAIL lines" : null;
}

function cleanEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/_LIVE$/.test(k) || k === "ANTHROPIC_API_KEY") delete env[k];   // US$0, live AI off
  const node = resolve(P, "../../../.tools/node-v24.21.0/bin");
  if (existsSync(node)) env.PATH = `${node}:/opt/homebrew/opt/postgresql@18/bin:${env.PATH}`;
  return env;
}
async function resetToSix(port) {
  const r = await fetch(`http://127.0.0.1:${port}/api/demo/reset-to-six`, { method: "POST", headers: { "content-type": "application/json", "x-actor": "user-A" }, body: JSON.stringify({ confirm: "RESET" }) });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, detail: body?.detail ?? body?.message ?? "" };
}
/** The demo data a pack alone runs on (P-294 (a)): "six" (Demo › Reset to the six, the default) or "checkpoint"
 *  (Demo › Load the configured checkpoint). Any other value is refused, so a typo never quietly runs on the six. */
export function dataOf(env = process.env) {
  const v = env.GATE_B_DATA ?? "six";
  if (v !== "six" && v !== "checkpoint") throw new Error(`GATE_B_DATA must be "six" or "checkpoint", not "${v}"`);
  return v;
}
/** GATE_B_DATA_OF (D5): "C4.8=checkpoint C1.1=six" (spaces or commas), each capability's own data. Anything else in it
 *  is refused, so a typo never quietly runs a row on the wrong data. */
export function dataMap(env = process.env) {
  const out = new Map();
  for (const t of (env.GATE_B_DATA_OF ?? "").split(/[\s,]+/).filter(Boolean)) {
    const m = t.match(/^(C\d{1,2}\.\d{1,2})=(six|checkpoint)$/);
    if (!m) throw new Error(`GATE_B_DATA_OF wants "C<n.n>=six|checkpoint" items, not "${t}"`);
    if (out.has(m[1]) && out.get(m[1]) !== m[2]) throw new Error(`GATE_B_DATA_OF names ${m[1]} twice with different data`);
    out.set(m[1], m[2]);
  }
  return out;
}
/** The data one capability's packs run on: its GATE_B_DATA_OF item, else GATE_B_DATA. */
export const dataFor = (id, env = process.env) => dataMap(env).get(id) ?? dataOf(env);
/** The run's mode (B131): "retest" for nightly.yml's re-test (GITHUB_EVENT_NAME workflow_dispatch or schedule), where
 *  NOT TESTED is exit 3; "pr" anywhere else (pull_request, a merge-queue run, off CI), where it is a warning. */
export const RETEST_EVENTS = new Set(["workflow_dispatch", "schedule"]);
// GATE_B_NOT_TESTED=warn (D5): works-set's pooled runs give their own verdict, so NOT TESTED stays a warning there.
export const modeOf = (env = process.env) => (env.GATE_B_NOT_TESTED !== "warn" && RETEST_EVENTS.has(env.GITHUB_EVENT_NAME ?? "") ? "retest" : "pr");
/** The setups Demo › Load the configured checkpoint already holds (it builds vv.single and its release 2, which they
 *  build on an empty workspace): skipped on the checkpoint (B125). Any other setup is the pack's own and still runs. */
export const IN_CHECKPOINT = new Set(["studio/tests/runtime/setup_visitor_visa.ts", "studio/acceptance/lib/setup_vv_m3.ts"]);
const isPack = (s) => /(^|\/)acceptance\/[^/]+\.test\.ts$/.test(s.script);
const base = (s) => s.script.split("/").pop();
/** How the gate runs one pack (B125), in one place: { steps, load, where }. load is the demo data loaded on the fresh
 *  copy first ("six", "checkpoint" or null: none). On the checkpoint: the checkpoint is loaded, the setups it holds are
 *  skipped, the pack's own other setups run after it; a pack whose run uses no server loads nothing. On the six (tech
 *  lead, 4 Nov): a pack alone runs on the six; a pack with setup steps on its own blank copy, "fixture only". */
export function placeOf(plan, data = "six") {
  if (data === "checkpoint") {
    const steps = plan.steps.filter((s) => !IN_CHECKPOINT.has(s.script)), own = steps.filter((s) => !isPack(s));
    if (!steps.some((s) => s.args.includes("{PORT}"))) return { steps, load: null, where: "on no demo data (its run uses no server)" };
    return { steps, load: "checkpoint", where: own.length ? `on the checkpoint, after its own setup ${own.map(base).join(", ")}` : "on the checkpoint" };
  }
  return plan.steps.length === 1 ? { steps: plan.steps, load: "six", where: "on the six" }
    : { steps: plan.steps, load: null, where: "fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A)" };
}
/** Where a pack runs, in words (placeOf's where). */
export const whereOf = (plan, data = "six") => placeOf(plan, data).where;
/** The NOT TESTED lines (B131) for the named capabilities and the packs that will run: a capability with no pack to
 *  run, and a pack whose run loads no demo data (no server, or "fixture only") on `data`. A pack whose run line cannot
 *  be read is a refusal already (runPack), not counted here. `read` gives a pack file's text. */
export function notTested(caps, runs, data, read = (f) => readFileSync(join(ACC_DIR(), f), "utf8")) {
  const out = [], dataOfId = typeof data === "function" ? data : () => data;   // one data, or each capability's own (D5)
  for (const id of caps) if (!runs.some((r) => r.id === id)) out.push(`NOT TESTED: ${id} has no acceptance pack`);
  for (const r of runs) {
    const plan = runPlan(r.f, read(r.f));
    if (plan.error) continue;
    const d = dataOfId(r.id), place = placeOf(plan, d);
    if (place.load === null) out.push(`NOT TESTED on the ${d}: ${r.id} ${r.f} runs ${place.where}`);
  }
  return out;
}
/** Demo › Load the configured checkpoint on a fresh copy: Reset (blank), then the checkpoint, as the author. node:http,
 *  not fetch: the load can outlast fetch's 300 s header wait on a busy machine; up to 20 minutes. */
function post(port, path, body, ms) {
  return new Promise((done) => {
    const data = JSON.stringify(body);
    const rq = request({ host: "127.0.0.1", port: Number(port), path, method: "POST", timeout: ms, headers: { "content-type": "application/json", "x-actor": "user-A", "content-length": Buffer.byteLength(data) } }, (r) => {
      let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c));
      r.on("end", () => { let b = {}; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ ok: (r.statusCode ?? 0) < 300, status: r.statusCode ?? 0, detail: b?.detail ?? b?.message ?? "" }); });
    });
    rq.on("timeout", () => rq.destroy(new Error(`no answer in ${ms / 1000} s`)));
    rq.on("error", (e) => done({ ok: false, status: 0, detail: e.message }));
    rq.end(data);
  });
}
async function loadCheckpoint(port) {
  const blank = await post(port, "/api/demo/reset", { confirm: "RESET" }, 300_000);
  return blank.ok ? post(port, "/api/demo/load", { sample: "configured" }, 1_200_000) : blank;
}
/** A child process as a promise, in its own process group, so a timeout stops the pack and its children (tsx starts
 *  the pack as a child node process). */
function sh(bin, args, opts, ms) {
  return new Promise((done) => {
    const c = spawn(bin, args, { ...opts, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; out += `\n(stopped after ${ms / 1000} s)`; try { process.kill(-c.pid, "SIGKILL"); } catch { c.kill("SIGKILL"); } }, ms);
    c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (out += d));
    c.on("error", (e) => { clearTimeout(timer); done({ status: 127, out: out + e.message }); });
    c.on("close", (code, signal) => { clearTimeout(timer); done({ status: timedOut ? 124 : code ?? (signal ? 128 + 9 : 1), out }); });
  });
}
const summary = (out) => out.trim().split("\n").reverse().find((l) => /\d+\/\d+ passed|passed|failed/i.test(l))?.trim() ?? "no summary line";
/** The last lines a run printed (non-blank, each cut to 200 characters): the reason a pack or setup that stopped with
 *  exit 2, a crash or no summary gives ("STOP  setup missing: …"), which the report names instead of "no summary line"
 *  (#933's re-test: C11.12-runtime "exit 2, no summary line"; P-214). A crash ends in stack frames, so its last
 *  "…Error: …" or "STOP …" line comes first when the last lines do not hold one (review m1). */
export const tail = (out, n = 3) => {
  const lines = out.split("\n").map((l) => l.trim()).filter(Boolean), last = lines.slice(-n);
  const why = [...lines].reverse().find((l) => /^(\w*Error\b|STOP\s)/.test(l));
  return (why && !last.includes(why) ? [why, ...last.slice(1)] : last).map((l) => l.slice(0, 200));
};
const lastLines = (out) => { const t = tail(out); return t.length ? `; last lines: ${t.join(" | ")}` : "; it printed nothing"; };
const fails = (out) => { const f = out.split("\n").filter((l) => /^FAIL\s/.test(l)).slice(0, 5); return f.length ? `; first FAIL lines: ${f.map((l) => l.slice(0, 160)).join(" | ")}` : ""; };
/** Part 2: one pack on a fresh copy in slot `slot` (its own name and port). A pack whose run has no setup lines runs on
 *  the six (Demo › Reset to the six first); a pack whose run line builds its own data runs on its documented blank copy,
 *  "fixture only". With GATE_B_DATA=checkpoint every pack runs alone on the checkpoint (B125). Returns { log, why, infra }: why is null when it passed; infra when the gate could not run it. */
async function runPack(id, file, wanted, slot) {
  const plan = runPlan(file, readFileSync(join(ACC_DIR(), file), "utf8"));
  if (plan.error) return { log: [], why: `${file}: ${plan.error}` };
  const data = dataFor(id), { steps, load, where } = placeOf(plan, data), log = [];
  // Only the steps that will run (a setup skipped on the checkpoint is not needed; review m2).
  const missing = steps.map((s) => join(s.cwd === "prototype" ? PROTO : S, s.script)).filter((f) => !existsSync(f));
  if (missing.length) return { log: [], why: `${file}: its run names a file that does not exist: ${missing.map((f) => relative(PROTO, f)).join(", ")}` };
  const name = `${process.env.GATE_B_NAME ?? "gateb"}${slot}`, port = String(Number(process.env.GATE_B_PORT ?? 4590) + slot), db = `xr_studio_${name}`, env = cleanEnv(), t0 = Date.now();
  if (port === "4400") return { log: [], why: `${file}: port 4400 is the demo; the gate never runs there`, infra: true };
  const onSix = load !== null, demo = load === "checkpoint" ? "Load the configured checkpoint" : "Reset to the six";
  const iso = (what) => sh("zsh", [join(S, "tools/isolated.sh"), name, port, what], { cwd: S, env }, 300_000);
  const up = await iso("start"), tUp = Date.now();
  try {
    if (up.status !== 0) return { log, why: `${file}: isolated copy ${name} did not start (exit ${up.status}): ${up.out.trim().split("\n").slice(-2).join(" ")}`, infra: true };
    if (onSix) {
      const six = await (load === "checkpoint" ? loadCheckpoint(port) : resetToSix(port)).catch((e) => ({ ok: false, status: 0, detail: e.message }));
      if (!six.ok) return { log, why: `${file}: Demo › ${demo} refused (${six.status}) ${six.detail}`, infra: true };
    }
    const tSix = Date.now();
    let out = "", last = null, setupBad = "";
    for (const s of steps) {
      const bin = s.tool === "node" ? "node" : join(S, "node_modules/.bin/tsx");
      const args = s.args.map((a) => a.replace("{PORT}", port).replace("{DB}", db));
      const r = await sh(bin, args, { cwd: s.cwd === "prototype" ? PROTO : S, env }, 900_000);
      if (s.script.endsWith(`acceptance/${file}`)) { out = r.out; last = r.status; continue; }
      log.push(`    setup ${s.script}: exit ${r.status}${r.status ? ` (${summary(r.out)})` : ""}`);
      // Exit 1 is a setup's own known gaps (setup_vv_m3 says so); anything else stops the pack.
      if (r.status !== 0 && r.status !== 1) { setupBad = `setup ${s.script} exit ${r.status} (${summary(r.out)})${lastLines(r.out)}`; break; }
    }
    const sec = (a, b) => Math.round((b - a) / 1000);
    if (setupBad) return { log, why: `${file}: ${setupBad}; the pack did not run` };
    log.push(`    ${file} ${where}: exit ${last}, ${summary(out)} (${sec(t0, Date.now())} s: copy ${sec(t0, tUp)}${onSix ? `, ${demo} ${sec(tUp, tSix)}` : ""}, run ${sec(tSix, Date.now())})`);
    // A held part's steps (P-284) print HELD and fail nothing; the report names them, so a held step is never unseen.
    for (const l of out.split("\n").filter((x) => /^HELD\s/.test(x)).slice(0, 5)) log.push(`      ${l.slice(0, 500)}`);
    // Several packs (C6.5-screen beside C6.5): this pack answers for the named steps it prints; none printed, its whole run.
    // An empty list ("steps ,") is refused as before (packVerdict says it names no step), never read as the whole run.
    const printed = wanted ? stepsPrinted(id, wanted, out) : null, judged = packSteps(id, wanted, out);
    if (wanted && wanted.length) log.push(`      judged on ${judged ? `its named steps ${judged.map((x) => `${id}-${x}`).join(", ")}` : "its whole run (it prints none of the named steps)"}`);
    const why = packVerdict(id, judged, last, out);
    // Exit 2, a crash, a timeout or no summary line: the pack's own last lines say why (never "exit 2" alone).
    const quiet = (last !== 0 && last !== 1) || summary(out) === "no summary line";
    if (quiet) for (const l of tail(out)) log.push(`      ${l}`);
    return { log, why: why ? `${file} ${where}: ${why}${fails(out)}${quiet ? lastLines(out) : ""}` : null, printed };
  } finally {
    await iso("stop");
    spawnSync("dropdb", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "--if-exists", db], { env, encoding: "utf8" });
    rmSync(join(S, "var", `isolated-${name}`), { recursive: true, force: true });
  }
}
const PACK = /^(C\d{1,2}\.\d{1,2})(-[\w.-]+)?\.test\.ts$/;
/** D2: the capabilities whose packs are touched: a pack file in `reached` (a changed file, or one that reads a changed
 *  file), or a pack whose run line names a set-up script in `reached`. reached: repository paths; files: the pack file
 *  names; read: a pack's text; top: the studio folder's repository path. Returns id → { files, why }. */
export function touchedPacks(reached, files, read, top, changed = new Set()) {
  const out = new Map(), proto = top.replace(/\/studio$/, "");
  for (const f of files) {
    const m = f.match(PACK); if (!m) continue;
    const own = `${top}/acceptance/${f}`, plan = runPlan(f, read(f));
    const steps = plan.error ? [] : plan.steps.map((s) => (s.cwd === "prototype" ? `${proto}/${s.script}` : `${top}/${s.script}`)).filter((x) => x !== own);
    const hit = reached.has(own) ? reached.get(own) : steps.map((x) => reached.get(x)).find((x) => x !== undefined);
    if (hit === undefined) continue;
    const e = out.get(m[1]) ?? { files: [], why: hit, direct: false }; e.files.push(f); e.direct ||= changed.has(own); out.set(m[1], e);
  }
  return out;
}
/** D2 in CI: git diff <base>...<head> → select-suites.mjs --packs → touchedPacks. Throws when it cannot tell (never a
 *  silent empty set). */
const gitTop = () => spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: S, encoding: "utf8" }).stdout.trim();
/** git diff --name-only <spec> at the repository's top (spec "a...b" or "a" "b"); throws on a failure. */
function changedFiles(...spec) {
  const d = spawnSync("git", ["-c", "core.quotePath=false", "diff", "--no-renames", "--name-only", ...spec], { cwd: gitTop(), encoding: "utf8", maxBuffer: 64 << 20 });
  if (d.status !== 0) throw new Error(`git diff ${spec.join(" ")} failed: ${d.stderr.trim()}`);
  return d.stdout.split("\n").filter(Boolean);
}
/** The packs a list of changed files reaches (select-suites.mjs --packs → touchedPacks). */
function packsReachedBy(list) {
  const top = gitTop();
  const r = spawnSync(process.execPath, [join(P, "tools/select-suites.mjs"), "--packs"], { cwd: top, input: list.map((f) => f + "\n").join(""), encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`select-suites.mjs --packs failed: ${(r.stderr || r.stdout).trim().split("\n").pop()}`);
  const reached = new Map(r.stdout.split("\n").filter(Boolean).map((l) => { const [f, ...c] = l.split("\t"); return [f, c.join("\t")]; }));
  const acc = join(S, "acceptance"), files = existsSync(acc) ? readdirSync(acc).filter((f) => PACK.test(f)) : [];
  return touchedPacks(reached, files, (f) => readFileSync(join(acc, f), "utf8"), relative(top, S), new Set(list));
}
function diffCaps(range) {
  const [b, h] = range.split(".."), top = gitTop(), rel = relative(top, S);
  const changed = changedFiles(`${b}...${h}`);
  const deleted = changed.filter((f) => f.startsWith(`${rel}/acceptance/`) && PACK.test(f.split("/").pop()) && !existsSync(join(top, f))).map((f) => f.split("/").pop());
  return { touched: packsReachedBy(changed), deleted };
}
/** QA-366: which capabilities a merge-queue batch runs again. prs: [{ n, caps: claims().caps, touched: id → { files, why }
 *  (the packs reached by what the batch adds to that PR's own run), or null when that could not be worked out }];
 *  statusOf: the base's status. A named row runs again when its pack is touched (every named row when touched is null),
 *  unless it is Works (the protected set runs it in the same batch). Two PRs naming one row: the union of their steps,
 *  the whole pack when either names it without steps. Returns { run: id → steps | null, why: id → text, works: [ids] }. */
export function batchRecheck(prs, statusOf) {
  const run = new Map(), why = new Map(), works = new Set();
  for (const pr of prs) for (const [id, steps] of pr.caps) {
    const t = pr.touched ? pr.touched.get(id) : { files: [], why: "what the batch adds could not be worked out, so it runs" };
    if (!t) continue;
    if (WORKS.test(statusOf(id) ?? "")) { works.add(id); continue; }
    run.set(id, run.has(id) && (run.get(id) === null || steps === null) ? null : steps === null ? null : [...new Set([...(run.get(id) ?? []), ...steps])]);
    why.set(id, `${why.has(id) ? `${why.get(id)}; ` : ""}#${pr.n}${t.files.length ? ` ${t.files.join(", ")}` : ""}: ${t.why.slice(0, 160)}`);
  }
  return { run, why, works: [...works] };
}
/** QA-366 in CI: the packs reached by what the batch adds to one PR's own run (main since its branch point, and every
 *  other PR of the batch). base: the batch's base (RANGE). null when a head cannot be read (then its rows all run). */
function batchTouched(pr, prs, base) {
  const has = (sha) => sha && (spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: S }).status === 0 || spawnSync("git", ["fetch", "-q", "--no-tags", "origin", sha], { cwd: S }).status === 0);
  if (!prs.every((q) => has(q.head))) return null;
  const mb = spawnSync("git", ["merge-base", pr.head, base], { cwd: S, encoding: "utf8" }).stdout.trim();
  if (!mb) return null;
  const list = new Set(changedFiles(mb, base));
  for (const q of prs) if (q.n !== pr.n) for (const f of changedFiles(`${base}...${q.head}`)) list.add(f);
  return list.size ? packsReachedBy([...list]) : new Map();
}
const BUILT = /^[^\p{L}\p{N}]*(works|partial)\b/iu, WORKS = /^[^\p{L}\p{N}]*works\b/iu;
/** D2's rule (review of #1337): which touched capabilities run. A pack the PR changes: its row if built; a pack that only
 *  reads a changed file: its row only if Works. Returns { run: [{id, why, direct}], listed: ["C… (why not)"] }. */
export function diffSet(touched, statusOf) {
  const run = [], listed = [];
  for (const [id, t] of touched) {
    const st = statusOf(id) ?? "no row";
    if (t.direct ? BUILT.test(st) : WORKS.test(st)) run.push({ id, why: `${t.files.join(", ")}: ${t.why.slice(0, 160)}`, direct: t.direct });
    else listed.push(`${id} (${st.slice(0, 24)}${t.direct || !BUILT.test(st) ? "" : "; reads a changed file"})`);
  }
  return { run, listed };
}
/** runPack plus one GATE_B_RESULTS line (D5), so a caller pooling many packs reads each verdict without parsing words. */
async function runPackRecorded(id, file, wanted, slot) {
  const r = await runPack(id, file, wanted, slot);
  if (process.env.GATE_B_RESULTS) {
    let where = null, load = null, data = null;
    try { data = dataFor(id); const plan = runPlan(file, readFileSync(join(ACC_DIR(), file), "utf8")); if (!plan.error) ({ where, load } = placeOf(plan, data)); } catch { /* the why says it */ }
    appendFileSync(process.env.GATE_B_RESULTS, JSON.stringify({ id, file, data, where, load, ok: !r.why, why: r.why ?? null, infra: Boolean(r.infra) }) + "\n");
  }
  return r;
}
/** BUGS.md as it is on the base branch (RANGE "<base>..<head>" from CI), so a PR's own edit to it counts for nothing. */
function bugsText(opt) {
  if (opt.bugs) return readFileSync(opt.bugs, "utf8");
  const base = (process.env.RANGE ?? "").match(/^([0-9a-f]{7,40})\.\./)?.[1];
  const file = join(P, "qa/BUGS.md");
  if (!base) return readFileSync(file, "utf8");
  const r = spawnSync("git", ["show", `${base}:${relative(spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: S, encoding: "utf8" }).stdout.trim(), file)}`], { cwd: S, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`cannot read qa/BUGS.md at the base ${base}: ${r.stderr.trim()}`);
  return r.stdout;
}
/** A merge-queue batch: the PRs its title names, with their title and body as they are now. */
async function batchPrs(title) {
  const nums = [...new Set([...title.matchAll(/#(\d+)/g)].map((m) => m[1]))], auth = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
  if (!nums.length) throw new Error("the merge-queue batch's title names no PR (#nnn)");
  // GATE_B_BATCH_PRS=<file> (check-gate-b.mjs only): the batch's PRs as JSON [{n, title, body, head}], in place of the API.
  if (process.env.GATE_B_BATCH_PRS) return JSON.parse(readFileSync(process.env.GATE_B_BATCH_PRS, "utf8"));
  if (!auth || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are needed to read the batch's PRs");
  return Promise.all(nums.map(async (n) => {
    const r = await fetch(`https://api.github.com/repos/${repo}/pulls/${n}`, { headers: { authorization: `Bearer ${auth}`, accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(`cannot read PR #${n} (${r.status})`);
    const j = await r.json(); return { n, title: j.title ?? "", body: j.body ?? "", head: j.head?.sha ?? null };
  }));
}
/** Part 1 for one PR: the reasons it refuses (empty when it passes). */
export function part1(cl, bugs) {
  return [
    ...cl.unread.map((l) => `a "Claims Works" line the gate cannot read: "${l}" (write "Claims Works: C<n.n>, C<n.n>")`),
    ...blockers(cl, bugs).map((b) => `${b.cap} has an open ${b.severity === "unknown" ? "row whose severity cannot be read" : b.severity}, ${b.bug}, in qa/BUGS.md: fix it in this PR and name it (a "Fixes: ${b.bug}" line), or do not claim Works for ${b.cap} yet`),
  ];
}

async function main(argv) {
  const opt = { title: process.env.PR_TITLE ?? "", body: process.env.PR_BODY ?? "", kind: process.env.KIND ?? "code", queue: process.env.QUEUE === "true", bugs: null, packs: true, plan: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { if (argv[i + 1] === undefined) throw new Error(`${a} wants a value`); return argv[++i]; };
    if (a === "--title") opt.title = v(); else if (a === "--body-file") opt.body = readFileSync(v(), "utf8"); else if (a === "--body") opt.body = v();
    else if (a === "--diff-groups") { opt.diffGroups = Number(v()); if (!Number.isInteger(opt.diffGroups) || opt.diffGroups < 1 || opt.diffGroups > 9) throw new Error("--diff-groups wants 1 to 9"); }
    else if (a === "--kind") opt.kind = v(); else if (a === "--bugs") opt.bugs = v(); else if (a === "--no-packs") opt.packs = false; else if (a === "--plan") opt.plan = true;
    else throw new Error(`unknown option ${a}`);
  }
  const say = (s) => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n"); };
  // --diff-groups prints only JSON: a batch or a change that is not code has no packs by diff.
  if (opt.diffGroups && (opt.queue || opt.kind !== "code")) { console.log("[]"); return 0; }
  if (opt.kind === "notes" || opt.kind === "records") { say(`Gate B: skipped (${opt.kind} change).`); return 0; }
  const bugs = openBugs(bugsText(opt));
  let cl = claims(opt.title, opt.body);
  if (opt.queue) {   // the batch: part 1 again for each PR, as it reads now
    const reasons = [], prs = await batchPrs(opt.title);
    for (const pr of prs) for (const r of part1(claims(pr.title, pr.body), bugs)) reasons.push(`#${pr.n}: ${r}`);
    if (reasons.length) { say("Gate B refuses the batch:"); for (const r of reasons) say(`  * ${r}`); return 1; }
    say("Gate B: the batch's PRs pass part 1 as they read now.");
    // QA-366: a named row's pack runs again when the batch adds a file it reads to what its PR's own run saw.
    const base = (process.env.RANGE ?? "").match(/^([0-9a-f]{7,40})\.\./)?.[1];
    if (!base) throw new Error("a merge-queue batch needs RANGE (<base>..<head>) to tell which named packs run again (QA-366)");
    const { baseScoring } = await import("./works-set.mjs"), sc = baseScoring();
    const { run, why, works } = batchRecheck(prs.map((pr) => ({ n: pr.n, caps: claims(pr.title, pr.body).caps, touched: batchTouched(pr, prs, base) })), sc.statusOf);
    if (works.length) say(`  named Works rows the protected set runs in this batch: ${works.join(", ")}`);
    if (!run.size) { say("  QA-366: no named row's pack reads a file this batch adds to its PR's own run; their packs ran on their own PRs."); return 0; }
    say(`Gate B, QA-366: the batch adds files these named rows' packs read, so they run again: ${[...run.keys()].map((id) => `${id} (${why.get(id)})`).join("; ")}.`);
    cl = { caps: run, works: new Set(), fixes: new Set(), unread: [] };
    if (!process.env.GATE_B_DATA && !process.env.GATE_B_DATA_OF) process.env.GATE_B_DATA_OF = [...run.keys()].map((id) => `${id}=${sc.dataOf(id)}`).join(" ");
  }
  // D2: on a pull request, the capabilities the change touches (diffSet) are tested too; every one on its scoring data.
  const range = process.env.RANGE ?? "", onPr = !opt.queue && /^[0-9a-f]{7,40}\.\.[0-9a-f]{7,40}$/.test(range);
  if (opt.diffGroups && !onPr) { console.log("[]"); return 0; }   // no pull-request range: nothing by diff
  const byDiff = onPr && (opt.diffGroups || !process.env.GATE_B_NO_DIFF), scoreIt = onPr && !process.env.GATE_B_DATA && !process.env.GATE_B_DATA_OF;
  if (byDiff || (scoreIt && cl.caps.size)) {   // the base's statuses, data and holds only when something needs them
    const { baseScoring, groupsOf } = await import("./works-set.mjs"), sc = baseScoring();
    if (byDiff) {
      const { touched, deleted } = diffCaps(range), { run, listed } = diffSet(touched, sc.statusOf);
      const fresh = run.filter((r) => !cl.caps.has(r.id));
      const note = (s) => (opt.diffGroups ? console.error(s) : console.log(s), process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n"));
      if (fresh.length) note(`Gate B by diff (D2): the change touches ${fresh.map((r) => `${r.id} on the ${sc.dataOf(r.id)} (${r.direct ? "its pack changed" : "Works; its pack reads a changed file"}: ${r.why})`).join("; ")}.`);
      if (listed.length) note(`  by diff, not run (a Partial row whose pack only reads a changed file, or not built; name it with its green steps to run it): ${listed.join(", ")}`);
      if (deleted.length) note(`  pack deleted at the head: ${deleted.join(", ")} (the merge queue refuses a deleted Works pack)`);
      if (opt.diffGroups) {
        // A Works row reached only by reading keeps qa's holds (REGRESSION-HELD.md, as the queue's set); a pack the PR
        // changes runs even when held (the PR may be its fix).
        const skipOf = (r) => (r.direct ? [] : sc.heldOf(r.id, packsOf(r.id)));
        const live = fresh.filter((r) => packsOf(r.id).length > skipOf(r).length);
        for (const r of fresh.filter((x) => !live.includes(x))) note(`  by diff, every pack held (REGRESSION-HELD.md), not run: ${r.id}`);
        const items = live.map((r) => { const n = packsOf(r.id).length - skipOf(r).length; return { id: r.id, packs: n, weight: n * (sc.dataOf(r.id) === "checkpoint" ? 2 : 1) }; });
        // As many machines as the work needs (about 6 pack weights each, review m2), at most --diff-groups.
        const n = Math.max(1, Math.min(opt.diffGroups, Math.ceil(items.reduce((t, x) => t + x.weight, 0) / 6)));
        console.log(JSON.stringify(groupsOf(items, n).map((g) => ({ caps: g.caps.join(" "), data: g.caps.map((id) => `${id}=${sc.dataOf(id)}`).join(" "), skip: g.caps.flatMap((id) => skipOf(live.find((r) => r.id === id))).join(","), packs: g.packs }))));
        return 0;
      }
      for (const r of fresh) cl.caps.set(r.id, null);
    }
    if (scoreIt && cl.caps.size) process.env.GATE_B_DATA_OF = [...cl.caps.keys()].map((id) => `${id}=${sc.dataOf(id)}`).join(" ");
  }
  if (!cl.caps.size && !cl.unread.length) { say("Gate B: skipped (the PR names no capability: C<n.n> in its title, or a \"Capabilities:\" or \"Claims Works:\" line)."); return 0; }
  // GATE_B_SKIP_PACKS: pack files left out by name (the protected regression set's held packs, works-set.mjs).
  const skip = new Set((process.env.GATE_B_SKIP_PACKS ?? "").split(",").map((x) => x.trim()).filter(Boolean));
  const runs = [...cl.caps].flatMap(([id, st]) => packsOf(id).filter((f) => !skip.has(f)).map((f) => ({ id, f, st })));
  // B131: what ran no test on the data asked for comes first (a wrong GATE_B_DATA is left to the pack run to refuse).
  let data = null; try { data = dataOf(); dataMap(); } catch { data = null; /* refused below when packs run */ }
  const mode = modeOf(), untested = data ? notTested([...cl.caps.keys()], runs, (id) => dataFor(id)) : [];
  if (process.env.GATE_B_DATA_OF) say(`  data: ${[...cl.caps.keys()].map((id) => `${id} on the ${dataFor(id)}`).join(", ")} (GATE_B_DATA_OF)`);
  for (const l of untested) say(l);
  if (untested.length) for (const l of untested) console.log(`::${mode === "retest" ? "error" : "warning"} title=Gate B NOT TESTED::${l.replace(/^NOT TESTED(?: on the \w+)?: /, "")}`);
  const named = [...cl.caps].map(([id, st]) => (st ? `${id} (steps ${st.join(", ")})` : id)).join(", ");
  say(`Gate B: ${opt.queue ? "the batch runs again" : "the PR names"} ${named || "nothing readable"}${opt.queue ? " (part 1 passed above)" : cl.works.size ? `; claims Works for ${[...cl.works].join(", ")}` : "; claims Works for none (no bug check)"}${cl.fixes.size ? `; says it fixes ${[...cl.fixes].join(", ")}` : ""}.`);
  const reasons = part1(cl, bugs);
  if (skip.size) say(`  held, not run: ${[...skip].join(", ")}`);
  say(`  packs: ${runs.length ? runs.map((r) => r.f).join(", ") : "none for the named capabilities"}`);
  if (opt.plan) {   // what the gate will run, in this GATE_B_DATA (B125: on the checkpoint, the pack alone)
    for (const r of runs) { const p = runPlan(r.f, readFileSync(join(ACC_DIR(), r.f), "utf8")), x = p.error ? null : placeOf(p, dataFor(r.id)); console.log(r.f, x ? `${x.where} · load ${x.load ?? "none"} · ${JSON.stringify(x.steps)}` : JSON.stringify(p)); }
    return 0;
  }
  let infra = false;
  if (opt.packs && runs.length) {
    if (!process.env.GITHUB_ACTIONS && !process.env.GATE_B_PORT) throw new Error("off CI, set GATE_B_PORT (and GATE_B_NAME) to this copy's own ports before running packs, or pass --no-packs");
    const jobs = Number(process.env.GATE_B_JOBS ?? 3);
    dataOf(); dataMap(); // a wrong GATE_B_DATA or GATE_B_DATA_OF stops the gate before any copy starts
    if (!Number.isInteger(jobs) || jobs < 1 || jobs > 9) throw new Error(`GATE_B_JOBS must be 1 to 9, not "${process.env.GATE_B_JOBS}"`);
    const results = new Array(runs.length), t0 = Date.now();
    let next = 0;   // one copy and port per slot: a slot runs its packs one after another
    await Promise.all(Array.from({ length: Math.min(jobs, runs.length) }, async (_, slot) => {
      for (let k = next++; k < runs.length; k = next++) results[k] = await runPackRecorded(runs[k].id, runs[k].f, runs[k].st, slot);
    }));
    for (const r of results) { for (const l of r.log) say(l); if (r.why) reasons.push(r.why); infra ||= Boolean(r.infra); }
    // Every named step is green in one of its capability's packs: a step none of them prints is refused.
    for (const [id, st] of cl.caps) {
      const why = unprintedReason(id, st, runs.map((r, k) => (r.id === id ? results[k] : null)).filter(Boolean));
      if (why) reasons.push(why);
    }
    say(`  packs took ${Math.round((Date.now() - t0) / 1000)} s in all`);
  }
  if (reasons.length) { say(infra ? "Gate B could not run every pack, and refuses:" : "Gate B refuses:"); for (const r of reasons) say(`  * ${r}`); return infra ? 2 : 1; }
  if (untested.length && mode === "retest") { say(`Gate B: NOT TESTED${process.env.GATE_B_DATA_OF ? "" : ` on the ${data}`} (exit 3): ${untested.length} named ${untested.length === 1 ? "part" : "parts"} ran no test on the data asked for; a re-test job is never green without one (B131).`); return 3; }
  if (untested.length) { say(`Gate B: passed part 1 and the packs that ran, with ${untested.length} NOT TESTED${process.env.GATE_B_DATA_OF ? "" : ` on the ${data}`} (a warning on a pull request, never a refusal; B131).`); return 0; }
  say("Gate B: passed."); return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`Gate B could not run: ${e.message}`); process.exit(2); });
